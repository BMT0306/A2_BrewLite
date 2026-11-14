# ĐẶC TẢ GIAO DIỆN NGƯỜI DÙNG VÀ TRẢI NGHIỆM KHÁCH HÀNG (UI/UX & FRONTEND SPECIFICATION)
## DỰ ÁN HỆ THỐNG ĐẶT VÀ THANH TOÁN ĐỒ UỐNG BREWLITE – ASSIGNMENT 2

---

### THÔNG TIN HỒ SƠ THỰC HIỆN (PHÂN CÔNG CHẤM TIẾN ĐỘ TUẦN 9)
| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Họ và tên sinh viên** | **Bùi Minh Trung** |
| **Mã thành viên** | **Chính 3** |
| **Họ và tên** | **Bùi Minh Trung** |
| **Vai trò chuyên môn** | **Frontend & PWA Lead** |
| **Tài liệu phụ trách** | `docs/ui-ux-frontend-specification.md`, `docs/diagrams/activity-menu-cart.puml` / `.svg`, `docs/diagrams/activity-auth-order-tracking.puml` / `.svg` |
| **Phần code phụ trách** | Khung PWA (`manifest.json`, `layout.tsx`), Trang chủ Menu (`page.tsx`), Tùy biến món (`products/[id]/page.tsx`), Giỏ hàng & Thanh toán (`cart/page.tsx`, `checkout/page.tsx`, `useCartStore.ts`) |
| **Mục đích in ấn Tuần 9** | Xuất trình tài liệu thiết kế giao diện di động, cấu trúc thành phần (Component Hierarchy) và xử lý trạng thái người dùng |

---

## 1. NGUYÊN TẮC THIẾT KẾ & TIÊU CHUẨN PWA (DESIGN PRINCIPLES & PWA)

### 1.1. Triết lý Thiết kế Mobile-First
Giao diện BrewLite được thiết kế ưu tiên tối đa cho trải nghiệm trên màn hình điện thoại di động (Mobile-first, tối ưu cho kích thước chiều rộng từ **375px đến 430px** tương ứng các dòng iPhone và điện thoại Android hiện đại):
- **Khung chứa ứng dụng (App Container):** Trên màn hình máy tính để bàn (Desktop), nội dung được hiển thị dưới dạng khung mô phỏng điện thoại di động ở chính giữa màn hình (tối đa `max-w-md`), nền ngoài xám nhẹ sang trọng giúp giảng viên và người dùng dễ dàng trải nghiệm như trên thiết bị thật.
- **Thao tác một tay (Thumb Zone Optimization):** Thanh điều hướng chính (Bottom Navigation Bar) và các nút bấm hành động then chốt (Thêm vào giỏ, Đặt đơn, Thanh toán) được cố định ở đáy màn hình (Fixed Bottom Bar), vừa vặn tầm với của ngón tay cái.
- **Bảng màu chủ đạo (Color Palette):**
  - Màu thương hiệu chính (Primary): Xanh ngọc đậm sang trọng (Emerald / Deep Teal `#0f766e` & `#14b8a6`).
  - Màu nền: Trắng tinh khôi và xám ấm (`#f8fafc`, `#f1f5f9`).
  - Màu nhấn trạng thái: Xanh lá (`#16a34a` - Thành công/Sẵn sàng), Vàng cam (`#ea580c` - Đang pha chế), Đỏ (`#dc2626` - Hết hàng/Thất bại).

### 1.2. Tiêu chuẩn Progressive Web App (PWA)
- Tệp cấu hình `apps/web/public/manifest.json` khai báo:
  - `name`: "BrewLite Coffee & Tea Ordering"
  - `short_name`: "BrewLite"
  - `start_url`: "/"
  - `display`: "standalone" (ẩn thanh URL trình duyệt khi người dùng lưu ra màn hình chính)
  - `theme_color`: "#0f766e"
  - `background_color`: "#f8fafc"
  - Bộ biểu tượng nhận diện kích thước 192x192 và 512x512.

---

## 2. KIẾN TRÚC THÀNH PHẦN VÀ CẤU TRÚC ĐIỀU HƯỚNG (COMPONENT HIERARCHY)

