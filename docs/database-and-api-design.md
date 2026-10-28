# ĐẶC TẢ CƠ SỞ DỮ LIỆU VÀ THIẾT KẾ GIAO DIỆN LẬP TRÌNH (DATABASE & REST API SPECIFICATION)
## DỰ ÁN HỆ THỐNG ĐẶT VÀ THANH TOÁN ĐỒ UỐNG BREWLITE – ASSIGNMENT 2

---

### THÔNG TIN HỒ SƠ THỰC HIỆN (PHÂN CÔNG CHẤM TIẾN ĐỘ TUẦN 9)
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Mã thành viên** | **Chính 2** |
| **Vai trò chuyên môn** | **Backend & Database Lead** |
| **Tài liệu phụ trách** | `docs/database-and-api-design.md`, `docs/diagrams/class-domain.puml` / `.svg`, `docs/diagrams/activity-end-to-end.puml` / `.svg` |
| **Phần code phụ trách** | Hiện thực toàn bộ `apps/api/prisma/schema.prisma`, `OrdersModule`, `PaymentsModule` (Transaction & Idempotency) |
| **Mục đích in ấn Tuần 9** | Xuất trình hồ sơ thiết kế chi tiết 7 thực thể cơ sở dữ liệu và hợp đồng giao tiếp REST API chuẩn mực |

---

## 1. THIẾT KẾ CƠ SỞ DỮ LIỆU QUAN HỆ (RELATIONAL DATABASE DESIGN)

Hệ thống cơ sở dữ liệu BrewLite được thiết kế khớp 100% với Sơ đồ lớp miền nghiệp vụ (`docs/diagrams/class-domain.svg`) và lược đồ Prisma (`apps/api/prisma/schema.prisma`), bao gồm **7 bảng thực thể** và **5 kiểu liệt kê (Enums)**:

### 1.1. Danh mục các Kiểu Liệt kê (Enums)
1. **`UserRole`**: `CUSTOMER` (Khách hàng), `STAFF` (Nhân viên quầy pha chế), `MANAGER` (Quản lý cửa hàng).
2. **`OrderStatus`**: `PENDING` (Chờ thanh toán), `CONFIRMED` (Đã thanh toán & Tiếp nhận), `PREPARING` (Đang pha chế), `READY` (Đã xong, chờ lấy), `COMPLETED` (Hoàn tất giao nước), `CANCELLED` (Đã hủy), `PAYMENT_FAILED` (Thanh toán lỗi).
3. **`PaymentMethod`**: `WALLET` (Ví điện tử), `CARD` (Thẻ ngân hàng / Visa / Master).
4. **`PaymentStatus`**: `PENDING` (Đang xử lý), `PAID` (Đã thanh toán), `FAILED` (Thất bại), `REFUNDED` (Đã hoàn tiền).
5. **`LoyaltyTxType`**: `EARN` (Tích lũy điểm), `REDEEM` (Tiêu điểm thưởng).

---

### 1.2. Chi tiết 7 Bảng Thực thể (Table Schemas)

