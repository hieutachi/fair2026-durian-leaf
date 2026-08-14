"""Kiểm tra out-of-domain sơ bộ: teacher train trên Mendeley VN, test trên bộ Kaggle.

Thiết kế theo đúng góp ý của Mentor: chỉ đánh giá trên các lớp GIAO NHAU giữa hai dataset;
lớp sâu hại chỉ có ở Kaggle (ALLOCARIDARA_ATTACK) bị loại khỏi phân tích và điều này được
nói rõ trong bài. Không retrain backbone.

Ba con số được báo cáo, để tách biệt hai nguồn sai lệch:
  - in-domain (restricted): teacher trên test Mendeley, chỉ tính trên các lớp giao nhau
    -> mốc so sánh có cùng không gian nhãn.
  - out-of-domain (restricted): argmax chỉ trên các logit của lớp giao nhau
    -> cách làm chuẩn khi hai dataset lệch tập nhãn.
  - out-of-domain (unrestricted): argmax trên toàn bộ 6 lớp; dự đoán rơi vào lớp không
    tồn tại ở Kaggle bị tính là sai -> đo mức "rò rỉ" sang lớp ngoài miền.
Cộng thêm: head tuyến tính đóng băng (train trên embedding Mendeley) đánh giá trên Kaggle.

Đầu ra:
  results/durian/<ds>/cross_dataset_eval.json
  reports/durian/<ds>/fig_cross_dataset.png

Chạy (từ gốc gói tái lập): python src/eval_ood.py --config configs/durian_leaf_task.yaml
"""
from __future__ import annotations

import argparse
import csv
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

# Ánh xạ nhãn Kaggle -> nhãn Mendeley. Chỉ gồm các lớp thực sự tương ứng về bệnh học.
CLASS_MAP: Dict[str, str] = {
    "ALGAL_LEAF_SPOT": "Leaf_Algal",
    "LEAF_BLIGHT": "Leaf_Blight",
    "HEALTHY_LEAF": "Leaf_Healthy",
    "PHOMOPSIS_LEAF_SPOT": "Leaf_Phomopsis",
}
# Lớp bị loại: có ở Kaggle nhưng không có lớp tương ứng ở Mendeley (sâu hại, không phải nấm).
EXCLUDED_KAGGLE = ["ALLOCARIDARA_ATTACK"]
# Lớp Mendeley không có bên Kaggle -> chỉ dùng để đo "rò rỉ" ở chế độ unrestricted.
TARGET_DS = "kaggle_durian_leaf_disease_dataset"


def read_rows(split_csv: Path, want_split: str) -> List[Dict[str, str]]:
    with open(split_csv, "r", encoding="utf-8", newline="") as f:
        return [r for r in csv.DictReader(f) if r["split"] == want_split]


def infer(rows: List[Dict[str, str]], labels: List[str], cfg: Dict[str, Any],
          ckpt_state: Dict[str, Any], device: str, log
          ) -> Tuple[np.ndarray, np.ndarray]:
    """Trả về (logits, embeddings) cho danh sách ảnh."""
    import torch
    from PIL import Image

    from durian_data import build_transforms
    from extract_embeddings import feature_extractor
    from train_teacher import build_model

    _tf, tf_eval = build_transforms(cfg)
    batch = int(cfg["training"].get("batch_size", 32))

    def run(model) -> np.ndarray:
        out: List[np.ndarray] = []
        model.to(device).eval()
        with torch.no_grad():
            for i in range(0, len(rows), batch):
                imgs = [tf_eval(Image.open(resolve(r["image_path"])).convert("RGB"))
                        for r in rows[i:i + batch]]
                x = torch.stack(imgs).to(device)
                out.append(model(x).float().cpu().numpy())
        return np.concatenate(out)

    clf, _ = build_model(cfg, len(labels))
    clf.load_state_dict(ckpt_state)
    logits = run(clf)
    log.info("  logits %s", logits.shape)

    emb_model, _ = build_model(cfg, len(labels))
    emb_model.load_state_dict(ckpt_state)
    emb_model = feature_extractor(emb_model, cfg["model"]["backbone"])
    emb = run(emb_model)
    log.info("  embeddings %s", emb.shape)
    return logits, emb


