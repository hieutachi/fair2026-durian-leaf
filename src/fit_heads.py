"""Bước 5.3 - Train các classifier ML trên handcrafted / embedding / concat.

Đầu ra:
  models/durian/<ds>/hybrid_<featset>_<clf>.pkl
  results/durian/<ds>/hybrid_metrics.json

Chạy (từ gốc gói tái lập): python src/fit_heads.py --config configs/durian_leaf_task.yaml
"""
from __future__ import annotations

import argparse
import pickle
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from durian_common import (  # noqa: E402
    add_common_args, ensure_dirs, get_logger, load_config, paths_for, resolve_mode, set_seed,
    write_json,
)
from durian_metrics import evaluate, fmt  # noqa: E402

SPLITS = ("train", "val", "test")


# ------------------------------------------------------------------ loading --
def load_npz(path: Path) -> Dict[str, Any]:
    d = np.load(path, allow_pickle=True)
    return {k: d[k] for k in d.files}


def load_feature_sets(P: Dict[str, Path], log) -> Tuple[Dict[str, Dict[str, Any]], List[str], List[str]]:
    """Trả về ({featset: {split: (X, y)}}, labels, feature_names_concat)."""
    emb = {s: load_npz(P["features"] / f"teacher_embeddings_{s}.npz") for s in SPLITS}
    hc_path = P["features"] / "handcrafted_train.npz"
    has_hc = hc_path.exists()
    hc = {s: load_npz(P["features"] / f"handcrafted_{s}.npz") for s in SPLITS} if has_hc else {}

    labels = [str(x) for x in emb["train"]["labels"]]
    emb_names = [f"emb_{i:04d}" for i in range(emb["train"]["X"].shape[1])]

    sets: Dict[str, Dict[str, Any]] = {"embedding": {}}
    for s in SPLITS:
        sets["embedding"][s] = (emb[s]["X"], emb[s]["y"])

    names: Dict[str, List[str]] = {"embedding": emb_names}

    if has_hc:
        hc_names = [str(x) for x in hc["train"]["feature_names"]]
        sets["handcrafted"] = {}
        sets["concat"] = {}
        names["handcrafted"] = hc_names
        names["concat"] = hc_names + emb_names
        for s in SPLITS:
            # khớp thứ tự mẫu theo image_path (2 script trích feature có thể khác thứ tự batch)
            e_paths = [str(p) for p in emb[s]["paths"]]
            h_paths = [str(p) for p in hc[s]["paths"]]
            h_index = {p: i for i, p in enumerate(h_paths)}
            order = [h_index[p] for p in e_paths]
            Xh = hc[s]["X"][order]
            yh = hc[s]["y"][order]
            assert np.array_equal(yh, emb[s]["y"]), f"nhãn không khớp ở split {s}"
            sets["handcrafted"][s] = (Xh, yh)
            sets["concat"][s] = (np.hstack([Xh, emb[s]["X"]]), yh)
        log.info("Feature sets: handcrafted=%d chiều, embedding=%d chiều, concat=%d chiều",
                 len(hc_names), len(emb_names), len(hc_names) + len(emb_names))
    else:
        log.warning("Không thấy handcrafted_*.npz -> chỉ train trên embedding. "
                    "Chạy src/extract_handcrafted.py để có đủ 3 feature set.")
    return sets, labels, names


# -------------------------------------------------------------- classifiers --
def make_classifier(kind: str, n_classes: int, seed: int, n_features: int):
    kind = kind.lower()
    if kind == "lightgbm":
        from lightgbm import LGBMClassifier

        return LGBMClassifier(
            objective="multiclass", num_class=n_classes, n_estimators=600, learning_rate=0.05,
            num_leaves=31, min_child_samples=10, subsample=0.9, subsample_freq=1,
            colsample_bytree=0.7, reg_lambda=1.0, random_state=seed, n_jobs=-1, verbose=-1,
        )
    if kind == "xgboost":
        from xgboost import XGBClassifier

        return XGBClassifier(
            objective="multi:softprob", num_class=n_classes, n_estimators=600, learning_rate=0.05,
            max_depth=6, subsample=0.9, colsample_bytree=0.7, reg_lambda=1.0,
            random_state=seed, n_jobs=-1, tree_method="hist", eval_metric="mlogloss",
            early_stopping_rounds=50,
        )
    if kind == "random_forest":
        from sklearn.ensemble import RandomForestClassifier

        return RandomForestClassifier(n_estimators=500, min_samples_leaf=1, max_features="sqrt",
                                      class_weight="balanced", random_state=seed, n_jobs=-1)
    if kind == "logistic_regression":
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import make_pipeline
        from sklearn.preprocessing import StandardScaler

        return make_pipeline(
            StandardScaler(),
            LogisticRegression(max_iter=3000, C=1.0, class_weight="balanced",
                               n_jobs=-1, random_state=seed),
        )
    raise SystemExit(f"classifier chưa hỗ trợ: {kind}")


