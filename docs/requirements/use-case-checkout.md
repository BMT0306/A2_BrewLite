# ĐẶC TẢ CHI TIẾT USE-CASE TRỌNG TÂM: ĐẶT VÀ THANH TOÁN ĐƠN HÀNG
## DỰ ÁN HỆ THỐNG ĐẶT VÀ THANH TOÁN ĐỒ UỐNG BREWLITE – ASSIGNMENT 2

---

### THÔNG TIN HỒ SƠ THỰC HIỆN (PHÂN CÔNG CHẤM TIẾN ĐỘ TUẦN 9)
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Họ và tên sinh viên** | **Nguyễn Thành Tài** |
| **Mã thành viên** | **Phụ 3** |
| **Vai trò chuyên môn** | **QA & Traceability Lead** |
| **Tài liệu phụ trách** | `docs/requirements/use-case-checkout.md` & `docs/diagrams/usecase-checkout.puml` / `.svg` |
| **Phần code phụ trách** | Lập trình API Health Check giám sát hệ thống (`apps/api/src/modules/health/health.controller.ts`), Bộ kiểm thử tích hợp tự động (`tests/integration-checkout.spec.ts`) & Unit Tests (`*.spec.ts`) |
| **Mục đích in ấn Tuần 9** | Xuất trình đặc tả ca sử dụng hạt nhân quan trọng nhất của hệ thống, làm căn cứ thẩm định thiết kế và kiểm thử tự động |

---

## 1. THÔNG TIN ĐẶC TẢ CA SỬ DỤNG (USE-CASE SPECIFICATION)

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use-case** | **UC-Checkout: Đặt và Thanh toán Đơn hàng (Place and Pay Order)** |
| **Mã Use-case** | `UC-05` (tương ứng use-case trọng tâm theo đề bài) |
| **Ánh xạ Yêu cầu** | `FR-03` (Giỏ hàng), `FR-04` (Xác thực JWT), `FR-05` (Đặt đơn & Trừ kho), `FR-06` (Thanh toán & Idempotency), `NFR-02` (Bảo mật giao dịch) |
| **Tác nhân chính (Primary Actor)** | **Khách hàng (Customer)** |
| **Tác nhân phụ (Supporting Actor)** | **Không có tác nhân bên ngoài; hệ thống sử dụng PaymentsService để mô phỏng xử lý thanh toán.** |
| **Sự kiện kích hoạt (Trigger)** | Khách hàng nhấn nút **"Đặt đơn & Thanh toán"** trên giao diện màn hình Checkout (`apps/web/src/app/checkout/page.tsx`). |

---

## 2. SƠ ĐỒ USE-CASE PHẠM VI THANH TOÁN (FOCUSED USE-CASE DIAGRAM)

![Focused Use-Case Checkout](../diagrams/usecase-checkout.svg)

---

## 3. ĐIỀU KIỆN TRƯỚC VÀ SAU (PRE-CONDITIONS & POST-CONDITIONS)

### 3.1. Tiền điều kiện (Pre-conditions)
1. Giỏ hàng của khách hàng trên ứng dụng có ít nhất 1 sản phẩm hợp lệ (`cartItems.length > 0`).
2. Khách hàng đã hoàn tất đăng nhập và trình duyệt đang lưu giữ `accessToken` (JWT) còn hiệu lực trong `localStorage`.
3. Khách hàng đã chọn phương thức thanh toán: Ví điện tử (`WALLET`) hoặc Thẻ ngân hàng (`CARD`).
4. Các sản phẩm trong giỏ hàng tồn tại và đang ở trạng thái có thể bán (`isAvailable = true`) với số lượng tồn kho đáp ứng yêu cầu đặt hàng.

### 3.2. Hậu điều kiện (Post-conditions)

