# HƯỚNG DẪN KIỂM THỬ TOÀN DIỆN VÀ TRÌNH DIỄN CI/CD (BREWLITE)

### THÔNG TIN HỒ SƠ THỰC HIỆN (PHÂN CÔNG CHẤM TIẾN ĐỘ TUẦN 9)
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Họ và tên sinh viên** | **Trần Lê Minh Tâm** |
| **Mã thành viên** | **Chính 1** |
| **Vai trò chuyên môn** | **System Architect & DevOps Lead** |
| **Tài liệu & Kịch bản phụ trách** | `docs/testing.md`, Newman CLI runner `scripts/run-postman-suite.js`, Bộ test Postman `tests/postman/` |

---

## 1. TỔNG QUAN CHIẾN LƯỢC KIỂM THỬ 3 TẦNG (TEST PYRAMID)

Hệ thống BrewLite được xây dựng theo chuẩn công nghiệp với **3 tầng kiểm thử tự động**, đạt độ bao phủ (coverage) toàn diện cho tất cả Use Case và Function Requirement trong đề bài Assignment 2:

```
                  ▲
                 / \
                /   \     TẦNG 3: Postman / Newman Regression Suite
               /     \    14 API Scenarios | 29 Assertions (E2E API Gate)
              /-------\
             /         \   TẦNG 2: Integration Tests (Jest E2E)
            /           \  INT-T01 -> INT-T04 (Atomic Transaction & Idempotency)
           /-------------\
          /               \ TẦNG 1: Unit Tests (Jest)
         /                 \14 Service Tests (Auth, Products, Orders, Payments)
        ---------------------
```

### Bảng Thống Kê Các Bộ Kiểm Thử
| Tầng kiểm thử | Công cụ | Số lượng kiểm thử | Kết quả | Thời gian chạy |
| :--- | :--- | :---: | :---: | :---: |
| **Unit Test** | Jest / TypeScript | 14 test cases | 🟢 **14/14 PASS (100%)** | ~6.5s |
| **Integration Test** | Jest / Supertest | 4 test cases | 🟢 **4/4 PASS (100%)** | ~2.5s |
| **Postman API Test** | Postman / Newman CLI | 14 requests / 29 assertions | 🟢 **29/29 PASS (100%)** | ~1.5s |
| **TỔNG CỘNG** | **Tự động hóa hoàn toàn** | **32 Kịch bản kiểm thử** | 🟢 **32/32 PASS (100%)** | **~10s** |

---

## 2. HƯỚNG DẪN CHẠY KIỂM THỬ TẠI MÁY CỤC BỘ (LOCAL DEMO)

### Cách 1: Chạy toàn bộ 3 tầng kiểm thử bằng 1 lệnh duy nhất (Khuyên dùng khi demo cho thầy)
Mở terminal tại thư mục gốc dự án (`c:\CNPM\A2`) và chạy:
```bash
npm run test:all
```
*Lệnh này sẽ tự động chạy tuần tự:*
1. Toàn bộ 14 bài Unit Test của các module Backend.
2. 4 bài Integration Test kiểm tra giao dịch đặt hàng nguyên tử và bù trừ kho.
3. Tự động khởi động API server ngầm, kích hoạt Newman CLI chạy trọn vẹn 14 request Postman và in bảng thống kê xanh 100%.

---

### Cách 2: Chạy kiểm thử Postman tự động qua dòng lệnh (Newman CLI)
```bash
npm run test:postman
```
*Đầu ra hiển thị trực tiếp trên terminal với 29/29 assertions xanh lá:*
```text
┌─────────────────────────┬──────────────────┬──────────────────┐
│                         │         executed │           failed │
├─────────────────────────┼──────────────────┼──────────────────┤
│              iterations │                1 │                0 │
│                requests │               14 │                0 │
│              assertions │               29 │                0 │
└─────────────────────────┴──────────────────┴──────────────────┘
🎉 TẤT CẢ 14 KIỂM THỬ POSTMAN ĐỀU ĐÃ VƯỢT QUA XUẤT SẮC (PASS 100%)!
```

