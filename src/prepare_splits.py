"""Bước 2.2 + 2.3 + 3 - Chuẩn hoá dữ liệu, sinh split cố định và file config task.

Đầu ra:
  data/durian/<dataset_id>/images/            (hardlink tới ảnh gốc, không nhân đôi dung lượng)
  data/durian/<dataset_id>/labels.csv         image_path,class_name
  data/durian/<dataset_id>/meta.json          tóm tắt dataset
  splits/durian_<dataset_id>_split.csv        image_path,label,split
  configs/durian_leaf_task.yaml               đặc tả task (tự điền labels từ meta)

Chạy:
  python src/prepare_splits.py
  python src/prepare_splits.py --dry-run
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent))
from durian_common import PROJECT_ROOT, get_logger, read_json, resolve, set_seed, write_json  # noqa: E402

LOG = get_logger("prepare_splits")
IMG_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
SPLIT_ALIASES = {
    "train": "train", "training": "train",
    "val": "val", "valid": "val", "validation": "val", "dev": "val",
    "test": "test", "testing": "test", "eval": "test",
}
SPLIT_RATIO = (0.70, 0.15, 0.15)


def scan_images(root: Path) -> List[Path]:
    return sorted(p for p in root.rglob("*") if p.suffix.lower() in IMG_EXT and p.is_file())


def parse_structure(root: Path, files: List[Path]) -> Tuple[List[Dict[str, str]], bool]:
    """Suy ra (split, class) từ cây thư mục.

    Hỗ trợ 2 dạng phổ biến: <split>/<class>/img và <class>/img.
    """
    recs: List[Dict[str, str]] = []
    has_official = False
    for f in files:
        parts = [p for p in f.relative_to(root).parts[:-1]]
        split, cls = "", ""
        low = [p.lower() for p in parts]
        for i, p in enumerate(low):
            if p in SPLIT_ALIASES:
                split = SPLIT_ALIASES[p]
                cls = parts[i + 1] if i + 1 < len(parts) else ""
                break
        if not cls:
            cls = parts[-1] if parts else ""
        if split:
            has_official = True
        recs.append({"src": str(f), "label": cls, "split": split})
    return recs, has_official


def stratified_split(recs: List[Dict[str, str]], seed: int) -> None:
    """Gán split 70/15/15 theo lớp, seed cố định (chỉ dùng khi dataset không có split sẵn)."""
    import random

    rng = random.Random(seed)
    by_cls: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for r in recs:
        by_cls[r["label"]].append(r)
    for cls, items in by_cls.items():
        items.sort(key=lambda r: r["src"])
        rng.shuffle(items)
        n = len(items)
        n_tr = int(round(n * SPLIT_RATIO[0]))
        n_va = int(round(n * SPLIT_RATIO[1]))
        n_va = min(n_va, n - n_tr)
        for i, r in enumerate(items):
            r["split"] = "train" if i < n_tr else ("val" if i < n_tr + n_va else "test")
        LOG.info("  %s: %d ảnh -> train %d / val %d / test %d", cls, n, n_tr, n_va, n - n_tr - n_va)


def safe_name(*parts: str) -> str:
    base = "__".join(re.sub(r"[^0-9A-Za-z._-]+", "_", p).strip("_") for p in parts if p)
    return base


def materialize(recs: List[Dict[str, str]], images_dir: Path, dry_run: bool) -> None:
    """Tạo images/ bằng hardlink (fallback: copy). Tên file: <split>__<class>__<tên gốc>."""
    images_dir.mkdir(parents=True, exist_ok=True)
    n_link = n_copy = n_skip = 0
    used: set[str] = set()
    for r in recs:
        src = Path(r["src"])
        name = safe_name(r["split"], r["label"], src.name)
        stem, suf = name.rsplit(".", 1)
        k = 1
        while name in used:
            name = f"{stem}_{k}.{suf}"
            k += 1
        used.add(name)
        dst = images_dir / name
        r["image_path"] = str(dst.relative_to(PROJECT_ROOT)).replace("\\", "/")
        if dry_run:
            continue
        if dst.exists():
            n_skip += 1
            continue
        try:
            os.link(src, dst)
            n_link += 1
        except OSError:
            shutil.copy2(src, dst)
            n_copy += 1
    if not dry_run:
        LOG.info("images/: %d hardlink, %d copy, %d đã có", n_link, n_copy, n_skip)


LABEL_VI = {
    "Leaf_Healthy": "Lá khỏe mạnh",
    "Leaf_Algal": "Đốm tảo (algal leaf spot)",
    "Leaf_Colletotrichum": "Thán thư Colletotrichum",
    "Leaf_Phomopsis": "Đốm lá Phomopsis",
    "Leaf_Rhizoctonia": "Cháy lá Rhizoctonia",
    "Leaf_Blight": "Cháy bìa lá (blight)",
}

CONFIG_TEMPLATE = """# Đặc tả task nhánh SẦU RIÊNG - sinh tự động bởi scripts/prepare_splits.py
# Mọi script chỉ cần: --config configs/durian_leaf_task.yaml
task_name: durian_leaf_disease_classification
dataset_id: {dataset_id}
dataset_root: {dataset_root}
split_file: {split_file}
source_url: {source_url}
paper_url: {paper_url}

