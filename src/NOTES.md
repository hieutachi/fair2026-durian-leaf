# How to run these scripts

The original training code is a small set of coupled modules. This folder copies them with **relative paths** (`../data`, `../results` via the package root). It does not rewrite the training loop.

Run every command from the **package root** (`fair2026-durian-repro/`), not from `src/`.

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Then follow `data/README.md` so images exist at the paths in `data/splits/*.csv`.

## Order

| Step | Command | Needs | Writes |
|---|---|---|---|
| 0 | `python src/prepare_splits.py` | unzipped Mendeley v3 under `data/durian/mendeley_pxzvksbwnj/raw_files/` | `images/`, refreshes split/labels |
| 1 | `python src/train_teacher.py --config configs/durian_leaf_task.yaml` | images + official split | `models/teacher_seed*.pt`, `results/teacher_summary.json` |
| 2 | `python src/extract_embeddings.py --config configs/durian_leaf_task.yaml` | best teacher checkpoint | `features/teacher_embeddings_{train,val,test}.npz` |
| 3a | `python src/extract_handcrafted.py --config configs/durian_leaf_task.yaml` | images (optional; needed for concat / classical) | `features/handcrafted_*.npz` |
| 3 | `python src/fit_heads.py --config configs/durian_leaf_task.yaml` | embeddings (+ handcrafted if present) | `models/hybrid_*.pkl`, `results/hybrid_metrics.json` |
| 4 | `python src/compare_models.py --config configs/durian_leaf_task.yaml` | teacher + hybrid metrics | `results/model_comparison.csv` |
| 5 | `python src/stats.py --config configs/durian_leaf_task.yaml` | teacher per-image preds + hybrid pickle | `results/teacher_vs_hybrid_stats.json` |
| 6 | `python src/eval_ood.py --config configs/durian_leaf_task.yaml` | teacher ckpt + Kaggle images + embeddings | `results/cross_dataset_eval.json` |
| 7 | `python src/deployment_tradeoff.py --config configs/durian_leaf_task.yaml` | embeddings + teacher metrics | `results/deployment_tradeoff.csv` |

Smoke test without training: add `--mode dry-run`. Short train: `--mode train-small`.

`src/stats.py --skip-paired` skips the per-seed embedding re-extract (McNemar + bootstrap still run).

## What is runnable vs artefact-only

**Runnable** (after images and `pip install`): `train_teacher.py`, `extract_embeddings.py`, `extract_handcrafted.py`, `fit_heads.py`, `compare_models.py`, `stats.py`, `eval_ood.py`, `deployment_tradeoff.py`, `prepare_splits.py`. Shared helpers: `durian_common.py`, `durian_data.py`, `durian_metrics.py`.

**Artefact-only in this pack** (verify paper numbers without re-running): the JSON/CSV already in `results/`. 5-fold / training-perturbation training (`train_teacher_cv.py` in the source project) is **not** copied; use `results/teacher_cv_summary.json` for the published 0.8990 ± 0.0103.

`fit_heads.py` is the linear-probe / hybrid-head script (original name `train_hybrid.py`). `eval_ood.py` is the zero-shot cross-dataset script. `stats.py` is McNemar + bootstrap.

## Path notes

- `durian_common.PROJECT_ROOT` is the parent of `src/` (this package root).
- Config: `configs/durian_leaf_task.yaml` → `data/splits/...`, `results/`, `models/`, `features/`.
- Split CSVs still point at `data/durian/<dataset_id>/images/...`. Do not flatten those image paths unless you also rewrite the CSV.
- `src/prepare_splits.py` still reads `config/durian_dataset_choice.json` to know which unzipped folder to scan.

Expected published numbers after a full re-run (rounding): teacher test macro-F1 **0.9088 ± 0.0119**; frozen embedding logistic regression **0.9235**; OOD teacher (4 shared classes, restricted) **0.3782**. Small last-digit drift from library or GPU noise is possible; compare against the shipped JSON before concluding a mismatch.
