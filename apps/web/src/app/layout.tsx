/**
 * @file layout.tsx
 * @description Khung ứng dụng chung (Root Layout):
 *              - Tự động co giãn Responsive hoàn hảo: trải rộng đa cột trên Desktop, tinh gọn trên Mobile.
 *              - Tông màu Cà phê & Trà thủ công cao cấp.
 *              - Navbar đỉnh cao trên Desktop & Bottom Navigation trên Mobile PWA.
 * @author Thành viên Chính 3: Bùi Minh Trung - Frontend & PWA Lead
 * @see docs/ui-ux-frontend-specification.md (Mục 1.1 Mobile-first, 1.2 PWA, 2 Component Hierarchy)
 */

import type { Metadata, Viewport } from 'next';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrewLite – Hệ Thống Cà Phê & Trà Không Dùng Tiền Mặt',
  description: 'Đặt món, tùy biến đồ uống và thanh toán thông minh không dùng tiền mặt BrewLite',
  manifest: '/manifest.json',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2c1810',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-[#faf7f2] text-stone-900 min-h-screen flex flex-col antialiased">
        {/* Thanh điều hướng chính (Top Navbar) */}
        <Navbar />

        {/* Nội dung trang: Tự động co giãn theo màn hình (Full-width responsive trên Desktop) */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
          {children}
        </main>

        {/* Chân trang Desktop */}
        <footer className="hidden md:block bg-[#24130b] text-amber-200/70 border-t border-amber-950/60 py-8 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">☕</span>
              <span className="font-extrabold text-white text-sm">BrewLite Coffee & Tea Roastery</span>
              <span className="text-stone-500">|</span>
              <span>Đồ uống thủ công chuẩn vị · Thanh toán không tiền mặt</span>
            </div>
            <div className="text-amber-200/50">
              © 2026 BrewLite Monorepo. Giờ phục vụ: 07:00 – 22:30 hàng ngày.
            </div>
          </div>
        </footer>

        {/* Thanh điều hướng cố định đáy dành riêng cho điện thoại */}
        <BottomNav />
      </body>
    </html>
  );
}
