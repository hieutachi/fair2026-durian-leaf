"""Bước 6.1 - So sánh DL teacher vs Hybrid vs Classical-only.

Đầu ra:
  results/durian/<ds>/model_comparison.csv
  reports/durian/<ds>/fig_model_comparison.png
  reports/durian/<ds>/fig_confusion_matrix_teacher.png
  reports/durian/<ds>/fig_confusion_matrix_best_hybrid.png

Chạy: python src/compare_models.py --config configs/durian_leaf_task.yaml
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from durian_common import (  # noqa: E402
    add_common_args, ensure_dirs, get_logger, load_config, paths_for, read_json, resolve_mode,
)

FAMILY = {
    "handcrafted": "Classical_only",
    "embedding": "Hybrid_embedding",
    "concat": "Hybrid_concat",
}


def plot_bars(rows: List[Dict[str, Any]], out_path: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    rows = sorted(rows, key=lambda r: r["test_macro_f1"])
    names = [f"{r['family']}\n{r['model']}" for r in rows]
    vals = [r["test_macro_f1"] for r in rows]
    colors = ["#c0392b" if r["family"] == "DL_teacher" else
              "#2980b9" if r["family"].startswith("Hybrid") else "#7f8c8d" for r in rows]

    fig, ax = plt.subplots(figsize=(9, max(4, 0.42 * len(rows) + 1.5)))
    bars = ax.barh(names, vals, color=colors)
    for b, v in zip(bars, vals):
        ax.text(v + 0.004, b.get_y() + b.get_height() / 2, f"{v:.4f}", va="center", fontsize=8)
    ax.set_xlim(0, max(1.0, max(vals) + 0.08))
    ax.set_xlabel("Test macro-F1")
    ax.set_title("Durian leaf disease: DL teacher vs Hybrid vs Classical-only")
    ax.grid(axis="x", alpha=0.3)
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_cm(cm: List[List[int]], labels: List[str], title: str, out_path: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    m = np.asarray(cm, dtype=float)
    norm = m / np.maximum(1, m.sum(axis=1, keepdims=True))
    fig, ax = plt.subplots(figsize=(7.2, 6))
    im = ax.imshow(norm, cmap="Blues", vmin=0, vmax=1)
    ax.set_xticks(range(len(labels)), [lb.replace("Leaf_", "") for lb in labels],
                  rotation=45, ha="right")
    ax.set_yticks(range(len(labels)), [lb.replace("Leaf_", "") for lb in labels])
    for i in range(len(labels)):
        for j in range(len(labels)):
            ax.text(j, i, f"{int(m[i, j])}", ha="center", va="center", fontsize=9,
                    color="white" if norm[i, j] > 0.5 else "black")
    ax.set_xlabel("Predicted label")
    ax.set_ylabel("True label")
    ax.set_title(title)
    fig.colorbar(im, ax=ax, fraction=0.046, label="row-normalised share")
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def main() -> None:
    ap = argparse.ArgumentParser(description="So sánh các mô hình")
    add_common_args(ap)
    args = ap.parse_args()

    cfg = load_config(args.config)
    mode = resolve_mode(args, cfg)
    P = paths_for(cfg)
    ensure_dirs(P["results"], P["reports"], P["logs"])
    log = get_logger("compare_models", P["logs"] / "compare_models.log")

    t_path, h_path = P["results"] / "teacher_summary.json", P["results"] / "hybrid_metrics.json"
    if not t_path.exists():
        raise SystemExit("Thiếu teacher_summary.json")
    teacher = read_json(t_path)
    hybrid = read_json(h_path) if h_path.exists() else {"runs": {}}

    labels = teacher["best_seed_test"]["labels"]
    rows: List[Dict[str, Any]] = [{
        "family": "DL_teacher",
        "model": teacher["backbone"],
        "feature_set": "raw_image",
        "n_features": "-",
        "val_macro_f1": round(teacher["mean_macro_f1_val"], 4),
        "test_macro_f1": round(teacher["best_seed_test"]["macro_f1"], 4),
        "test_balanced_accuracy": round(teacher["best_seed_test"]["balanced_accuracy"], 4),
        "test_accuracy": round(teacher["best_seed_test"]["accuracy"], 4),
        "note": (f"best_seed={teacher['best_seed']}; "
                 f"mean±std trên {len(teacher['seeds'])} seed = "
                 f"{teacher['mean_macro_f1_test']:.4f}±{teacher['std_macro_f1_test']:.4f}"),
    }]
    for key, r in hybrid.get("runs", {}).items():
        rows.append({
            "family": FAMILY.get(r["feature_set"], r["feature_set"]),
            "model": r["classifier"],
            "feature_set": r["feature_set"],
            "n_features": r["n_features"],
            "val_macro_f1": round(r["val"]["macro_f1"], 4),
            "test_macro_f1": round(r["test"]["macro_f1"], 4),
            "test_balanced_accuracy": round(r["test"]["balanced_accuracy"], 4),
            "test_accuracy": round(r["test"]["accuracy"], 4),
            "note": f"fit {r['fit_time_sec']}s",
        })

    rows.sort(key=lambda r: -r["test_macro_f1"])
    out_csv = P["results"] / "model_comparison.csv"
    with open(out_csv, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    log.info("Bảng so sánh -> %s (%d dòng)", out_csv.name, len(rows))
    for r in rows:
        log.info("  %-18s %-22s test macro-F1=%.4f balAcc=%.4f",
                 r["family"], r["model"], r["test_macro_f1"], r["test_balanced_accuracy"])

    if mode.dry_run:
        return

    plot_bars(rows, P["reports"] / "fig_model_comparison.png")
    plot_cm(teacher["best_seed_test"]["confusion_matrix"], labels,
            f"Teacher {teacher['backbone']} (seed {teacher['best_seed']}) - test",
            P["reports"] / "fig_confusion_matrix_teacher.png")
    if hybrid.get("runs"):
        bk = max(hybrid["runs"].items(), key=lambda kv: kv[1]["val"]["macro_f1"])
        plot_cm(bk[1]["test"]["confusion_matrix"], labels, f"Best hybrid: {bk[0]} - test",
                P["reports"] / "fig_confusion_matrix_best_hybrid.png")
    log.info("Đã xuất hình -> %s", P["reports"])


if __name__ == "__main__":
    main()
