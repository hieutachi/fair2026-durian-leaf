"""Tiện ích chung cho nhánh sầu riêng (durian-only pipeline).

Mọi script khác import từ đây: đường dẫn, config, seed, logging, dataset, metrics.
"""
from __future__ import annotations

import json
import logging
import os
import random
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Console Windows mặc định là cp1252 -> log tiếng Việt sẽ lỗi. Ép UTF-8 ngay khi import.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except Exception:  # noqa: BLE001
        pass

# ---------------------------------------------------------------- logging ----
_LOG_FMT = "%(asctime)s | %(levelname)-7s | %(message)s"


def get_logger(name: str, log_file: Optional[Path] = None) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(logging.Formatter(_LOG_FMT))
    logger.addHandler(sh)
    if log_file is not None:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(log_file, encoding="utf-8")
        fh.setFormatter(logging.Formatter(_LOG_FMT))
        logger.addHandler(fh)
    logger.propagate = False
    return logger


# ----------------------------------------------------------------- config ----
@dataclass
class RunMode:
    """Chế độ chạy: full / dry-run / train-small."""

    name: str = "full"

    @property
    def dry_run(self) -> bool:
        return self.name == "dry-run"

    @property
    def train_small(self) -> bool:
        return self.name == "train-small"


def load_config(path: str | Path) -> Dict[str, Any]:
    path = Path(path)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    with open(path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    cfg["_config_path"] = str(path)
    return cfg


def resolve(p: str | Path) -> Path:
    """Đường dẫn tương đối luôn tính từ project root (chạy được từ mọi cwd)."""
    p = Path(p)
    return p if p.is_absolute() else PROJECT_ROOT / p


def add_common_args(parser):
    parser.add_argument("--config", default="configs/durian_leaf_task.yaml",
                        help="đường dẫn file YAML đặc tả task")
    parser.add_argument("--mode", default=None,
                        choices=["full", "dry-run", "train-small"],
                        help="chế độ chạy (mặc định lấy từ config.compute_mode)")
    parser.add_argument("--dry-run", action="store_true", help="alias của --mode dry-run")
    parser.add_argument("--train-small", action="store_true", help="alias của --mode train-small")
    return parser


def resolve_mode(args, cfg: Dict[str, Any]) -> RunMode:
    if args.mode:
        return RunMode(args.mode)
    if getattr(args, "dry_run", False):
        return RunMode("dry-run")
    if getattr(args, "train_small", False):
        return RunMode("train-small")
    cm = cfg.get("compute_mode", {}) or {}
    if cm.get("profile_only"):
        return RunMode("dry-run")
    if cm.get("train_small"):
        return RunMode("train-small")
    return RunMode("full")


# ------------------------------------------------------------------- seed ----
def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    try:
        import torch

        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    except Exception:  # noqa: BLE001
        pass


def pick_device(prefer: str = "auto") -> str:
    import torch

    if prefer not in ("auto", None):
        return prefer
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


# -------------------------------------------------------------------- io -----
def write_json(path: str | Path, obj: Any) -> Path:
    path = resolve(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    return path


def read_json(path: str | Path) -> Any:
    with open(resolve(path), "r", encoding="utf-8") as f:
        return json.load(f)


def ensure_dirs(*paths: str | Path) -> None:
    for p in paths:
        resolve(p).mkdir(parents=True, exist_ok=True)


# --------------------------------------------------------------- datasets ----
def paths_for(cfg: Dict[str, Any]) -> Dict[str, Path]:
    """Đường dẫn tương đối từ gốc gói tái lập (src/ -> ../data, ../results)."""
    return {
        "dataset_root": resolve(cfg.get("dataset_root", "data")),
        "split_file": resolve(cfg["split_file"]),
        "models": resolve(cfg.get("models_dir", "models")),
        "features": resolve(cfg.get("features_dir", "features")),
        "results": resolve(cfg.get("results_dir", "results")),
        "reports": resolve(cfg.get("reports_dir", "reports")),
        "logs": resolve(cfg.get("logs_dir", "results/logs")),
    }


def load_split(cfg: Dict[str, Any]) -> "Tuple[List[Dict[str, str]], List[str]]":
    """Đọc split csv -> (rows, labels). rows: dict(image_path,label,split)."""
    import csv

    split_file = resolve(cfg["split_file"])
    rows: List[Dict[str, str]] = []
    with open(split_file, "r", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            rows.append({"image_path": r["image_path"], "label": r["label"], "split": r["split"]})
    labels = cfg.get("labels") or sorted({r["label"] for r in rows})
    return rows, list(labels)


class Timer:
    def __enter__(self):
        self.t0 = time.perf_counter()
        return self

    def __exit__(self, *exc):
        self.elapsed = time.perf_counter() - self.t0


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"
