# Hướng dẫn sinh viên

Đọc bài báo trước, rồi chạy lại thí nghiệm theo thứ tự dưới đây. Mục tiêu là hiểu **ba số chính** và **bốn bảng** (Table 3–6), không phải đạt điểm cao hơn bài.

Bài này đánh giá pipeline trên một bộ dữ liệu công khai của Việt Nam. Không phải bài SOTA, không phải kiến trúc mới.

## 1. Đọc gì trong bài

1. **Abstract + Section I** — câu hỏi nghiên cứu: backbone đóng băng có giữ được hiệu năng trong miền và giảm chi phí cập nhật đầu phân loại không.
2. **Section III.A (dataset)** — 2595 ảnh, 6 lớp, split 1814 / 387 / 394. Dùng đúng split này.
3. **Table 3–6** — bốn bảng chính; ý nghĩa từng bảng ở mục 4 dưới đây.
4. **Section V, đoạn Scope / Limitations** — những gì bài **không** khẳng định (chuyển vườn, UAV, sâu hại, SOTA).

## 2. Chuẩn bị

1. Cài Python 3 (khuyến nghị 3.10+). GPU không bắt buộc; máy thí nghiệm của bài là RTX 3090.
2. Clone repo này. Script nằm ở `src/` (kèm `requirements.txt`). Thứ tự lệnh: `src/NOTES.md`.
3. Khi `requirements.txt` có mặt: tạo môi trường ảo và `pip install -r requirements.txt`.
4. Tải dataset Mendeley **version 3** (không phải version 4 nếu listing rỗng):
   - Bản ghi: DOI [10.17632/pxzvksbwnj.4](https://doi.org/10.17632/pxzvksbwnj.4)
   - File: `Durian_Leaf_Disease.zip`
   - Kiểm SHA-256: `5e271cfd89e8a738ef760aa48bb1081e68e0f6f2c53e689566a7920a09be8dce`
5. Giải nén vào `data/`. Giữ nguyên split train / val / test của tác giả dữ liệu.
6. (Chỉ khi làm Table 5) Tải bộ Kaggle *Durian Leaf Disease Dataset* (cthng123). Bài chỉ dùng 4 lớp chung; bỏ lớp `ALLOCARIDARA_ATTACK`.

Ghi công dữ liệu: Nguyen et al., *Data in Brief* 61:111845, 2025, DOI [10.1016/j.dib.2025.111845](https://doi.org/10.1016/j.dib.2025.111845). Giấy phép ảnh: CC BY 4.0.

## 3. Chạy gì, theo thứ tự

Khi script đã có, làm lần lượt. Đối chiếu file JSON/CSV trong `results/` sau mỗi bước — đó là nguồn số của bài.

| Bước | Việc làm | Số cần thấy | File đối chiếu |
|---|---|---|---|
| A | Fine-tune MobileNetV2, seed 42, 43, 44; chọn seed theo **validation** macro-F1 | mean ± std test = **0.9088 ± 0.0119**; seed 42 ≈ 0.9255 | `teacher_summary.json` |
| B | Đóng băng backbone, lấy embedding 1280 chiều, fit logistic regression | test macro-F1 = **0.9235** | `model_comparison.csv` |
| C | (Tùy chọn) Fit các đầu khác: cây quyết định, concat 71 đặc trưng thủ công | Table 3: concat LR 0.9207; chỉ thủ công tốt nhất 0.8151 | `hybrid_metrics.json` |
| D | (Tùy chọn) McNemar + bootstrap teacher vs hybrid concat | p ≈ 0.7266; CI chứa 0 | `teacher_vs_hybrid_stats.json` |
| E | Zero-shot trên bộ Kaggle, 4 lớp chung, không retrain | teacher OOD = **0.3782** | `cross_dataset_eval.json` |
| F | (Tùy chọn) Đo thời gian fit đầu và kích thước file | Table 6: LR 1.28 s, 45.1×, 0.089 MB | `deployment_tradeoff.csv` |

Lệnh: xem `src/NOTES.md`. Đừng bịa tên script.

Ba số **bắt buộc** để nói là đã tái lập phần chính của bài: **0.9088 ± 0.0119**, **0.9235**, **0.3782**.

## 4. Ý nghĩa từng bảng

### Table 3 — So sánh bốn họ mô hình

Cùng một tập test 394 ảnh. Mỗi họ lấy cấu hình tốt nhất theo **validation**, rồi mới đọc test.

| Họ | Cách hiểu đơn giản | Số test macro-F1 |
|---|---|---|
| End-to-end CNN | Fine-tune cả mạng (teacher) | 0.9255 (một seed); trung bình 3 seed là 0.9088 |
| Frozen embedding | Chỉ học một lớp tuyến tính trên vector 1280 chiều | **0.9235** |
| Embedding + đặc trưng thủ công | Ghép thêm 71 số (màu, histogram, texture, hình dạng) | 0.9207 — **không** hơn embedding đơn |
| Chỉ đặc trưng thủ công | Không dùng CNN | 0.8151 — thấp hơn khoảng 0.11 |

Bảng này **không** nói hybrid thắng teacher. Nó nói: trên bộ này, vector CNN đã đủ; 71 số thủ công không cạnh tranh một mình và không giúp khi ghép vào.

### Table 4 — Độ ổn định và kiểm định

| Dòng | Ý nghĩa |
|---|---|
| 0.9088 ± 0.0119 | Cùng split, đổi seed khởi tạo (42–44) |
| 0.8990 ± 0.0103 | Đổi tập huấn luyện (5 lần xáo trộn train+val), **test giữ nguyên** 394 ảnh |
| McNemar p = 0.7266 | Teacher và hybrid concat chỉ lệch 8 / 394 ảnh; không đủ để nói khác nhau ở α = 0.05 |
| Bootstrap CI [−0.0094, +0.0198] | Khoảng tin cậy của hiệu macro-F1 chứa 0 |

Đọc đúng: *trên giao thức test cố định này, không phát hiện khác biệt*. Không suy ra hai mô hình luôn tương đương mọi lúc, mọi vườn.

### Table 5 — Ra ngoài miền (một bộ độc lập)

Cùng backbone, **không huấn luyện lại**, chỉ 4 lớp có ở cả hai bộ (Algal, Blight, Healthy, Phomopsis).

| Cột | Ý nghĩa |
|---|---|
| In-domain 0.9889 | Cùng 4 lớp, vẫn trên test của bộ nguồn (273 ảnh) — bài toán dễ hơn Table 3 vì đã bỏ 2 lớp khó |
| OOD **0.3782** | Cùng 4 lớp, trên 707 ảnh bộ kia |
| Frozen head 0.3811 | Đầu đóng băng cũng rơi tương tự |

*Restricted* = chỉ argmax trên 4 lớp chung. *Unrestricted* = argmax trên đủ 6 lớp nguồn; 91 ảnh bị gán vào lớp không tồn tại ở bộ đích.

Kết luận hợp lệ: cấu hình đã đánh giá **chưa** được xác nhận cho chuyển vườn nếu không thích nghi. Một bộ đích, không phải định luật tổng quát.

### Table 6 — Chi phí cập nhật, không phải tốc độ suy luận

| Cột | Đọc thế nào |
|---|---|
| Test macro-F1 0.9235 / retained 99.78% | Đầu LR gần teacher ở seed đã chọn |
| Train (s) 1.28 vs 57.7; 45.1× | Thời gian **fit lại đầu** trên embedding đã cache, so với fine-tune cả mạng trên máy thí nghiệm |
| Head-only vs end-to-end (ms) | Head-only bỏ qua backbone; end-to-end **vẫn** chạy backbone ≈ 8.3–8.4 ms |
| Size 0.089 MB vs 8.748 MB | File đầu vs checkpoint cả mạng |

Lợi ích đo được là **chi phí cập nhật đầu**, không phải latency khi dự đoán một ảnh. Số thời gian phụ thuộc máy; RTX 3090 là máy thí nghiệm, không phải yêu cầu.

## 5. Những điều không làm / không viết trong báo cáo bài tập

- Không đổi split để “đẹp số”.
- Không gọi 0.9235 là SOTA hay “tốt hơn teacher” — trung bình 3 seed của teacher là 0.9088; 0.9235 là một seed / một đầu.
- Không kết luận mô hình dùng được mọi vườn sau khi thấy 0.3782.
- Không commit ảnh, file `*.pt`, hay cache embedding lên Git.

## 6. Nếu số của bạn lệch

1. Đúng version 3 và SHA-256 chưa.
2. Đúng 3 seed 42 / 43 / 44 và metric **macro-F1** (không nhầm accuracy).
3. Seed backbone được chọn trên **val**, không trên test.
4. OOD: đúng 4 lớp, quy tắc restricted, không retrain.
5. So với JSON đã có trong `results/`, không chỉ với số đã làm tròn trong PDF.

Lệch nhỏ ở chữ số cuối có thể do phiên bản PyTorch / CUDA. Lệch lớn (ví dụ OOD > 0.7 hoặc teacher < 0.85) thường là sai split, sai version dữ liệu, hoặc sai tập lớp.
