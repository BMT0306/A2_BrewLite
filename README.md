# BREWLITE – MOBILE-FIRST ORDERING & PAYMENT SYSTEM
## HỌC PHẦN CÔNG NGHỆ PHẦN MỀM (SOFTWARE ENGINEERING) – ASSIGNMENT 2

---

### THÔNG TIN HỒ SƠ DỰ ÁN & PHÂN CÔNG 6 THÀNH VIÊN (CHẤM TIẾN ĐỘ TUẦN 9)
| Mã TV | Họ và Tên | Vai trò Chuyên môn | File Tài Liệu & Sơ Đồ Phụ Trách (In Ấn Tuần 9) | Phần Code & Kiểm Thử Phụ Trách |
| :---: | :--- | :--- | :--- | :--- |
| **Chính 1** | Kỹ sư Trưởng | **System Architect & DevOps Lead** | 1. `docs/architecture/overview.md`<br>2. `docs/architecture/adr/001-monorepo.md`, `002-...`, `003-...`<br>3. `docs/diagrams/sequence-checkout.puml` & `.svg`<br>4. `docs/diagrams/deployment-prod.puml` & `.svg`<br>5. `docs/deployment.md` | Khung Monorepo, Docker Compose, `ci.yml`, `cd.yml`, scripts tự động hóa (`scripts/`). |
| **Chính 2** | Kỹ sư Backend | **Backend & Database Lead** | 1. `docs/diagrams/class-domain.puml` & `.svg`<br>2. `docs/diagrams/activity-end-to-end.puml` & `.svg`<br>3. `docs/database-and-api-design.md` | Lược đồ `schema.prisma`, `OrdersModule`, `PaymentsModule` (Transaction & Idempotency), `AuthModule`. |
| **Chính 3** | Kỹ sư Frontend | **Frontend & PWA Lead** | 1. `docs/diagrams/activity-menu-cart.puml` & `.svg`<br>2. `docs/diagrams/activity-auth-order-tracking.puml` & `.svg`<br>3. `docs/ui-ux-frontend-specification.md` | Khung PWA (`manifest.json`, `layout.tsx`), Trang chủ Menu (`page.tsx`), Tùy biến món (`products/[id]/page.tsx`), Giỏ hàng & Thanh toán (`cart/page.tsx`, `checkout/page.tsx`, `useCartStore.ts`). |
| **Phụ 1** | Chuyên viên BA | **Business Analyst 1 (Scope & Data)** | 1. `docs/requirements/context-and-scope.md`<br>2. Phụ lục Danh mục Menu & Dữ liệu mẫu (`seed.ts` spec) | Lập trình kịch bản nạp dữ liệu mẫu (`apps/api/prisma/seed.ts`), Module API Danh mục Sản phẩm Menu (`apps/api/src/modules/products/`). |
| **Phụ 2** | Hoàng Minh Quân | **Business Analyst 2 (SRS & Use-case)** | 1. `docs/requirements/srs.md`<br>2. `docs/diagrams/usecase-overall.puml` & `.svg` | Lập trình Màn hình Tra cứu Trạng thái & Lịch sử Đơn hàng (`apps/web/src/app/orders/page.tsx` - UC-06), Màn hình Đăng nhập / Đăng ký (`apps/web/src/app/login/page.tsx` - UC-04). |
| **Phụ 3** | Kỹ sư QA | **QA & Traceability Lead** | 1. `docs/requirements/use-case-checkout.md`<br>2. `docs/diagrams/usecase-checkout.puml` & `.svg`<br>3. `docs/traceability-matrix.md`<br>4. `README.md` | Lập trình API Health Check (`apps/api/src/modules/health/health.controller.ts`), Bộ kiểm thử tích hợp tự động (`tests/integration-checkout.spec.ts`), Unit Tests (`products.service.spec.ts`, `payments.service.spec.ts`). |

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

**BrewLite** là giải pháp phần mềm gọi món và thanh toán đồ uống trực tuyến chuẩn PWA (Progressive Web App) dành cho các cửa hàng cà phê và trà hiện đại. Hệ thống giải quyết triệt để vấn nạn xếp hàng giờ cao điểm, loại bỏ sai sót tùy biến đồ uống (size, đá, đường, topping) và minh bạch hóa tiến trình pha chế đồ uống theo thời gian thực.

Dự án được triển khai với tính kỷ luật công nghệ phần mềm cao nhất, tuân thủ nghiêm ngặt **5 Nguyên tắc cốt lõi**:
1. **Bộ ba công nghệ bắt buộc:** Frontend dùng **Next.js** (App Router, TailwindCSS, Mobile-first PWA), Backend dùng **NestJS**, Cơ sở dữ liệu dùng **PostgreSQL** kết nối qua **Prisma ORM** và đóng gói bằng **Docker**.
2. **Thiết kế khóa chặt với Code (100% Consistency):** Mọi lớp trong `docs/diagrams/class-domain.svg` khớp 100% với `apps/api/prisma/schema.prisma`. Toàn bộ luồng xử lý Transaction và Idempotency trên sơ đồ hoạt động được hiện thực trọn vẹn trong code.
3. **Diagram-as-Code:** 100% sơ đồ được lưu dưới dạng mã nguồn `.puml` và ảnh vector `.svg` trong thư mục `docs/diagrams/`.
4. **Quy tắc thực hiện tuần tự 5 Task trên Git:** Lịch sử Git thể hiện rõ ràng 5 commit tuần tự từ Yêu cầu -> Mô hình hóa -> Kiến trúc -> Sprint 1 MVP -> Sprint 2 Hoàn chỉnh & CI/CD.
5. **Tách biệt hồ sơ cá nhân cho 6 thành viên:** Sẵn sàng in ấn và chấm tiến độ độc lập cho từng thành viên sau tuần 9.

