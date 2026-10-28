'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { getStoredUser } from '../lib/api';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const cartItems = useCartStore((state) => state.items);
  const [cartCount, setCartCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const totalQty = cartItems.reduce((acc, it) => acc + it.quantity, 0);
    setCartCount(totalQty);
  }, [cartItems]);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Thực đơn', icon: Coffee },
    { href: '/cart', label: 'Giỏ hàng', icon: ShoppingBag, badge: cartCount },
    { href: '/orders', label: 'Đơn mua', icon: ClipboardList },
    { href: '/login', label: currentUser ? 'Cá nhân' : 'Đăng nhập', icon: User },
  ];

  return (
    <html lang="vi">
      <head>
        <title>BrewLite – Cà Phê & Trà Trực Tuyến (Mobile PWA)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f766e" />
      </head>
      <body className="bg-slate-200 antialiased min-h-screen flex justify-center selection:bg-teal-500 selection:text-white">
        {/* Mobile Device Viewport Simulation */}
        <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative pb-20 border-x border-slate-200">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-teal-800 text-white px-4 py-3 shadow-md flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white shadow-inner">
                ☕
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight leading-none">BrewLite</h1>
                <p className="text-[10px] text-teal-200 leading-tight">Coffee & Tea Express</p>
              </div>
            </Link>
            {currentUser && (
              <div className="text-right">
                <span className="text-xs text-teal-100 font-medium block truncate max-w-[120px]">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] bg-teal-900 text-teal-300 px-1.5 py-0.5 rounded-full font-mono">
                  {currentUser.role}
                </span>
              </div>
            )}
          </header>

          {/* Main App Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>

          {/* Fixed Bottom Navigation Thumb Zone */}
          <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-50 shadow-lg">
            {navLinks.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center relative py-1 px-3 rounded-xl transition-all ${
                    isActive ? 'text-teal-700 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {tab.badge && tab.badge > 0 ? (
                      <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </body>
    </html>
  );
}