#### Bảng 1: `users` (Quản lý thông tin tài khoản & định danh)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `String` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Khóa chính định danh tài khoản người dùng |
| `email` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL` | Địa chỉ email dùng để đăng nhập hệ thống |
| `passwordHash` | `VARCHAR(255)` | `NOT NULL` | Chuỗi mật khẩu băm bảo mật bằng `bcrypt` |
| `fullName` | `VARCHAR(150)` | `NOT NULL` | Họ và tên hiển thị của người dùng |
| `phone` | `VARCHAR(20)` | `NULLABLE` | Số điện thoại liên hệ nhận đồ uống |
| `role` | `UserRole` | `NOT NULL`, Default: `CUSTOMER` | Phân quyền vai trò trong hệ thống |
| `loyaltyPoints` | `INTEGER` | `NOT NULL`, Default: `0` | Số điểm thưởng tích lũy của thành viên |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Thời điểm tạo tài khoản |

#### Bảng 2: `products` (Danh mục sản phẩm, tùy biến & tồn kho)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `String` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Khóa chính sản phẩm |
| `name` | `VARCHAR(200)` | `NOT NULL` | Tên đồ uống (VD: Trà Đào Cam Sả) |
| `description` | `TEXT` | `NOT NULL` | Mô tả chi tiết hương vị sản phẩm |
| `category` | `VARCHAR(100)` | `NOT NULL` | Phân loại (Coffee, Tea, MilkTea, Freeze) |
| `basePrice` | `DECIMAL(10, 2)` | `NOT NULL` | Giá niêm yết cơ bản (Size S) |
| `imageUrl` | `VARCHAR(500)` | `NOT NULL` | Đường dẫn ảnh minh họa đồ uống |
| `sizeOptions` | `JSONB` | `NOT NULL` | Cấu hình kích cỡ kèm giá cộng thêm (`[{size: "M", price: 6000}]`) |
| `toppingOptions`| `JSONB` | `NOT NULL` | Danh mục topping tùy chọn (`[{name: "Trân châu", price: 5000}]`) |
| `stockQuantity` | `INTEGER` | `NOT NULL`, Default: `0` | Số lượng tồn kho sẵn sàng phục vụ |
| `isAvailable` | `BOOLEAN` | `NOT NULL`, Default: `true` | Trạng thái đang kinh doanh hay ngừng bán |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Thời điểm khởi tạo món trên hệ thống |

#### Bảng 3: `promotions` (Chương trình khuyến mãi - Sẵn sàng mở rộng)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `String` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Khóa chính chương trình khuyến mãi |
| `code` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL` | Mã voucher nhập trên ứng dụng (VD: `WELCOME10`) |
| `description` | `TEXT` | `NOT NULL` | Thể lệ và quyền lợi chiết khấu |
| `discountPercent`| `DECIMAL(5, 2)` | `NOT NULL` | Tỷ lệ giảm giá (%) |
| `maxDiscountAmount`| `DECIMAL(10, 2)`| `NOT NULL` | Mức giảm tối đa cho mỗi đơn hàng (VNĐ) |
| `validFrom` | `TIMESTAMPTZ` | `NOT NULL` | Thời điểm bắt đầu có hiệu lực |
| `validUntil` | `TIMESTAMPTZ` | `NOT NULL` | Thời điểm kết thúc hiệu lực |
| `isActive` | `BOOLEAN` | `NOT NULL`, Default: `true` | Bật/tắt kích hoạt mã |

#### Bảng 4: `orders` (Quản lý đơn hàng đặt món)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `String` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Khóa chính đơn hàng |
| `orderCode` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL` | Mã đơn hàng hiển thị cho khách (VD: `BL-20261028-001`) |
| `userId` | `UUID` / `String` | `NOT NULL`, `FOREIGN KEY -> users(id)` | Người đặt đơn |
| `promotionId` | `UUID` / `String` | `NULLABLE`, `FOREIGN KEY -> promotions(id)` | Mã khuyến mãi đã áp dụng (nếu có) |
| `status` | `OrderStatus` | `NOT NULL`, Default: `PENDING` | Trạng thái hiện thời của đơn |
| `subtotalAmount`| `DECIMAL(10, 2)`| `NOT NULL` | Tổng tiền hàng chưa trừ khuyến mãi |
| `discountAmount`| `DECIMAL(10, 2)`| `NOT NULL`, Default: `0.00` | Số tiền được giảm giá |
| `totalAmount` | `DECIMAL(10, 2)` | `NOT NULL` | Tổng tiền thực tế cần thanh toán |
| `note` | `TEXT` | `NULLABLE` | Ghi chú dặn dò của khách hàng |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Thời điểm đặt đơn |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL`, Auto-update | Thời điểm cập nhật trạng thái gần nhất |

#### Bảng 5: `order_items` (Chi tiết các dòng món trong đơn hàng)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `String` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Khóa chính chi tiết món |
| `orderId` | `UUID` / `String` | `NOT NULL`, `FOREIGN KEY -> orders(id) ON DELETE CASCADE` | Thuộc về đơn hàng nào |
| `productId` | `UUID` / `String` | `NOT NULL`, `FOREIGN KEY -> products(id)` | Sản phẩm đồ uống tương ứng |
| `size` | `VARCHAR(10)` | `NOT NULL` | Kích cỡ đã chọn (`S`, `M`, `L`) |
| `selectedToppings` | `JSONB` | `NOT NULL` | Danh sách tên và giá topping đã chọn |
| `quantity` | `INTEGER` | `NOT NULL` | Số lượng ly đặt mua |
| `unitPrice` | `DECIMAL(10, 2)` | `NOT NULL` | Đơn giá thành phẩm tại thời điểm mua |
| `lineTotal` | `DECIMAL(10, 2)` | `NOT NULL` | Thành tiền dòng (`unitPrice * quantity`) |

