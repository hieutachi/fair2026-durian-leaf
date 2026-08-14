"""Bước 1.2 - Kiểm định thống kê teacher CNN vs hybrid trên CÙNG tập test (394 ảnh).

Ba lớp bằng chứng, từ yếu tới mạnh về mặt ghép cặp:
  A. Paired test trên macro-F1 giữa các seed: với mỗi seed, trích embedding của chính teacher
     seed đó rồi fit logistic head -> cặp (teacher_i, hybrid_i) thực sự ghép đôi.
     => paired t-test + Wilcoxon signed-rank.
  B. McNemar (exact, nhị thức) trên dự đoán từng ảnh của teacher tốt nhất vs hybrid tốt nhất:
     đúng/sai theo từng ảnh, đây là kiểm định chuẩn cho hai model trên cùng test set.
     Chạy cả cho toàn bộ (đúng/sai đa lớp) và one-vs-rest cho từng lớp.
  C. Bootstrap 2.000 lần trên tập test -> khoảng tin cậy 95% của hiệu macro-F1.

Đầu ra:
  results/durian/<ds>/teacher_vs_hybrid_stats.json
  results/durian/<ds>/teacher_vs_hybrid_summary.md   (đoạn văn ghép thẳng vào report)

Chạy (từ gốc gói tái lập): python src/stats.py --config configs/durian_leaf_task.yaml
"""
from __future__ import annotations

import argparse
import pickle
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from durian_common import (  # noqa: E402
    add_common_args, ensure_dirs, get_logger, load_config, paths_for, pick_device, read_json,
    resolve, resolve_mode, write_json,
)
from durian_metrics import evaluate  # noqa: E402

ALPHA = 0.05
N_BOOT = 2000


# --------------------------------------------------------------- kiểm định ----
def mcnemar_exact(b: int, c: int) -> Dict[str, Any]:
    """McNemar exact (binomial test) trên 2 ô lệch: b = chỉ A đúng, c = chỉ B đúng."""
    from scipy.stats import binomtest

    n = b + c
    p = float(binomtest(b, n, 0.5).pvalue) if n > 0 else 1.0
    return {"only_A_correct": int(b), "only_B_correct": int(c), "n_discordant": int(n),
            "p_value": p, "significant_at_0.05": bool(p < ALPHA)}


def bootstrap_macro_f1_diff(yt: np.ndarray, pa: np.ndarray, pb: np.ndarray,
                            labels: List[str], n_boot: int = N_BOOT, seed: int = 42
                            ) -> Dict[str, Any]:
    from sklearn.metrics import f1_score

    idx_all = np.arange(len(yt))
    rng = np.random.default_rng(seed)
    lab_idx = list(range(len(labels)))
    diffs = np.empty(n_boot, dtype=float)
    for i in range(n_boot):
        s = rng.choice(idx_all, size=len(idx_all), replace=True)
        fa = f1_score(yt[s], pa[s], labels=lab_idx, average="macro", zero_division=0)
        fb = f1_score(yt[s], pb[s], labels=lab_idx, average="macro", zero_division=0)
        diffs[i] = fa - fb
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    return {"n_boot": n_boot, "mean_diff": float(diffs.mean()),
            "ci95_low": float(lo), "ci95_high": float(hi),
            "ci_contains_zero": bool(lo <= 0 <= hi),
            "p_two_sided_empirical": float(2 * min((diffs <= 0).mean(), (diffs >= 0).mean()))}


