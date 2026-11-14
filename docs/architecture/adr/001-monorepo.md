# BẢN GHI QUYẾT ĐỊNH KIẾN TRÚC: ADR-001 - TỔ CHỨC CẤU TRÚC MONOREPO CHO DỰ ÁN
## ARCHITECTURE DECISION RECORD 001: MONOREPO STRUCTURE

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
Dự án BrewLite bao gồm nhiều tạo phẩm kỹ thuật: Giao diện người dùng web di động (Next.js), Ứng dụng Backend API (NestJS), Lược đồ CSDL và Migration (Prisma), Bộ tài liệu kỹ thuật (Markdown trong `docs/`), Tập hợp sơ đồ mô hình hóa (.puml và .svg trong `docs/diagrams/`), Bộ kịch bản kiểm thử (E2E & Integration tests) và Cấu hình tự động hóa đường ống CI/CD.

Nhóm phát triển gồm 6 thành viên (3 Chính và 3 Phụ) cần phối hợp chặt chẽ theo quy trình 5 Task tuần tự của học phần Công nghệ Phần mềm. Việc tách thành nhiều kho lưu trữ riêng biệt (Multi-repo) tiềm ẩn nguy cơ lệch pha giữa tài liệu, sơ đồ và mã nguồn; đồng thời gây khó khăn cho giảng viên và hội đồng trong việc đánh giá lịch sử commit tuần tự và ma trận truy vết.

## 2. QUYẾT ĐỊNH KIẾN TRÚC (DECISION)
Nhóm quyết định áp dụng mô hình **Monorepo** trong đó toàn bộ mã nguồn, tài liệu, sơ đồ và cấu hình triển khai được lưu trữ tập trung trong duy nhất một repository Git có cấu trúc như sau:
- `apps/web`: Ứng dụng Next.js Mobile-first PWA.
- `apps/api`: Dịch vụ Backend NestJS kết hợp Prisma ORM.
- `docs/`: Toàn bộ tài liệu nghiệp vụ, kiến trúc, thiết kế và sơ đồ PlantUML + SVG.
- `scripts/`: Bộ công cụ tự động hóa xuất sơ đồ và tạo commit tuần tự.
- `tests/`: Bộ kiểm thử tích hợp và kiểm thử đầu cuối.
- `.github/workflows/`: Quy trình CI và CD tự động hóa cho toàn bộ hệ thống.

## 3. CÁC PHƯƠNG ÁN ĐÃ XEM XÉT (CONSIDERED OPTIONS)
1. **Phương án A: Multi-repo (Tách riêng repo web, repo api, repo docs):**
   - *Ưu điểm:* Quản lý phân quyền độc lập, kích thước từng repo nhỏ.
   - *Nhược điểm:* Khó đồng bộ phiên bản giữa frontend và backend; không thể thực hiện kiểm tra chéo (Atomic PR); không thể duy trì lịch sử 5 task tuần tự thống nhất trên một cây commit duy nhất; vi phạm nguyên tắc thiết kế khóa chặt với code.
2. **Phương án B: Monorepo hợp nhất (Được lựa chọn):**
   - *Ưu điểm:* Đảm bảo tính nhất quán 100% giữa Sơ đồ, Tài liệu và Mã nguồn; dễ dàng truy vết hai chiều; đơn giản hóa cấu hình Docker Compose và CI/CD; phản ánh minh bạch toàn bộ đóng góp của 6 thành viên.
   - *Nhược điểm:* Cần cấu hình đường dẫn chặt chẽ trong workflow GitHub Actions để tránh build thừa các phần không thay đổi.

## 4. HỆ QUẢ VÀ TÁC ĐỘNG (CONSEQUENCES)
- **Tích cực:** Mọi thay đổi về Database Schema trong `apps/api/prisma/schema.prisma` có thể được đối chiếu và commit cùng lúc với `docs/diagrams/class-domain.puml`, đảm bảo 0% độ lệch pha. Quá trình chấm tiến độ Tuần 9 và bảo vệ cuối kỳ diễn ra trơn tru trên 1 link repo duy nhất.
- **Tiêu cực:** Đòi hỏi các thành viên phải tuân thủ nghiêm ngặt quy tắc commit và không tự ý sửa đổi các file nằm ngoài phạm vi phân công của mình.
