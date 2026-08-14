"""Bước 4 - Train baseline CNN (teacher) cho bệnh lá sầu riêng, nhiều seed.

Đầu ra:
  models/teacher_seedXX.pt
  results/teacher_metrics_seedXX.json
  results/teacher_summary.json
  results/logs/train_teacher.log

Chạy (từ gốc gói tái lập):
  python src/train_teacher.py --config configs/durian_leaf_task.yaml
  python src/train_teacher.py --config ... --mode train-small
  python src/train_teacher.py --config ... --mode dry-run
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

sys.path.insert(0, str(Path(__file__).resolve().parent))
from durian_common import (  # noqa: E402
    add_common_args, ensure_dirs, get_logger, load_config, paths_for, pick_device,
    resolve, resolve_mode, set_seed, write_json,
)
from durian_data import get_splits, make_loaders  # noqa: E402
from durian_metrics import evaluate, fmt, summarize  # noqa: E402


# ------------------------------------------------------------------- model ---
def build_model(cfg: Dict[str, Any], n_classes: int) -> Tuple[nn.Module, int]:
    """Trả về (model, feature_dim). Hỗ trợ mobilenet_v2 / efficientnet_b0 / resnet18."""
    from torchvision import models

    name = str(cfg["model"].get("backbone", "mobilenet_v2")).lower()
    pretrained = str(cfg["model"].get("pretrained", "imagenet")).lower() in ("imagenet", "true", "1")

    if name in ("mobilenet_v2", "mobilenetv2"):
        w = models.MobileNet_V2_Weights.IMAGENET1K_V1 if pretrained else None
        m = models.mobilenet_v2(weights=w)
        feat_dim = m.classifier[-1].in_features
        m.classifier[-1] = nn.Linear(feat_dim, n_classes)
    elif name in ("efficientnet_b0", "efficientnet-lite0", "efficientnet_lite0"):
        w = models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        m = models.efficientnet_b0(weights=w)
        feat_dim = m.classifier[-1].in_features
        m.classifier[-1] = nn.Linear(feat_dim, n_classes)
    elif name == "resnet18":
        w = models.ResNet18_Weights.IMAGENET1K_V1 if pretrained else None
        m = models.resnet18(weights=w)
        feat_dim = m.fc.in_features
        m.fc = nn.Linear(feat_dim, n_classes)
    else:
        raise SystemExit(f"backbone chưa hỗ trợ: {name}")
    return m, feat_dim


@torch.no_grad()
def predict(model: nn.Module, loader: DataLoader, device: str
            ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Trả về (y_true, y_pred, dataset_index) - index dùng để map lại image_path."""
    model.eval()
    ys, ps, ids = [], [], []
    for x, y, i in loader:
        x = x.to(device, non_blocking=True)
        logits = model(x)
        ps.append(logits.argmax(1).cpu().numpy())
        ys.append(y.numpy())
        ids.append(np.asarray(i))
    if not ys:
        return np.array([]), np.array([]), np.array([])
    return np.concatenate(ys), np.concatenate(ps), np.concatenate(ids)


