"""Bước 2.1 - Bảng trade-off accuracy vs chi phí: teacher vs các head nhẹ trên embedding.

Đo thật (không lấy từ báo cáo cũ):
  - macro-F1, balanced accuracy trên cùng tập test 394 ảnh
  - thời gian huấn luyện (teacher: tổng train_time_sec của seed tốt nhất; head: fit time đo lại)
  - thời gian inference: HEAD-ONLY và END-TO-END (backbone + head) trên CPU, batch = 1
  - kích thước model trên đĩa (MB)

Thêm mô hình cực nhẹ: LinearSVC trên embedding.

Đầu ra:
  results/durian/<ds>/deployment_tradeoff.csv
  results/durian/<ds>/deployment_tradeoff.json
  reports/durian/<ds>/fig_deployment_tradeoff.png

Chạy: python src/deployment_tradeoff.py --config configs/durian_leaf_task.yaml
"""
from __future__ import annotations

import argparse
import csv
import pickle
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from durian_common import (  # noqa: E402
    add_common_args, ensure_dirs, get_logger, load_config, paths_for, read_json, resolve,
    resolve_mode, write_json,
)
from durian_metrics import evaluate  # noqa: E402

N_LATENCY_SAMPLES = 200


def head_specs(seed: int = 42) -> Dict[str, Any]:
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.svm import LinearSVC

    return {
        "logistic_regression": lambda: make_pipeline(
            StandardScaler(),
            LogisticRegression(max_iter=3000, C=1.0, class_weight="balanced",
                               n_jobs=-1, random_state=seed)),
        "linear_svm": lambda: make_pipeline(
            StandardScaler(),
            LinearSVC(C=0.1, class_weight="balanced", max_iter=5000, random_state=seed)),
    }


def model_size_mb(obj) -> float:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pkl") as f:
        pickle.dump(obj, f)
        p = Path(f.name)
    mb = p.stat().st_size / 1024**2
    p.unlink(missing_ok=True)
    return round(mb, 3)


def head_latency_ms(clf, X: np.ndarray, n: int = N_LATENCY_SAMPLES) -> float:
    """Latency head-only, batch=1, CPU."""
    xs = [X[i: i + 1] for i in range(min(n, len(X)))]
    for x in xs[:5]:
        clf.predict(x)
    t0 = time.perf_counter()
    for x in xs:
        clf.predict(x)
    return round(1000.0 * (time.perf_counter() - t0) / len(xs), 3)


