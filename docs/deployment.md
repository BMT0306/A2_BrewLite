# TÀI LIỆU VẬN HÀNH, TRIỂN KHAI VÀ BIÊN BẢN SPRINT (DEPLOYMENT & SPRINT RETROSPECTIVE)
## DỰ ÁN HỆ THỐNG ĐẶT VÀ THANH TOÁN ĐỒ UỐNG BREWLITE – ASSIGNMENT 2

---

### THÔNG TIN HỒ SƠ THỰC HIỆN (PHÂN CÔNG CHẤM TIẾN ĐỘ TUẦN 9)
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Mã thành viên** | **Chính 1** |
| **Vai trò chuyên môn** | **System Architect & DevOps Lead** |
| **Tài liệu phụ trách** | `docs/deployment.md`, `docs/architecture/overview.md`, `.github/workflows/ci.yml`, `.github/workflows/cd.yml`, `docker-compose.yml` |
| **Phần code phụ trách** | Thiết lập hạ tầng Docker, hoàn thiện cấu hình CI/CD và quy trình giám sát tự động |
| **Mục đích in ấn Tuần 9** | Xuất trình hướng dẫn triển khai, kịch bản Smoke Test/Rollback và biên bản nghiệm thu hai chu kỳ Sprint |

---

## 1. QUY TRÌNH TỰ ĐỘNG HÓA ĐƯỜNG ỐNG CI/CD (GITHUB ACTIONS PIPELINES)

### 1.1. Đường ống Tích hợp Liên tục - CI Pipeline (`.github/workflows/ci.yml` - Task 4.4)
- **Sự kiện kích hoạt (Triggers):**
  - Mọi sự kiện `push` lên các nhánh tính năng (`feature/*`, `fix/*`).
  - Mọi sự kiện mở hoặc cập nhật `pull_request` vào nhánh `main` hoặc `develop`.
- **Chuỗi 4 bước thực thi tuần tự (Sequential Stages):**
  1. `Stage 1: Checkout & Setup Environment`: Tải mã nguồn, thiết lập môi trường Node.js 20/22 với cơ chế bộ nhớ đệm (npm cache).
  2. `Stage 2: Install Dependencies`: Cài đặt toàn bộ gói phụ thuộc đồng nhất qua `npm ci`.
  3. `Stage 3: Linting & Code Formatting`: Chạy kiểm tra tĩnh cú pháp mã nguồn và tuân thủ chuẩn TypeScript (`npm run lint`).
  4. `Stage 4: Automated Testing`: Chạy toàn bộ các bài kiểm thử đơn vị (`npm run test`).
  5. `Stage 5: Production Build`: Biên dịch ứng dụng Backend NestJS và Frontend Next.js (`npm run build`).

### 1.2. Đường ống Triển khai Liên tục - CD Pipeline (`.github/workflows/cd.yml` - Task 5.3)
- **Sự kiện kích hoạt (Triggers):**
  - Khi một PR được duyệt và merge vào nhánh `main`.
  - Khi gắn thẻ phiên bản phát hành chính thức (`git tag v*`).
- **Chuỗi quy trình triển khai và kiểm soát chất lượng (Deployment Stages):**
  1. `Quality Gate Stage`: Xác thực lại kết quả CI (đảm bảo không bao giờ deploy code lỗi).
  2. `Docker Build & Tagging`: Đóng gói Docker Image cho cả 2 dịch vụ (`api` và `web`), gắn thẻ phiên bản bằng Git Commit SHA ngắn (`${{ github.sha }}`) và thẻ `latest`.
  3. `Push to Registry`: Đẩy các image lên GitHub Container Registry (`ghcr.io/brewlite/api` và `ghcr.io/brewlite/web`) thông qua token xác thực `GITHUB_TOKEN`.
  4. `Cloud Deploy & Migration`: Kích hoạt Deploy Webhook tới hạ tầng Cloud (Render / Railway / VPS); tự động chạy lệnh `npx prisma migrate deploy` để đồng bộ CSDL trước khi kích hoạt container mới.
  5. `Automated Smoke Test`: Tự động gọi lệnh kiểm tra sức khỏe `curl -f -m 10 https://api.brewlite.vn/health`.
  6. `Automatic Rollback Trigger`: Nếu Smoke Test phản hồi mã lỗi khác 200 hoặc quá thời gian chờ (Timeout 10s), đường ống lập tức kích hoạt webhook hoàn tác (Rollback) về phiên bản commit SHA thành công liền kề trước đó và gửi cảnh báo đỏ.

