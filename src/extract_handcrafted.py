"""Bước 5.2 - Sinh handcrafted features (color / histogram / texture / shape).

Nhóm đặc trưng (tổng 71 chiều, có tên rõ ràng để SHAP đọc được):
  - color:   mean/std RGB + mean/std Lab           (12)
  - hist:    histogram H (16 bin) + S (8 bin)      (24)
  - texture: GLCM contrast/dissimilarity/homogeneity/energy/correlation/ASM x 2 khoảng cách (12)
             + LBP uniform histogram (10)
  - shape:   tỉ lệ diện tích lá / nền, độ đặc, tỉ lệ khung bao, chu vi chuẩn hoá... (13)

Đầu ra: features/durian/<ds>/handcrafted_{train,val,test}.npz  (X, y, paths, feature_names)

Chạy: python src/extract_handcrafted.py --config configs/durian_leaf_task.yaml
"""
from __future__ import annotations

import argparse
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from durian_common import (  # noqa: E402
    add_common_args, ensure_dirs, get_logger, load_config, paths_for, resolve, resolve_mode,
)
from durian_data import get_splits  # noqa: E402

WORK_SIZE = 256          # ảnh được resize về cạnh này để tính feature cho nhanh & ổn định
GLCM_DISTANCES = (1, 3)
GLCM_PROPS = ("contrast", "dissimilarity", "homogeneity", "energy", "correlation", "ASM")
LBP_P, LBP_R = 8, 1


def feature_names() -> List[str]:
    names: List[str] = []
    for c in ("R", "G", "B"):
        names += [f"color_mean_{c}", f"color_std_{c}"]
    for c in ("L", "a", "b"):
        names += [f"color_mean_lab{c}", f"color_std_lab{c}"]
    names += [f"hist_H_{i:02d}" for i in range(16)]
    names += [f"hist_S_{i:02d}" for i in range(8)]
    for d in GLCM_DISTANCES:
        names += [f"glcm_{p}_d{d}" for p in GLCM_PROPS]
    names += [f"lbp_{i}" for i in range(LBP_P + 2)]
    names += [
        "shape_leaf_area_ratio", "shape_solidity", "shape_extent", "shape_aspect_ratio",
        "shape_perimeter_norm", "shape_circularity", "shape_eccentricity",
        "shape_n_components", "shape_lesion_area_ratio", "shape_lesion_count",
        "shape_edge_density", "shape_bg_mean_v", "shape_leaf_mean_v",
    ]
    return names