# --------------------------------------------------------------------- loss ---
class FocalLoss(nn.Module):
    """Focal loss đa lớp (Lin et al. 2017), có thể kèm alpha theo lớp."""

    def __init__(self, gamma: float = 2.0, weight: torch.Tensor | None = None):
        super().__init__()
        self.gamma = gamma
        self.register_buffer("weight", weight if weight is not None else torch.tensor([]))

    def forward(self, logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        w = self.weight if self.weight.numel() else None
        logp = torch.log_softmax(logits, dim=1)
        logpt = logp.gather(1, target.unsqueeze(1)).squeeze(1)
        pt = logpt.exp()
        loss = -((1.0 - pt) ** self.gamma) * logpt
        if w is not None:
            loss = loss * w.to(logits.device)[target]
        return loss.mean()


def class_weights_from_rows(rows: List[Dict[str, str]], labels: List[str]) -> torch.Tensor:
    """Trọng số nghịch đảo tần suất, chuẩn hoá để trung bình = 1."""
    counts = np.array([sum(1 for r in rows if r["label"] == lb) for lb in labels], dtype=np.float64)
    counts = np.maximum(counts, 1.0)
    w = counts.sum() / (len(labels) * counts)
    return torch.tensor(w / w.mean(), dtype=torch.float32)


def build_criterion(cfg: Dict[str, Any], rows: List[Dict[str, str]], labels: List[str],
                    device: str, log) -> nn.Module:
    tr = cfg["training"]
    kind = str(tr.get("loss", "ce")).lower()
    weight = None
    if kind in ("ce_weighted", "focal_weighted") or tr.get("class_weight") == "from_labels":
        weight = class_weights_from_rows(rows, labels).to(device)
        log.info("Class weight (from_labels): %s",
                 {lb: round(float(w), 3) for lb, w in zip(labels, weight.cpu())})
    if kind.startswith("focal"):
        gamma = float(tr.get("focal_gamma", 2.0))
        log.info("Loss = focal (gamma=%.1f%s)", gamma, ", weighted" if weight is not None else "")
        return FocalLoss(gamma=gamma, weight=weight).to(device)
    log.info("Loss = cross-entropy%s", " (weighted)" if weight is not None else "")
    return nn.CrossEntropyLoss(weight=weight)


def run_name(cfg: Dict[str, Any]) -> str:
    """Tên file đầu ra: 'teacher' cho baseline, 'teacher_<tag>' cho biến thể."""
    tag = str(cfg["training"].get("run_tag", "baseline")).strip()
    return "teacher" if tag in ("", "baseline") else f"teacher_{tag}"


# ----------------------------------------------------------------- one seed --
def train_one_seed(cfg: Dict[str, Any], labels: List[str], loaders: Dict[str, DataLoader],
                   seed: int, device: str, epochs: int, log,
                   train_rows: List[Dict[str, str]] | None = None) -> Dict[str, Any]:
    set_seed(seed)
    model, _ = build_model(cfg, len(labels))
    model.to(device)

    tr = cfg["training"]
    mcfg = cfg["model"]
    opt_name = str(mcfg.get("optimizer", "adamw")).lower()
    lr, wd = float(mcfg.get("lr", 1e-3)), float(mcfg.get("weight_decay", 1e-4))
    opt = (torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=wd) if opt_name == "adamw"
           else torch.optim.SGD(model.parameters(), lr=lr, momentum=0.9, weight_decay=wd))
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=max(1, epochs))
    crit = build_criterion(cfg, train_rows or loaders["train"].dataset.rows, labels, device, log)
    use_amp = bool(tr.get("amp", True)) and device == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)

    patience = int(tr.get("early_stopping_patience", 5))
    best_f1, best_epoch, best_state, bad = -1.0, -1, None, 0
    history: List[Dict[str, float]] = []
    t0 = time.time()

    for ep in range(1, epochs + 1):
        model.train()
        run_loss, n_seen, correct = 0.0, 0, 0
        for x, y, _ in loaders["train"]:
            x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
            opt.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=use_amp):
                out = model(x)
                loss = crit(out, y)
            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()
            run_loss += loss.item() * y.size(0)
            correct += (out.argmax(1) == y).sum().item()
            n_seen += y.size(0)
        sched.step()

        yv, pv, _ = predict(model, loaders["val"], device)
        val_m = evaluate(yv, pv, labels)
        history.append({"epoch": ep, "train_loss": run_loss / max(1, n_seen),
                        "train_acc": correct / max(1, n_seen),
                        "val_macro_f1": val_m["macro_f1"],
                        "val_balanced_accuracy": val_m["balanced_accuracy"],
                        "lr": opt.param_groups[0]["lr"]})
        log.info("seed %d | epoch %2d/%d | loss %.4f | train_acc %.4f | val %s",
                 seed, ep, epochs, history[-1]["train_loss"], history[-1]["train_acc"], fmt(val_m))

        if val_m["macro_f1"] > best_f1 + 1e-6:
            best_f1, best_epoch, bad = val_m["macro_f1"], ep, 0
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        else:
            bad += 1
            if bad >= patience:
                log.info("seed %d | early stopping ở epoch %d (best epoch %d)", seed, ep, best_epoch)
                break

    if best_state is not None:
        model.load_state_dict(best_state)
    train_time = time.time() - t0

    out: Dict[str, Any] = {"seed": seed, "epochs_run": len(history), "best_epoch": best_epoch,
                           "train_time_sec": round(train_time, 1), "history": history,
                           "device": device, "backbone": cfg["model"]["backbone"],
                           "loss": str(cfg["training"].get("loss", "ce"))}
    for split in ("train", "val", "test"):
        y, p, ids = predict(model, loaders[split], device)
        out[split] = evaluate(y, p, labels)
        if split == "test":
            # lưu prediction từng ảnh -> phục vụ McNemar / bootstrap sau này
            rows = loaders["test"].dataset.rows
            out["test_predictions"] = {
                "image_path": [rows[int(i)]["image_path"] for i in ids],
                "y_true": [int(v) for v in y],
                "y_pred": [int(v) for v in p],
            }
        log.info("seed %d | %-5s | %s", seed, split, fmt(out[split]))
    return out, model