---

## 2. QUẢN LÝ BÍ MẬT HẠ TẦNG (GITHUB SECRETS CONFIGURATION)

Để đảm bảo tính an toàn theo tiêu chuẩn `NFR-02`, các biến bí mật sau đây được cấu hình trong `Settings -> Secrets and variables -> Actions` của repository:

| Tên GitHub Secret | Ý Nghĩa / Mục Đích Sử Dụng | Môi Trường Áp Dụng |
| :--- | :--- | :---: |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL bảo mật trên Cloud | Production |
| `JWT_SECRET` | Khóa bí mật dùng để ký và xác thực chữ ký số JWT | Production |
| `RENDER_API_DEPLOY_HOOK` | URL Webhook kích hoạt tái triển khai dịch vụ Backend NestJS | Production |
| `RENDER_WEB_DEPLOY_HOOK` | URL Webhook kích hoạt tái triển khai dịch vụ Frontend Next.js | Production |
| `GHCR_TOKEN` | Token có quyền ghi đẩy container image lên GHCR | CI/CD |

---

## 3. HƯỚNG DẪN CHẠY CỤC BỘ BẰNG DOCKER COMPOSE (LOCAL RUNBOOK)

Hệ thống được đóng gói để bất kỳ ai tải repository về đều có thể chạy hoàn chỉnh chỉ với **1 câu lệnh duy nhất**:

```bash
# 1. Sao chép biến môi trường mẫu
cp .env.example .env

# 2. Khởi tạo và khởi động toàn bộ cụm dịch vụ (Postgres + NestJS API + Next.js Web)
docker compose up --build -d

# 3. Theo dõi nhật ký khởi động (Logs)
docker compose logs -f
```

- **Truy cập ứng dụng:**
  - Frontend Web di động: `http://localhost:3000`
  - Backend REST API: `http://localhost:4000`
  - API Health Check: `http://localhost:4000/health`
  - PostgreSQL Database: `localhost:5432` (User: `brewlite`, Pass: `secret`, DB: `brewlite_db`)

---

## 4. BIÊN BẢN SPRINT REVIEW & SPRINT RETROSPECTIVE (2 SPRINT CHUẨN MỰC)

### 4.1. SPRINT 1: KHỞI TẠO NỀN TẢNG, MÔ HÌNH HÓA VÀ MVP XEM MENU
- **Khoảng thời gian:** Tuần 7 - Tuần 8.
- **Mục tiêu Sprint 1:** Thiết lập Monorepo, hoàn thành tài liệu Yêu cầu (Task 1), mô hình hóa 7 sơ đồ UML (Task 2), thiết kế Kiến trúc & ADR (Task 3), hiện thực cơ sở dữ liệu và MVP chức năng Xem Menu / Chi tiết món (Task 4).

#### Biên bản Sprint Review 1:
- **Hạng mục đã hoàn thành:**
  - [x] Khởi tạo khung thư mục Monorepo chuẩn mực theo Phần 1.
  - [x] Soạn thảo đầy đủ 3 file tài liệu yêu cầu: Bối cảnh Stakeholder, SRS MoSCoW, và Ca sử dụng Checkout.
  - [x] Vẽ và kết xuất 7 sơ đồ PlantUML sang SVG chuẩn xác thông qua script `render-diagrams.mjs`.
  - [x] Thiết lập `schema.prisma` khớp 100% với Domain Class Diagram (7 bảng, 5 enums).
  - [x] Cài đặt module `ProductsModule` và `HealthModule` trên NestJS.
  - [x] Xây dựng màn hình Menu (`/`) và Chi tiết món (`/products/[id]`) trên Next.js Mobile-first với đầy đủ 4 trạng thái (Loading, Empty, Error, Out-of-Stock).
  - [x] Thiết lập workflow CI tự động kiểm tra cú pháp và build.