```text
apps/web/src/app/
├── layout.tsx                     # Khung viền chung, Header thương hiệu, Bottom Navigation Bar
├── page.tsx                       # Màn hình Trang chủ Menu (FR-01)
├── products/
│   └── [id]/
│       └── page.tsx               # Màn hình Chi tiết Món & Chọn Size/Topping (FR-02)
├── cart/
│   └── page.tsx                   # Màn hình Giỏ hàng & Tạm tính (FR-03)
├── login/
│   └── page.tsx                   # Màn hình Đăng nhập & Đăng ký tài khoản (FR-04)
├── checkout/
│   └── page.tsx                   # Màn hình Đặt đơn & Thanh toán Mô phỏng (FR-05, FR-06)
└── orders/
    └── page.tsx                   # Màn hình Lịch sử & Theo dõi tiến trình đơn hàng (FR-07, FR-08)
```

---

## 3. CHI TIẾT CÁC MÀN HÌNH VÀ XỬ LÝ 4 TRẠNG THÁI GIAO DIỆN

### 3.1. Màn hình Trang chủ Menu (`/`) – Đáp ứng FR-01
- **Phân loại danh mục (Category Tabs):** Tất cả (All), Cà phê (Coffee), Trà trái cây (Tea), Trà sữa (MilkTea), Đá xay (Freeze). Người dùng nhấn tab để lọc danh sách tức thì.
- **Thanh tìm kiếm (Search Bar):** Nhập từ khóa tên đồ uống để lọc nhanh không cần tải lại trang.
- **Xử lý 4 Trạng thái bắt buộc:**
  1. *Đang tải (Loading State):* Hiển thị 6 thẻ khung xương (Skeleton Cards) nhấp nháy tạo cảm giác ứng dụng phản hồi mượt mà.
  2. *Dữ liệu rỗng (Empty State):* Khi không tìm thấy sản phẩm hoặc danh mục chưa có món, hiển thị hình minh họa ly nước rỗng kèm thông điệp: *"Chưa có đồ uống nào phù hợp với tìm kiếm của bạn"*.
  3. *Lỗi kết nối (Error State):* Khi API mất kết nối hoặc trả về mã lỗi 500, hiển thị hộp thoại cảnh báo lỗi đỏ kèm nút bấm **"Thử lại"** để người dùng gọi lại API `GET /products`.
  4. *Hết hàng (Out-of-Stock Badge):* Đối với sản phẩm có `stockQuantity <= 0` hoặc `isAvailable = false`, hiển thị nhãn đỏ **"TẠM HẾT HÀNG"**, làm mờ ảnh sản phẩm và chuyển nút bấm sang trạng thái vô hiệu hóa.

### 3.2. Màn hình Chi tiết Món (`/products/[id]`) – Đáp ứng FR-02
- **Hình ảnh & Thông tin sản phẩm:** Ảnh chất lượng cao, tên món, mô tả chi tiết và số lượng tồn kho còn lại (`Còn lại: X ly`).
- **Chọn Kích thước (Size Selector):**
  - Size S: Mặc định (+0đ).
  - Size M: +6.000đ.
  - Size L: +10.000đ.
- **Chọn Topping (Multi-select Toppings):** Danh sách checkbox chọn các loại topping (Trân châu đen +5.000đ, Thạch nha đam +6.000đ, Kem cheese +10.000đ).
- **Bộ đếm số lượng (Quantity Counter):** Cho phép tăng/giảm số lượng ly. Nếu người dùng chọn vượt quá `stockQuantity`, hệ thống tự động khóa nút tăng và hiển thị thông báo: *"Chỉ còn tối đa X ly trong kho"*.
- **Nút hành động cố định đáy:** Hiển thị tổng tiền tính toán theo công thức: `(basePrice + sizePrice + toppingsTotal) * quantity` và nút **"Thêm vào giỏ hàng"**.

### 3.3. Màn hình Giỏ hàng (`/cart`) – Đáp ứng FR-03
- **Danh sách món trong giỏ:** Mỗi dòng sản phẩm hiển thị ảnh, tên món, kích cỡ, danh sách topping đã chọn, đơn giá và nút tăng/giảm số lượng hoặc xóa dòng.
- **Tính toán tài chính:**
  - Tạm tính (`subtotal`): Tổng các dòng sản phẩm.
  - Phí đóng gói/dịch vụ: Miễn phí (0đ).
  - Tổng thanh toán: Cập nhật tự động theo thời gian thực.
- **Trạng thái giỏ rỗng:** Nếu chưa có món, hiển thị nút bấm điều hướng **"Khám phá Menu ngay"**.
- **Nút "Tiến hành Đặt đơn":** Nếu người dùng chưa đăng nhập, tự động lưu giỏ và chuyển hướng sang `/login?redirect=/checkout`. Nếu đã đăng nhập, chuyển hướng sang `/checkout`.

