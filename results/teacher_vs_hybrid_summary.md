### Kiểm định thống kê: teacher vs hybrid

Cùng tập test 394 ảnh, α = 0.05.

- Teacher `mobilenet_v2_seed42`: macro-F1 = 0.9255
- Hybrid `concat__logistic_regression`: macro-F1 = 0.9207
- **McNemar exact (toàn bộ)**: b = 5, c = 3, p = 0.7266 → **KHÔNG có khác biệt có ý nghĩa thống kê** ở α = 0.05.
- **Bootstrap 2000 lần**: Δmacro-F1 (teacher − hybrid) = +0.0050, CI95 = [-0.0094, +0.0198] (chứa 0).
- **McNemar theo lớp (one-vs-rest)**: không lớp nào khác biệt có ý nghĩa, kể cả Blight và Colletotrichum.

Paired test trên 3 seed (mỗi seed ghép teacher với logistic head trên embedding của chính seed đó): teacher 0.9088 vs hybrid 0.9191, Δ = -0.0104; paired t-test p = 0.1830.

_Chỉ có 3 cặp (bằng số seed) nên power của paired test rất thấp; bằng chứng chính nên dựa vào McNemar và bootstrap trên 394 ảnh test._

**Kết luận**: hybrid không thay thế teacher về độ chính xác cũng không thua kém có ý nghĩa; giá trị của hybrid nằm ở chi phí huấn luyện/triển khai (xem bảng deployment trade-off).