- **Demo nghiệm thu:** Giảng viên duyệt qua danh mục đồ uống trên điện thoại, kiểm tra thử món hết hàng (`stockQuantity = 0`) hiển thị nhãn đỏ chính xác.

#### Biên bản Sprint Retrospective 1:
- **Điểm tích cực (What went well):**
  - Việc chia rõ vai trò cho 6 thành viên (3 Chính - 3 Phụ) giúp tiến độ không bị chồng chéo.
  - Sơ đồ PlantUML lưu dạng code giúp quản lý phiên bản trên Git rất thuận tiện.
- **Điểm cần cải tiến (What could be improved):**
  - Cần thống nhất chặt chẽ hơn về DTO giữa Frontend và Backend trước khi code để giảm thời gian ghép nối.
- **Hành động khắc phục cho Sprint 2 (Action Items):**
  - Khóa chặt API Contract trong `docs/database-and-api-design.md` trước khi code luồng Đặt hàng và Thanh toán.

---

### 4.2. SPRINT 2: HOÀN TẤT ĐẶT ĐƠN, THANH TOÁN IDEMPOTENCY, CI/CD & TRACEABILITY
- **Khoảng thời gian:** Tuần 8 - Tuần 9.
- **Mục tiêu Sprint 2:** Hiện thực Giỏ hàng (FR-03), Đăng nhập JWT (FR-04), Đặt đơn nguyên tử (FR-05), Thanh toán Idempotency & Hoàn kho (FR-06), Theo dõi đơn (FR-07, FR-08), đường ống CD, kiểm thử tự động và ma trận truy vết (Task 5).

#### Biên bản Sprint Review 2:
- **Hạng mục đã hoàn thành:**
  - [x] Cài đặt kho giỏ hàng `useCartStore` lưu trữ LocalStorage, tự động tính tổng tiền.
  - [x] Hoàn thiện `AuthModule` (đăng ký, đăng nhập JWT, mật khẩu băm `bcrypt`).
  - [x] Cài đặt `OrdersModule` với cơ chế Database Transaction nguyên tử, chặn đứng rủi ro mua vượt tồn kho (HTTP 409).
  - [x] Cài đặt `PaymentsModule` hỗ trợ Header `Idempotency-Key` (chống trừ tiền 2 lần) và cơ chế hoàn tồn kho tự động khi thanh toán lỗi (HTTP 402).
  - [x] Thiết kế giao diện Checkout trực quan với bảng điều khiển cho phép Giảng viên thử nghiệm cả 2 kịch bản Thanh toán Thành công và Thất bại.
  - [x] Xây dựng màn hình Lịch sử đơn (`/orders`) có thanh tiến trình trạng thái và chức năng cho nhân viên đổi trạng thái chế biến.
  - [x] Thiết lập trọn vẹn đường ống CD tự động đẩy Docker Image lên GHCR và chạy Smoke Test `GET /health`.
  - [x] Hoàn tất Bảng Ma trận Truy vết hai chiều (`traceability-matrix.md`) ánh xạ 100% từ yêu cầu đến mã nguồn và bài test.
- **Demo nghiệm thu:** Trình diễn thành công kịch bản thanh toán Idempotency và kịch bản hoàn kho tự động trước hội đồng đánh giá.

#### Biên bản Sprint Retrospective 2:
- **Điểm tích cực (What went well):**
  - Tuân thủ tuyệt đối quy tắc tuần tự 5 task trên Git.
  - Hệ thống vận hành trơn tru và đồng bộ 100% giữa Sơ đồ, Tài liệu và Mã nguồn thực tế.
  - Sẵn sàng xuất sắc cho kỳ chấm tiến độ sau Tuần 9 và bảo vệ đồ án cuối kỳ.
- **Kết luận:** Dự án BrewLite đạt toàn bộ mục tiêu đề ra với chất lượng chuyên nghiệp của một Principal Software Engineer.
