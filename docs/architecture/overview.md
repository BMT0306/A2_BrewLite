# TÀI LIỆU KIẾN TRÚC TỔNG THỂ HỆ THỐNG (SYSTEM ARCHITECTURE OVERVIEW)
## DỰ ÁN HỆ THỐNG ĐẶT VÀ THANH TOÁN ĐỒ UỐNG BREWLITE – ASSIGNMENT 2

---

### THÔNG TIN HỒ SƠ THỰC HIỆN (PHÂN CÔNG CHẤM TIẾN ĐỘ TUẦN 9)
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Họ và tên sinh viên** | **Trần Lê Minh Tâm** |
| **Mã thành viên** | **Chính 1** |
| **Vai trò chuyên môn** | **System Architect & DevOps Lead** |
| **Tài liệu phụ trách** | `docs/architecture/overview.md`, `docs/architecture/adr/001-monorepo.md`, `002-database-transaction.md`, `003-mock-payment-idempotency.md`, `docs/diagrams/sequence-checkout.puml` / `.svg`, `docs/diagrams/deployment-prod.puml` / `.svg`, `docs/deployment.md` |
| **Phần code phụ trách** | Thiết lập cấu trúc Monorepo, cấu hình Docker Compose, thiết lập đường ống CI (`ci.yml`) và CD (`cd.yml`), scripts tự động hóa (`scripts/`) |
| **Mục đích in ấn Tuần 9** | Xuất trình tài liệu thiết kế kiến trúc hệ thống, phân tích các quyết định kiến trúc (ADR) và mô hình triển khai thực tế |

---

## 1. NGUYÊN TẮC VÀ PHONG CÁCH KIẾN TRÚC (ARCHITECTURAL STYLE & PRINCIPLES)

Hệ thống BrewLite áp dụng mô hình kiến trúc **Phân tầng hướng dịch vụ mô-đun (Modular Layered Architecture)** kết hợp với mô hình triển khai **Containerized Monorepo**. Kiến trúc được thiết kế xoay quanh các nguyên tắc cốt lõi:

1. **Phân tách mối quan tâm (Separation of Concerns - SoC):** Tách biệt rõ ràng tầng Giao diện máy khách (Next.js PWA), tầng Xử lý nghiệp vụ API (NestJS Modular Backend) và tầng Lưu trữ bền vững (PostgreSQL).
2. **Thiết kế khóa chặt với Code (100% Consistency):** Mọi thực thể trong kiến trúc phản ánh chính xác các lớp trong `docs/diagrams/class-domain.svg` và ánh xạ trực tiếp sang `apps/api/prisma/schema.prisma`.
3. **Tính nguyên tử và Khả năng chịu lỗi (Atomicity & Idempotency):** Áp dụng Database Transaction cho các tác vụ thay đổi trạng thái tồn kho và lưu trữ Idempotency Key để đảm bảo an toàn giao dịch thanh toán.
4. **Giám sát chủ động (Observability & Health Checks):** Tích hợp endpoint chuẩn hóa `GET /health` trả về trạng thái hoạt động của hệ thống phục vụ công tác kiểm tra tự động (Smoke Test) trên đường ống CI/CD.

---

## 2. KIẾN TRÚC PHÂN TẦNG VÀ CÁC THÀNH PHẦN (SYSTEM LAYERS)