labels:
{labels_block}
metrics:
  primary: macro_f1
  secondary:
    - balanced_accuracy
    - confusion_matrix
    - per_class_precision_recall

model:
  backbone: mobilenet_v2
  input_size: 224
  pretrained: imagenet
  optimizer: adamw
  lr: 1.0e-3
  weight_decay: 1.0e-4

training:
  epochs: 25
  batch_size: 32
  num_workers: 4
  seeds: [42, 43, 44]
  early_stopping_patience: 5
  device: auto            # auto | cuda | cpu | mps
  amp: true               # mixed precision khi có CUDA

augmentation:
  horizontal_flip: true
  vertical_flip: false
  color_jitter: "brightness=0.1,contrast=0.1,saturation=0.1"
  random_resized_crop_scale: [0.8, 1.0]

hybrid:
  handcrafted: true       # color stats + HSV histogram + GLCM + LBP + shape
  classifiers: [lightgbm, xgboost, random_forest, logistic_regression]
  feature_sets: [handcrafted, embedding, concat]

explain:
  shap_max_samples: 300
  gradcam_per_class: 2

compute_mode:
  profile_only: false
  train_small: false
  small_epochs: 2
  small_per_class: 40
"""


def write_config(cfg_path: Path, dataset_id: str, labels: List[str], meta: Dict[str, Any],
                 dry_run: bool) -> None:
    labels_block = "".join(
        f"  - {lb}{'':<{max(0, 24 - len(lb))}}  # {LABEL_VI.get(lb, '')}\n".rstrip() + "\n"
        for lb in labels
    )
    text = CONFIG_TEMPLATE.format(
        dataset_id=dataset_id,
        dataset_root=f"data/durian/{dataset_id}/",
        split_file=f"splits/durian_{dataset_id}_split.csv",
        source_url=meta.get("source_url", ""),
        paper_url=meta.get("paper_url", ""),
        labels_block=labels_block,
    )
    if dry_run:
        LOG.info("[dry-run] sẽ ghi config %s", cfg_path)
        return
    cfg_path.parent.mkdir(parents=True, exist_ok=True)
    cfg_path.write_text(text, encoding="utf-8")
    LOG.info("Config task -> %s", cfg_path.relative_to(PROJECT_ROOT))


def main() -> None:
    ap = argparse.ArgumentParser(description="Chuẩn hoá dữ liệu + sinh split sầu riêng")
    ap.add_argument("--choice", default="config/durian_dataset_choice.json")
    ap.add_argument("--dataset-id", default=None, help="ghi đè dataset cần xử lý")
    ap.add_argument("--seed", type=int, default=42, help="seed cho stratified split")
    ap.add_argument("--no-config", action="store_true",
                    help="không sinh configs/durian_leaf_task.yaml (dùng khi chuẩn hoá dataset phụ)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    choice = read_json(resolve(args.choice))
    ds_id = args.dataset_id or choice["leaf_main"]
    info = choice["candidates"][ds_id]
    ds_dir = resolve(f"data/durian/{ds_id}")
    raw_files = ds_dir / "raw_files"
    if not raw_files.exists():
        raise SystemExit(f"Chưa có dữ liệu giải nén tại {raw_files} -> chạy download_all_datasets.py trước.")

    files = scan_images(raw_files)
    LOG.info("Tìm thấy %d ảnh trong %s", len(files), raw_files.relative_to(PROJECT_ROOT))
    if not files:
        raise SystemExit("Không có ảnh nào.")

    recs, has_official = parse_structure(raw_files, files)
    recs = [r for r in recs if r["label"]]
    if has_official:
        missing = [r for r in recs if not r["split"]]
        if missing:
            LOG.warning("%d ảnh nằm ngoài train/val/test -> bỏ qua", len(missing))
            recs = [r for r in recs if r["split"]]
        LOG.info("Dùng split GỐC của dataset (không tự chia lại).")
    else:
        LOG.info("Dataset không có split sẵn -> stratified 70/15/15, seed=%d", args.seed)
        set_seed(args.seed)
        stratified_split(recs, args.seed)

    labels = sorted({r["label"] for r in recs})
    materialize(recs, ds_dir / "images", args.dry_run)

    counts = Counter((r["split"], r["label"]) for r in recs)
    split_tot = Counter(r["split"] for r in recs)
    LOG.info("Tổng: %d ảnh | %s", len(recs), dict(split_tot))
    for lb in labels:
        LOG.info("  %-22s train %3d | val %3d | test %3d | tổng %4d", lb,
                 counts[("train", lb)], counts[("val", lb)], counts[("test", lb)],
                 sum(counts[(s, lb)] for s in ("train", "val", "test")))

    meta = {
        "dataset_id": ds_id,
        "name": info["name"],
        "source": info["source"],
        "source_url": info["url"],
        "paper_url": info.get("paper_url") or "",
        "origin": "Vietnam" if info.get("vietnam_origin") else "non-VN",
        "annotator_level": info["expert_level"],
        "annotator_note": info.get("annotator_note", ""),
        "n_images": len(recs),
        "n_classes": len(labels),
        "classes": labels,
        "class_counts": {lb: sum(counts[(s, lb)] for s in ("train", "val", "test")) for lb in labels},
        "split_counts": dict(split_tot),
        "split_source": "official" if has_official else f"stratified_70_15_15_seed{args.seed}",
        "images_dir": "images/",
        "labels_csv": "labels.csv",
    }

    if args.dry_run:
        LOG.info("[dry-run] không ghi labels.csv / meta.json / split file")
        if not args.no_config:
            write_config(resolve("configs/durian_leaf_task.yaml"), ds_id, labels, meta, True)
        return

    with open(ds_dir / "labels.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["image_path", "class_name"])
        for r in recs:
            w.writerow([r["image_path"], r["label"]])
    LOG.info("labels.csv -> %d dòng", len(recs))

    write_json(ds_dir / "meta.json", meta)

    split_path = resolve(f"data/splits/durian_{ds_id}_split.csv")
    split_path.parent.mkdir(parents=True, exist_ok=True)
    with open(split_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["image_path", "label", "split"])
        for r in recs:
            w.writerow([r["image_path"], r["label"], r["split"]])
    LOG.info("Split file -> %s", split_path.relative_to(PROJECT_ROOT))

    if args.no_config:
        LOG.info("Bỏ qua sinh config (--no-config): giữ nguyên configs/durian_leaf_task.yaml")
    else:
        write_config(resolve("configs/durian_leaf_task.yaml"), ds_id, labels, meta, False)


if __name__ == "__main__":
    main()