def main() -> None:
    ap = argparse.ArgumentParser(description="Bảng trade-off accuracy vs chi phí triển khai")
    add_common_args(ap)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    cfg = load_config(args.config)
    mode = resolve_mode(args, cfg)
    P = paths_for(cfg)
    ensure_dirs(P["results"], P["reports"], P["logs"])
    log = get_logger("deployment_tradeoff", P["logs"] / "deployment_tradeoff.log")

    for need in ("teacher_summary.json", "edge_profile.json"):
        if not (P["results"] / need).exists():
            raise SystemExit(f"Thiếu {need} -> chạy train_teacher.py / profile_edge.py trước.")
    summary = read_json(P["results"] / "teacher_summary.json")
    edge = read_json(P["results"] / "edge_profile.json")
    labels: List[str] = summary["best_seed_test"]["labels"]
    best_seed = int(summary["best_seed"])

    emb_tr = np.load(P["features"] / "teacher_embeddings_train.npz", allow_pickle=True)
    emb_te = np.load(P["features"] / "teacher_embeddings_test.npz", allow_pickle=True)
    Xtr, ytr = emb_tr["X"], emb_tr["y"]
    Xte, yte = emb_te["X"], emb_te["y"]
    log.info("Embedding: train %s | test %s", Xtr.shape, Xte.shape)

    if mode.dry_run:
        log.info("[dry-run] đủ dữ liệu để dựng bảng trade-off.")
        return

    tm = read_json(P["results"] / f"teacher_metrics_seed{best_seed}.json")
    backbone_ms = float(edge["detail"]["cpu"]["1"]["latency_ms_per_image"])
    teacher_ckpt = P["models"] / f"teacher_seed{best_seed}.pt"

    rows: List[Dict[str, Any]] = [{
        "model": f"{summary['backbone']} (teacher, end-to-end)",
        "trainable_part": "toàn bộ backbone + head",
        "n_params_or_features": f"{edge['n_params_million']}M params",
        "test_macro_f1": round(summary["best_seed_test"]["macro_f1"], 4),
        "test_balanced_accuracy": round(summary["best_seed_test"]["balanced_accuracy"], 4),
        "train_time_sec": round(float(tm["train_time_sec"]), 1),
        "head_only_latency_ms": "-",
        "end_to_end_latency_ms_cpu_b1": round(backbone_ms, 3),
        "model_size_mb": round(float(teacher_ckpt.stat().st_size / 1024**2), 3),
        "note": f"seed {best_seed}, {tm['epochs_run']} epoch (early stop ở epoch {tm['best_epoch']})",
    }]

    for name, factory in head_specs(args.seed).items():
        clf = factory()
        t0 = time.perf_counter()
        clf.fit(Xtr, ytr)
        fit_s = time.perf_counter() - t0
        m = evaluate(yte, clf.predict(Xte), labels)
        h_ms = head_latency_ms(clf, Xte)
        size = model_size_mb({"model": clf, "labels": labels})
        rows.append({
            "model": f"{name} on frozen embedding",
            "trainable_part": "chỉ head (backbone đóng băng)",
            "n_params_or_features": f"{Xtr.shape[1]} features",
            "test_macro_f1": round(m["macro_f1"], 4),
            "test_balanced_accuracy": round(m["balanced_accuracy"], 4),
            "train_time_sec": round(fit_s, 2),
            "head_only_latency_ms": h_ms,
            "end_to_end_latency_ms_cpu_b1": round(backbone_ms + h_ms, 3),
            "model_size_mb": size,
            "note": "backbone dùng lại từ teacher seed %d" % best_seed,
        })
        log.info("%-34s macro-F1 %.4f | fit %.2fs | head %.3f ms | %.3f MB",
                 name, m["macro_f1"], fit_s, h_ms, size)

    base_f1 = rows[0]["test_macro_f1"]
    base_train = rows[0]["train_time_sec"]
    for r in rows:
        r["accuracy_retained_pct"] = round(100.0 * r["test_macro_f1"] / base_f1, 2)
        r["train_speedup_vs_teacher"] = (round(base_train / r["train_time_sec"], 1)
                                         if r["train_time_sec"] > 0 else "-")

    out_csv = P["results"] / "deployment_tradeoff.csv"
    with open(out_csv, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    write_json(P["results"] / "deployment_tradeoff.json", {
        "dataset_id": cfg["dataset_id"],
        "device": edge["device"],
        "backbone_cpu_latency_ms_b1": backbone_ms,
        "n_test": int(len(yte)),
        "rows": rows,
        "caveat": ("Head chạy trên embedding nên inference thực tế vẫn phải qua backbone: cột "
                   "end_to_end = backbone + head. Lợi thế của head nằm ở TRAIN TIME và khả năng "
                   "retrain khi thêm lớp bệnh mới, không phải ở latency."),
    })
    log.info("-> %s (%d dòng)", out_csv.name, len(rows))

    # ---- hình: accuracy giữ lại vs thời gian train (log scale)
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(8.2, 5))
    for r in rows:
        is_teacher = "teacher" in r["model"]
        ax.scatter(r["train_time_sec"], r["test_macro_f1"], s=170,
                   color="#c0392b" if is_teacher else "#2980b9",
                   marker="s" if is_teacher else "o", zorder=3)
        ax.annotate(f"{r['model'].split(' (')[0].split(' on ')[0]}\n"
                    f"F1={r['test_macro_f1']:.4f} ({r['accuracy_retained_pct']}%)\n"
                    f"train {r['train_time_sec']}s, {r['model_size_mb']} MB",
                    (r["train_time_sec"], r["test_macro_f1"]),
                    textcoords="offset points", xytext=(10, -6), fontsize=8)
    ax.set_xscale("log")
    ax.set_xlabel("Training time (s, log scale)")
    ax.set_ylabel("Test macro-F1")
    ax.set_title("Accuracy versus training cost (identical test split)")
    ax.grid(alpha=0.3)
    ax.set_xlim(left=max(0.1, min(r["train_time_sec"] for r in rows) * 0.4),
                right=max(r["train_time_sec"] for r in rows) * 6)
    fig.tight_layout()
    out_png = P["reports"] / "fig_deployment_tradeoff.png"
    fig.savefig(out_png, dpi=150)
    plt.close(fig)
    log.info("-> %s", out_png.name)


if __name__ == "__main__":
    main()
