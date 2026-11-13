# ĐẶC TẢ YÊU CẦU PHẦN MỀM (SOFTWARE REQUIREMENTS SPECIFICATION - SRS)
## DỰ ÁN HỆ THỐNG ĐẶT VÀ THANH TOÁN ĐỒ UỐNG BREWLITE – ASSIGNMENT 2

---

### THÔNG TIN HỒ SƠ THỰC HIỆN (PHÂN CÔNG CHẤM TIẾN ĐỘ TUẦN 9)
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Mã thành viên** | **Phụ 2** |
| **Họ và tên** | **Hoàng Minh Quân** (minhquan131106@gmail.com) |
| **Vai trò chuyên môn** | **Business Analyst 2 (Đặc tả SRS & Use-case Tổng quát)** |
| **Tài liệu phụ trách** | `docs/requirements/srs.md` & `docs/diagrams/usecase-overall.puml` / `.svg` |
| **Phần code phụ trách** | Lập trình Màn hình Tra cứu Trạng thái & Lịch sử Đơn hàng (`apps/web/src/app/orders/page.tsx` - UC-06), Màn hình Đăng nhập / Đăng ký (`apps/web/src/app/login/page.tsx` - UC-04) |
| **Mục đích in ấn Tuần 9** | Xuất trình tài liệu đặc tả toàn bộ yêu cầu chức năng (FR), phi chức năng (NFR), sơ đồ Use-Case tổng thể và đặc tả chi tiết ca sử dụng xác thực và theo dõi đơn hàng |

---

## 1. BẢNG ĐẶC TẢ YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS - MOSCOW)

