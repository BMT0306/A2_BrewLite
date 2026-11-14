# MA TRẬN TRUY VẾT YÊU CẦU HAI CHIỀU (BI-DIRECTIONAL TRACEABILITY MATRIX)
## DỰ ÁN HỆ THỐNG ĐẶT VÀ THANH TOÁN ĐỒ UỐNG BREWLITE – ASSIGNMENT 2

---

### THÔNG TIN HỒ SƠ THỰC HIỆN (PHÂN CÔNG CHẤM TIẾN ĐỘ TUẦN 9)
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Họ và tên sinh viên** | **Nguyễn Thành Tài** |
| **Mã thành viên** | **Phụ 3** |
| **Vai trò chuyên môn** | **QA & Traceability Lead** |
| **Tài liệu phụ trách** | `docs/traceability-matrix.md`, `docs/requirements/use-case-checkout.md`, `README.md` |
| **Phần code phụ trách** | Lập trình API Health Check (`apps/api/src/modules/health/health.controller.ts`), Bộ kiểm thử tích hợp tự động (`tests/integration-checkout.spec.ts`) & Unit Tests (`*.spec.ts`) |
| **Mục đích in ấn Tuần 9** | Xuất trình ma trận liên kết chứng minh mọi yêu cầu đều được mô hình hóa, lập trình và kiểm thử đầy đủ |

---

## 1. BẢNG MA TRẬN TRUY VẾT YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS TRACEABILITY)

| Mã YC (FR) | Tên Yêu Cầu Chức Năng | Use-case & User Story Liên Quan | Sơ Đồ Thiết Kế (.puml / .svg) | Mã Nguồn Hiện Thực (Frontend / Backend) | Mã Kiểm Thử (Test Case ID) | Trạng Thái Nghiệm Thu |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **FR-01** | Xem Menu & Lọc đồ uống | `UC-01`<br>US-1: Khách hàng xem danh sách menu theo danh mục | `usecase-overall.svg`<br>`activity-menu-cart.svg`<br>`class-domain.svg` | `apps/web/src/app/page.tsx`<br>`apps/api/src/modules/products/` | `API-T01` (GET /products)<br>`UI-T01` (Menu display)<br>`E2E-T01` | **PASS (Sprint 1)** |
| **FR-02** | Xem Chi tiết & Tùy biến món | `UC-02`<br>US-2: Chọn size S/M/L, topping & kiểm tra tồn kho | `usecase-overall.svg`<br>`activity-menu-cart.svg`<br>`class-domain.svg` | `apps/web/src/app/products/[id]/page.tsx`<br>`GET /products/:id` | `API-T02` (GET /products/:id)<br>`UI-T02` (Size/Topping add)<br>`UNIT-T01` (`apps/api/src/modules/products/products.service.spec.ts`) | **PASS (Sprint 1)** |
| **FR-03** | Quản lý Giỏ hàng & Tạm tính | `UC-03`<br>US-3: Thêm, sửa, xóa món & tính tổng tiền giỏ hàng | `activity-menu-cart.svg`<br>`activity-end-to-end.svg` | `apps/web/src/app/cart/page.tsx`<br>`apps/web/src/store/useCartStore.ts` | `UI-T03` (Cart sync localstorage) | **PASS (Sprint 2)** |
| **FR-04** | Đăng ký & Đăng nhập (Auth JWT) | `UC-04`<br>US-4: Xác thực người dùng bằng JWT Token | `activity-auth-order-tracking.svg`<br>`sequence-checkout.svg` | `apps/web/src/app/login/page.tsx`<br>`apps/api/src/modules/auth/` | `API-T03` (POST /auth/register)<br>`API-T04` (POST /auth/login)<br>`SEC-T01` (401 Unauthorized) | **PASS (Sprint 2)** |
| **FR-05** | Đặt đơn & Trừ tồn kho nguyên tử | `UC-05`<br>US-5: Tạo đơn hàng với Database Transaction | `usecase-checkout.svg`<br>`sequence-checkout.svg`<br>`activity-end-to-end.svg` | `apps/web/src/app/checkout/page.tsx`<br>`POST /orders` (`OrdersModule`) | `INT-T01` (Atomic order & stock)<br>`INT-T02` (409 Conflict out-of-stock)<br>`UNIT-T02` (`apps/api/src/modules/orders/orders.service.spec.ts`) | **PASS (Sprint 2)** |
| **FR-06** | Thanh toán Ví/Thẻ & Idempotency | `UC-05`<br>US-6: Xử lý thanh toán có khóa Idempotency | `usecase-checkout.svg`<br>`sequence-checkout.svg`<br>`activity-end-to-end.svg` | `apps/api/src/modules/payments/`<br>`apps/web/src/app/checkout/page.tsx` | `INT-T03` (Idempotent 200 replay)<br>`UNIT-T03` (`apps/api/src/modules/payments/payments.service.spec.ts`)<br>`INT-T04` (402 Fail & Stock refund) | **PASS (Sprint 2)** |
| **FR-07** | Theo dõi trạng thái & Lịch sử đơn | `UC-06`<br>US-7: Khách hàng theo dõi đơn hàng thời gian thực | `activity-auth-order-tracking.svg`<br>`activity-end-to-end.svg` | `apps/web/src/app/orders/page.tsx`<br>`GET /orders` | `API-T05` (GET /orders user scope)<br>`UI-T04` (Order stepper UI) | **PASS (Sprint 2)** |
| **FR-08** | Cập nhật trạng thái đơn (Staff) | `UC-07`<br>US-8: Nhân viên cập nhật trạng thái chế biến | `usecase-overall.svg`<br>`activity-auth-order-tracking.svg` | `PATCH /orders/:id/status`<br>`apps/web/src/app/orders/page.tsx` | `API-T06` (PATCH order status)<br>`SEC-T02` (Staff role guard) | **PASS (Sprint 2)** |
| **FR-09** | Khuyến mãi & Tích điểm thành viên | `UC-09`<br>Mở rộng sau MVP | `class-domain.svg`<br>`usecase-overall.svg` | `schema.prisma` (`Promotion`, `LoyaltyTransaction`) | `SCHEMA-T01` (Prisma validation) | **READY (Scope Extended)** |

