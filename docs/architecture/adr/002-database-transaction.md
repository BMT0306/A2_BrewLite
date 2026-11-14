# BẢN GHI QUYẾT ĐỊNH KIẾN TRÚC: ADR-002 - SỬ DỤNG DATABASE TRANSACTION TRONG TẠO ĐƠN VÀ TRỪ TỒN KHO
## ARCHITECTURE DECISION RECORD 002: INTERACTIVE DATABASE TRANSACTIONS

---

### THÔNG TIN HỒ SƠ THỰC HIỆN
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Họ và tên** | **Trần Lê Minh Tâm** |
| **Mã thành viên** | **Chính 1** |
| **Vai trò** | **System Architect & DevOps Lead** |
| **Trạng thái quyết định** | **ĐÃ CHẤP NHẬN (ACCEPTED)** |
| **Ngày quyết định** | 2026-10-28 |

---

## 1. BỐI CẢNH VÀ VẤN ĐỀ ĐẶT RA (CONTEXT)
Trong các khung giờ cao điểm, hệ thống cửa hàng đồ uống phải đối mặt với tình huống nhiều khách hàng cùng lúc chọn mua một sản phẩm có số lượng tồn kho hữu hạn (ví dụ: món Trà Oolong sen chỉ còn 1 ly duy nhất). 

Nếu hệ thống thực hiện kiểm tra tồn kho bằng lệnh `SELECT` thông thường, sau đó thực hiện lệnh `UPDATE` độc lập ở tầng ứng dụng mà không nằm trong một Transaction có cơ chế khóa:
- Hai luồng xử lý đồng thời (Concurrent Threads) đều đọc thấy `stockQuantity = 1`.
- Cả hai luồng đều cho rằng còn đủ hàng và thực hiện trừ kho.
- Kết quả: `stockQuantity` bị âm (`-1`), hai đơn hàng cùng được tạo thành công cho chỉ 1 ly nước thực tế. Đây là lỗi Race Condition kinh điển trong các ứng dụng thương mại điện tử.

## 2. QUYẾT ĐỊNH KIẾN TRÚC (DECISION)
Nhóm quyết định áp dụng mô hình **Interactive Database Transaction** được cung cấp bởi Prisma ORM (`prisma.$transaction(async (tx) => { ... })`) kết hợp cơ chế kiểm tra điều kiện tồn kho nguyên tử ở cấp độ CSDL:
1. Mọi thao tác kiểm tra tồn kho, trừ `stockQuantity`, tạo bản ghi `Order` và các bản ghi `OrderItem` bắt buộc phải nằm trọn vẹn trong cùng một Transaction duy nhất.
2. Tại bước kiểm tra tồn kho bên trong transaction:
   - Nếu phát hiện `product.stockQuantity < requestedQuantity` hoặc `product.isAvailable == false`, tiến trình lập tức ném ra ngoại lệ `ConflictException` (HTTP 409).
   - Cơ chế của Prisma sẽ tự động kích hoạt `ROLLBACK TRANSACTION`, hoàn tác toàn bộ các thao tác đã thực hiện và đảm bảo dữ liệu không bị thay đổi.
3. Chỉ khi toàn bộ sản phẩm trong giỏ hàng đều thỏa mãn điều kiện tồn kho, lệnh trừ kho và tạo đơn mới được thực thi và cam kết (`COMMIT`).

## 3. CÁC PHƯƠNG ÁN ĐÃ XEM XÉT (CONSIDERED OPTIONS)
1. **Phương án A: Không dùng Transaction (Kiểm tra và trừ kho rời rạc):**
   - *Đánh giá:* Cực kỳ rủi ro, chắc chắn xảy ra lỗi số lượng tồn kho âm khi có tải đồng thời. Bị loại bỏ.
2. **Phương án B: Sử dụng Prisma Batch Transaction (`prisma.$transaction([op1, op2])`):**
   - *Đánh giá:* Chỉ hỗ trợ các lệnh tĩnh thực thi đồng thời, không cho phép đọc kết quả của bước kiểm tra tồn kho để quyết định có chạy tiếp bước tạo đơn hay không. Bị loại bỏ.
3. **Phương án C: Sử dụng Prisma Interactive Transaction (Được lựa chọn):**
   - *Đánh giá:* Cho phép truyền hàm callback bất đồng bộ, đọc dữ liệu tức thời trong transaction, thực thi logic điều kiện và tự động rollback nếu có ngoại lệ. Hoàn toàn phù hợp với yêu cầu bài toán.

## 4. HỆ QUẢ VÀ TÁC ĐỘNG (CONSEQUENCES)
- **Tích cực:** Đảm bảo 100% tính toán vẹn dữ liệu tồn kho theo tiêu chuẩn ACID; loại bỏ hoàn toàn hiện tượng bán vượt số lượng (Overselling); khớp chính xác với luồng xử lý đã mô hình hóa trong `docs/diagrams/sequence-checkout.svg`.
- **Tiêu cực:** Transaction giữ kết nối CSDL lâu hơn một chút so với truy vấn đơn lẻ; cần thiết lập thời gian timeout hợp lý (mặc định 5000ms) để tránh làm nghẽn connection pool.