| Mã YC | Tên Yêu cầu | Mức ưu tiên | Mô tả chi tiết nghiệp vụ | Tiêu chí chấp nhận kỹ thuật (Acceptance Criteria - AC) |
| :---: | :--- | :---: | :--- | :--- |
| **FR-01** | **Xem Menu & Phân loại Đồ uống** | **Must** | Hệ thống cung cấp danh mục đồ uống đa dạng, hỗ trợ lọc theo thể loại (Cà phê, Trà sữa, Trà trái cây, Đá xay) và tìm kiếm theo tên. | - API `GET /products` trả về mã HTTP `200 OK` kèm mảng danh sách sản phẩm với thời gian phản hồi < 500ms.<br>- Giao diện thể hiện đầy đủ 4 trạng thái: Đang tải (Skeleton/Loading), Không có dữ liệu (Empty), Lỗi kết nối (Error message kèm nút Thử lại), và Hết hàng (Gắn nhãn `Tạm hết hàng` khi `stockQuantity <= 0` hoặc `isAvailable = false`). |
| **FR-02** | **Xem Chi tiết Món & Chọn Tùy biến** | **Must** | Người dùng có thể nhấn vào từng món để xem thông tin mở rộng, chọn kích thước (Size S: +0đ, M: +6.000đ, L: +10.000đ) và danh sách Topping kèm số lượng mong muốn. | - API `GET /products/:id` trả về thông tin chi tiết và cấu trúc JSON `sizeOptions`, `toppingOptions`.<br>- Giao diện tự động tính đơn giá xem trước: `đơn giá = basePrice + giá size + tổng giá topping`.<br>- Không cho phép người dùng chọn số lượng vượt quá `stockQuantity` trong kho. Nếu `stockQuantity = 0`, vô hiệu hóa nút "Thêm vào giỏ". |
| **FR-03** | **Quản lý Giỏ hàng & Tạm tính** | **Must** | Khách hàng có thể lưu các món đã chọn vào giỏ hàng, cập nhật số lượng, xóa từng món hoặc xóa toàn bộ giỏ. Dữ liệu giỏ được lưu trữ cục bộ. | - Dữ liệu giỏ hàng đồng bộ với `LocalStorage` qua `useCartStore`.<br>- Công thức tính tổng tiền dòng: `lineTotal = (basePrice + sizePrice + sum(toppingPrices)) * quantity`.<br>- Tổng tiền tạm tính (`subtotal`) bằng tổng tất cả `lineTotal`, cập nhật tức thì với độ trễ < 50ms khi thay đổi số lượng. |
| **FR-04** | **Xác thực & Ủy quyền (Auth JWT)** | **Must** | Khách hàng đăng ký tài khoản mới bằng Email/Mật khẩu hoặc đăng nhập để nhận mã truy cập JWT. Bảo vệ an toàn các tác vụ đặt hàng. | - Mật khẩu lưu trữ trong bảng `User` bắt buộc được băm bằng thuật toán `bcrypt` với muối (salt rounds >= 10).<br>- `POST /auth/register` và `POST /auth/login` trả về chuỗi `accessToken` (JWT) có thời hạn hiệu lực.<br>- Mọi request tới API `POST /orders`, `GET /orders`, `POST /payments` nếu không có Header `Authorization: Bearer <token>` hợp lệ đều bị chặn với mã lỗi `401 Unauthorized`. |
| **FR-05** | **Tạo Đơn hàng & Trừ Tồn kho Nguyên tử** | **Must** | Tạo đơn hàng mới từ danh sách món trong giỏ hàng. Kiểm tra tính sẵn sàng của tồn kho và trừ kho trong một giao dịch cơ sở dữ liệu duy nhất. | - API `POST /orders` chạy trọn vẹn bên trong `prisma.$transaction`.<br>- Nếu bất kỳ sản phẩm nào có `stockQuantity < quantity` yêu cầu, giao dịch bị Rollback ngay lập tức và trả về mã HTTP `409 Conflict` kèm thông báo chi tiết.<br>- Nếu đủ tồn kho, trừ `stockQuantity`, tạo bản ghi `Order (status = PENDING)` và các bản ghi con `OrderItem`, trả về mã HTTP `201 Created` kèm `orderId`. |
| **FR-06** | **Xử lý Thanh toán & Idempotency** | **Must** | Khách hàng chọn phương thức Ví điện tử (`WALLET`) hoặc Thẻ (`CARD`) để hoàn tất đơn hàng. Ngăn chặn tuyệt đối việc trừ tiền hai lần. | - Client bắt buộc truyền Header `Idempotency-Key` (UUIDv4) khi gọi `POST /payments`.<br>- Nếu `Idempotency-Key` đã tồn tại trong CSDL, trả về ngay bản ghi giao dịch đã lưu kèm HTTP `200 OK` (không gọi lại cổng thanh toán).<br>- Nếu thanh toán thành công: Cập nhật `Payment (status = PAID)` và `Order (status = CONFIRMED)`.<br>- Nếu thanh toán thất bại: Cập nhật `Payment (status = FAILED)`, `Order (status = PAYMENT_FAILED)` và tự động kích hoạt Transaction hoàn trả lại đúng số lượng tồn kho `stockQuantity` đã trừ. |
| **FR-07** | **Lịch sử & Theo dõi Đơn hàng** | **Should** | Khách hàng xem danh sách đơn hàng mình đã đặt và tiến trình pha chế của đơn theo thời gian thực. | - API `GET /orders` có gắn `JwtAuthGuard`, lọc và chỉ trả về danh sách các đơn hàng thuộc quyền sở hữu của `userId` trong Token.<br>- Giao diện hiển thị rõ trạng thái trực quan: `CONFIRMED` (Đã tiếp nhận) -> `PREPARING` (Đang pha chế) -> `READY` (Sẵn sàng nhận đồ) -> `COMPLETED` (Hoàn tất). |
| **FR-08** | **Cập nhật Trạng thái Đơn hàng (Staff)** | **Should** | Nhân viên quầy và Quản lý có thể cập nhật trạng thái đơn hàng theo quy trình phục vụ tại quầy. | - API `PATCH /orders/:id/status` yêu cầu quyền hạn `STAFF` hoặc `MANAGER`.<br>- Ràng buộc luồng chuyển trạng thái hợp lệ, không cho phép đảo ngược trạng thái từ `COMPLETED` về `PENDING`. |
| **FR-09** | **Mã Khuyến mãi & Điểm Thưởng (Mở rộng)** | **Could / Won't in MVP** | Khách hàng nhập mã giảm giá (`Promotion`) hoặc sử dụng điểm thưởng tích lũy (`LoyaltyTransaction`). | - Cấu trúc bảng `Promotion` và `LoyaltyTransaction` cùng các quan hệ khóa ngoại đã được khai báo 100% đầy đủ trong `class-domain.puml` và `schema.prisma` để sẵn sàng mở rộng mà không cần phá vỡ cấu trúc CSDL hiện hữu. |