---

## 2. BẢNG MA TRẬN TRUY VẾT YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS TRACEABILITY)

| Mã YC (NFR) | Thuộc Tính Chất Lượng | Giải Pháp Kiến Trúc & Thiết Kế | Mã Nguồn / Cấu Hình Vận Hành | Kịch Bản Thẩm Định / Metric Đo Lường | Kết Quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **NFR-01** | **Hiệu năng (Performance)** | - API phân trang, tối ưu query Prisma.<br>- Static Optimization & CDN Caching trên Next.js. | `apps/api/src/modules/products/`<br>`apps/web/src/app/page.tsx` | `PERF-T01`: GET /products phản hồi p95 < 180ms (Mục tiêu < 500ms). | **ĐẠT** |
| **NFR-02** | **Bảo mật (Security)** | - Băm mật khẩu `bcrypt` salt 10.<br>- Xác thực `JwtAuthGuard`.<br>- Quản lý biến môi trường qua `.env`.<br>- Chống SQL Injection bằng Prisma ORM. | `apps/api/src/modules/auth/`<br>`.env.example`<br>`apps/api/prisma/schema.prisma` | `SEC-T03`: Chặn tấn công SQLi 100%.<br>`SEC-T04`: Không để lộ secret trên repo Git. | **ĐẠT** |
| **NFR-03** | **Tính khả dụng & PWA (Usability)** | - Mobile-first chuẩn 375px - 430px.<br>- Khai báo Web App Manifest & Service Worker. | `apps/web/public/manifest.json`<br>`apps/web/src/app/layout.tsx` | `PWA-T01`: Kiểm tra Lighthouse PWA Score >= 90.<br>`UI-T05`: Đáp ứng 4 trạng thái giao diện. | **ĐẠT** |
| **NFR-04** | **Triển khai & CI/CD (DevOps)** | - Container hóa chuẩn Docker Compose.<br>- GitHub Actions CI (4 bước tuần tự).<br>- GitHub Actions CD có Smoke Test `GET /health`. | `docker-compose.yml`<br>`apps/api/Dockerfile`<br>`apps/web/Dockerfile`<br>`.github/workflows/ci.yml`<br>`.github/workflows/cd.yml` | `OPS-T01`: CI build & test pass 100%.<br>`OPS-T02`: `curl -f GET /health` phản hồi HTTP 200. | **ĐẠT** |