```text
+-----------------------------------------------------------------------+
| 1. CLIENT TIER (apps/web)                                             |
|    Next.js 14+ (App Router, TailwindCSS, Mobile-First PWA)            |
|    - Pages: / (Menu), /products/[id], /cart, /login, /checkout, /orders|
|    - State: Zustand / localStorage (useCartStore)                     |
|    - API Client: Fetch wrapper có xử lý Bearer JWT & Idempotency-Key  |
+-----------------------------------▲-----------------------------------+
                                    │ HTTPS / JSON REST API
+-----------------------------------▼-----------------------------------+
| 2. BACKEND API TIER (apps/api)                                        |
|    NestJS Application (Node.js / TypeScript)                          |
|    ├── Presentation Layer: REST Controllers, DTOs, ValidationPipe     |
|    ├── Security Layer: JwtAuthGuard, Passport JWT, Bcrypt Hashing     |
|    ├── Domain / Service Layer:                                        |
|    │   ├── HealthModule (GET /health)                                 |
|    │   ├── AuthModule (Register, Login, Token generation)             |
|    │   ├── ProductsModule (Menu query, Detail & Stock inspect)        |
|    │   ├── OrdersModule (Order placement inside Interactive Tx)       |
|    │   └── PaymentsModule (Mock Payment Gateway & Idempotency check)  |
|    └── Data Access Layer: Prisma ORM (Type-safe client, Migrations)   |
+-----------------------------------▲-----------------------------------+
                                    │ TCP / TLS (Port 5432)
+-----------------------------------▼-----------------------------------+
| 3. PERSISTENT STORAGE TIER                                            |
|    PostgreSQL 16 Database                                             |
|    - 7 Relational Tables: users, products, orders, order_items,       |
|      payments, promotions, loyalty_transactions                       |
|    - Enums: UserRole, OrderStatus, PaymentMethod, PaymentStatus,      |
|             LoyaltyTxType                                             |
+-----------------------------------------------------------------------+
```

### 2.1. Tầng Giao diện Người dùng (Client Tier - `apps/web`)
- **Khung công nghệ:** Next.js (React 18/19, App Router) kết hợp TailwindCSS tạo phong cách thẩm mỹ hiện đại, mobile-first, mượt mà trên màn hình di động từ 375px đến 430px.
- **Tiêu chuẩn PWA (Progressive Web App):** Tệp cấu hình `manifest.json` và Service Worker cho phép người dùng thêm ứng dụng vào màn hình chính điện thoại (Add to Home Screen) với biểu tượng nhận diện riêng và hiển thị ở chế độ `standalone` không thanh địa chỉ trình duyệt.
- **Quản lý Trạng thái:** Sử dụng kho lưu trữ giỏ hàng `useCartStore` với cơ chế đồng bộ tự động vào `localStorage`, đảm bảo khách hàng không bị mất dữ liệu giỏ khi tải lại trang hoặc điều hướng giữa các màn hình.
- **Xử lý Trạng thái Toàn diện:** Mỗi màn hình đều cài đặt đầy đủ các trạng thái giao diện: Đang tải (Skeleton/Loading Spinner), Dữ liệu rỗng (Empty State), Lỗi hệ thống/mạng (Error State với nút Thử lại) và Cảnh báo hết hàng (Out-of-Stock).

### 2.2. Tầng Ứng dụng & Nghiệp vụ (Backend API Tier - `apps/api`)
- **Khung công nghệ:** NestJS (Node.js framework) áp dụng chặt chẽ mô hình Dependency Injection (DI) và tổ chức theo Domain Modules:
  - `HealthModule`: Cung cấp endpoint `GET /health` phục vụ kiểm tra sức khỏe của dịch vụ.
  - `AuthModule`: Quản lý quy trình đăng ký, đăng nhập, băm mật khẩu `bcrypt` và sinh mã thông báo JWT. Cung cấp `JwtAuthGuard` để bảo vệ các tuyến API nhạy cảm.
  - `ProductsModule`: Cung cấp dữ liệu thực đơn, chi tiết món, tùy chọn size và topping kèm số lượng tồn kho theo thời gian thực.
  - `OrdersModule`: Tiếp nhận yêu cầu đặt đơn, kích hoạt Database Transaction nguyên tử để kiểm tra và trừ tồn kho sản phẩm, tạo đơn hàng mới và trả về mã đơn hàng.
  - `PaymentsModule`: Xử lý giao dịch thanh toán mô phỏng, tiếp nhận Header `Idempotency-Key`, kiểm tra trùng lặp giao dịch và kích hoạt hoàn trả kho nếu thanh toán không thành công.
