'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { getStoredToken } from '../../lib/api';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore();

  const subtotal = getSubtotal();

  const handleCheckout = () => {
    const token = getStoredToken();
    if (!token) {
      router.push('/login?redirect=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="p-6 text-center space-y-4 my-auto min-h-[70vh] flex flex-col justify-center items-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">Giỏ hàng của bạn đang trống</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Hãy khám phá menu thơm ngon và chọn những ly cà phê hoặc trà yêu thích nhé!
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
        >
          <span>Khám phá Menu ngay</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <Link href="/" className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-sm font-bold text-slate-800">Giỏ hàng ({items.length} món)</h1>
        <div className="w-5" />
      </div>

      {/* Cart Items List */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex space-x-3 items-center"
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-16 h-16 rounded-lg object-cover bg-slate-100 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 truncate">{item.name}</h3>
              <p className="text-[11px] text-teal-700 font-medium mt-0.5">Size {item.size}</p>
              {item.toppings && item.toppings.length > 0 && (
                <p className="text-[10px] text-slate-500 truncate">
                  + {item.toppings.map((t) => t.name).join(', ')}
                </p>
              )}
              <div className="text-xs font-extrabold text-slate-900 mt-1">
                {item.lineTotal.toLocaleString('vi-VN')} đ
              </div>
            </div>

            {/* Quantity controls */}
            <div className="flex flex-col items-end space-y-2">
              <button
                onClick={() => removeItem(item.id)}
                className="text-slate-400 hover:text-rose-500 p-1 transition"
                title="Xóa món"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center space-x-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-5 h-5 rounded bg-white flex items-center justify-center text-slate-600 shadow-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold text-slate-800 w-4 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  disabled={item.quantity >= item.stockQuantity}
                  className="w-5 h-5 rounded bg-white flex items-center justify-center text-slate-600 shadow-xs disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bill Summary */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Tạm tính tiền hàng:</span>
          <span>{subtotal.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Phí giao hàng & phục vụ:</span>
          <span className="text-teal-700 font-medium">Miễn phí (0 đ)</span>
        </div>
        <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
          <span>Tổng thanh toán:</span>
          <span className="text-teal-800">{subtotal.toLocaleString('vi-VN')} đ</span>
        </div>
      </div>

      {/* Checkout Fixed Button */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
        <button
          onClick={handleCheckout}
          className="w-full bg-teal-700 hover:bg-teal-800 text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-between shadow-lg transition active:scale-95"
        >
          <span>Tiến hành Đặt đơn</span>
          <span className="bg-teal-900/60 text-teal-100 px-2.5 py-1 rounded-lg">
            {subtotal.toLocaleString('vi-VN')} đ
          </span>
        </button>
      </div>
    </div>
  );
}
