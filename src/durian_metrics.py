"""Bộ chỉ số dùng chung: macro-F1, balanced accuracy, per-class P/R/F1, confusion matrix."""
from __future__ import annotations

from typing import Any, Dict, List, Sequence

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)


def evaluate(y_true: Sequence[int], y_pred: Sequence[int], labels: List[str]) -> Dict[str, Any]:
    idx = list(range(len(labels)))
    p, r, f1, sup = precision_recall_fscore_support(y_true, y_pred, labels=idx, zero_division=0)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_f1": float(f1_score(y_true, y_pred, labels=idx, average="macro", zero_division=0)),
        "weighted_f1": float(f1_score(y_true, y_pred, labels=idx, average="weighted", zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "per_class": {
            labels[i]: {"precision": float(p[i]), "recall": float(r[i]),
                        "f1": float(f1[i]), "support": int(sup[i])}
            for i in idx
        },
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=idx).tolist(),
        "labels": labels,
    }


def summarize(values: Sequence[float]) -> Dict[str, float]:
    a = np.asarray(list(values), dtype=float)
    return {"mean": float(a.mean()), "std": float(a.std(ddof=0)),
            "min": float(a.min()), "max": float(a.max())}


def fmt(m: Dict[str, Any]) -> str:
    return (f"macroF1={m['macro_f1']:.4f} balAcc={m['balanced_accuracy']:.4f} "
            f"acc={m['accuracy']:.4f}")