# ------------------------------------------------------------------- main ----
def main() -> None:
    ap = argparse.ArgumentParser(description="Train teacher CNN cho bệnh lá sầu riêng")
    add_common_args(ap)
    ap.add_argument("--seeds", default=None, help="ghi đè seeds, ví dụ 42,43")
    args = ap.parse_args()

    cfg = load_config(args.config)
    mode = resolve_mode(args, cfg)
    P = paths_for(cfg)
    ensure_dirs(P["models"], P["results"], P["logs"])
    log = get_logger("train_teacher", P["logs"] / "train_teacher.log")

    by_split, labels = get_splits(cfg, train_small=mode.train_small, seed=42)
    log.info("Task=%s | dataset=%s | labels=%s", cfg["task_name"], cfg["dataset_id"], labels)
    log.info("Số ảnh: train %d | val %d | test %d | mode=%s",
             len(by_split["train"]), len(by_split["val"]), len(by_split["test"]), mode.name)

    missing = [r["image_path"] for s in by_split for r in by_split[s]
               if not resolve(r["image_path"]).exists()]
    if missing:
        raise SystemExit(f"Thiếu {len(missing)} ảnh, ví dụ: {missing[:3]}")
    log.info("Đã kiểm tra: tất cả ảnh tồn tại.")

    if mode.dry_run:
        log.info("[dry-run] dữ liệu OK, không train.")
        return

    device = pick_device(cfg["training"].get("device", "auto"))
    log.info("Device: %s", device)
    loaders = make_loaders(cfg, labels, by_split, train_small=mode.train_small)

    seeds = ([int(s) for s in args.seeds.split(",")] if args.seeds
             else [int(s) for s in cfg["training"].get("seeds", [42])])
    epochs = (int((cfg.get("compute_mode", {}) or {}).get("small_epochs", 2)) if mode.train_small
              else int(cfg["training"].get("epochs", 25)))

    name = run_name(cfg)
    log.info("Run name = %s", name)
    per_seed: Dict[int, Dict[str, Any]] = {}
    for seed in seeds:
        res, model = train_one_seed(cfg, labels, loaders, seed, device, epochs, log,
                                    train_rows=by_split["train"])
        ckpt = P["models"] / f"{name}_seed{seed}.pt"
        torch.save({"state_dict": model.state_dict(), "labels": labels,
                    "backbone": cfg["model"]["backbone"], "seed": seed,
                    "input_size": cfg["model"].get("input_size", 224)}, ckpt)
        write_json(P["results"] / f"{name}_metrics_seed{seed}.json", res)
        log.info("seed %d | lưu %s (%.1f MB)", seed, ckpt.name, ckpt.stat().st_size / 1024**2)
        per_seed[seed] = res

    test_f1 = [per_seed[s]["test"]["macro_f1"] for s in seeds]
    val_f1 = [per_seed[s]["val"]["macro_f1"] for s in seeds]
    best_seed = seeds[int(np.argmax(val_f1))]
    summary = {
        "dataset_id": cfg["dataset_id"],
        "run_name": name,
        "backbone": cfg["model"]["backbone"],
        "loss": str(cfg["training"].get("loss", "ce")),
        "split_file": cfg["split_file"],
        "mode": mode.name,
        "epochs": epochs,
        "seeds": seeds,
        "mean_macro_f1_test": float(np.mean(test_f1)),
        "std_macro_f1_test": float(np.std(test_f1)),
        "mean_macro_f1_val": float(np.mean(val_f1)),
        "test_macro_f1_per_seed": {str(s): per_seed[s]["test"]["macro_f1"] for s in seeds},
        "test_balanced_accuracy": summarize([per_seed[s]["test"]["balanced_accuracy"] for s in seeds]),
        "best_seed": int(best_seed),
        "best_seed_selected_on": "val_macro_f1",
        "best_seed_test": per_seed[best_seed]["test"],
        "checkpoint_best": str((P["models"] / f"{name}_seed{best_seed}.pt").relative_to(resolve("."))),
    }
    write_json(P["results"] / f"{name}_summary.json", summary)
    log.info("TỔNG KẾT: test macro-F1 = %.4f ± %.4f | best_seed = %d",
             summary["mean_macro_f1_test"], summary["std_macro_f1_test"], best_seed)


if __name__ == "__main__":
    main()