- **Trường hợp Giao dịch Thành công:**
  - Một bản ghi `Order` được tạo và hoàn tất với trạng thái `status = CONFIRMED`.
  - Các bản ghi `OrderItem` được lưu tương ứng với từng sản phẩm, size và danh sách topping đã chọn.
  - Một bản ghi `Payment` được tạo với trạng thái `status = PAID`, kèm `transactionRef` và thời điểm `paidAt`.
  - Số lượng tồn kho `stockQuantity` của các sản phẩm tương ứng được trừ theo số lượng đã đặt.
  - `Idempotency-Key` của giao dịch được lưu trong bản ghi `Payment` để ngăn xử lý thanh toán trùng lặp.
  - Giỏ hàng của khách hàng trên máy khách được làm sạch hoàn toàn bằng `clearCart()`.

- **Trường hợp Thanh toán Thất bại:**
  - Một bản ghi `Payment` được tạo với trạng thái `status = FAILED`.
  - Bản ghi `Order` được cập nhật thành trạng thái `status = PAYMENT_FAILED`.
  - Số lượng tồn kho `stockQuantity` của các sản phẩm đã được trừ khi tạo đơn được hoàn trả lại thông qua giao dịch bù trừ.
  - API trả về HTTP `402 Payment Required`.
  - Giỏ hàng không được xác nhận là đã thanh toán thành công và không thực hiện chuyển hướng tới `/orders` như trường hợp thành công.

---

## 4. CÁC LUỒNG SỰ KIỆN CHI TIẾT (FLOWS OF EVENTS)

### 4.1. Luồng chính thành công (Main Success Scenario)

```text
[Customer] ---> [Next.js UI] ---> [NestJS API] ---> [PostgreSQL DB]
                                      |
                                      └──> [PaymentsService]
```

1. **Khách hàng** truy cập màn hình Thanh toán (`/checkout`), xem lại danh sách món, tổng tiền tạm tính, chọn phương thức thanh toán (`WALLET` hoặc `CARD`) và nhấn **"Đặt đơn & Thanh toán"**.
2. **Next.js UI** kích hoạt hiệu ứng tải, kiểm tra tính hợp lệ của Token JWT và tự động sinh một chuỗi định danh duy nhất `Idempotency-Key` (chuẩn UUIDv4 ngẫu nhiên).
3. **Next.js UI** gửi yêu cầu `POST /orders` tới **NestJS API** với Header `Authorization: Bearer <JWT>` và Payload chứa danh sách `items: [{ productId, size, toppings, quantity }]` cùng `note`.
4. **NestJS API** xác thực danh tính qua `JwtAuthGuard`, kiểm tra dữ liệu qua `ValidationPipe`, và khởi tạo một giao dịch CSDL tương tác (`prisma.$transaction`).
5. **NestJS API** truy vấn các bản ghi sản phẩm trong bảng `Product` để đối chiếu tồn kho:
   - Toàn bộ sản phẩm đều tồn tại, đang được phép bán (`isAvailable = true`) và còn đủ số lượng (`stockQuantity >= quantity`).
6. **NestJS API** thực hiện trừ tồn kho (`stockQuantity = stockQuantity - quantity`), tạo bản ghi `Order` với trạng thái `PENDING`, chèn các bản ghi con `OrderItem`, và cam kết giao dịch (`COMMIT TRANSACTION`).
7. **NestJS API** trả về mã HTTP `201 Created` kèm thông tin đơn hàng (`orderId`, `totalAmount`, `status: "PENDING"`).
8. **Next.js UI** nhận phản hồi tạo đơn thành công, tiếp tục tự động gửi yêu cầu `POST /payments` kèm Header `Authorization` và Header `Idempotency-Key: <UUID>` cùng Body `{ orderId, method }`.
9. **NestJS API** kiểm tra `Idempotency-Key` trong bảng `Payment`. Nếu khóa chưa tồn tại, hệ thống tiếp tục xử lý yêu cầu thanh toán.

10. **PaymentsService** xử lý thanh toán mô phỏng dựa trên phương thức `WALLET` hoặc `CARD`. Với trường hợp thành công, hệ thống tạo bản ghi `Payment` với `status = PAID`, `amount`, `transactionRef` và `paidAt`.

11. **NestJS API** cập nhật trạng thái `Order` từ `PENDING` sang `CONFIRMED` trong transaction.