---

## 2. BẢNG ĐẶC TẢ YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

| Mã YC | Thuộc tính chất lượng | Mô tả chi tiết yêu cầu kỹ thuật | Phương pháp kiểm chứng & Chỉ số đo lường |
| :---: | :--- | :--- | :--- |
| **NFR-01** | **Hiệu năng & Thời gian đáp ứng (Performance)** | - API đọc dữ liệu thực đơn `GET /products` và endpoint kiểm tra sức khỏe `GET /health` phải phản hồi cực nhanh dưới tải thông thường.<br>- Giao diện Web phải tối ưu kích thước gói tải (bundle size) và áp dụng Server-Side Rendering / Static Caching hợp lý. | - Thời gian phản hồi p95 của `GET /products` < 500ms.<br>- Thời gian tải trang ban đầu (First Contentful Paint - FCP) trên mạng 4G di động < 1.5 giây. |
| **NFR-02** | **Bảo mật & Tính toàn vẹn (Security)** | - Bảo vệ tuyệt đối thông tin định danh và mật khẩu người dùng.<br>- Truyền tải dữ liệu an toàn trên môi trường mạng.<br>- Quản lý biến môi trường an toàn, không để lộ secrets trên mã nguồn mở. | - Mật khẩu người dùng được mã hóa bằng `bcrypt` với cost factor >= 10.<br>- Khóa bí mật (`JWT_SECRET`, `DATABASE_URL`) cấu hình qua file `.env` hoặc GitHub Actions Secrets, cam kết không commit vào kho Git.<br>- Mọi truy vấn CSDL đều thực hiện qua Prisma ORM để loại bỏ 100% rủi ro tấn công SQL Injection. |
| **NFR-03** | **Tính khả dụng & Thiết kế PWA (Usability & PWA)** | - Giao diện ưu tiên thiết bị di động (Mobile-first design) chuẩn kích thước 375px đến 430px (iPhone, Samsung Galaxy).<br>- Hỗ trợ cài đặt như ứng dụng gốc qua tiêu chuẩn Progressive Web App (PWA). | - Tệp `apps/web/public/manifest.json` đầy đủ các trường `name`, `short_name`, `icons`, `start_url`, `display: standalone`.<br>- Thanh điều hướng dưới đáy (Bottom Navigation Bar) thuận tiện cho thao tác bằng một tay. |
| **NFR-04** | **Khả năng triển khai & Tự động hóa (Deployability & CI/CD)** | - 100% hệ thống được đóng gói container hóa chuẩn Docker.<br>- Mọi thay đổi mã nguồn phải vượt qua đường ống kiểm thử tự động trước khi triển khai lên môi trường Production. | - Khởi tạo toàn bộ hệ thống (PostgreSQL, NestJS API, Next.js Web) chỉ với 1 lệnh duy nhất: `docker compose up --build`.<br>- Workflow CI (`.github/workflows/ci.yml`) tự động thực thi 4 bước: Install -> Lint -> Unit Test -> Build. |

---

## 3. SƠ ĐỒ USE-CASE TỔNG QUÁT HỆ THỐNG (OVERALL USE-CASE DIAGRAM)

Dưới đây là sơ đồ Use-Case tổng thể thể hiện mối tương tác giữa 4 nhóm tác nhân (Khách hàng, Nhân viên, Quản lý, Cổng thanh toán) với toàn bộ 9 chức năng nghiệp vụ của hệ thống BrewLite:

![BrewLite Overall System Use-Case Diagram](../diagrams/usecase-overall.svg)

### 3.1. Phân loại Tác nhân (Actors)
1. **Khách hàng (Customer):** Tác nhân chính thực hiện chuỗi hành vi xem thực đơn, tùy chọn đồ uống, giỏ hàng, đăng ký/đăng nhập, đặt đơn, thanh toán và theo dõi tiến trình đơn hàng.
2. **Nhân viên quầy (Barista / Staff):** Đăng nhập vào hệ thống để tiếp nhận đơn hàng đã thanh toán thành công và cập nhật trạng thái chế biến đồ uống.
3. **Quản lý cửa hàng (Store Manager):** Đăng nhập để điều chỉnh trạng thái danh mục sản phẩm và kiểm soát tồn kho.
4. **Cổng thanh toán (Payment Service):** Tác nhân hệ thống hỗ trợ tiếp nhận và xác nhận kết quả thanh toán trực tuyến từ giao dịch của khách hàng.

### 3.2. Quan hệ giữa các Use-Case (Use-Case Relationships)
- `UC-05 (Đặt đơn & Thanh toán)` bao gồm (`<<include>>`) tác vụ `UC-04 (Đăng ký / Đăng nhập)` nhằm đảm bảo định danh người mua.
- `UC-05 (Đặt đơn & Thanh toán)` mở rộng (`<<extend>>`) tới `UC-09 (Áp mã khuyến mãi & Tích điểm)` khi khách hàng cung cấp mã ưu đãi hợp lệ.
- `UC-05` tương tác hai chiều với `Payment Service` để hoàn tất thanh toán không tiền mặt.

---

## 4. ĐẶC TẢ CHI TIẾT CA SỬ DỤNG DO PHỤ 2 PHỤ TRÁCH

### 4.1. UC-04: Đăng ký / Đăng nhập & Quản lý Hồ sơ (JWT Authentication)

| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã ca sử dụng** | **UC-04** |
| **Tên ca sử dụng** | Đăng ký tài khoản, Đăng nhập và Quản lý phiên làm việc JWT |
| **Tác nhân chính** | Khách hàng (Customer), Nhân viên quầy (Staff), Quản lý (Manager) |
| **Mục tiêu** | Xác thực danh tính người dùng và cấp phát mã JWT an toàn phục vụ các tương tác đặt hàng |
| **Tiền điều kiện** | Người dùng mở trình duyệt truy cập vào đường dẫn `/login` trên ứng dụng PWA |
| **Hậu điều kiện** | JWT Token được lưu tại LocalStorage (`brewlite_jwt_token`), thông tin người dùng được lưu tại `brewlite_user` |

#### Luồng sự kiện chính (Main Success Scenario)
1. Người dùng truy cập màn hình Đăng nhập `/login`.
2. Hệ thống kiểm tra phiên đăng nhập hiện tại:
   - Nếu đã đăng nhập: Hiển thị Thẻ hồ sơ thành viên (Tên, Email, Vai trò, Điểm thưởng Loyalty, Hạng thẻ) kèm nút "Đăng xuất".
   - Nếu chưa đăng nhập: Hiển thị Form Đăng nhập kèm Bảng tài khoản thử nghiệm nhanh (Quick-Fill).
3. Người dùng nhập Email và Mật khẩu (hoặc nhấn 1-Chạm vào tài khoản mẫu).
4. Người dùng bấm nút "Đăng nhập ngay".
5. Hệ thống gửi yêu cầu `POST /auth/login` kèm Payload `{ email, password }`.
6. Backend kiểm tra Email, đối chiếu mã băm mật khẩu với `bcrypt.compare`.
7. Backend tạo chuỗi `accessToken` có chứa `userId`, `email`, `role` và trả về HTTP `200 OK`.
8. Hệ thống lưu Token và Profile vào bộ nhớ client, sau đó điều hướng người dùng về trang trước đó (`redirectUrl`) hoặc Trang chủ (`/`).

