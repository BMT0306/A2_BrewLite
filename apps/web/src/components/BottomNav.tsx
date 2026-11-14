/**
 * @file BottomNav.tsx
 * @description Thanh điều hướng cố định đáy màn hình (Thumb Zone) dành riêng cho giao diện di động (Mobile PWA)
 *              Ẩn hoàn toàn trên giao diện máy tính (Desktop/Laptop)
 * @author Thành viên Chính 3: Bùi Minh Trung - Frontend & PWA Lead
 * @see docs/ui-ux-frontend-specification.md (Mục 1.1 - Thumb Zone Optimization)
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, ShoppingBag, ClipboardList, User, ChefHat } from 'lucide-react';
import { useCartStore, useCartHydrated } from '../store/useCartStore';
import { getStoredUser } from '../lib/api';

export default function BottomNav() {
  const pathname = usePathname();
  const hydrated = useCartHydrated();
  const cartCount = useCartStore((s) => s.items.reduce((sum, it) => sum + it.quantity, 0));
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  const tabs = [
    { href: '/', label: 'Thực đơn', icon: Coffee },
    { href: '/cart', label: 'Giỏ hàng', icon: ShoppingBag },
    { href: '/orders', label: 'Đơn hàng', icon: ClipboardList },
    ...(user && (user.role === 'STAFF' || user.role === 'MANAGER')
      ? [{ href: '/barista', label: 'Barista', icon: ChefHat }]
      : []),
    { href: '/login', label: 'Tài khoản', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-amber-900/10 flex justify-around py-2 z-50 md:hidden shadow-lg">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        const showBadge = href === '/cart' && hydrated && cartCount > 0;

        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center px-3 py-1 text-[11px] transition-colors ${
              isActive ? 'text-[#7e4d26] font-bold' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {showBadge && (
                <span className="absolute -top-1.5 -right-2.5 bg-amber-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="mt-1">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