12. **NestJS API** trả về HTTP `200 OK` với thông tin thanh toán và đơn hàng.

13. **Next.js UI** nhận kết quả thành công, gọi `clearCart()` để xóa giỏ hàng và chuyển hướng khách hàng tới `/orders`.

---

### 4.2. Luồng thay thế (Alternative Flows)

#### AF-01: Gửi lặp lại yêu cầu thanh toán do mạng chập chờn (Idempotency Handling)

- **Điều kiện phát sinh:** Khách hàng gửi lại yêu cầu `POST /payments` với cùng Header `Idempotency-Key` do mạng chập chờn hoặc Client thực hiện retry.

- **Luồng xử lý:**
  1. **NestJS API** nhận yêu cầu và kiểm tra `Idempotency-Key` trong bảng `Payment`.
  2. Hệ thống phát hiện `Idempotency-Key` đã tồn tại trong cơ sở dữ liệu.
  3. **PaymentsService** không tạo thêm bản ghi `Payment` và không xử lý thanh toán lần thứ hai.
  4. Hệ thống lấy lại thông tin giao dịch đã lưu trước đó và trả về HTTP `200 OK`, kèm `isIdempotentReplay = true`.
  5. **Next.js UI** nhận kết quả giao dịch đã được xử lý trước đó và hiển thị trạng thái đơn hàng tương ứng, đảm bảo giao dịch không bị xử lý thanh toán hai lần.

---

### 4.3. Các luồng ngoại lệ (Exception Flows)

#### EF-01: Khách hàng chưa đăng nhập hoặc phiên làm việc (JWT) hết hạn

- **Phát hiện:** `JwtAuthGuard` tại **NestJS API** không tìm thấy Header `Authorization` hoặc Token JWT không hợp lệ/hết hạn.

- **Xử lý:**
  1. **NestJS API** từ chối yêu cầu và phản hồi HTTP `401 Unauthorized`.
  2. **Next.js UI** nhận lỗi `401` và yêu cầu khách hàng đăng nhập trước khi tiếp tục thực hiện Checkout.

#### EF-02: Sản phẩm hết hàng tại thời điểm tạo đơn

- **Phát hiện:** Trong quá trình kiểm tra tồn kho, **NestJS API** phát hiện một hoặc nhiều sản phẩm không đáp ứng điều kiện đặt hàng, chẳng hạn `stockQuantity < quantity` hoặc `isAvailable = false`.

- **Xử lý:**
  1. **NestJS API** hủy giao dịch tạo đơn (`prisma.$transaction`) để không ghi nhận đơn hàng và không thực hiện thay đổi tồn kho không hợp lệ.
  2. API phản hồi HTTP `409 Conflict` kèm thông báo: *"Một hoặc nhiều món trong đơn hàng đã hết tồn kho, vui lòng kiểm tra lại giỏ hàng."*
  3. **Next.js UI** hiển thị thông báo lỗi và yêu cầu khách hàng kiểm tra, điều chỉnh lại số lượng sản phẩm trong giỏ hàng.

#### EF-03: Thanh toán mô phỏng bị thất bại (Payment Failure)

- **Điều kiện phát sinh:** Yêu cầu `POST /payments` được gửi với `simulateFailure = true`, mô phỏng trường hợp thanh toán không thành công.

- **Xử lý:**
  1. **PaymentsService** thực hiện một transaction bù trừ (`prisma.$transaction`):
     - Tạo bản ghi `Payment` với `status = FAILED`.
     - Cập nhật `Order` thành `status = PAYMENT_FAILED`.
     - Hoàn trả số lượng tồn kho bằng cách tăng `stockQuantity` tương ứng với số lượng sản phẩm trong đơn hàng.
  2. **NestJS API** phản hồi HTTP `402 Payment Required` cùng thông tin đơn hàng và trạng thái thanh toán thất bại.
  3. **Next.js UI** hiển thị thông báo thanh toán không thành công và cho phép khách hàng thực hiện lại thao tác thanh toán theo luồng phù hợp.