#### Luồng thay thế A1 – Đăng ký tài khoản mới:
- **2a.** Người dùng chọn tab "Đăng ký mới".
- **2b.** Form mở rộng các trường: Họ và tên, Email, Số điện thoại, Mật khẩu, Xác nhận mật khẩu.
- **2c.** Người dùng nhập thông tin và nhấn "Tạo tài khoản".
- **2d.** Hệ thống kiểm tra client-side: email hợp lệ, mật khẩu >= 6 ký tự, mật khẩu xác nhận trùng khớp.
- **2e.** Hệ thống gọi `POST /auth/register`. Backend băm mật khẩu bằng `bcrypt` và tạo bản ghi User mới trong CSDL PostgreSQL.
- **2f.** Backend trả về JWT token; client tự động đăng nhập và chuyển hướng.

#### Luồng ngoại lệ:
- **E1: Sai thông tin đăng nhập:** Backend trả về `401 Unauthorized`. Giao diện hiển thị banner cảnh báo màu đỏ: "Email hoặc mật khẩu không chính xác".
- **E2: Email đã tồn tại khi đăng ký:** Backend trả về `409 Conflict`. Giao diện thông báo: "Email này đã được sử dụng".
- **E3: Lỗi kết nối mạng:** Giao diện hiển thị thông báo lỗi và giữ nguyên dữ liệu đã nhập trên form để người dùng thử lại.

---

### 4.2. UC-06: Tra cứu Lịch sử & Theo dõi Trạng thái Đơn hàng theo Thời gian thực

| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã ca sử dụng** | **UC-06** |
| **Tên ca sử dụng** | Tra cứu Lịch sử Đơn hàng & Theo dõi Trạng thái Chế biến (Order Tracking) |
| **Tác nhân chính** | Khách hàng (Customer), Nhân viên quầy (Staff) |
| **Mục tiêu** | Giúp khách hàng theo dõi trực quan tiến trình đồ uống từ lúc đặt đến khi nhận; giúp nhân viên cập nhật trạng thái phục vụ |
| **Tiền điều kiện** | Người dùng đã đăng nhập và sở hữu Token hợp lệ trong hệ thống |
| **Hậu điều kiện** | Danh sách đơn hàng được hiển thị đầy đủ thông tin mã đơn, chi tiết món, tổng tiền và tiến trình Stepper |

#### Luồng sự kiện chính (Main Success Scenario - Khách hàng)
1. Khách hàng nhấn vào biểu tượng "Đơn mua" trên thanh điều hướng dưới đáy (`/orders`).
2. Hệ thống kiểm tra Token:
   - Nếu chưa có Token: Chuyển hướng tức thì sang `/login?redirect=/orders`.
3. Hệ thống gửi yêu cầu `GET /orders` kèm Header `Authorization: Bearer <token>`.
4. Backend lọc danh sách đơn hàng theo `userId` (sắp xếp giảm dần theo `createdAt`).
5. Giao diện hiển thị danh sách đơn hàng dạng thẻ (Card-based UI). Mỗi thẻ hiển thị:
   - Mã đơn hàng (VD: `BL-8921A`), Thời gian đặt hàng dạng định dạng Việt Nam.
   - Badge trạng thái trực quan kèm hiệu ứng phát xung (Pulse animation) khi ở trạng thái `PREPARING`.
   - Tiến trình 4 bước trực quan: Xác nhận -> Pha chế -> Sẵn sàng -> Đã lấy.
   - Danh sách chi tiết các món (Tên món, Size, Topping, Số lượng, Đơn giá dòng).
   - Tổng thanh toán đã định dạng tiền tệ Việt Nam (VNĐ).

