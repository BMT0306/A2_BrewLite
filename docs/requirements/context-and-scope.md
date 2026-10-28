# TÀI LIỆU BỐI CẢNH DỰ ÁN VÀ XÁC ĐỊNH PHẠM VI (CONTEXT & SCOPE)
## DỰ ÁN HỆ THỐNG ĐẶT VÀ THANH TOÁN ĐỒ UỐNG BREWLITE – ASSIGNMENT 2

---

### THÔNG TIN HỒ SƠ THỰC HIỆN (PHÂN CÔNG CHẤM TIẾN ĐỘ TUẦN 9)
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Mã thành viên** | **Phụ 1** |
| **Vai trò chuyên môn** | **Business Analyst 1 (Bối cảnh, Stakeholder & Phạm vi)** |
| **Tài liệu phụ trách** | `docs/requirements/context-and-scope.md` & Phụ lục Danh mục Menu & Dữ liệu mẫu (`seed.ts`) |
| **Phần code phụ trách** | Chuẩn bị dữ liệu ban đầu cho `apps/api/prisma/seed.ts` và kiểm thử tính đúng đắn của dữ liệu mẫu |
| **Mục đích in ấn Tuần 9** | Độc lập xuất trình chứng minh công tác khảo sát nghiệp vụ, phân tích stakeholder và xác lập giới hạn phạm vi |

---

## 1. VẤN ĐỀ NGHIỆP VỤ CẦN GIẢI QUYẾT (BUSINESS PROBLEM STATEMENT)

Tại các chuỗi cửa hàng cà phê và trà hiện đại trong giờ cao điểm (8:00 - 9:30 sáng và 12:30 - 14:00 chiều), mô hình bán hàng truyền thống tại quầy (counter ordering) đang bộc lộ 3 nút thắt cổ chai nghiêm trọng:

1. **Ùn tắc và thời gian chờ đợi kéo dài:** Khách hàng phải xếp hàng từ 10 đến 20 phút chỉ để đọc món và thanh toán. Tình trạng này khiến tỷ lệ bỏ dở mua hàng (churn rate) tăng cao và gây áp lực lớn lên nhân viên quầy thu ngân.
2. **Sai sót đơn hàng do ghi nhận thủ công:** Các tùy chọn đồ uống trong ngành pha chế hiện đại có mức độ phân nhánh phức tạp (kích cỡ ly S/M/L, lượng đá 0%/50%/100%, lượng đường 0%/30%/50%/100%, danh sách topping đa dạng như Trân châu đen, Thạch nha đam, Kem cheese). Việc nhân viên ghi chép giấy hoặc bấm máy POS thủ công dễ dẫn đến nhầm lẫn, dẫn đến hủy đơn, lãng phí nguyên vật liệu và trải nghiệm khách hàng tiêu cực.
3. **Thiếu thông tin tiến trình minh bạch theo thời gian thực:** Khách hàng sau khi thanh toán không biết khi nào đồ uống của mình sẵn sàng, dẫn đến việc tụ tập chờ đợi quanh quầy giao nước, gây mất trật tự và ảnh hưởng đến không gian thưởng thức của quán.

**Giải pháp đề xuất - BrewLite:** Xây dựng ứng dụng Web di động tiến tiến (Progressive Web App - PWA) kết hợp Backend REST API cho phép khách hàng tự gọi món tại bàn hoặc trước khi đến quán, tùy biến công thức chính xác, thanh toán không dùng tiền mặt tức thì và theo dõi trạng thái pha chế của đơn hàng trực tiếp trên thiết bị cá nhân.

---

## 2. BẢNG PHÂN TÍCH 6 NHÓM STAKEHOLDER BẮT BUỘC

