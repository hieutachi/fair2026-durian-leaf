# Phân loại bệnh lá sầu riêng: đánh giá pipeline frozen-backbone (FAIR 2026)

Gói tái lập thí nghiệm cho bài báo gửi FAIR 2026. Đây **không** phải công bố kiến trúc mới hay kết quả SOTA. Bài đánh giá một pipeline backbone đóng băng trên một bộ ảnh lá sầu riêng Việt Nam, có kiểm định thống kê và đo chi phí cập nhật đầu phân loại.

**Bài báo.** Ta Chi Hieu, Vu Thi Thanh Nhai. *Cost-Aware Durian Leaf Disease Classification for Vietnamese Orchards: A Frozen-Backbone Pipeline with Statistical Validation.* FAIR 2026, Thuy Loi University.

## Bài báo nói gì

Chẩn đoán bệnh lá sầu riêng ở vườn nhỏ vẫn phụ thuộc quan sát bằng mắt. Một công cụ sàng lọc thực tế cần vừa đủ chính xác, vừa rẻ khi cập nhật nhãn hoặc chuyển vườn. Trên bộ 2595 ảnh / 6 lớp (split chính thức của tác giả dữ liệu), MobileNetV2 fine-tune đạt **0.9088 ± 0.0119** macro-F1 trên tập test (3 seed). Đầu logistic regression trên embedding đóng băng đạt **0.9235** (giữ 99.78% macro-F1 của teacher ở seed được chọn theo validation) và bước fit lại đầu trên embedding đã cache nhanh hơn rõ rệt; độ trễ suy luận end-to-end **không** giảm vì backbone vẫn chạy. Kiểm tra zero-shot trên một bộ Việt Nam độc lập, chỉ 4 lớp chung, teacher rơi xuống **0.3782**. Pipeline **chưa** được xác nhận cho chuyển vườn nếu không thích nghi. Phần lớn lỗi còn lại nằm ở hai lớp Blight và Colletotrichum.

## Dataset

Thí nghiệm dùng bộ *A Durian Leaf Image Dataset of Common Diseases in Vietnam for Agricultural Diagnosis*, Mendeley Data **version 3**, giấy phép **CC BY 4.0**.