---

## 3. DANH MỤC BỘ TEST CASES VÀ KẾT QUẢ THỰC THI (VERIFICATION SUMMARY)

| Test Case ID | Loại Test | Mô Tả Kịch Bản Kiểm Thử | Dữ Liệu Đầu Vào | Kỳ Vọng (Expected Result) | Kết Quả Thực Tế |
| :---: | :---: | :--- | :--- | :--- | :---: |
| `API-T01` | Integration | Truy vấn danh sách menu công khai | `GET /products` | HTTP 200, mảng có 6 món, thời gian < 500ms | **PASS** |
| `API-T02` | Integration | Lấy chi tiết món Cà phê sữa đá | `GET /products/:id` | HTTP 200, có đủ `sizeOptions` và `toppingOptions` | **PASS** |
| `API-T03` | Integration | Đăng ký tài khoản khách hàng mới | `POST /auth/register` (email mới) | HTTP 201, trả về `accessToken` và mã hóa `bcrypt` trong DB | **PASS** |
| `API-T04` | Integration | Đăng nhập tài khoản mẫu | `POST /auth/login` (`customer@brewlite.vn`) | HTTP 200, trả về chuỗi JWT hợp lệ | **PASS** |
| `UNIT-T01` | Unit | Kiểm tra ProductsService: findAll, findOne và xử lý sản phẩm không tồn tại | `findAll()` / `findOne()` | Trả về danh sách/sản phẩm hợp lệ; sản phẩm không tồn tại ném `NotFoundException` | **PASS** |
| `UNIT-T02` | Unit | Kiểm tra OrdersService: tạo đơn hàng và xử lý tồn kho nguyên tử | Sản phẩm đủ/hết tồn kho | 3 test PASS: tạo đơn, hết kho và chuyển trạng thái COMPLETED | **PASS** |
| `INT-T01` | Integration | Đặt đơn hàng đủ tồn kho trong Transaction | `POST /orders` (quantity: 2) | HTTP 201, `Order.status = PENDING`, kho trừ đi 2 ly | **PASS** |
| `INT-T02` | Integration | Đặt đơn hàng với món đã hết kho | `POST /orders` (món `stockQuantity = 0`) | HTTP 409 Conflict, Rollback transaction, không tạo order | **PASS** |
| `INT-T03` | Integration | Kiểm tra tính Idempotency khi gửi lặp lại | `POST /payments` (cùng Idempotency-Key) | HTTP 200, trả lại kết quả giao dịch cũ, không trừ tiền lần 2 | **PASS** |
| `INT-T04` | Integration | Xử lý thanh toán lỗi & Hoàn trả tồn kho | `POST /payments` (`simulateFailure: true`) | HTTP 402, `Order = PAYMENT_FAILED`, kho được cộng hoàn trả | **PASS** |
| `UNIT-T03` | Unit | Kiểm tra PaymentsService: thiếu idempotencyKey, replay idempotency và thanh toán mới | `processPayment()` với idempotencyKey hợp lệ/không hợp lệ | 3 test PASS: thiếu key, replay kết quả cũ và thanh toán mới thành công | **PASS** |
| `OPS-T01` | DevOps | Kiểm tra sức khỏe hệ thống (Health Check) | `GET /health` | HTTP 200, `{ status: "ok", service: "brewlite-api" }` | **PASS** |