def main() -> None:
    ap = argparse.ArgumentParser(description="Đánh giá out-of-domain trên bộ Kaggle")
    add_common_args(ap)
    ap.add_argument("--target", default=TARGET_DS)
    args = ap.parse_args()

    import torch

    cfg = load_config(args.config)
    mode = resolve_mode(args, cfg)
    P = paths_for(cfg)
    ensure_dirs(P["results"], P["reports"], P["logs"])
    log = get_logger("cross_dataset_eval", P["logs"] / "cross_dataset_eval.log")

    tgt_split = resolve(f"data/splits/durian_{args.target}_split.csv")
    if not tgt_split.exists():
        raise SystemExit(f"Chưa có split đích tại {tgt_split}. "
                         f"Xem data/README.md rồi chạy:\n"
                         f"  python src/prepare_splits.py --dataset-id {args.target} --no-config")

    summary = read_json(P["results"] / "teacher_summary.json")
    seed = int(summary["best_seed"])
    ckpt = torch.load(P["models"] / f"teacher_seed{seed}.pt", map_location="cpu",
                      weights_only=False)
    labels: List[str] = ckpt["labels"]
    shared = [lb for lb in labels if lb in CLASS_MAP.values()]
    shared_idx = [labels.index(lb) for lb in shared]
    log.info("Lớp giao nhau (%d): %s", len(shared), shared)
    log.info("Lớp Kaggle bị loại: %s | lớp Mendeley không có bên Kaggle: %s",
             EXCLUDED_KAGGLE, [lb for lb in labels if lb not in shared])

    tgt_rows_all = read_rows(tgt_split, "test")
    tgt_rows = [r for r in tgt_rows_all if r["label"] in CLASS_MAP]
    log.info("Kaggle test: %d ảnh, sau khi lọc lớp giao nhau còn %d ảnh (%d ảnh thuộc lớp bị loại)",
             len(tgt_rows_all), len(tgt_rows), len(tgt_rows_all) - len(tgt_rows))

    src_rows_all = read_rows(resolve(cfg["split_file"]), "test")
    src_rows = [r for r in src_rows_all if r["label"] in shared]
    log.info("Mendeley test: %d ảnh, lớp giao nhau %d ảnh", len(src_rows_all), len(src_rows))

    if mode.dry_run:
        log.info("[dry-run] dữ liệu sẵn sàng, không chạy inference.")
        return

    device = pick_device(cfg["training"].get("device", "auto"))
    log.info("Device=%s | teacher seed=%d", device, seed)

    log.info("Inference trên Mendeley (in-domain, lớp giao nhau)...")
    src_logits, src_emb = infer(src_rows, labels, cfg, ckpt["state_dict"], device, log)
    log.info("Inference trên Kaggle (out-of-domain)...")
    tgt_logits, tgt_emb = infer(tgt_rows, labels, cfg, ckpt["state_dict"], device, log)

    y_src = np.array([shared.index(r["label"]) for r in src_rows])
    y_tgt = np.array([shared.index(CLASS_MAP[r["label"]]) for r in tgt_rows])

    def restricted(logits: np.ndarray) -> np.ndarray:
        return np.asarray(logits)[:, shared_idx].argmax(1)

    m_src = evaluate(y_src, restricted(src_logits), shared)
    m_tgt = evaluate(y_tgt, restricted(tgt_logits), shared)

    # unrestricted: argmax trên toàn bộ 6 lớp; rơi ra ngoài -> tính là sai
    full = np.asarray(tgt_logits).argmax(1)
    leaked = np.array([labels[i] not in shared for i in full])
    pred_unres = np.array([shared.index(labels[i]) if labels[i] in shared else -1 for i in full])
    acc_unres = float(((pred_unres == y_tgt) & ~leaked).sum() / len(y_tgt))
    leak_by_class = {lb: int(c) for lb, c in
                     zip(*np.unique([labels[i] for i in full[leaked]], return_counts=True))} \
        if leaked.any() else {}

    # head tuyến tính đóng băng: train trên embedding Mendeley (lớp giao nhau) -> test Kaggle
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    emb_tr = np.load(P["features"] / "teacher_embeddings_train.npz", allow_pickle=True)
    tr_labels = [str(x) for x in emb_tr["labels"]]
    keep = np.array([tr_labels[int(y)] in shared for y in emb_tr["y"]])
    Xtr = emb_tr["X"][keep]
    ytr = np.array([shared.index(tr_labels[int(y)]) for y in emb_tr["y"][keep]])
    head = make_pipeline(StandardScaler(),
                         LogisticRegression(max_iter=3000, C=1.0, class_weight="balanced",
                                            n_jobs=-1, random_state=42))
    head.fit(Xtr, ytr)
    m_head_src = evaluate(y_src, head.predict(src_emb), shared)
    m_head_tgt = evaluate(y_tgt, head.predict(tgt_emb), shared)
    log.info("Head tuyến tính: train %d ảnh Mendeley (%d lớp)", len(ytr), len(shared))

    for name, m in (("teacher in-domain ", m_src), ("teacher out-of-domain", m_tgt),
                    ("head in-domain    ", m_head_src), ("head out-of-domain   ", m_head_tgt)):
        log.info("%s | macro-F1 %.4f | bal-acc %.4f | acc %.4f", name, m["macro_f1"],
                 m["balanced_accuracy"], m["accuracy"])
    log.info("Unrestricted (6 lớp): accuracy %.4f | %d/%d ảnh bị gán sang lớp ngoài miền %s",
             acc_unres, int(leaked.sum()), len(y_tgt), leak_by_class)

    out: Dict[str, Any] = {
        "source_dataset": cfg["dataset_id"],
        "target_dataset": args.target,
        "teacher_seed": seed,
        "retrained": False,
        "shared_classes": shared,
        "class_map_kaggle_to_mendeley": CLASS_MAP,
        "excluded_target_classes": EXCLUDED_KAGGLE,
        "source_only_classes": [lb for lb in labels if lb not in shared],
        "n_target_test_all": len(tgt_rows_all),
        "n_target_test_shared": len(tgt_rows),
        "n_source_test_shared": len(src_rows),
        "teacher_in_domain": m_src,
        "teacher_out_of_domain": m_tgt,
        "teacher_out_of_domain_unrestricted": {
            "accuracy": acc_unres,
            "n_predicted_into_source_only_classes": int(leaked.sum()),
            "leak_by_class": leak_by_class,
        },
        "frozen_head_in_domain": m_head_src,
        "frozen_head_out_of_domain": m_head_tgt,
        "delta_macro_f1_teacher": m_tgt["macro_f1"] - m_src["macro_f1"],
        "delta_macro_f1_head": m_head_tgt["macro_f1"] - m_head_src["macro_f1"],
        "note": ("Evaluation restricted to the classes shared by both datasets; the pest class "
                 "present only in the target dataset is excluded. The backbone is not retrained, "
                 "so this measures zero-shot transfer across orchards and acquisition conditions."),
    }
    write_json(P["results"] / "cross_dataset_eval.json", out)

    # ---- hình: F1 theo lớp, in-domain vs out-of-domain
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    x = np.arange(len(shared))
    w = 0.35
    fig, ax = plt.subplots(figsize=(8.4, 4.6))
    ax.bar(x - w / 2, [m_src["per_class"][lb]["f1"] for lb in shared], w,
           label=f"In-domain (Mendeley test, n={len(src_rows)})", color="#2980b9")
    ax.bar(x + w / 2, [m_tgt["per_class"][lb]["f1"] for lb in shared], w,
           label=f"Out-of-domain (Kaggle test, n={len(tgt_rows)})", color="#c0392b")
    for i, lb in enumerate(shared):
        ax.text(i - w / 2, m_src["per_class"][lb]["f1"] + 0.015,
                f"{m_src['per_class'][lb]['f1']:.3f}", ha="center", fontsize=8)
        ax.text(i + w / 2, m_tgt["per_class"][lb]["f1"] + 0.015,
                f"{m_tgt['per_class'][lb]['f1']:.3f}", ha="center", fontsize=8)
    ax.set_xticks(x, [lb.replace("Leaf_", "") for lb in shared])
    ax.set_ylim(0, 1.12)
    ax.set_ylabel("Test F1")
    ax.set_title("Zero-shot transfer on the four shared classes (backbone not retrained)")
    ax.legend(loc="lower right", fontsize=8)
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    png = P["reports"] / "fig_cross_dataset.png"
    fig.savefig(png, dpi=150)
    plt.close(fig)
    log.info("-> %s và cross_dataset_eval.json", png.name)


if __name__ == "__main__":
    main()