| Mục | Giá trị |
|---|---|
| Bản ghi Mendeley | `pxzvksbwnj` |
| Phiên bản dùng để tải | **3** (`Durian_Leaf_Disease.zip`, 334 201 946 byte) |
| SHA-256 | `5e271cfd89e8a738ef760aa48bb1081e68e0f6f2c53e689566a7920a09be8dce` |
| DOI bản ghi (landing mới nhất) | [10.17632/pxzvksbwnj.4](https://doi.org/10.17632/pxzvksbwnj.4) |
| DOI phiên bản 3 | [10.17632/pxzvksbwnj.3](https://doi.org/10.17632/pxzvksbwnj.3) |
| Bài mô tả dữ liệu | Nguyen et al., *Data in Brief* 61:111845, 2025. DOI: [10.1016/j.dib.2025.111845](https://doi.org/10.1016/j.dib.2025.111845) |
| Quy mô / split | 2595 ảnh, 6 lớp; train 1814 / val 387 / test 394 (split của tác giả dữ liệu, giữ nguyên) |

Trang Mendeley có thể trỏ tới version 4, nhưng listing file của version 4 từng rỗng ở API. Thí nghiệm trong bài **tải version 3** và đối chiếu số ảnh với bài *Data in Brief*. Trích dẫn **DOI**, không cần URL phụ.

Bộ độc lập dùng cho kiểm tra ngoài miền (Table 5) là *Durian Leaf Disease Dataset* (Kaggle, cthng123), chỉ 4 lớp giao nhau; lớp sâu hại `ALLOCARIDARA_ATTACK` bị loại.

## Cấu trúc thư mục

```
fair2026-durian-repro/
├── README.md
├── CITATION.cff
├── requirements.txt          # được thêm trong cùng folder
├── data/                     # tải cục bộ; không commit ảnh thô
├── src/                      # script huấn luyện / đánh giá (được thêm trong cùng folder)
├── results/                  # bảng nhỏ + JSON đã công bố
├── paper/                    # bản thảo / hình (nếu kèm)
└── docs/
    ├── STUDENT_GUIDE.md
    └── REVIEWER.md
```

Script huấn luyện nằm ở `src/`; bảng số đã công bố nằm ở `results/`.

## Tái lập ba số chính

| Số trong bài | Ý nghĩa | Artefact để đối chiếu |
|---|---|---|
| **0.9088 ± 0.0119** | Teacher MobileNetV2, macro-F1 test, mean ± std trên seed 42 / 43 / 44 | `results/teacher_summary.json` (`mean_macro_f1_test`, `std_macro_f1_test`) |
| **0.9235** | Logistic regression trên embedding 1280 chiều (backbone đóng băng, seed chọn theo val) | `results/model_comparison.csv` (hàng `embedding` + `logistic_regression`) |
| **0.3782** | Teacher zero-shot, 4 lớp chung, quy tắc *restricted* | `results/cross_dataset_eval.json` (`teacher_out_of_domain.macro_f1`) |

Chạy từ gốc folder này:

```bash
pip install -r requirements.txt
# tải ảnh: xem data/README.md
python src/train_teacher.py --config configs/durian_leaf_task.yaml
python src/extract_embeddings.py --config configs/durian_leaf_task.yaml
python src/fit_heads.py --config configs/durian_leaf_task.yaml
python src/stats.py --config configs/durian_leaf_task.yaml
python src/eval_ood.py --config configs/durian_leaf_task.yaml
```

Thứ tự đủ và ghi chú path: [`src/NOTES.md`](src/NOTES.md). Tải dữ liệu: [`data/README.md`](data/README.md). Tóm tắt đóng góp + 5 số: [`paper/ABSTRACT.md`](paper/ABSTRACT.md). Ánh xạ artefact ↔ bảng: [`docs/REVIEWER.md`](docs/REVIEWER.md). Hướng dẫn sinh viên: [`docs/STUDENT_GUIDE.md`](docs/STUDENT_GUIDE.md).

Số công bố đã làm tròn. Chênh lệch nhỏ do phiên bản thư viện hoặc nhiễu GPU có thể xảy ra; đối chiếu JSON đã đính kèm trước khi kết luận lệch.

## Yêu cầu máy

- **Python 3** (khuyến nghị 3.10+).
- Thư viện: xem `requirements.txt` khi file đó có trong folder này (PyTorch, torchvision, scikit-learn, …).
- **GPU tùy chọn.** Máy thí nghiệm của bài là NVIDIA GeForce RTX 3090; không bắt buộc. CPU chạy được, chậm hơn rõ khi fine-tune teacher.
- Ổ đĩa: khoảng 320 MB archive version 3, cộng dung lượng giải nén; bộ OOD (nếu chạy Table 5) thêm vài trăm MB.
- RAM: đủ để fine-tune MobileNetV2, batch 32, ảnh 224×224.

## Giấy phép

| Thành phần | Giấy phép | Ghi chú |
|---|---|---|
| Ảnh và nhãn Mendeley `pxzvksbwnj` | **CC BY 4.0** (tác giả dữ liệu) | Phải ghi công Nguyen et al.; không đổi giấy phép khi tái phân phối ảnh |
| Bài *Data in Brief* | Bản quyền tạp chí | Trích dẫn DOI; không sao chép toàn văn bài báo dữ liệu |
| Bộ Kaggle (OOD) | Theo điều khoản Kaggle / người gửi | Chỉ dùng để tái lập Table 5 |
| Mã nguồn trong repo này | Mã kèm bài nghiên cứu | Xem file `LICENSE` nếu có; mặc định dùng để tái lập, không chuyển quyền dữ liệu |

Dữ liệu và mã **tách giấy phép**. Commit code và bảng kết quả nhỏ; **không** commit ảnh thô, checkpoint `*.pt`, hay cache embedding.

## English (short)

This repository reproduces a FAIR 2026 evaluation paper: a frozen-backbone pipeline on a Vietnamese durian leaf dataset, not a new architecture and not a SOTA claim. Main public numbers: teacher MobileNetV2 test macro-F1 **0.9088 ± 0.0119** (3 seeds); frozen embedding logistic regression **0.9235**; zero-shot OOD on 4 shared classes **0.3782**. Data: Mendeley `pxzvksbwnj` **version 3**, CC BY 4.0; cite [10.17632/pxzvksbwnj.4](https://doi.org/10.17632/pxzvksbwnj.4) and the data article [10.1016/j.dib.2025.111845](https://doi.org/10.1016/j.dib.2025.111845). GPU is optional (RTX 3090 was the experimental machine). Run from this folder: `pip install -r requirements.txt`, then `src/train_teacher.py`, `src/fit_heads.py`, `src/stats.py`, `src/eval_ood.py` (see `src/NOTES.md`). See `docs/REVIEWER.md` for artefact-to-table mapping.