| STT | Nhóm Stakeholder | Mô tả vai trò & Trách nhiệm | Nhu cầu then chốt (Key Needs) | Mức độ ảnh hưởng / Kỳ vọng |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Khách hàng (Customer)** | Người trực tiếp mua và thưởng thức đồ uống tại quán hoặc mang đi. | - Truy cập Menu tức thì trên điện thoại thông minh mà không cần cài ứng dụng từ Store.<br>- Tùy biến size, đá, đường, topping rõ ràng, xem giá cập nhật tự động.<br>- Thanh toán không tiền mặt an toàn, minh bạch.<br>- Nhận thông báo tiến trình pha chế để nhận đồ uống đúng lúc. | **Rất cao (Primary User)**: Quyết định sự thành công và mức độ đón nhận sản phẩm thực tế. |
| **2** | **Nhân viên quầy (Barista / Staff)** | Lực lượng pha chế và bàn giao sản phẩm tại cửa hàng. | - Nhận thông tin đơn hàng đã thanh toán tức thời, chuẩn xác từng topping/size.<br>- Giao diện cập nhật trạng thái đơn tinh gọn (`CONFIRMED` -> `PREPARING` -> `READY` -> `COMPLETED`) chỉ với 1 chạm.<br>- Giảm tải áp lực giao tiếp và thu tiền mặt trong giờ cao điểm. | **Rất cao (Operational)**: Người trực tiếp vận hành hệ thống hàng ngày. |
| **3** | **Quản lý cửa hàng (Store Manager)** | Người chịu trách nhiệm doanh thu, chất lượng dịch vụ và điều phối kho. | - Quản lý danh mục đồ uống, bật/tắt trạng thái món khi hết nguyên liệu.<br>- Kiểm soát số lượng tồn kho tự động trừ theo đơn bán.<br>- Xem báo cáo doanh thu, số lượng đơn theo ngày/giờ. | **Cao (Management)**: Đảm bảo hiệu quả kinh doanh và kiểm soát thất thoát. |
| **4** | **Giảng viên / Khách hàng nghiệm thu (Evaluator / Product Owner)** | Giảng viên học phần Công nghệ Phần mềm & đại diện hội đồng phản biện. | - Đánh giá tính kỷ luật và toàn vẹn của quy trình kỹ nghệ từ Requirement -> Model -> Architecture -> Implementation -> CI/CD -> Production.<br>- Kiểm tra tính nhất quán 100% giữa Sơ đồ (PlantUML) và Mã nguồn (Prisma/NestJS/Next.js).<br>- Khả năng truy vết hai chiều (Bi-directional Traceability Matrix). | **Tuyệt đối (Assessment)**: Người đánh giá chất lượng kỹ thuật và kết quả môn học. |
| **5** | **Nhóm phát triển (Development Team - 6 SV)** | Đội ngũ kỹ sư phân bổ thành 3 Chính và 3 Phụ theo quy định. | - Phân rã kiến trúc rõ ràng (Monorepo), tách biệt Frontend và Backend độc lập.<br>- Quy ước API Contract chuẩn (REST/OpenAPI) để làm việc song song.<br>- Đường ống CI/CD tự động phát hiện lỗi và đảm bảo quy tắc tuần tự 5 task trên Git. | **Cao (Execution)**: Đảm bảo hoàn thành đúng hạn các mốc tuần tự không xung đột. |
| **6** | **Dịch vụ Thanh toán (Mock Payment Service)** | Hệ thống mô phỏng trung gian xử lý thanh toán Ví điện tử và Thẻ ngân hàng. | - Giao tiếp qua giao thức bảo mật HTTPS.<br>- Đảm bảo tính toán vẹn và Idempotency (chống trùng lặp giao dịch).<br>- Hỗ trợ các kịch bản kiểm thử giả lập thành công/thất bại chính xác. | **Trung bình - Kỹ thuật (Integration)**: Đảm bảo giao dịch tài chính chính xác. |

---

## 3. PHẠM VI SẢN PHẨM (PROJECT SCOPE)

### 3.1. Phạm vi cốt lõi trong MVP (In-Scope - Hoàn thành trong Sprint 1 & Sprint 2)
1. **Khám phá Thực đơn (Menu Discovery):**
   - Xem danh sách sản phẩm phân loại theo danh mục (Cà phê, Trà trái cây, Trà sữa, Đá xay, Bánh ngọt).
   - Tìm kiếm đồ uống theo từ khóa và bộ lọc danh mục.
   - Hiển thị đầy đủ 4 trạng thái giao diện: Đang tải (Loading), Dữ liệu rỗng (Empty), Lỗi kết nối (Error), và Hết hàng (Out-of-stock badge khi `stockQuantity = 0`).
2. **Chi tiết Món & Tùy chọn (Customization):**
   - Xem thông tin chi tiết: tên, mô tả, ảnh, giá cơ bản, số lượng còn trong kho.
   - Chọn kích cỡ (Size S/M/L) với giá chênh lệch tự động cộng thêm.
   - Chọn đa dạng topping (Trân châu, Thạch nha đam, Kem cheese) với giá niêm yết tương ứng.
   - Giới hạn số lượng chọn không vượt quá tồn kho thực tế (`stockQuantity`).