---

## 2. CẤU TRÚC THƯ MỤC REPOSITORY (MONOREPO DIRECTORY TREE)

```text
brewlite/
├── apps/
│   ├── web/                                   # Next.js 14+ (App Router, TailwindCSS, Mobile-first PWA)
│   │   ├── public/manifest.json               # Cấu hình PWA cài đặt ra màn hình chính (Chính 3)
│   │   ├── src/app/
│   │   │   ├── page.tsx                       # Màn hình danh mục món Menu (Chính 3)
│   │   │   ├── products/[id]/page.tsx         # Chi tiết & Tùy biến món (Chính 3)
│   │   │   ├── cart/page.tsx                  # Quản lý giỏ hàng (Chính 3)
│   │   │   ├── checkout/page.tsx              # Luồng thanh toán đơn hàng (Chính 3)
│   │   │   ├── login/page.tsx                 # Màn hình Đăng nhập / Profile (Phụ 2)
│   │   │   └── orders/page.tsx                # Màn hình Tra cứu đơn & Trạng thái pha chế (Phụ 2)
│   │   ├── src/store/useCartStore.ts          # Zustand / LocalStorage Cart Management (Chính 3)
│   │   ├── Dockerfile                         # Đóng gói Docker Frontend (Chính 1)
│   │   └── package.json
│   └── api/                                   # NestJS Backend theo Module/Domain
│       ├── prisma/
│       │   ├── schema.prisma                  # 7 Models + 5 Enums khớp 100% Class Diagram (Chính 2)
│       │   └── seed.ts                        # Kịch bản nạp dữ liệu mẫu khởi tạo DB (Phụ 1)
│       ├── src/modules/
│       │   ├── health/                        # API Health Check giám sát hệ thống (Phụ 3)
│       │   ├── products/                      # API Danh mục Sản phẩm Menu (Phụ 1)
│       │   ├── auth/                          # Xác thực JWT & Phân quyền (Chính 2)
│       │   ├── orders/                        # Xử lý Đơn hàng & Transaction trừ tồn kho (Chính 2)
│       │   └── payments/                      # Cổng thanh toán & Khóa Idempotency (Chính 2)
│       ├── Dockerfile                         # Đóng gói Docker Backend (Chính 1)
│       └── package.json
├── docs/                                      # Tài liệu & Diagram-as-Code phân công 6 thành viên
│   ├── requirements/                          # Task 1 (Context, SRS, Use-case Checkout)
│   ├── diagrams/                              # Task 2 (8 file .puml & 8 file .svg)
│   ├── architecture/                          # Task 3 (Overview & 3 bản ghi ADR)
│   ├── database-and-api-design.md             # Task 3 (Hồ sơ Chính 2)
│   ├── ui-ux-frontend-specification.md        # Task 3 (Hồ sơ Chính 3)
│   ├── traceability-matrix.md                 # Task 5 (Ma trận truy vết hai chiều)
│   └── deployment.md                          # Task 5 (Hướng dẫn vận hành & Biên bản 2 Sprint)
├── scripts/                                   # Tự động hóa render diagram & sequential git (Chính 1)
│   ├── render-diagrams.mjs                    # Xuất tự động .puml sang .svg
│   └── git-sequential-commits.sh              # Ghi nhận lịch sử Git 5 mốc tuần tự
├── tests/                                     # Bộ kiểm thử tích hợp E2E & Unit Tests (Phụ 3)
├── .github/workflows/                         # CI/CD Pipelines (Chính 1)
│   ├── ci.yml                                 # CI Pipeline (Install -> Lint -> Test -> Build)
│   └── cd.yml                                 # CD Pipeline (Quality Gate -> Docker -> GHCR -> Smoke Test)
├── docker-compose.yml                         # Cụm Docker hoàn chỉnh (Chính 1)
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG (QUICK START GUIDE)

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyên dùng)
Chỉ với 1 câu lệnh duy nhất:
```bash
# Sao chép file cấu hình môi trường
cp .env.example .env

# Khởi động toàn bộ Postgres (5432), API (4000) và Web (3000)
docker compose up --build -d
```
- **Web App (PWA):** [http://localhost:3000](http://localhost:3000)
- **API Swagger/Docs:** [http://localhost:4000](http://localhost:4000)
- **API Health Check:** [http://localhost:4000/health](http://localhost:4000/health)

### Cách 2: Khởi chạy thủ công ở môi trường phát triển (Local Development)

#### 1. Khởi động Backend API (`apps/api`):
```bash
cd apps/api
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

#### 2. Khởi động Frontend Web (`apps/web`):
```bash
cd apps/web
npm install
npm run dev
```

---

## 4. TÀI KHOẢN MẪU PHỤC VỤ NGHIỆM THU (TEST CREDENTIALS)

Tại màn hình Đăng nhập (`/login`), hệ thống tích hợp sẵn các nút bấm một chạm để tự động điền tài khoản:
- **Tài khoản Khách hàng (Customer):** `customer@brewlite.vn` / `123456`
- **Tài khoản Nhân viên (Staff):** `staff@brewlite.vn` / `123456`
- **Mã khuyến mãi có sẵn:** `WELCOME10` (Giảm 10% tối đa 50.000đ)

---

## 5. THỰC THI BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE)

```bash
# Chạy toàn bộ Unit & Integration Tests trên Backend:
cd apps/api
npm test

# Chạy kiểm thử luồng End-to-End:
npm run test:e2e
```
