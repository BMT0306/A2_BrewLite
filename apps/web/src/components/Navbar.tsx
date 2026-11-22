'use client';

/**
 * @file Navbar.tsx
 * @description Thanh điều hướng chính đẳng cấp thương hiệu Specialty Coffee Roastery
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / Chính 1 (System Architect & DevOps Lead)
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, ShoppingBag, ClipboardList, User, ChefHat, Package } from 'lucide-react';
import { useCartStore, useCartHydrated } from '../store/useCartStore';
import { apiFetch, getStoredToken, getStoredUser, removeStoredToken, setStoredUser } from '../lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const hydrated = useCartHydrated();
  const cartCount = useCartStore((s) => s.items.reduce((sum, it) => sum + it.quantity, 0));
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let active = true;

    const syncAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        if (active) setUser(null);
        return;
      }

      // Hiển thị nhanh cache hiện có trong khi xác thực lại bằng JWT thật ở Backend (/auth/me)
      const cached = getStoredUser();
      if (active && cached) setUser(cached);

      try {
        const verifiedUser = await apiFetch<any>('/auth/me');
        if (!active) return;
        if (verifiedUser && verifiedUser.id) {
          setUser(verifiedUser);
          // Chỉ ghi lại nếu dữ liệu thực tế từ token khác với localStorage (chống giả mạo role / đổi token thủ công)
          if (
            !cached ||
            cached.id !== verifiedUser.id ||
            cached.role !== verifiedUser.role ||
            cached.fullName !== verifiedUser.fullName
          ) {
            localStorage.setItem('brewlite_user', JSON.stringify(verifiedUser));
          }
        }
      } catch (err: any) {
        if (!active) return;
        if (err?.status === 401) {
          removeStoredToken();
          setUser(null);
        }
      }
    };

    syncAuth();

    const handleAuthChange = () => {
      syncAuth();
    };
    window.addEventListener('brewlite-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener('brewlite-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [pathname]);

  const isStaff = user && (user.role === 'STAFF' || user.role === 'MANAGER');

  return (
    <header className="sticky top-0 z-40 bg-[#1c120c] text-[#f7edde] border-b border-[#362217] shadow-lg backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo - Vector Emblem Cao Cấp */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d97706] to-[#7e4d26] p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#1c120c] rounded-[10px] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors"
              >
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                <line x1="6" y1="2" x2="6" y2="4" />
                <line x1="10" y1="2" x2="10" y2="4" />
                <line x1="14" y1="2" x2="14" y2="4" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-black tracking-[0.18em] text-white uppercase font-sans">
              BREWLITE
            </span>
            <span className="text-[10px] tracking-[0.25em] text-amber-300/80 uppercase font-medium -mt-0.5">
              Specialty Roastery
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link
            href="/"
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              pathname === '/'
                ? 'bg-[#331f14] text-amber-300 shadow-inner'
                : 'text-stone-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Coffee className="w-4 h-4 text-amber-400" />
            <span>Thực đơn</span>
          </Link>

          <Link
            href="/cart"
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              pathname === '/cart'
                ? 'bg-[#331f14] text-amber-300 shadow-inner'
                : 'text-stone-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Giỏ hàng</span>
            {hydrated && cartCount > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                {cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/orders"
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              pathname === '/orders'
                ? 'bg-[#331f14] text-amber-300 shadow-inner'
                : 'text-stone-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-amber-400" />
            <span>Đơn hàng</span>
          </Link>

          {isStaff && (
            <>
              <Link
                href="/barista"
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 border border-amber-500/40 ${
                  pathname === '/barista'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white'
                }`}
              >
                <ChefHat className="w-4 h-4 text-amber-400" />
                <span>Quầy Barista (KDS)</span>
              </Link>

              <Link
                href="/barista?tab=inventory"
                className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 text-stone-300 hover:text-white hover:bg-white/5"
              >
                <Package className="w-4 h-4 text-amber-400" />
                <span>Kho & Công Thức</span>
              </Link>
            </>
          )}

          <Link
            href="/login"
            className={`ml-3 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              pathname === '/login'
                ? 'bg-amber-700 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/15 text-stone-200 border border-white/10 hover:text-white'
            }`}
          >
            <User className="w-4 h-4 text-amber-300" />
            <span>{user ? user.fullName || 'Tài khoản' : 'Đăng nhập'}</span>
            {isStaff && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {user.role}
              </span>
            )}
          </Link>
        </nav>

        {/* Mobile Header Right */}
        <div className="flex md:hidden items-center gap-2">
          {isStaff && (
            <Link
              href="/barista"
              className={`p-2 rounded-xl ${pathname === '/barista' ? 'bg-amber-600 text-white' : 'text-amber-400'}`}
              title="Quầy Barista"
            >
              <ChefHat className="w-5 h-5" />
            </Link>
          )}
          <Link
            href="/cart"
            className="relative p-2 text-stone-300 hover:text-white"
          >
            <ShoppingBag className="w-6 h-6" />
            {hydrated && cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-amber-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