def compute_one(image_path: str) -> np.ndarray:
    """Tính vector handcrafted cho 1 ảnh. Chạy trong process con nên import cục bộ."""
    import cv2
    from skimage.feature import graycomatrix, graycoprops, local_binary_pattern

    p = str(resolve(image_path))
    bgr = cv2.imread(p, cv2.IMREAD_COLOR)
    if bgr is None:
        return np.zeros(len(feature_names()), dtype=np.float32)
    h, w = bgr.shape[:2]
    s = WORK_SIZE / max(h, w)
    if s < 1:
        bgr = cv2.resize(bgr, (max(1, int(w * s)), max(1, int(h * s))), interpolation=cv2.INTER_AREA)

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    feats: List[float] = []
    for c in range(3):
        feats += [float(rgb[..., c].mean()), float(rgb[..., c].std())]
    for c in range(3):
        feats += [float(lab[..., c].mean() / 255.0), float(lab[..., c].std() / 255.0)]

    hist_h = cv2.calcHist([hsv], [0], None, [16], [0, 180]).ravel()
    hist_s = cv2.calcHist([hsv], [1], None, [8], [0, 256]).ravel()
    feats += list(hist_h / max(1.0, hist_h.sum()))
    feats += list(hist_s / max(1.0, hist_s.sum()))

    q = (gray // 8).astype(np.uint8)  # 32 mức -> GLCM nhẹ hơn
    glcm = graycomatrix(q, distances=list(GLCM_DISTANCES), angles=[0, np.pi / 4, np.pi / 2, 3 * np.pi / 4],
                        levels=32, symmetric=True, normed=True)
    for di in range(len(GLCM_DISTANCES)):
        for prop in GLCM_PROPS:
            feats.append(float(graycoprops(glcm, prop)[di].mean()))

    lbp = local_binary_pattern(gray, LBP_P, LBP_R, method="uniform")
    lbp_hist, _ = np.histogram(lbp, bins=LBP_P + 2, range=(0, LBP_P + 2), density=True)
    feats += [float(v) for v in lbp_hist]

    # ---- shape: tách lá khỏi nền bằng ngưỡng Otsu trên kênh a* (lá xanh lệch a* thấp)
    a_ch = lab[..., 1].astype(np.uint8)
    _t, mask = cv2.threshold(a_ch, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    total = float(mask.size)
    area_ratio = float((mask > 0).sum()) / total

    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    solidity = extent = aspect = perim_norm = circularity = ecc = 0.0
    if cnts:
        c = max(cnts, key=cv2.contourArea)
        area = float(cv2.contourArea(c))
        perim = float(cv2.arcLength(c, True))
        hull_area = float(cv2.contourArea(cv2.convexHull(c))) or 1.0
        x, y, bw, bh = cv2.boundingRect(c)
        solidity = area / hull_area
        extent = area / float(max(1, bw * bh))
        aspect = float(bw) / float(max(1, bh))
        perim_norm = perim / float(np.sqrt(total))
        circularity = 4 * np.pi * area / max(1e-6, perim ** 2)
        if len(c) >= 5:
            (_cx, _cy), (ma, mi), _ang = cv2.fitEllipse(c)
            ma, mi = max(ma, mi), min(ma, mi)
            ecc = float(np.sqrt(max(0.0, 1 - (mi / max(1e-6, ma)) ** 2)))
    n_comp = int(cv2.connectedComponents(mask)[0]) - 1

    # vùng tổn thương: điểm nằm trong lá nhưng lệch màu (V cao / H ngoài dải xanh)
    leaf = mask > 0
    hh, vv = hsv[..., 0].astype(np.float32), hsv[..., 2].astype(np.float32)
    lesion = leaf & (((hh < 20) | (hh > 45)) | (vv > 200))
    lesion_u8 = (lesion * 255).astype(np.uint8)
    lesion_u8 = cv2.morphologyEx(lesion_u8, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    lesion_ratio = float(lesion_u8.sum() > 0 and (lesion_u8 > 0).sum()) / max(1.0, float(leaf.sum()))
    lcnts, _ = cv2.findContours(lesion_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    lesion_count = float(sum(1 for c in lcnts if cv2.contourArea(c) > 20))

    edges = cv2.Canny(gray, 80, 160)
    edge_density = float((edges > 0).sum()) / total
    bg_mean_v = float(vv[~leaf].mean()) / 255.0 if (~leaf).any() else 0.0
    leaf_mean_v = float(vv[leaf].mean()) / 255.0 if leaf.any() else 0.0

    feats += [area_ratio, solidity, extent, aspect, perim_norm, circularity, ecc,
              float(n_comp), lesion_ratio, lesion_count, edge_density, bg_mean_v, leaf_mean_v]

    v = np.asarray(feats, dtype=np.float32)
    return np.nan_to_num(v, nan=0.0, posinf=0.0, neginf=0.0)


def main() -> None:
    ap = argparse.ArgumentParser(description="Sinh handcrafted features cho ảnh lá sầu riêng")
    add_common_args(ap)
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    cfg = load_config(args.config)
    mode = resolve_mode(args, cfg)
    P = paths_for(cfg)
    ensure_dirs(P["features"], P["logs"])
    log = get_logger("extract_handcrafted", P["logs"] / "extract_handcrafted.log")

    names = feature_names()
    by_split, labels = get_splits(cfg, train_small=mode.train_small, seed=42)
    log.info("Handcrafted: %d chiều | workers=%d | mode=%s", len(names), args.workers, mode.name)

    if mode.dry_run:
        log.info("[dry-run] kiểm tra 1 ảnh mẫu ...")
        v = compute_one(by_split["train"][0]["image_path"])
        log.info("[dry-run] vector dài %d (khớp tên: %s)", len(v), len(v) == len(names))
        return

    lab2idx = {lb: i for i, lb in enumerate(labels)}
    for split in ("train", "val", "test"):
        rows = by_split[split]
        paths = [r["image_path"] for r in rows]
        with ProcessPoolExecutor(max_workers=args.workers) as ex:
            X = np.stack(list(ex.map(compute_one, paths, chunksize=16)))
        y = np.array([lab2idx[r["label"]] for r in rows], dtype=np.int64)
        out = P["features"] / f"handcrafted_{split}.npz"
        np.savez_compressed(out, X=X.astype(np.float32), y=y, paths=np.array(paths),
                            labels=np.array(labels), feature_names=np.array(names))
        log.info("%-5s | X=%s -> %s", split, X.shape, out.name)


if __name__ == "__main__":
    main()