---

### Cách 3: Chạy trực quan trên ứng dụng Postman Desktop (GUI)
Nếu thầy yêu cầu mở phần mềm **Postman** trên laptop để xem trực quan:

1. **Bước 1 - Khởi động Backend API:**
   ```bash
   npm run build:api
   npm run start:api
   ```
   *(Server sẽ online tại: `http://localhost:4000`, Healthcheck: `http://localhost:4000/health`)*

2. **Bước 2 - Import Collection & Environment vào Postman:**
   * Mở ứng dụng **Postman**.
   * Nhấn nút **Import** (góc trên bên trái).
   * Chọn kéo thả 2 file sau từ thư mục dự án:
     * File Collection: `tests/postman/BrewLite_API.postman_collection.json`
     * File Môi trường: `tests/postman/BrewLite_Local.postman_environment.json`

3. **Bước 3 - Chọn Environment:**
   * Ở góc trên bên phải màn hình Postman, chọn dropdown môi trường là **`BrewLite Local Environment`**.

4. **Bước 4 - Chạy Runner:**
   * Nhấp chuột phải vào thư mục **BrewLite Backend REST API Test Suite** -> Chọn **Run collection**.
   * Nhấn nút cam **Run BrewLite Backend REST API Test Suite**.
   * Toàn bộ 14 kịch bản kiểm thử sẽ chạy tuần tự và hiển thị dấu tích xanh `Pass` cho từng assertion!

---

## 3. DANH SÁCH CHI TIẾT 14 KỊCH BẢN KIỂM THỬ POSTMAN

Bộ test Postman được thiết kế liên kết dữ liệu tự động giữa các bước (Chaining Variables):

1. **`GET /health` (Health Check):** Giám sát trạng thái sẵn sàng của dịch vụ, trả về 200 OK, latency < 500ms.
2. **`GET /` (Service Info):** Xác nhận metadata dịch vụ BrewLite REST API.
3. **`POST /auth/register` (Đăng ký tài khoản mới):** Tự động sinh email ngẫu nhiên theo timestamp, kiểm tra mã HTTP 201 Created và trả về Token JWT.
4. **`POST /auth/login` (Đăng nhập thành công):** Đăng nhập tài khoản khách hàng chuẩn, tự động trích xuất `accessToken` và lưu vào biến môi trường `{{authToken}}`.
5. **`POST /auth/login` (Đăng nhập sai mật khẩu - Kiểm thử biên):** Truyền sai mật khẩu, kiểm tra phản hồi đúng mã HTTP 401 Unauthorized.
6. **`GET /products` (Xem thực đơn đồ uống):** Kiểm tra danh mục món, các tuỳ chọn Size (S/M/L) và Topping, tự động lưu `{{productId}}` món đầu tiên.
7. **`GET /products?category=Coffee` (Lọc theo danh mục):** Kiểm tra chức năng lọc món theo nhóm Cà phê.
8. **`GET /products/{{productId}}` (Chi tiết món):** Tra cứu bảng giá và công thức tùy biến.
9. **`POST /orders` (Tạo đơn hàng nguyên tử):** Sử dụng Bearer `{{authToken}}`, tính toán đơn giá, trừ tồn kho và lưu mã `{{orderId}}` mới sinh.
10. **`GET /orders` (Lịch sử đơn hàng của khách):** Xác nhận đơn hàng vừa tạo xuất hiện trong lịch sử của người dùng.
11. **`GET /orders/{{orderId}}` (Tra cứu trạng thái đơn):** Kiểm tra chi tiết đơn hàng theo mã ID.
12. **`POST /payments` (Thanh toán lần đầu với Idempotency-Key):** Truyền Header `Idempotency-Key: UUIDv4`, chuyển đơn sang trạng thái `CONFIRMED` và thanh toán `PAID`.
13. **`POST /payments` (Gửi lại cùng Idempotency-Key - Chống trừ tiền trùng):** Gửi lại chính xác request trên với cùng key, hệ thống nhận diện giao dịch trùng lặp và trả về biên nhận đã lưu trong bộ nhớ đệm mà không trừ tiền lần 2.
14. **`PATCH /orders/{{orderId}}/status` (Pha chế / Cập nhật tiến độ):** Chuyển trạng thái đơn sang `COMPLETED` hoàn tất đơn hàng.

