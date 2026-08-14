# Data

Images are **not** included. Download them locally; do not commit raw photos, zip archives, or embedding caches.

## Main dataset (in-domain)

*A Durian Leaf Image Dataset of Common Diseases in Vietnam for Agricultural Diagnosis*, Mendeley Data, **version 3**, licence **CC BY 4.0**.

| Item | Value |
|---|---|
| Record | `pxzvksbwnj` |
| Version used | **3** (`Durian_Leaf_Disease.zip`, 334 201 946 bytes) |
| SHA-256 | `5e271cfd89e8a738ef760aa48bb1081e68e0f6f2c53e689566a7920a09be8dce` |
| Record DOI | [10.17632/pxzvksbwnj.4](https://doi.org/10.17632/pxzvksbwnj.4) |
| Version-3 DOI | [10.17632/pxzvksbwnj.3](https://doi.org/10.17632/pxzvksbwnj.3) |
| Data article | Nguyen et al., *Data in Brief* 61:111845, 2025. [10.1016/j.dib.2025.111845](https://doi.org/10.1016/j.dib.2025.111845) |
| Official split | 1814 train / 387 val / 394 test (2595 images, 6 classes) |

The landing page may show version 4. Version 4 file listings have been empty at the public API. The paper downloads **version 3** and cites the record by DOI.

### Download and layout

1. From the Mendeley record, download **version 3** `Durian_Leaf_Disease.zip`. Check the SHA-256 above.
2. Unzip into `data/durian/mendeley_pxzvksbwnj/raw_files/` (from the package root).
3. Materialise the official split (keeps the authors' train/val/test folders; does not re-split):

```bash
python src/prepare_splits.py
```

Expected images after that step: `data/durian/mendeley_pxzvksbwnj/images/` with names matching `data/splits/durian_mendeley_pxzvksbwnj_split.csv` (paths start with `data/durian/mendeley_pxzvksbwnj/images/`).

This folder already ships:

- `data/splits/durian_mendeley_pxzvksbwnj_split.csv` — official 2595-row split
- `data/labels.csv` — `image_path,class_name` for the same images

## Out-of-domain check (optional)

*Durian Leaf Disease Dataset* (Kaggle, `cthng123`). Used only for the zero-shot shared-class check. Keep only the four overlapping classes; drop `ALLOCARIDARA_ATTACK`.

After download and `python src/prepare_splits.py --dataset-id kaggle_durian_leaf_disease_dataset --no-config`, images should sit at the paths in `data/splits/durian_kaggle_durian_leaf_disease_dataset_split.csv`.

## Cite the data

Cite the Mendeley record by DOI and the *Data in Brief* article separately. Images remain CC BY 4.0 (Nguyen et al.); do not relicense them.