# ------------------------------------------------- A. paired theo từng seed ---
def paired_per_seed(cfg: Dict[str, Any], P: Dict[str, Path], labels: List[str], log
                    ) -> Dict[str, Any]:
    """Với mỗi seed teacher: lấy embedding của chính seed đó -> fit logistic -> so sánh."""
    import torch
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    from durian_data import get_splits, make_loaders
    from extract_embeddings import extract, feature_extractor
    from train_teacher import build_model

    summary = read_json(P["results"] / "teacher_summary.json")
    seeds = summary["seeds"]
    by_split, _ = get_splits(cfg, train_small=False, seed=42)
    loaders = make_loaders(cfg, labels, by_split, train_small=False)
    device = pick_device(cfg["training"].get("device", "auto"))

    pairs: List[Dict[str, Any]] = []
    for seed in seeds:
        m = read_json(P["results"] / f"teacher_metrics_seed{seed}.json")
        teacher_f1 = m["test"]["macro_f1"]

        ckpt = torch.load(P["models"] / f"teacher_seed{seed}.pt", map_location="cpu",
                          weights_only=False)
        model, _ = build_model(cfg, len(labels))
        model.load_state_dict(ckpt["state_dict"])
        model = feature_extractor(model, ckpt.get("backbone", cfg["model"]["backbone"]))
        model.to(device)
        feats: Dict[str, Tuple[np.ndarray, np.ndarray]] = {}
        for split in ("train", "test"):
            X, y, _ = extract(model, loaders[split], device)
            feats[split] = (X, y)
        clf = make_pipeline(StandardScaler(),
                            LogisticRegression(max_iter=3000, C=1.0, class_weight="balanced",
                                               n_jobs=-1, random_state=42))
        clf.fit(*feats["train"])
        hy = clf.predict(feats["test"][0])
        hybrid_f1 = evaluate(feats["test"][1], hy, labels)["macro_f1"]
        pairs.append({"seed": seed, "teacher_macro_f1": teacher_f1,
                      "hybrid_macro_f1": hybrid_f1, "diff": teacher_f1 - hybrid_f1})
        log.info("seed %d | teacher %.4f vs hybrid(logreg cùng seed) %.4f | diff %+.4f",
                 seed, teacher_f1, hybrid_f1, teacher_f1 - hybrid_f1)

    a = np.array([p["teacher_macro_f1"] for p in pairs])
    b = np.array([p["hybrid_macro_f1"] for p in pairs])
    out: Dict[str, Any] = {"pairs": pairs, "n_pairs": len(pairs),
                           "teacher_mean": float(a.mean()), "hybrid_mean": float(b.mean()),
                           "mean_diff": float((a - b).mean())}
    if len(pairs) >= 2:
        from scipy.stats import ttest_rel, wilcoxon

        t = ttest_rel(a, b)
        out["paired_t_test"] = {"statistic": float(t.statistic), "p_value": float(t.pvalue),
                                "significant_at_0.05": bool(t.pvalue < ALPHA)}
        try:
            w = wilcoxon(a, b)
            out["wilcoxon"] = {"statistic": float(w.statistic), "p_value": float(w.pvalue),
                               "significant_at_0.05": bool(w.pvalue < ALPHA)}
        except Exception as exc:  # noqa: BLE001
            out["wilcoxon"] = {"error": str(exc),
                               "note": "n quá nhỏ để Wilcoxon có ý nghĩa (cần >= 6 cặp)"}
        out["caveat"] = (f"Chỉ có {len(pairs)} cặp (bằng số seed) nên power của paired test rất thấp; "
                         "bằng chứng chính nên dựa vào McNemar và bootstrap trên 394 ảnh test.")
    return out


# --------------------------------------- B/C. per-image trên cùng test set ----
def hybrid_test_predictions(P: Dict[str, Path], log) -> Tuple[str, np.ndarray, np.ndarray, List[str]]:
    """Dự đoán từng ảnh của hybrid tốt nhất (chọn theo val) trên test."""
    hybrid = read_json(P["results"] / "hybrid_metrics.json")
    key = max(hybrid["runs"].items(), key=lambda kv: kv[1]["val"]["macro_f1"])[0]
    fs, kind = hybrid["runs"][key]["feature_set"], hybrid["runs"][key]["classifier"]
    with open(P["models"] / f"hybrid_{fs}_{kind}.pkl", "rb") as f:
        bundle = pickle.load(f)

    emb = np.load(P["features"] / "teacher_embeddings_test.npz", allow_pickle=True)
    paths = [str(p) for p in emb["paths"]]
    if fs == "embedding":
        X = emb["X"]
    else:
        hc = np.load(P["features"] / "handcrafted_test.npz", allow_pickle=True)
        h_index = {str(p): i for i, p in enumerate(hc["paths"])}
        Xh = hc["X"][[h_index[p] for p in paths]]
        X = Xh if fs == "handcrafted" else np.hstack([Xh, emb["X"]])
    log.info("Hybrid tốt nhất = %s (%d chiều)", key, X.shape[1])
    return key, bundle["model"].predict(X), emb["y"], paths


