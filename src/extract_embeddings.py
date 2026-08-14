"""Bước 5.1 - Trích embedding từ teacher CNN (seed tốt nhất) cho train/val/test.

Đầu ra:
  features/durian/<ds>/teacher_embeddings_{train,val,test}.npz  (X, y, paths, labels)

Chạy: python src/extract_embeddings.py --config configs/durian_leaf_task.yaml
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn

sys.path.insert(0, str(Path(__file__).resolve().parent))
from durian_common import (  # noqa: E402
    add_common_args, ensure_dirs, get_logger, load_config, paths_for, pick_device,
    read_json, resolve, resolve_mode,
)
from durian_data import get_splits, make_loaders  # noqa: E402
from train_teacher import build_model  # noqa: E402


def feature_extractor(model: nn.Module, backbone: str) -> nn.Module:
    """Bỏ lớp classifier cuối -> lấy vector đặc trưng (penultimate layer)."""
    name = backbone.lower()
    if name.startswith("mobilenet") or name.startswith("efficientnet"):
        model.classifier[-1] = nn.Identity()
    elif name.startswith("resnet"):
        model.fc = nn.Identity()
    else:
        raise SystemExit(f"chưa hỗ trợ trích feature cho backbone {backbone}")
    return model


@torch.no_grad()
def extract(model: nn.Module, loader, device: str) -> Tuple[np.ndarray, np.ndarray, List[int]]:
    model.eval()
    xs, ys, idxs = [], [], []
    for x, y, i in loader:
        x = x.to(device, non_blocking=True)
        f = model(x)
        xs.append(f.float().cpu().numpy())
        ys.append(y.numpy())
        idxs += [int(v) for v in i]
    return np.concatenate(xs), np.concatenate(ys), idxs


def main() -> None:
    ap = argparse.ArgumentParser(description="Trích embedding teacher CNN")
    add_common_args(ap)
    ap.add_argument("--seed", type=int, default=None, help="ghi đè seed (mặc định best_seed)")
    args = ap.parse_args()

    cfg = load_config(args.config)
    mode = resolve_mode(args, cfg)
    P = paths_for(cfg)
    ensure_dirs(P["features"], P["logs"])
    log = get_logger("extract_embeddings", P["logs"] / "extract_embeddings.log")

    summary_path = P["results"] / "teacher_summary.json"
    if not summary_path.exists():
        raise SystemExit("Chưa có teacher_summary.json -> chạy train_teacher.py trước.")
    summary = read_json(summary_path)
    seed = args.seed or int(summary["best_seed"])
    ckpt_path = P["models"] / f"teacher_seed{seed}.pt"
    if not ckpt_path.exists():
        raise SystemExit(f"Không thấy checkpoint {ckpt_path}")
    log.info("Dùng teacher seed=%d (%s)", seed, ckpt_path.name)

    if mode.dry_run:
        log.info("[dry-run] checkpoint OK, không trích feature.")
        return

    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    labels: List[str] = ckpt["labels"]
    by_split, labels_cfg = get_splits(cfg, train_small=mode.train_small, seed=42)
    if labels_cfg != labels:
        log.warning("Thứ tự nhãn config khác checkpoint, dùng theo checkpoint.")

    device = pick_device(cfg["training"].get("device", "auto"))
    model, feat_dim = build_model(cfg, len(labels))
    model.load_state_dict(ckpt["state_dict"])
    model = feature_extractor(model, ckpt.get("backbone", cfg["model"]["backbone"]))
    model.to(device)
    log.info("Device=%s | feature_dim=%d", device, feat_dim)

    loaders = make_loaders(cfg, labels, by_split, train_small=mode.train_small)
    for split in ("train", "val", "test"):
        X, y, idxs = extract(model, loaders[split], device)
        paths = [by_split[split][i]["image_path"] for i in idxs]
        out = P["features"] / f"teacher_embeddings_{split}.npz"
        np.savez_compressed(out, X=X.astype(np.float32), y=y.astype(np.int64),
                            paths=np.array(paths), labels=np.array(labels), seed=seed)
        log.info("%-5s | X=%s | -> %s", split, X.shape, out.name)


if __name__ == "__main__":
    main()