- **Xác thực và Toàn vẹn Dữ liệu:** Áp dụng toàn cục `ValidationPipe` kết hợp bộ thư viện `class-validator` và `class-transformer` để đảm bảo 100% dữ liệu đầu vào được thẩm định chặt chẽ trước khi đi vào tầng dịch vụ.

### 2.3. Tầng Dữ liệu (Data Persistence Tier)
- **Cơ sở dữ liệu:** PostgreSQL 16 quản lý dữ liệu quan hệ, hỗ trợ khóa dòng (`FOR UPDATE`) và tính năng Transaction tương tác chuẩn ACID.
- **Công cụ ORM:** Prisma ORM cung cấp lớp trừu tượng truy cập CSDL an toàn kiểu (Type-safe), quản lý lược đồ qua `schema.prisma` và tự động sinh mã Migration phục vụ đồng bộ cấu trúc CSDL giữa các môi trường phát triển, kiểm thử và sản xuất.

---

## 3. SƠ ĐỒ MÔ HÌNH TRIỂN KHAI VÀ VẬN HÀNH (DEPLOYMENT ARCHITECTURE)

Hệ thống được thiết kế để vận hành nhất quán trên cả môi trường Cục bộ (Local Development), Đường ống Tích hợp/Triển khai liên tục (CI/CD Pipeline) và Môi trường Sản xuất Đám mây (Cloud Production):

![BrewLite Production Deployment Diagram](../diagrams/deployment-prod.svg)

### 3.1. Môi trường Cục bộ (Local Development)
- Đóng gói toàn bộ trong `docker-compose.yml` gồm 3 container độc lập:
  1. `web-local`: Dịch vụ Next.js lắng nghe cổng `3000`.
  2. `api-local`: Dịch vụ NestJS lắng nghe cổng `4000`, tự động chạy lệnh kiểm tra kết nối và migration CSDL trước khi khởi động.
  3. `postgres-local`: CSDL PostgreSQL 16 lắng nghe cổng `5432`, sử dụng Named Volume `pgdata` để duy trì dữ liệu bền vững qua các lần khởi động lại.

### 3.2. Môi trường Tích hợp và Triển khai Tự động (CI/CD Boundary)
- Tận dụng GitHub Actions Runner (Ubuntu) để thực hiện:
  - **CI Pipeline (`.github/workflows/ci.yml`):** Kích hoạt tự động khi có Pull Request hoặc push vào các nhánh tính năng. Thực hiện kiểm tra cú pháp (Lint), chạy bộ kiểm thử đơn vị (Unit Tests) và biên dịch mã nguồn (Build).
  - **CD Pipeline (`.github/workflows/cd.yml`):** Kích hoạt khi merge vào nhánh `main` hoặc gắn thẻ phiên bản (`v*`). Thực hiện thẩm định chất lượng (Quality Gate), đóng gói Docker Image gắn tag commit SHA, đẩy lên GitHub Container Registry (GHCR), kích hoạt triển khai lên hạ tầng Cloud và tự động chạy kiểm thử khói (Smoke Test `curl -f GET /health`).

---

## 4. QUẢN LÝ CẤU HÌNH BIẾN MÔI TRƯỜNG (.ENV)

| Tên Biến | Môi trường | Ý nghĩa & Mô tả | Giá trị Mẫu |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Tất cả | Chế độ thực thi ứng dụng | `development` / `production` / `test` |
| `PORT` | API | Cổng mạng của dịch vụ Backend NestJS | `4000` |
| `DATABASE_URL` | API | Chuỗi kết nối bảo mật tới CSDL PostgreSQL | `postgresql://brewlite:secret@postgres:5432/brewlite_db?schema=public` |
| `JWT_SECRET` | API | Khóa bí mật dùng để ký và xác thực mã JWT | `brewlite_super_secret_jwt_key_2026_production` |
| `JWT_EXPIRES_IN` | API | Thời hạn hiệu lực của mã thông báo truy cập | `7d` |
| `NEXT_PUBLIC_API_URL` | Web | Địa chỉ URL công khai gọi tới Backend REST API | `http://localhost:4000` (Local) hoặc `https://api.brewlite.vn` (Prod) |