def fit_model(kind: str, clf, Xtr, ytr, Xva, yva):
    if kind == "lightgbm":
        import lightgbm as lgb

        clf.fit(Xtr, ytr, eval_set=[(Xva, yva)], eval_metric="multi_logloss",
                callbacks=[lgb.early_stopping(50, verbose=False), lgb.log_evaluation(0)])
    elif kind == "xgboost":
        clf.fit(Xtr, ytr, eval_set=[(Xva, yva)], verbose=False)
    else:
        clf.fit(Xtr, ytr)
    return clf


# -------------------------------------------------------------------- main ----
def main() -> None:
    ap = argparse.ArgumentParser(description="Train hybrid classifiers cho bệnh lá sầu riêng")
    add_common_args(ap)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    cfg = load_config(args.config)
    mode = resolve_mode(args, cfg)
    P = paths_for(cfg)
    ensure_dirs(P["models"], P["results"], P["logs"])
    log = get_logger("train_hybrid", P["logs"] / "train_hybrid.log")

    if not (P["features"] / "teacher_embeddings_train.npz").exists():
        raise SystemExit("Chưa có embedding -> chạy src/extract_embeddings.py trước.")

    sets, labels, names = load_feature_sets(P, log)
    hcfg = cfg.get("hybrid", {}) or {}
    want_sets = [s for s in hcfg.get("feature_sets", ["handcrafted", "embedding", "concat"]) if s in sets]
    want_clfs = hcfg.get("classifiers", ["lightgbm", "xgboost", "random_forest", "logistic_regression"])
    log.info("Sẽ train %d feature set x %d classifier", len(want_sets), len(want_clfs))

    if mode.dry_run:
        for fs in want_sets:
            log.info("[dry-run] %s: train %s val %s test %s", fs, sets[fs]["train"][0].shape,
                     sets[fs]["val"][0].shape, sets[fs]["test"][0].shape)
        return

    set_seed(args.seed)
    results: Dict[str, Any] = {"dataset_id": cfg["dataset_id"], "labels": labels,
                               "seed": args.seed, "runs": {}}
    for fs in want_sets:
        Xtr, ytr = sets[fs]["train"]
        Xva, yva = sets[fs]["val"]
        Xte, yte = sets[fs]["test"]
        for kind in want_clfs:
            key = f"{fs}__{kind}"
            t0 = time.time()
            clf = make_classifier(kind, len(labels), args.seed, Xtr.shape[1])
            try:
                clf = fit_model(kind, clf, Xtr, ytr, Xva, yva)
            except Exception as exc:  # noqa: BLE001
                log.error("%s lỗi: %s", key, exc)
                continue
            fit_time = time.time() - t0
            m_val = evaluate(yva, clf.predict(Xva), labels)
            m_test = evaluate(yte, clf.predict(Xte), labels)
            results["runs"][key] = {
                "feature_set": fs, "classifier": kind, "n_features": int(Xtr.shape[1]),
                "fit_time_sec": round(fit_time, 2), "val": m_val, "test": m_test,
            }
            with open(P["models"] / f"hybrid_{fs}_{kind}.pkl", "wb") as f:
                pickle.dump({"model": clf, "labels": labels, "feature_set": fs,
                             "feature_names": names[fs]}, f)
            log.info("%-38s | val %s | test %s | %.1fs", key, fmt(m_val), fmt(m_test), fit_time)

    if results["runs"]:
        best = max(results["runs"].items(), key=lambda kv: kv[1]["val"]["macro_f1"])
        results["best"] = {"key": best[0], "val_macro_f1": best[1]["val"]["macro_f1"],
                           "test_macro_f1": best[1]["test"]["macro_f1"]}
        log.info("Hybrid tốt nhất (chọn theo val): %s -> test macro-F1 = %.4f",
                 best[0], best[1]["test"]["macro_f1"])
    write_json(P["results"] / "hybrid_metrics.json", results)
    log.info("-> %s", (P["results"] / "hybrid_metrics.json").name)


if __name__ == "__main__":
    main()
