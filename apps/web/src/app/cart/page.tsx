/**
 * @file cart/page.tsx
 * @description Giỏ hàng & Tạm tính (FR-03): sửa số lượng, xóa món, tính tổng tiền, chuyển sang thanh toán.
 * @author Thành viên Chính 3 - Frontend & PWA Lead
 * @see docs/diagrams/activity-auth-order-tracking.puml (Bước "Từ Giỏ hàng nhấn Thanh toán" → kiểm tra JWT)
 * @see docs/ui-ux-frontend-specification.md (Mục 3.3)
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { getStoredToken } from '../../lib/api';
import { formatVND } from '../../lib/format';
import { useCartStore, useCartHydrated, calcLineTotal } from '../../store/useCartStore';

export default function CartPage() {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore();

  if (!hydrated) return null;

  // Trạng thái giỏ rỗng
  if (items.length === 0) {
    return (
      <div className="p-6 min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
        <ShoppingBag className="w-12 h-12 text-teal-600" />
        <p className="text-sm text-slate-600">Giỏ hàng của bạn đang trống</p>
        <Link href="/" className="bg-teal-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl">
          Khám phá Menu ngay
        </Link>
      </div>
    );
  }

  const subtotal = getSubtotal();

  // Diagram: "Kiểm tra JWT Token?" → chưa có thì chuyển tới /login?redirect=/checkout
  const handleCheckout = () => {
    router.push(getStoredToken() ? '/checkout' : '/login?redirect=/checkout');
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-base font-bold text-slate-800">Giỏ hàng ({items.length} món)</h1>

      {/* Danh sách món */}
      {items.map((item) => (
        <div key={item.id} className="bg-white rounded-xl p-3 border border-slate-100 flex gap-3">
          <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate">{item.name}</h3>
            <p className="text-xs text-slate-500">
              Size {item.size}
              {item.toppings.length > 0 && ` · ${item.toppings.map((t) => t.name).join(', ')}`}
            </p>
            <p className="text-xs text-slate-500">Đơn giá: {formatVND(item.unitPrice)}</p>
            <p className="text-sm font-extrabold text-teal-700 mt-1">{formatVND(calcLineTotal(item))}</p>
          </div>

          <div className="flex flex-col items-end justify-between">
            <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500" title="Xóa món">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="w-6 h-6 rounded border border-slate-300 flex items-center justify-center disabled:opacity-40"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={item.quantity >= item.stockQuantity}
                className="w-6 h-6 rounded border border-slate-300 flex items-center justify-center disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Tóm tắt tiền */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2 text-sm">
        <Row label="Tạm tính" value={formatVND(subtotal)} />
        <Row label="Phí đóng gói / dịch vụ" value="Miễn phí" />
        <div className="border-t pt-2">
          <Row label="Tổng thanh toán" value={formatVND(subtotal)} bold />
        </div>
      </div>

      <button onClick={handleCheckout} className="w-full bg-teal-700 text-white font-bold text-sm py-3.5 rounded-xl">
        Tiến hành Đặt đơn
      </button>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-extrabold text-slate-900' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
