/**
 * @file BottomNav.tsx
 * @description Thanh điều hướng cố định đáy màn hình (Thumb Zone), hiển thị số món trong giỏ.
 * @author Thành viên Chính 3: Bùi Minh Trung - Frontend & PWA Lead
 * @see docs/ui-ux-frontend-specification.md (Mục 1.1 - Thumb Zone Optimization)
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { useCartStore, useCartHydrated } from '../store/useCartStore';

const TABS = [
  { href: '/', label: 'Thực đơn', icon: Coffee },
  { href: '/cart', label: 'Giỏ hàng', icon: ShoppingBag },
  { href: '/orders', label: 'Đơn mua', icon: ClipboardList },
  { href: '/login', label: 'Tài khoản', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const hydrated = useCartHydrated();
  const cartCount = useCartStore((s) => s.items.reduce((sum, it) => sum + it.quantity, 0));

  return (
    <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-200 flex justify-around py-2 z-50">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        const showBadge = href === '/cart' && hydrated && cartCount > 0;

        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center px-3 text-[11px] ${
              isActive ? 'text-teal-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            {showBadge && (
              <span className="absolute -top-1 right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] px-1 text-center">
                {cartCount}
              </span>
            )}
            <span className="mt-1">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

