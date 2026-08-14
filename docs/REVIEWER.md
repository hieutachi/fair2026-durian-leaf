# Reviewer note: artefact ↔ số trong bài

Mọi số chính của bản thảo được làm tròn từ JSON/CSV dưới đây (dataset id `mendeley_pxzvksbwnj`). Đường dẫn tương đối từ gốc repo tái lập, khi `results/` đã được thêm trong cùng folder.

Dataset thí nghiệm: Mendeley **version 3**, CC BY 4.0. DOI bản ghi [10.17632/pxzvksbwnj.4](https://doi.org/10.17632/pxzvksbwnj.4); bài mô tả [10.1016/j.dib.2025.111845](https://doi.org/10.1016/j.dib.2025.111845). Version 4 từng không chứa archive ở API root; bài tải version 3.

## Ba số chính

| Số trong bài | Trường / hàng | Artefact |
|---|---|---|
| Teacher **0.9088 ± 0.0119** | `mean_macro_f1_test` = 0.908788…, `std_macro_f1_test` = 0.011858…; seed 42/43/44 = 0.9255 / 0.8999 / 0.9009 | `results/teacher_summary.json` |
| Frozen LR **0.9235** | `Hybrid_embedding`, `logistic_regression`, `embedding`, 1280 dim, test macro-F1 | `results/model_comparison.csv` (cùng số trong `hybrid_metrics.json`, `deployment_tradeoff.csv`) |
| OOD teacher **0.3782** | `teacher_out_of_domain.macro_f1` = 0.378209…; 4 lớp chung; không retrain | `results/cross_dataset_eval.json` |

## Table 3 — Main performance

| Ô bài | Nguồn |
|---|---|
| CNN 0.9255 / bal. acc. 0.9261 / val 0.9458 | `teacher_summary.json` → `best_seed` 42, `best_seed_test` |
| Frozen embedding LR 0.9235 / 0.9241 / val 0.9445 | `model_comparison.csv` hàng embedding + logistic_regression |
| Concat LR 0.9207 / 0.921 / val 0.945 | cùng file, hàng concat + logistic_regression |
| Handcrafted XGBoost 0.8151 / 0.8156 / val 0.8258 | cùng file, hàng handcrafted + xgboost |
| Lưới đủ 4 đầu × 3 feature set | `hybrid_metrics.json` |

Teacher trung bình 3 seed (0.9088) **không** đứng trong cột “Test macro-F1” của Table 3; cột đó là cấu hình chọn theo val (seed 42). Trung bình nằm ở Table 4.

## Table 4 — Statistical validation

| Ô bài | Nguồn |
|---|---|
| 0.9088 ± 0.0119 | `teacher_summary.json` |
| 0.8990 ± 0.0103 (range 0.8886–0.9172) | `teacher_cv_summary.json` (`test_macro_f1`; 5 perturbation trên pool 2201, test 394 cố định) |
| Δ summaries −0.0098 | hiệu hai mean trên |
| 8 / 394 discordant (5 vs 3) | `teacher_vs_hybrid_stats.json` → `mcnemar_overall` |
| McNemar p = 0.7266 | cùng file, `p_value` = 0.7265625 (abstract làm tròn 0.727) |
| Bootstrap Δ +0.0050, 95% CI [−0.0094, +0.0198] | `bootstrap_macro_f1_diff` |
| Seed-paired t p = 0.1830 | `paired_per_seed.paired_t_test` (n = 3; power thấp) |
| Tóm tắt chữ | `teacher_vs_hybrid_summary.md` |

Teacher so sánh với hybrid **concat** logistic regression (0.9207), không với embedding-only 0.9235.

## Table 5 — Out-of-domain

Artefact: `cross_dataset_eval.json`. Đích: Kaggle `kaggle_durian_leaf_disease_dataset`. `retrained: false`.

| Ô bài | Trường |
|---|---|
| Teacher in-domain 0.9889 (4 lớp, 273 ảnh) | `teacher_in_domain.macro_f1` |
| Teacher OOD **0.3782** (707 ảnh) | `teacher_out_of_domain.macro_f1` |
| Δ −0.6107; bal. acc. 0.4199 | `delta_macro_f1_teacher`; `teacher_out_of_domain.balanced_accuracy` |
| Frozen head 0.9850 → 0.3811 | `frozen_head_in_domain` / `frozen_head_out_of_domain` |
| Unrestricted accuracy 0.4158; 91 escape (1 Colletotrichum, 90 Rhizoctonia) | `teacher_out_of_domain_unrestricted` |

Lớp đích bị loại: `ALLOCARIDARA_ATTACK`. Đây là **một** kiểm tra zero-shot, không phải benchmark đa site.

## Table 6 — Update cost

Artefact: `deployment_tradeoff.csv` / `deployment_tradeoff.json`. Máy đo: RTX 3090 (tham chiếu, không bắt buộc để tái lập độ chính xác).

| Ô bài | Hàng |
|---|---|
| Teacher 0.9255, 57.7 s, 8.291 ms, 8.748 MB | `mobilenet_v2 (teacher, end-to-end)` |
| Frozen LR **0.9235**, 99.78%, 1.28 s, **45.1×**, head 0.103 ms, e2e 8.394 ms, **0.089 MB** | `logistic_regression on frozen embedding` |
| Linear SVC 0.9179, 99.18%, 0.44 s, 131.1× | `linear_svm on frozen embedding` |

Cột end-to-end gồm forward backbone. Bài không khẳng định giảm latency suy luận.

Gói nhỏ này chỉ kèm các bảng/JSON ở `results/` (teacher, so sánh, trade-off, OOD, McNemar, CV summary). Các file `hybrid_metrics`, `dataset_citation`, `error_analysis`, `shap_top_features`, `edge_profile` và biến thể weighted/focal/augmented **không** copy vào đây.

## Các số khác trong main text (đối chiếu nhanh)

| Số | Artefact |
|---|---|
| Dataset 2595 / 6 lớp; DOI, CC BY 4.0; version_used = 3; SHA-256 archive | `dataset_citation.json` |
| 28 lỗi test; 26 (92.9%) dính Blight / Colletotrichum; F1 0.8333 / 0.8421 | `error_analysis_weak_classes.json`; confusion trong `teacher_summary.json` |
| SHAP nhánh thủ công 0.8% | `shap_top_features.json` |
| Latency / kích thước backbone (Section IV.E) | `edge_profile.json` |
| Weighted / focal / augmented không nâng mean macro-F1 | `teacher_weighted_summary.json`, `teacher_focal_summary.json`, `teacher_augmented_summary.json` |

## Cách đọc claim

- Đóng góp là **đánh giá giao thức và chi phí cập nhật** trên một bộ Việt Nam, không phải SOTA.
- “Không phát hiện khác biệt” (McNemar / bootstrap) ≠ chứng minh tương đương tổng quát.
- 0.3782 là biên chuyển vườn trên **một** bộ đích.
- Tái lập độ chính xác không cần GPU 3090; số thời gian/latency trong Table 6 thì phụ thuộc máy đo.
