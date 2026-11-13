/**
 * @file layout.tsx
 * @description Khung ứng dụng chung (App Container): Header thương hiệu + nội dung trang + Bottom Navigation.
 *              Khai báo PWA manifest & theme color theo đặc tả.
 * @author Thành viên Chính 3: Bùi Minh Trung - Frontend & PWA Lead
 * @see docs/ui-ux-frontend-specification.md (Mục 1.1 Mobile-first, 1.2 PWA, 2 Component Hierarchy)
 */

import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrewLite – Cà Phê & Trà Trực Tuyến',
  description: 'Đặt món và thanh toán đồ uống trực tuyến – Mobile-first PWA',
  manifest: '/manifest.json',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f766e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-slate-200 min-h-screen flex justify-center">
        {/* Khung mô phỏng điện thoại: tối đa max-w-md, căn giữa trên Desktop */}
        <div className="w-full max-w-md bg-slate-50 min-h-screen flex flex-col shadow-2xl pb-20">
          <header className="sticky top-0 z-40 bg-teal-700 text-white px-4 py-3 shadow">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">☕</span>
              <span className="text-base font-extrabold">BrewLite</span>
            </Link>
          </header>

          <main className="flex-1">{children}</main>

          <BottomNav />
        </div>
      </body>
    </html>
  );
}
