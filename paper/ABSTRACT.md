# Abstract (one page)

**Paper.** Ta Chi Hieu, Vu Thi Thanh Nhai. *Cost-Aware Durian Leaf Disease Classification for Vietnamese Orchards: A Frozen-Backbone Pipeline with Statistical Validation.* FAIR 2026.

This is a **pipeline and deployment-evaluation** contribution on one Vietnamese public dataset, not a new architecture and not a state-of-the-art claim.

## Contributions (from the paper)

1. A reproducible benchmark on the author-defined split of a 2595-image, 6-class durian leaf dataset (mean ± std over 3 seeds, plus 5 training-set perturbations on a fixed held-out test set).
2. A three-way comparison of end-to-end fine-tuning, frozen-embedding heads, and classical handcrafted-feature models under one protocol.
3. Statistical validation of a selected concatenated hybrid against the teacher (McNemar exact, per-class one-vs-rest, bootstrap CI) rather than a bare point-estimate gap.
4. A measured update-cost analysis (head-refit time on cached embeddings, serialised head size, end-to-end latency). The measured benefit is update cost, not inference latency.
5. An error analysis: residual mistakes concentrate in Blight and Colletotrichum; class weighting, focal loss and targeted augmentation do not resolve that confusion under the tested protocol.

## Five headline numbers (hedged)

Numbers are rounded from `results/`. They describe this dataset and this test protocol.

| # | Number | Reading |
|---|---|---|
| 1 | **0.9088 ± 0.0119** | Fine-tuned MobileNetV2 test macro-F1, mean ± std over seeds 42 / 43 / 44. |
| 2 | **0.8990 ± 0.0103** | Same held-out test set after 5 training-set perturbations (5-fold on the train+val pool). Additional stability evidence within the fixed-test protocol, not a second independent test set. |
| 3 | McNemar **p = 0.727**; bootstrap 95% CI of the macro-F1 difference **[−0.0094, +0.0198]** | Selected concatenated hybrid vs teacher on the shared 394-image test set. Within this protocol, **no difference is detected**; this does **not** establish general equivalence. |
| 4 | Frozen embedding linear head retains **99.78%** of teacher macro-F1; head-refit **45.1×** faster on cached embeddings; serialised head **0.089 MB** | Operational trade-off. End-to-end inference latency is **unchanged** because the frozen backbone still runs. |
| 5 | Zero-shot teacher macro-F1 **0.9889 → 0.3782** | Restricted to 4 shared classes on one independent Vietnamese dataset; the frozen head drops similarly. The pipeline is **not** validated for cross-orchard transfer without adaptation. |

A further in-domain limit: **92.9%** of remaining teacher errors involve Blight and Colletotrichum, which have visually overlapping symptoms.