#### Luồng mở rộng – Chế độ Nhân viên quầy (Staff View):
- Nếu tài khoản có vai trò `STAFF` hoặc `MANAGER`:
  * Hệ thống hiển thị Banner thông báo chế độ phục vụ.
  * Hiển thị danh sách tất cả các đơn hàng trong toàn hệ thống.
  * Cung cấp các nút thao tác nhanh để nhân viên bấm cập nhật một chạm:
    - Khi đơn ở trạng thái `CONFIRMED` -> Nút "Pha chế" (Chuyển sang `PREPARING`).
    - Khi đơn ở trạng thái `PREPARING` -> Nút "Sẵn sàng" (Chuyển sang `READY`).
    - Khi đơn ở trạng thái `READY` -> Nút "Hoàn tất" (Chuyển sang `COMPLETED`).
  * Khi bấm nút, hệ thống gọi `PATCH /orders/:id/status` và tự động làm mới danh sách đơn.

#### Luồng ngoại lệ:
- **E1: Token hết hạn (401):** Hệ thống xóa token cục bộ và chuyển hướng về `/login`.
- **E2: Chưa có đơn hàng nào:** Giao diện hiển thị trạng thái Empty State thân thiện kèm nút bấm chuyển về Thực đơn ("Đặt món ngay").

---

## 5. MÔ HÌNH CHUYỂN TRẠNG THÁI ĐƠN HÀNG (ORDER STATE MACHINE)

Vòng đời trạng thái của đơn hàng trong BrewLite tuân thủ chặt chẽ ràng buộc toàn vẹn dữ liệu:

```
                  ┌───────────────┐
                  │    PENDING    │ (Đơn khởi tạo, đang khóa tồn kho)
                  └───────┬───────┘
                          │ Thanh toán thành công (PAID)
                          ▼
                  ┌───────────────┐
                  │   CONFIRMED   │ (Tiếp nhận tại quầy Barista)
                  └───────┬───────┘
                          │ Bắt đầu chế biến
                          ▼
                  ┌───────────────┐
                  │   PREPARING   │ (Đang pha chế đồ uống)
                  └───────┬───────┘
                          │ Pha chế hoàn tất
                          ▼
                  ┌───────────────┐
                  │     READY     │ (Sẵn sàng tại quầy nhận món)
                  └───────┬───────┘
                          │ Khách hàng đã lấy đồ
                          ▼
                  ┌───────────────┐
                  │   COMPLETED   │ (Giao dịch kết thúc thành công)
                  └───────────────┘

Luồng hủy / Thất bại:
PENDING ──► PAYMENT_FAILED (Thanh toán lỗi -> Tự động kích hoạt bù trừ hoàn kho)
PENDING / CONFIRMED ──► CANCELLED (Khách hàng hoặc Quản lý hủy đơn)
```

---

## 6. DANH MỤC API LIÊN QUAN ĐẾN PHÂN HỆ PHỤ 2

| Phương thức | Endpoint | Mô tả chức năng | Quyền truy cập | Mã phản hồi |
| :---: | :--- | :--- | :---: | :---: |
| `POST` | `/auth/register` | Đăng ký tài khoản người dùng mới | Public | `201 Created`, `409 Conflict` |
| `POST` | `/auth/login` | Đăng nhập hệ thống và nhận JWT Token | Public | `200 OK`, `401 Unauthorized` |
| `GET` | `/orders` | Lấy danh sách đơn hàng (Customer: của tôi; Staff: toàn bộ) | Đã xác thực (JWT) | `200 OK`, `401 Unauthorized` |
| `GET` | `/orders/:id` | Xem chi tiết một đơn hàng cụ thể | Đã xác thực (JWT) | `200 OK`, `404 Not Found` |
| `PATCH` | `/orders/:id/status` | Cập nhật tiến trình phục vụ đơn hàng | `STAFF`, `MANAGER` | `200 OK`, `400 Bad Request` |

---

*Hồ sơ tài liệu được biên soạn và bảo chứng bởi: **Thành viên Phụ 2 – Business Analyst 2 (SRS & Use-case Lead)***
*Dự án BrewLite – Bộ môn Công nghệ Phần mềm – Đánh giá tiến độ Tuần 9*
