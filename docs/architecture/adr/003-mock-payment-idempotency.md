# BẢN GHI QUYẾT ĐỊNH KIẾN TRÚC: ADR-003 - XỬ LÝ THANH TOÁN IDEMPOTENCY VÀ CƠ CHẾ BÙ TRỪ KHI THẤT BẠI
## ARCHITECTURE DECISION RECORD 003: MOCK PAYMENT IDEMPOTENCY & COMPENSATING TRANSACTIONS

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
Trong các giao dịch thanh toán trực tuyến qua thiết bị di động, đường truyền mạng thường xuyên gặp sự cố mất gói, chậm phản hồi hoặc ngắt kết nối đột ngột. Khi người dùng nhấn nút "Thanh toán", nếu ứng dụng không phản hồi ngay trong 1-2 giây, tâm lý khách hàng sẽ nhấn liên tục nhiều lần.

Nếu Backend API xử lý mỗi request như một giao dịch mới:
- Tài khoản khách hàng có thể bị trừ tiền nhiều lần cho cùng một mã đơn hàng.
- Trạng thái đơn hàng bị ghi đè không kiểm soát.

Ngược lại, nếu quá trình trừ tồn kho đã hoàn tất ở bước tạo đơn nhưng bước thanh toán lại thất bại (ví dụ: số dư ví không đủ, thẻ bị từ chối), nếu hệ thống không có cơ chế hoàn trả tồn kho thì cửa hàng sẽ bị thất thoát sản phẩm ảo (kho hiển thị hết hàng nhưng thực tế không ai mua).

## 2. QUYẾT ĐỊNH KIẾN TRÚC (DECISION)
Nhóm quyết định triển khai cơ chế **Idempotency** kết hợp với **Giao dịch Bù trừ (Compensating Transaction)** trong module `PaymentsModule`:

1. **Ràng buộc Idempotency-Key ở tầng CSDL:**
   - Trong bảng `Payment`, bổ sung cột `idempotencyKey String @unique`.
   - Máy khách (Next.js UI) khi bắt đầu quy trình thanh toán phải tự sinh một chuỗi UUIDv4 duy nhất gắn vào Header `Idempotency-Key` của request `POST /payments`.
2. **Quy trình xử lý Idempotency tại Backend:**
   - Khi nhận request, API kiểm tra trong CSDL: Nếu đã có bản ghi `Payment` với `idempotencyKey` tương ứng, API bỏ qua việc gọi cổng thanh toán và trả về ngay kết quả giao dịch đã lưu trước đó kèm mã HTTP 200.
   - Nếu `idempotencyKey` mới: Tiếp tục tạo bản ghi `Payment (status = PENDING)` và tiến hành xử lý thanh toán.
3. **Cơ chế Giao dịch Bù trừ (Compensating Transaction) khi thanh toán thất bại:**
   - Khi dịch vụ thanh toán mô phỏng phản hồi thất bại (hoặc khi bật cờ mô phỏng thất bại để kiểm thử):
     - Cập nhật bản ghi `Payment` sang trạng thái `FAILED`.
     - Cập nhật bản ghi `Order` sang trạng thái `PAYMENT_FAILED`.
     - Tự động kích hoạt câu lệnh `UPDATE products SET stockQuantity = stockQuantity + quantity` để hoàn trả toàn bộ số lượng đồ uống về kho hàng.
     - Trả về mã lỗi HTTP `402 Payment Required` kèm thông báo cho phép khách hàng chọn phương thức khác để thử lại.

## 3. CÁC PHƯƠNG ÁN ĐÃ XEM XÉT (CONSIDERED OPTIONS)
1. **Phương án A: Khóa nút bấm ở Frontend (Disable button on click):**
   - *Đánh giá:* Chỉ giải quyết được phía UI cơ bản; không thể bảo vệ hệ thống nếu người dùng mở 2 tab hoặc gửi request trực tiếp bằng Postman / curl. Cần bổ sung bảo vệ ở Backend.
2. **Phương án B: Sử dụng Redis Distributed Lock:**
   - *Đánh giá:* Hiệu quả cao nhưng làm tăng độ phức tạp hạ tầng (cần thêm container Redis trong đồ án).
3. **Phương án C: Tận dụng ràng buộc UNIQUE của PostgreSQL (Được lựa chọn):**
   - *Đánh giá:* Tận dụng sức mạnh sẵn có của PostgreSQL và Prisma ORM; không phát sinh dịch vụ phụ trợ; tốc độ truy vấn trên chỉ mục Unique cực nhanh; hoàn toàn đáp ứng chuẩn đề bài.

## 4. HỆ QUẢ VÀ TÁC ĐỘNG (CONSEQUENCES)
- **Tích cực:** Ngăn chặn triệt để 100% rủi ro trừ tiền trùng lặp; bảo toàn tuyệt đối số lượng tồn kho khi thanh toán lỗi; tạo điều kiện thuận lợi để sinh viên demo trực quan cả 2 kịch bản Thành công và Thất bại trước hội đồng nghiệm thu.
- **Tiêu cực:** Yêu cầu Client phải tuân thủ nghiêm ngặt việc sinh và gửi `Idempotency-Key` trên HTTP Header.