#### Bảng 6: `payments` (Lịch sử thanh toán & Ràng buộc Idempotency)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `String` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Khóa chính giao dịch thanh toán |
| `orderId` | `UUID` / `String` | `NOT NULL`, `FOREIGN KEY -> orders(id)` | Mã đơn hàng thanh toán |
| `idempotencyKey` | `VARCHAR(100)` | `UNIQUE`, `NOT NULL` | Khóa định danh chống giao dịch trùng lặp |
| `method` | `PaymentMethod` | `NOT NULL` | Phương thức thanh toán (`WALLET` / `CARD`) |
| `status` | `PaymentStatus` | `NOT NULL`, Default: `PENDING` | Trạng thái giao dịch |
| `amount` | `DECIMAL(10, 2)` | `NOT NULL` | Số tiền thực hiện giao dịch |
| `transactionRef` | `VARCHAR(100)` | `NULLABLE` | Mã tham chiếu trả về từ cổng thanh toán |
| `paidAt` | `TIMESTAMPTZ` | `NULLABLE` | Thời điểm thanh toán thành công |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Thời điểm khởi tạo yêu cầu thanh toán |

#### Bảng 7: `loyalty_transactions` (Lịch sử tích lũy/sử dụng điểm thưởng)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `String` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Khóa chính giao dịch điểm |
| `userId` | `UUID` / `String` | `NOT NULL`, `FOREIGN KEY -> users(id)` | Khách hàng sở hữu điểm |
| `orderId` | `UUID` / `String` | `NULLABLE`, `FOREIGN KEY -> orders(id)` | Đơn hàng kích hoạt tích điểm |
| `points` | `INTEGER` | `NOT NULL` | Số điểm cộng thêm hoặc khấu trừ |
| `type` | `LoyaltyTxType` | `NOT NULL` | Loại giao dịch (`EARN` / `REDEEM`) |
| `description` | `VARCHAR(255)` | `NOT NULL` | Mô tả lý do phát sinh giao dịch điểm |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Thời điểm ghi nhận giao dịch điểm |

---

## 2. ĐẶC TẢ GIAO DIỆN LẬP TRÌNH REST API (RESTFUL API SPECIFICATION)

### 2.1. Chuẩn hóa Mã Lỗi HTTP (Standard HTTP Status Codes)
- `200 OK`: Truy vấn hoặc xử lý thành công.
- `201 Created`: Tạo mới tài nguyên thành công (Đăng ký tài khoản, Tạo đơn hàng).
- `400 Bad Request`: Dữ liệu đầu vào sai định dạng hoặc không vượt qua `ValidationPipe`.
- `401 Unauthorized`: Chưa truyền Token hoặc JWT không hợp lệ/hết hạn.
- `402 Payment Required`: Thanh toán thất bại từ dịch vụ Ví/Thẻ (Kèm tự động hoàn kho).
- `409 Conflict`: Xung đột tồn kho CSDL (Món hết hàng tại thời điểm đặt đơn).
- `500 Internal Server Error`: Lỗi hệ thống nội bộ.

---

### 2.2. Danh mục Endpoints Chi tiết

#### 1. `GET /health`
- **Mục đích:** Kiểm tra trạng thái sẵn sàng phục vụ của Backend API (Sử dụng cho Docker Healthcheck & CI/CD Smoke Test).
- **Quyền truy cập:** Công khai (Public).
- **Phản hồi 200 OK:**
```json
{
  "status": "ok",
  "service": "brewlite-api",
  "timestamp": "2026-10-28T14:00:00.000Z",
  "uptime": 124.5
}
```