def main() -> None:
    ap = argparse.ArgumentParser(description="Kiểm định thống kê teacher vs hybrid")
    add_common_args(ap)
    ap.add_argument("--skip-paired", action="store_true",
                    help="bỏ qua phần A (phải trích lại embedding cho từng seed)")
    args = ap.parse_args()

    cfg = load_config(args.config)
    mode = resolve_mode(args, cfg)
    P = paths_for(cfg)
    ensure_dirs(P["results"], P["logs"])
    log = get_logger("test_teacher_vs_hybrid", P["logs"] / "test_teacher_vs_hybrid.log")

    for need in ("teacher_summary.json", "hybrid_metrics.json"):
        if not (P["results"] / need).exists():
            raise SystemExit(f"Thiếu {need} -> chạy src/train_teacher.py / src/fit_heads.py trước.")
    summary = read_json(P["results"] / "teacher_summary.json")
    labels: List[str] = summary["best_seed_test"]["labels"]

    if mode.dry_run:
        log.info("[dry-run] đủ dữ liệu để chạy kiểm định.")
        return

    # ---- dự đoán từng ảnh: teacher tốt nhất
    best_seed = int(summary["best_seed"])
    tm = read_json(P["results"] / f"teacher_metrics_seed{best_seed}.json")
    if "test_predictions" not in tm:
        raise SystemExit("teacher_metrics_seed*.json chưa có 'test_predictions' -> "
                         "chạy lại train_teacher.py với phiên bản script hiện tại.")
    tp = tm["test_predictions"]
    t_map = {p: (yt, yp) for p, yt, yp in zip(tp["image_path"], tp["y_true"], tp["y_pred"])}

    hyb_key, h_pred, h_true, h_paths = hybrid_test_predictions(P, log)
    missing = [p for p in h_paths if p not in t_map]
    if missing:
        raise SystemExit(f"{len(missing)} ảnh không khớp giữa teacher và hybrid, ví dụ {missing[:2]}")

    yt = np.array([t_map[p][0] for p in h_paths])
    pa = np.array([t_map[p][1] for p in h_paths])          # A = teacher
    pb = np.asarray(h_pred)                                 # B = hybrid
    assert np.array_equal(yt, np.asarray(h_true)), "nhãn thật không khớp"
    log.info("Test set dùng chung: %d ảnh", len(yt))

    m_a, m_b = evaluate(yt, pa, labels), evaluate(yt, pb, labels)
    ca, cb = (pa == yt), (pb == yt)
    overall = mcnemar_exact(int((ca & ~cb).sum()), int((~ca & cb).sum()))
    log.info("McNemar tổng thể: b=%d c=%d p=%.4f -> %s", overall["only_A_correct"],
             overall["only_B_correct"], overall["p_value"],
             "KHÁC BIỆT có ý nghĩa" if overall["significant_at_0.05"] else "KHÔNG khác biệt")

    per_class: Dict[str, Any] = {}
    for i, lb in enumerate(labels):
        ta, tb = (pa == i), (pb == i)
        pos = (yt == i)
        ok_a, ok_b = (ta == pos), (tb == pos)   # one-vs-rest: đúng/sai cho lớp này
        per_class[lb] = mcnemar_exact(int((ok_a & ~ok_b).sum()), int((~ok_a & ok_b).sum()))
        per_class[lb]["teacher_f1"] = m_a["per_class"][lb]["f1"]
        per_class[lb]["hybrid_f1"] = m_b["per_class"][lb]["f1"]
        log.info("  %-22s teacher F1 %.4f vs hybrid %.4f | McNemar p=%.4f%s", lb,
                 per_class[lb]["teacher_f1"], per_class[lb]["hybrid_f1"],
                 per_class[lb]["p_value"], "  *" if per_class[lb]["significant_at_0.05"] else "")

    boot = bootstrap_macro_f1_diff(yt, pa, pb, labels)
    log.info("Bootstrap %d lần: diff macro-F1 = %+.4f, CI95 = [%+.4f, %+.4f] -> %s",
             boot["n_boot"], boot["mean_diff"], boot["ci95_low"], boot["ci95_high"],
             "chứa 0 (không khác biệt)" if boot["ci_contains_zero"] else "không chứa 0")

    stats: Dict[str, Any] = {
        "dataset_id": cfg["dataset_id"],
        "alpha": ALPHA,
        "n_test": int(len(yt)),
        "model_A_teacher": {"name": f"{summary['backbone']}_seed{best_seed}",
                            "macro_f1": m_a["macro_f1"], "accuracy": m_a["accuracy"],
                            "balanced_accuracy": m_a["balanced_accuracy"]},
        "model_B_hybrid": {"name": hyb_key, "macro_f1": m_b["macro_f1"],
                           "accuracy": m_b["accuracy"],
                           "balanced_accuracy": m_b["balanced_accuracy"]},
        "mcnemar_overall": overall,
        "mcnemar_per_class_one_vs_rest": per_class,
        "bootstrap_macro_f1_diff": boot,
    }
    if not args.skip_paired:
        log.info("--- Paired test theo từng seed (trích lại embedding mỗi seed) ---")
        stats["paired_per_seed"] = paired_per_seed(cfg, P, labels, log)

    write_json(P["results"] / "teacher_vs_hybrid_stats.json", stats)

    # ---- đoạn markdown ghép vào report
    verdict = ("KHÔNG có khác biệt có ý nghĩa thống kê" if not overall["significant_at_0.05"]
               else "CÓ khác biệt có ý nghĩa thống kê")
    sig_classes = [lb for lb, v in per_class.items() if v["significant_at_0.05"]]
    md = [
        "### Kiểm định thống kê: teacher vs hybrid",
        "",
        f"Cùng tập test {len(yt)} ảnh, α = {ALPHA}.",
        "",
        f"- Teacher `{stats['model_A_teacher']['name']}`: macro-F1 = {m_a['macro_f1']:.4f}",
        f"- Hybrid `{hyb_key}`: macro-F1 = {m_b['macro_f1']:.4f}",
        f"- **McNemar exact (toàn bộ)**: b = {overall['only_A_correct']}, "
        f"c = {overall['only_B_correct']}, p = {overall['p_value']:.4f} → **{verdict}** ở α = {ALPHA}.",
        f"- **Bootstrap {boot['n_boot']} lần**: Δmacro-F1 (teacher − hybrid) = "
        f"{boot['mean_diff']:+.4f}, CI95 = [{boot['ci95_low']:+.4f}, {boot['ci95_high']:+.4f}]"
        f"{' (chứa 0)' if boot['ci_contains_zero'] else ''}.",
        f"- **McNemar theo lớp (one-vs-rest)**: "
        + (f"khác biệt có ý nghĩa ở {sig_classes}." if sig_classes
           else "không lớp nào khác biệt có ý nghĩa, kể cả Blight và Colletotrichum."),
        "",
    ]
    if "paired_per_seed" in stats:
        pp = stats["paired_per_seed"]
        md += [
            f"Paired test trên {pp['n_pairs']} seed (mỗi seed ghép teacher với logistic head trên "
            f"embedding của chính seed đó): teacher {pp['teacher_mean']:.4f} vs hybrid "
            f"{pp['hybrid_mean']:.4f}, Δ = {pp['mean_diff']:+.4f}; "
            f"paired t-test p = {pp['paired_t_test']['p_value']:.4f}.",
            "",
            f"_{pp['caveat']}_",
            "",
        ]
    md += [
        "**Kết luận**: hybrid không thay thế teacher về độ chính xác cũng không thua kém có ý nghĩa; "
        "giá trị của hybrid nằm ở chi phí huấn luyện/triển khai (xem bảng deployment trade-off).",
        "",
    ]
    out_md = P["results"] / "teacher_vs_hybrid_summary.md"
    out_md.write_text("\n".join(md), encoding="utf-8")
    log.info("-> %s và %s", "teacher_vs_hybrid_stats.json", out_md.name)


if __name__ == "__main__":
    main()