### 3.4. Màn hình Đăng nhập & Đăng ký (`/login`) – Đáp ứng FR-04
- Giao diện chuyển đổi tab linh hoạt giữa **"Đăng nhập"** và **"Đăng ký tài khoản mới"**.
- **Tài khoản dùng thử một chạm (Quick Test Credentials):** Cung cấp các nút bấm điền tự động tài khoản mẫu (`customer@brewlite.vn` / `123456` và `staff@brewlite.vn` / `123456`) để giảng viên nghiệm thu đồ án không phải mất công gõ tay.
- Sau khi xác thực thành công, mã JWT được ghi vào `localStorage` và chuyển hướng quay lại trang trước đó.

### 3.5. Màn hình Thanh toán (`/checkout`) – Đáp ứng FR-05 & FR-06
- **Tóm tắt đơn hàng:** Hiển thị danh sách món tóm gọn và tổng tiền cần thanh toán.
- **Phương thức thanh toán:**
  - `WALLET`: Ví điện tử (MoMo / ZaloPay / ShopeePay).
  - `CARD`: Thẻ ngân hàng nội địa / Quốc tế (Visa / Master).
- **Bảng điều khiển Giả lập cho Giảng viên (Demo Control Panel):**
  - Hộp kiểm hoặc nút bấm trực quan: **"Giả lập Thanh toán Thành công"** vs **"Giả lập Thanh toán Thất bại"** (gửi trường `simulateFailure: true`).
  - Giúp hội đồng nghiệm thu dễ dàng quan sát:
    - *Khi Thành công:* Đơn hàng chuyển sang `CONFIRMED`, thanh toán `PAID`, giỏ hàng được làm sạch và chuyển sang trang xem đơn.
    - *Khi Thất bại:* Báo lỗi thanh toán `402 Payment Required`, đơn hàng chuyển sang `PAYMENT_FAILED`, cơ sở dữ liệu tự động hoàn trả số lượng tồn kho `stockQuantity` ngay trước mắt.

### 3.6. Màn hình Đơn hàng của tôi (`/orders`) – Đáp ứng FR-07 & FR-08
- Hiển thị danh sách các đơn hàng đã đặt kèm mã đơn hàng (`orderCode`) và ngày giờ đặt.
- **Dòng tiến trình trạng thái trực quan (Status Stepper):**
  - `CONFIRMED`: Đơn đã được tiếp nhận và thanh toán thành công.
  - `PREPARING`: Nhân viên đang tiến hành pha chế.
  - `READY`: Đồ uống đã hoàn tất, mời khách tới quầy nhận.
  - `COMPLETED`: Đơn hàng hoàn tất phục vụ.
- **Giao diện dành cho Nhân viên (Staff Action):** Nếu đăng nhập bằng tài khoản `staff@brewlite.vn`, trên mỗi đơn hàng sẽ xuất hiện nút bấm cập nhật trạng thái nhanh (VD: *"Chuyển sang Đang pha chế"*, *"Báo Đồ uống đã sẵn sàng"*, *"Hoàn tất đơn"*).

---

## 4. QUẢN LÝ TRẠNG THÁI GIỎ HÀNG (STATE MANAGEMENT SPECIFICATION)

Kho lưu trữ trạng thái giỏ hàng được cài đặt trong `apps/web/src/store/useCartStore.ts` với các hàm nghiệp vụ:
- `items: CartItem[]`: Mảng lưu trữ danh sách sản phẩm trong giỏ.
- `addItem(item)`: Thêm một món mới hoặc tăng số lượng nếu đã có món trùng cấu hình (cùng `productId`, cùng `size`, cùng mảng `toppings`).
- `updateQuantity(itemId, quantity)`: Thay đổi số lượng mua của một món.
- `removeItem(itemId)`: Xóa một dòng món khỏi giỏ.
- `clearCart()`: Làm sạch toàn bộ giỏ hàng sau khi thanh toán thành công.
- `getSubtotal()`: Hàm tính toán tổng tiền tạm tính của toàn bộ giỏ hàng.
- **Đồng bộ Bền vững (Persistence):** Toàn bộ trạng thái giỏ hàng được lưu trữ và khôi phục tự động từ `window.localStorage` với khóa `brewlite_cart_v1`.