#### 2. `POST /auth/register`
- **Mục đích:** Đăng ký tài khoản khách hàng mới.
- **Quyền truy cập:** Công khai (Public).
- **Request Body:**
```json
{
  "email": "customer@brewlite.vn",
  "password": "Password123!",
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567"
}
```
- **Phản hồi 201 Created:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "user": {
    "id": "c7b5c128-98e3-4c91-b3e1-34fa9b012345",
    "email": "customer@brewlite.vn",
    "fullName": "Nguyễn Văn A",
    "role": "CUSTOMER"
  }
}
```

#### 3. `POST /auth/login`
- **Mục đích:** Đăng nhập xác thực và nhận JWT Token.
- **Request Body:**
```json
{
  "email": "customer@brewlite.vn",
  "password": "Password123!"
}
```
- **Phản hồi 200 OK:** Trả về đối tượng `{ accessToken, user }` tương tự `/auth/register`.

#### 4. `GET /products`
- **Mục đích:** Lấy danh sách toàn bộ sản phẩm thực đơn (hỗ trợ lọc theo `category` hoặc tìm kiếm theo `search`).
- **Phản hồi 200 OK:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Cà Phê Sữa Đá Sài Gòn",
    "description": "Cà phê Robusta rang đậm kết hợp sữa đặc ngọt thanh truyền thống",
    "category": "Coffee",
    "basePrice": "29000.00",
    "imageUrl": "/images/ca-phe-sua.jpg",
    "sizeOptions": [
      { "size": "S", "price": 0 },
      { "size": "M", "price": 6000 },
      { "size": "L", "price": 10000 }
    ],
    "toppingOptions": [
      { "name": "Trân châu đen", "price": 5000 },
      { "name": "Thạch cà phê", "price": 6000 }
    ],
    "stockQuantity": 50,
    "isAvailable": true
  }
]
```

#### 5. `GET /products/:id`
- **Mục đích:** Xem chi tiết một sản phẩm theo UUID.
- **Phản hồi 200 OK:** Trả về đối tượng sản phẩm chi tiết; hoặc 404 Not Found nếu không tồn tại.

#### 6. `POST /orders`
- **Mục đích:** Tạo đơn hàng mới và trừ tồn kho nguyên tử bằng Interactive Database Transaction.
- **Headers:** `Authorization: Bearer <JWT>`
- **Request Body:**
```json
{
  "items": [
    {
      "productId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "size": "M",
      "toppings": [
        { "name": "Trân châu đen", "price": 5000 }
      ],
      "quantity": 2,
      "unitPrice": 40000
    }
  ],
  "note": "Ít ngọt, nhiều đá giúp em"
}
```
- **Phản hồi 201 Created:**
```json
{
  "orderId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
  "orderCode": "BL-20261028-101",
  "status": "PENDING",
  "subtotalAmount": "80000.00",
  "discountAmount": "0.00",
  "totalAmount": "80000.00"
}
```
- **Phản hồi 409 Conflict:** Khi sản phẩm hết hàng hoặc số lượng trong kho không đủ.

#### 7. `POST /payments`
- **Mục đích:** Xử lý thanh toán đơn hàng có kiểm soát Idempotency và hoàn tồn kho khi lỗi.
- **Headers:**
  - `Authorization: Bearer <JWT>`
  - `Idempotency-Key: <UUIDv4>` (Bắt buộc)
- **Request Body:**
```json
{
  "orderId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
  "method": "WALLET",
  "simulateFailure": false
}
```
- **Phản hồi 200 OK (Thành công hoặc Gửi lại Idempotency-Key cũ):**
```json
{
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "orderId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
  "orderStatus": "CONFIRMED",
  "paymentStatus": "PAID",
  "transactionRef": "TXN_WALLET_1793171200",
  "paidAt": "2026-10-28T14:05:00.000Z"
}
```
- **Phản hồi 402 Payment Required (Khi thanh toán lỗi - simulateFailure: true):**
```json
{
  "statusCode": 402,
  "message": "Thanh toán thất bại: Số dư ví không đủ hoặc thẻ bị từ chối. Đã hoàn lại tồn kho sản phẩm.",
  "orderId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
  "orderStatus": "PAYMENT_FAILED",
  "paymentStatus": "FAILED"
}
```

#### 8. `GET /orders`
- **Mục đích:** Lấy danh sách lịch sử đơn hàng của người dùng hiện tại (hoặc toàn bộ đơn nếu có vai trò `STAFF`/`MANAGER`).
- **Headers:** `Authorization: Bearer <JWT>`
- **Phản hồi 200 OK:** Mảng danh sách các đơn hàng kèm theo chi tiết `items` và `payments`.

#### 9. `PATCH /orders/:id/status`
- **Mục đích:** Nhân viên cập nhật trạng thái chế biến (`PREPARING` -> `READY` -> `COMPLETED`).
- **Headers:** `Authorization: Bearer <JWT>` (Yêu cầu Role `STAFF` hoặc `MANAGER`).
- **Request Body:** `{ "status": "PREPARING" }`
- **Phản hồi 200 OK:** Thông tin đơn hàng sau khi cập nhật trạng thái mới.