3. **Quản lý Giỏ hàng (Cart Management):**
   - Thêm món có cấu hình tùy chọn vào giỏ hàng lưu trữ LocalStorage.
   - Tăng/giảm số lượng từng dòng sản phẩm, xóa dòng sản phẩm, dọn sạch giỏ hàng.
   - Tự động tính toán tổng tiền tạm tính (`subtotal`) tức thời.
4. **Xác thực Người dùng (Authentication & Authorization):**
   - Đăng ký tài khoản khách hàng mới với mã hóa mật khẩu một chiều (`bcrypt`).
   - Đăng nhập xác thực và cấp mã thông báo JWT (`accessToken`) có thời hạn.
   - Bảo vệ các API nhạy cảm bằng `JwtAuthGuard` (yêu cầu gửi Header `Authorization: Bearer <token>`).
5. **Đặt đơn & Kiểm soát Tồn kho (Atomic Order Placement):**
   - Đặt đơn hàng với danh sách món, tùy chọn, số lượng và ghi chú.
   - Cơ chế Database Transaction nguyên tử: Khóa và kiểm tra tồn kho DB; nếu thiếu hàng thì Rollback và trả về mã lỗi HTTP `409 Conflict`; nếu đủ hàng thì trừ tồn kho và tạo bản ghi `Order (PENDING)` cùng các `OrderItem`.
6. **Thanh toán An toàn & Idempotency (Payment Processing):**
   - Lựa chọn phương thức thanh toán: Ví điện tử (`WALLET`) hoặc Thẻ (`CARD`).
   - Gửi yêu cầu thanh toán kèm mã định danh duy nhất `Idempotency-Key` (UUIDv4) ở Header.
   - Nếu Idempotency-Key đã tồn tại: trả về ngay kết quả giao dịch đã lưu mà không trừ tiền lần 2 (HTTP 200).
   - Mô phỏng thanh toán thành công: Cập nhật `Payment (PAID)` và `Order (CONFIRMED)`.
   - Mô phỏng thanh toán thất bại: Cập nhật `Payment (FAILED)`, `Order (PAYMENT_FAILED)` và tự động hoàn trả số lượng tồn kho `stockQuantity` vào cơ sở dữ liệu.
7. **Theo dõi Đơn hàng & Cập nhật Trạng thái (Order Tracking & Staff Ops):**
   - Khách hàng xem lịch sử đơn hàng của chính mình và tiến trình trạng thái trực quan.
   - Nhân viên cập nhật trạng thái đơn (`CONFIRMED` -> `PREPARING` -> `READY` -> `COMPLETED`).
8. **Đóng gói & Giám sát Hệ thống:**
   - Đóng gói toàn bộ ứng dụng bằng Docker Compose (PostgreSQL, NestJS API, Next.js Web).
   - Endpoint giám sát sức khỏe `GET /health` trả về trạng thái service và timestamp phục vụ CD Smoke Test.

### 3.2. Phạm vi mở rộng (Extended Scope - Đã thiết kế sẵn Database Schema)
- **Mã khuyến mãi (Promotion):** Khai báo bảng `Promotion` với các trường mã giảm, tỷ lệ chiết khấu, mức giảm tối đa, thời hạn hiệu lực. Trong MVP gắn nhãn `Could / Won't in MVP`, cấu trúc DB sẵn sàng mở rộng mà không cần sửa schema.
- **Tích điểm thành viên (LoyaltyTransaction):** Khai báo bảng `LoyaltyTransaction` với loại giao dịch tích/tiêu điểm (`EARN` / `REDEEM`). Sẵn sàng cho giai đoạn phát triển tiếp theo.

### 3.3. Phạm vi loại trừ (Out-of-Scope)
- Không tích hợp tài khoản thanh toán merchant thật với các cổng ngân hàng bên ngoài (VNPay, MoMo, ZaloPay production sandbox). Sử dụng Mock Payment Engine nội bộ.
- Không phát triển hệ thống điều phối tài xế giao hàng chặng cuối (Last-mile delivery integration qua GrabExpress hay AhaMove).
- Không quản lý chi tiết định lượng nguyên vật liệu hạt cà phê, sữa tươi theo đơn vị gram/ml. Quản lý kho dựa trên đơn vị ly thành phẩm (`stockQuantity`).

---

## 4. GIẢ ĐỊNH, RÀNG BUỘC VÀ QUẢN TRỊ RỦI RO (ASSUMPTIONS, CONSTRAINTS & RISKS)