---

## 4. KỊCH BẢN TRÌNH DIỄN CI/CD CHO GIẢNG VIÊN (VAI TRÒ KỸ SƯ TRƯỞNG)

Khi thầy yêu cầu: *"Show CI/CD như thế nào?"*, bạn thực hiện theo 4 bước trình bày chuyên nghiệp sau:

### Bước 1: Mở Tab GitHub Actions trên trình duyệt
* Truy cập: `https://github.com/BMT0306/A2_BrewLite/actions`
* Chỉ cho thầy thấy quy trình **BrewLite CI Pipeline (Task 4.4)** có biểu tượng **Tích Xanh (Success)**.

### Bước 2: Thuyết minh kiến trúc Pipeline CI/CD (Theo đúng sơ đồ `deployment-prod.puml`)
Nói với thầy:
> *"Thưa thầy, hệ thống CI/CD của BrewLite được Kỹ sư Trưởng thiết lập tự động hóa theo chuẩn Monorepo với 10 Quality Gates nghiêm ngặt nhằm đảm bảo không có bất kỳ commit lỗi nào có thể lọt vào nhánh main:"*

1. **Quality Gate 1 - Multi-Service Container:** Tự động kích hoạt cơ sở dữ liệu cô lập PostgreSQL 16 Alpine với cơ chế `healthcheck: pg_isready` để phục vụ chạy kiểm thử.
2. **Quality Gate 2 - Environment Setup:** Khởi tạo môi trường chuẩn Node.js 20 LTS.
3. **Quality Gate 3 & 4 - Isolated Dependency Installation:** Cài đặt dependencies độc lập, tối ưu cache cho cả `apps/api` (NestJS) và `apps/web` (Next.js 14).
4. **Quality Gate 5 - Database Schema Integrity:** Tự động biên dịch Prisma Client từ `schema.prisma`.
5. **Quality Gate 6 - Static Code Quality & Linting:** Thực thi kiểm tra kiểu tĩnh TypeScript nghiêm ngặt (`tsc --noEmit`).
6. **Quality Gate 7 - Automated Unit & Integration Tests:** Chạy toàn bộ 18 test cases của Jest (kiểm tra Idempotency, Compensating Transaction hoàn kho khi thanh toán lỗi).
7. **Quality Gate 8 & 9 - Production Build Verification:** Biên dịch độc lập mã nguồn Backend (`nest build`) và Frontend (`next build`) đảm bảo 100% không lỗi SSR/CSR.
8. **Quality Gate 10 - Automated Postman API Regression:** Khởi chạy Newman CLI kiểm thử toàn bộ 14 endpoint API trước khi cho phép Merge PR.

### Bước 3: Show Pipeline CD tự động triển khai (Continuous Deployment)
* Mở file `.github/workflows/cd.yml` và sơ đồ kiến trúc triển khai `docs/diagrams/deployment-prod.svg`:
  * Tự động build **Docker Container** cho cả Backend API và Web PWA khi code được merge vào `main`.
  * Thực thi **Automated Smoke Test** bằng cách ping vào endpoint `/health` trên container vừa triển khai. Nếu status trả về `ok`, hệ thống mới đánh dấu bản deploy thành công.

### Bước 4: Trình diễn Live Terminal tại chỗ (Tạo ấn tượng tuyệt đối)
Mở ngay terminal trên máy bạn và gõ:
```bash
npm run test:all
```
Trong 10 giây, toàn bộ Unit Test, Integration Test và Postman Test sẽ chạy vèo vèo và in ra chữ **PASS 100%**. Đây là minh chứng rõ ràng nhất cho thấy nhóm tự làm, code thật, test thật và tuân thủ chặt chẽ yêu cầu của thầy.

