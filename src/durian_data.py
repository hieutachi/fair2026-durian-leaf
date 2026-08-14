"""Dataset / transform dùng chung cho nhánh sầu riêng."""
from __future__ import annotations

import random
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Tuple

import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

sys.path.insert(0, str(Path(__file__).resolve().parent))
from durian_common import PROJECT_ROOT, load_split, resolve  # noqa: E402

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


class DurianLeafDataset(Dataset):
    def __init__(self, rows: List[Dict[str, str]], labels: List[str], tf):
        self.rows = rows
        self.labels = labels
        self.lab2idx = {lb: i for i, lb in enumerate(labels)}
        self.tf = tf

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i: int):
        r = self.rows[i]
        img = Image.open(resolve(r["image_path"])).convert("RGB")
        return self.tf(img), self.lab2idx[r["label"]], i


def parse_color_jitter(spec: str | None) -> Dict[str, float]:
    out = {"brightness": 0.0, "contrast": 0.0, "saturation": 0.0, "hue": 0.0}
    for part in (spec or "").split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            k = k.strip()
            if k in out:
                try:
                    out[k] = float(v)
                except ValueError:
                    pass
    return out


def build_transforms(cfg: Dict[str, Any]) -> Tuple[Any, Any]:
    size = int(cfg["model"].get("input_size", 224))
    aug = cfg.get("augmentation", {}) or {}
    cj = parse_color_jitter(aug.get("color_jitter"))
    scale = tuple(aug.get("random_resized_crop_scale", [0.8, 1.0]))

    train_ops: List[Any] = [transforms.RandomResizedCrop(size, scale=scale)]
    if aug.get("horizontal_flip"):
        train_ops.append(transforms.RandomHorizontalFlip())
    if aug.get("vertical_flip"):
        train_ops.append(transforms.RandomVerticalFlip())
    if any(v > 0 for v in cj.values()):
        train_ops.append(transforms.ColorJitter(**cj))
    train_ops += [transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)]

    eval_ops = [transforms.Resize(int(size * 1.14)), transforms.CenterCrop(size),
                transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)]
    return transforms.Compose(train_ops), transforms.Compose(eval_ops)


def subsample(rows: List[Dict[str, str]], per_class: int, seed: int) -> List[Dict[str, str]]:
    rng = random.Random(seed)
    by: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for r in rows:
        by[r["label"]].append(r)
    out: List[Dict[str, str]] = []
    for _lb, items in sorted(by.items()):
        items = sorted(items, key=lambda r: r["image_path"])
        rng.shuffle(items)
        out += items[:per_class]
    return out


def get_splits(cfg: Dict[str, Any], train_small: bool = False, seed: int = 42
               ) -> Tuple[Dict[str, List[Dict[str, str]]], List[str]]:
    rows, labels = load_split(cfg)
    by_split: Dict[str, List[Dict[str, str]]] = {"train": [], "val": [], "test": []}
    for r in rows:
        if r["split"] in by_split:
            by_split[r["split"]].append(r)
    if train_small:
        n = int((cfg.get("compute_mode", {}) or {}).get("small_per_class", 40))
        for s in by_split:
            by_split[s] = subsample(by_split[s], n if s == "train" else max(8, n // 3), seed)
    return by_split, labels


def make_loaders(cfg: Dict[str, Any], labels: List[str], by_split: Dict[str, List[Dict[str, str]]],
                 train_small: bool = False) -> Dict[str, DataLoader]:
    tf_train, tf_eval = build_transforms(cfg)
    tr = cfg["training"]
    bs = int(tr.get("batch_size", 32))
    nw = int(tr.get("num_workers", 4))
    loaders: Dict[str, DataLoader] = {}
    for split, rows in by_split.items():
        ds = DurianLeafDataset(rows, labels, tf_train if split == "train" else tf_eval)
        loaders[split] = DataLoader(
            ds, batch_size=bs, shuffle=(split == "train"), num_workers=nw,
            pin_memory=torch.cuda.is_available(), drop_last=False,
            persistent_workers=nw > 0 and len(rows) > 0,
        )
    return loaders