### 4.1. Giả định ban đầu (Assumptions)
- Khách hàng sử dụng thiết bị di động cá nhân chạy hệ điều hành iOS hoặc Android có trình duyệt hiện đại (Safari, Chrome) hỗ trợ PWA và kết nối Internet ổn định.
- Cửa hàng trang bị ít nhất 1 thiết bị máy tính bảng hoặc máy tính để bàn tại quầy cho nhân viên mở giao diện cập nhật trạng thái đơn hàng.
- Cơ chế thanh toán trực tuyến được kiểm thử tự động thông qua dịch vụ Mock Payment nội bộ được tích hợp trong Backend NestJS.

### 4.2. Ràng buộc kỹ thuật cốt lõi (Technical Constraints)
1. **Ràng buộc công nghệ:** Bắt buộc áp dụng bộ công nghệ tiêu chuẩn của đồ án:
   - Frontend: **Next.js** (App Router, TailwindCSS, Mobile-first layout).
   - Backend: **NestJS** (Modular architecture, TypeScript, class-validator, JWT passport).
   - Database: **PostgreSQL** kết nối qua **Prisma ORM**.
   - Đóng gói: **Docker** & **Docker Compose**.
2. **Ràng buộc tiến độ & Git:** Hoàn thành dự án tuần tự theo 5 Task (`Task 1` -> `Task 2` -> `Task 3` -> `Task 4` -> `Task 5`). Mỗi task tương ứng với một mốc commit/branch độc lập trên kho lưu trữ.
3. **Ràng buộc tính nhất quán:** Thiết kế Class Diagram phải khớp 100% với `schema.prisma`. Toàn bộ luồng nghiệp vụ trên Activity Diagram và Sequence Diagram phải được hiện thực chính xác trong mã nguồn API và UI.

### 4.3. Bảng Ma trận Rủi ro & Chiến lược Giảm thiểu (Risk Matrix)

| Mã Rủi ro | Mô tả Rủi ro | Mức độ | Hậu quả tiềm ẩn | Chiến lược Giảm thiểu (Mitigation Strategy) |
| :---: | :--- | :---: | :--- | :--- |
| **R-01** | **Xung đột đặt hàng đồng thời (Race Condition on Stock)** | Cao | Hai khách hàng cùng bấm đặt món tại thời điểm chỉ còn 1 sản phẩm cuối cùng trong kho, dẫn đến số lượng tồn kho bị âm (`stockQuantity < 0`). | Sử dụng Interactive Database Transaction (`prisma.$transaction`) kết hợp câu lệnh kiểm tra số lượng và trừ kho nguyên tử. Bắt lỗi và trả về ngay mã `409 Conflict`. |
| **R-02** | **Thanh toán trùng lặp do bấm nhiều lần (Double Charging)** | Cao | Mạng di động chập chờn khiến khách bấm nút "Thanh toán" liên tiếp nhiều lần, tạo ra nhiều giao dịch trừ tiền cho cùng một đơn hàng. | Thiết kế bắt buộc Client sinh `Idempotency-Key` (UUIDv4) gửi qua HTTP Header. Backend lưu khóa này vào bảng `Payment` với ràng buộc `UNIQUE`. Giao dịch trùng lặp sẽ trả về ngay kết quả cũ mà không gọi lại dịch vụ thanh toán. |
| **R-03** | **Treo kho khi thanh toán bị hủy hoặc thất bại** | Trung bình | Tồn kho đã bị trừ khi tạo đơn nhưng khách hàng thanh toán thất bại hoặc hủy ngang, dẫn đến thất thoát hàng ảo. | Thiết kế luồng bù trừ (Compensating Transaction): Khi dịch vụ thanh toán báo thất bại, Backend kích hoạt transaction cập nhật `Payment=FAILED`, `Order=PAYMENT_FAILED` và tự động cộng hoàn lại `stockQuantity` cho sản phẩm. |
| **R-04** | **Lệch pha giữa Tài liệu và Mã nguồn** | Trung bình | Sơ đồ UML vẽ một đường nhưng lập trình viên viết schema CSDL và API endpoint một nẻo, bị hội đồng trừ điểm tính nhất quán. | Thiết lập quy trình Thiết kế khóa chặt với Code (Rule 2). Sử dụng bảng đối chiếu 100% giữa thuộc tính Class Diagram và Prisma Schema, đồng thời xây dựng Bảng Ma trận Truy vết (Traceability Matrix). |
