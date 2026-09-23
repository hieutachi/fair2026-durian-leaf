# Tài liệu đọc hiểu bài báo — bản web tự học

Tài liệu tiếng Việt giúp sinh viên **tự đọc hiểu và thuyết trình lại** bài báo FAIR 2026:

> Ta Chi Hieu, Vu Thi Thanh Nhai. *Cost-Aware Durian Leaf Disease Classification for Vietnamese
> Orchards: A Frozen-Backbone Pipeline with Statistical Validation.* FAIR 2026, Thuy Loi University.

Đây **không** phải bản tóm tắt. Đây là một lộ trình tự học có tương tác: phiếu dự đoán trước khi đọc,
giải nghĩa từng bảng, các "cái bẫy" dễ hiểu sai, bộ câu hỏi tự kiểm tra có đáp án, kịch bản phòng thủ
trước hội đồng, và kịch bản thuyết trình 15 phút.

**Mở `index.html` trực tiếp bằng trình duyệt** — một file duy nhất, không cần server, không cần mạng,
chạy được trên điện thoại. Tiến độ (ô nhập dự đoán, checkbox) lưu trong `localStorage` của trình duyệt.

## Có gì bên trong

| Mục | Nội dung |
|---|---|
| 0 | Lộ trình 5 buổi tự học |
| 1 | Bài báo **khẳng định** gì và **không** khẳng định gì |
| 2 | Phiếu dự đoán 8 câu — viết trước khi mở bài báo, có đáp án để đối chiếu |
| 3 | Dữ liệu, giao thức thí nghiệm, sơ đồ pipeline và ranh giới train/val/test |
| 4–7 | Đọc Table 3, 4, 5, 6 — mỗi bảng kèm một "cái bẫy" dễ nói sai |
| 8 | Phân tích lỗi, Table S1, và ba can thiệp thất bại |
| 9 | SHAP và Grad-CAM: vì sao vẫn giữ nhánh đặc trưng thủ công |
| 10 | 8 hạn chế, kèm câu hỏi hội đồng có thể đặt và cách trả lời |
| 11 | 24 câu tự kiểm tra (nhớ / hiểu / vận dụng / phản biện), đáp án ẩn |
| 12 | 14 câu hỏi hội đồng: trả lời sai vs trả lời đúng |
| 13 | Kịch bản thuyết trình 15 phút, 10 slide, có mốc thời gian |
| 14 | Từ điển thuật ngữ Việt – Anh |
| 15 | Checklist 16 mục sẵn sàng thuyết trình |
| 16 | Artefact của từng con số, và trích dẫn bắt buộc |

Sáu sơ đồ vẽ tay bằng SVG (pipeline, ranh giới dữ liệu, luồng suy luận thống kê, không gian nhãn
khi chuyển miền, đồ thị nhầm lẫn giữa các lớp hoại tử, và hai con đường chi phí) nằm xen trong
các mục 3, 5, 6, 7 và 8.

## Quan hệ với các tài liệu khác trong repo

| Tài liệu | Vai trò |
|---|---|
| `docs/STUDENT_GUIDE.md` | **Chạy lại** thí nghiệm: cài đặt, tải dữ liệu, thứ tự lệnh, đối chiếu số |
| `docs/reading-guide/index.html` | **Đọc hiểu và thuyết trình**: tài liệu này |
| `docs/REVIEWER.md` | Đối chiếu nhanh từng con số với trường JSON/CSV |
| `paper/ABSTRACT.md` | Một trang: 5 đóng góp và 5 số kèm cách đọc hedged |

Đọc `STUDENT_GUIDE.md` trước nếu muốn tự chạy ra số; đọc tài liệu này để hiểu và trình bày số đó.

## Số liệu

Mọi con số trong tài liệu đều đọc từ artefact trong `results/` của repo này, cùng nguồn với bài báo.
Không có số nào nhập tay. Ba số chính: teacher **0.9088 ± 0.0119**, frozen LR **0.9235**,
zero-shot OOD **0.3782**.

## Dựng lại `index.html`

`index.html` là **sản phẩm sinh ra**, không sửa tay. Nguồn là một Canvas của Qoder IDE:

```
source/doc-hieu-paper-durian-fair2026.canvas.tsx   # nguồn duy nhất (React TSX)
build_html.js                                      # bộ dựng
index.html                                         # kết quả — commit để đọc không cần IDE
```

```bash
node build_html.js
```

Bộ dựng dùng `esbuild-wasm` đi kèm Qoder IDE để biên dịch TSX, thực thi component với một stub của
`qoder/canvas`, rồi render cây JSX ra HTML kèm CSS/JS vanilla. Nếu IDE cài ở chỗ khác:

```bash
ESBUILD_WASM_DIR=/path/to/esbuild-wasm node build_html.js
```

Repo này cố tình **không** có `package.json`: bộ dựng chỉ cần Node và `esbuild-wasm`, không cần
`npm install`.

## Hai điểm chưa nhất quán trong bài báo

Tài liệu ghi rõ hai điểm này ở mục 12 (câu D13, D14) để người đọc không bị bất ngờ:

1. **Cách gọi 0.8990 ± 0.0103.** Bản nộp cuối viết đúng là "five training-set perturbations on a
   fixed test set". Một số bản thảo sớm hơn vẫn còn cụm "5-fold cross-validation". Đây **không** phải
   cross-validation theo nghĩa thông thường: 5 fold rút từ pool train+val (2201 ảnh) nhưng mọi mô hình
   đều đánh giá trên cùng 394 ảnh test cố định.
2. **Dòng "handcrafted only" trong Table 3.** Caption nói chọn theo validation macro-F1, nhưng dòng đó
   báo cáo XGBoost (val 0.8258) trong khi LightGBM có val cao hơn (0.8270). Không đổi kết luận nào
   của bài — cả hai đều kém cấu hình frozen-embedding tốt nhất khoảng 0.11 — nhưng nên sửa ở bản
   camera-ready.

## Giấy phép

Ảnh và nhãn thuộc bộ dữ liệu Mendeley `pxzvksbwnj`, **CC BY 4.0**, phải ghi công Nguyen et al.
Tài liệu này không sao chép toàn văn bài báo hay bài *Data in Brief*; nó trích dẫn số liệu và
giải thích cách đọc.
