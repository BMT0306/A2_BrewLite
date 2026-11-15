/**
 * @file cart/page.tsx
 * @description Giỏ hàng & Tạm tính (FR-03): sửa số lượng, xóa món, tính tổng tiền, chuyển sang thanh toán.
 *              Xử lý thông minh chống trùng đơn PENDING, tích hợp mã VietQR và hoàn kho khi hủy.
 * @author Thành viên Chính 3: Bùi Minh Trung - Frontend & PWA Lead
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / Chính 1 (System Architect & DevOps Lead)
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Coffee,
  ShieldCheck,
  Tag,
  CheckCircle2,
  QrCode,
  AlertCircle,
} from 'lucide-react';
import { apiFetch, getStoredToken } from '../../lib/api';
import { formatVND } from '../../lib/format';
import { useCartStore, useCartHydrated, calcLineTotal } from '../../store/useCartStore';
import { VietQRModal } from '../../components/VietQRModal';

export default function CartPage() {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    promoCode,
    applyPromo,
    removePromo,
    getDiscountAmount,
    getTotal,
  } = useCartStore();

  const [promoInput, setPromoInput] = useState(promoCode || 'WELCOME10');
  const [promoMsg, setPromoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    promoCode ? { type: 'success', text: `Đang áp dụng mã ${promoCode}` } : null,
  );

  const [pendingOrder, setPendingOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancellingPending, setCancellingPending] = useState(false);

  const handleApplyPromo = () => {
    if (!promoInput.trim()) return;
    const res = applyPromo(promoInput);
    if (res.success) {
      setPromoMsg({ type: 'success', text: res.message });
    } else {
      setPromoMsg({ type: 'error', text: res.message });
    }
  };

  const handleRemovePromo = () => {
    removePromo();
    setPromoMsg(null);
    setPromoInput('');
  };

  // Kiểm tra xem có đơn hàng nào đang chờ thanh toán (PENDING) không
  const fetchPendingOrder = async () => {
    if (!getStoredToken()) return;
    try {
      const userOrders = await apiFetch<any[]>('/orders');
      if (Array.isArray(userOrders)) {
        const active = userOrders.find((o) => o.status === 'PENDING');
        setPendingOrder(active || null);
      }
    } catch {
      // Bỏ qua lỗi
    }
  };

  useEffect(() => {
    fetchPendingOrder();
  }, []);

  const handleCancelPendingOrder = async () => {
    if (!pendingOrder) return;
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng đang chờ thanh toán này và hoàn trả lại kho?')) return;
    try {
      setCancellingPending(true);
      await apiFetch(`/orders/${pendingOrder.id}`, { method: 'DELETE' });
      setPendingOrder(null);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Không thể hủy đơn hàng');
    } finally {
      setCancellingPending(false);
    }
  };

  if (!hydrated) return null;

  // Trạng thái giỏ rỗng
  if (items.length === 0) {
    return (
      <div className="bg-[#faf7f2] min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-5">
        {pendingOrder ? (
          <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-8 max-w-lg shadow-md space-y-4 text-left">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#2c1810]">
                  Bạn có 1 đơn hàng đang chờ thanh toán!
                </h3>
                <span className="text-xs font-mono text-stone-500 font-bold">
                  #{pendingOrder.orderCode} · {formatVND(pendingOrder.totalAmount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Đơn hàng của bạn đang chờ thanh toán. Bạn có thể mở mã VietQR để thanh toán ngay hoặc hủy đơn này.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCancelPendingOrder}
                disabled={cancellingPending}
                className="flex-1 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                {cancellingPending ? 'Đang hủy...' : 'Hủy đơn này'}
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex-1 bg-[#7e4d26] hover:bg-[#5a371b] text-white text-xs font-black py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
              >
                <QrCode className="w-4 h-4" />
                <span>Thanh toán ngay</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center text-[#7e4d26] shadow-sm">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-[#2c1810]">Giỏ hàng của bạn đang trống</h2>
            <p className="text-sm text-stone-500 max-w-md">
              Chưa có đồ uống nào trong giỏ. Hãy chọn những ly cà phê thơm ngon từ thực đơn BrewLite nhé!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#7e4d26] hover:bg-[#5a371b] text-white text-sm font-bold px-6 py-3 rounded-xl transition shadow-md shadow-amber-900/10"
            >
              <Coffee className="w-4 h-4" />
              <span>Khám phá Menu ngay</span>
            </Link>
          </>
        )}

        {pendingOrder && (
          <VietQRModal
            isOpen={isModalOpen}
            orderId={pendingOrder.id}
            orderCode={pendingOrder.orderCode}
            amount={pendingOrder.totalAmount}
            method="CARD"
            onClose={() => setIsModalOpen(false)}
            onConfirmPayment={async () => {
              setIsModalOpen(false);
              router.push('/orders');
            }}
            onPaymentSuccess={() => {
              setIsModalOpen(false);
              router.push('/orders');
            }}
            onCancelOrder={handleCancelPendingOrder}
            submitting={false}
          />
        )}
      </div>
    );
  }

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();

  const handleCheckout = () => {
    router.push(getStoredToken() ? '/checkout' : '/login?redirect=/checkout');
  };

  return (
    <div className="bg-[#faf7f2] min-h-screen py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Banner cảnh báo nếu có đơn hàng PENDING */}
        {pendingOrder && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-amber-950 text-sm">
                  Bạn có đơn hàng #{pendingOrder.orderCode} ({formatVND(pendingOrder.totalAmount)}) đang chờ thanh toán!
                </p>
                <p className="text-xs text-amber-800">
                  Số lượng ly và nguyên liệu đã được giữ chỗ trong kho. Bạn muốn thanh toán tiếp hay hủy để đặt đơn mới này?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={handleCancelPendingOrder}
                disabled={cancellingPending}
                className="text-stone-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-stone-200 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
              >
                {cancellingPending ? 'Đang hủy...' : 'Hủy đơn cũ'}
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#7e4d26] hover:bg-[#5a371b] text-white text-xs font-black px-4 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <QrCode className="w-4 h-4" />
                <span>Thanh toán ngay</span>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2c1810] tracking-tight">
              Giỏ Hàng Của Bạn
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Đang có {items.reduce((s, i) => s + i.quantity, 0)} món đồ uống được chọn
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-xs text-stone-400 hover:text-red-600 transition flex items-center gap-1 p-2 rounded-lg hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa tất cả</span>
          </button>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {/* Cột trái: Danh sách các món trong giỏ (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm divide-y divide-stone-100 overflow-hidden">
              {items.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex gap-4 items-center">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-stone-200 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-[#2c1810] truncate">{item.name}</h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-stone-400 hover:text-red-500 transition p-1 cursor-pointer"
                        title="Xóa món"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-stone-500 mt-0.5">
                      <span className="font-semibold text-amber-800">Size {item.size}</span>
                      {item.toppings.length > 0 && (
                        <span> · {item.toppings.map((t) => t.name).join(', ')}</span>
                      )}
                    </p>

                    <p className="text-xs text-stone-400 mt-1">
                      Đơn giá: {formatVND(item.unitPrice)}
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      {/* Bộ tăng giảm số lượng */}
                      <div className="flex items-center border border-stone-300 rounded-xl bg-stone-50 overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center hover:bg-stone-200 disabled:opacity-30 transition text-stone-700 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-[#2c1810]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stockQuantity}
                          className="w-8 h-8 flex items-center justify-center hover:bg-stone-200 disabled:opacity-30 transition text-stone-700 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Thành tiền dòng */}
                      <span className="text-base font-extrabold text-[#7e4d26]">
                        {formatVND(calcLineTotal(item))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 hover:text-amber-900 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Tiếp tục chọn thêm đồ uống</span>
              </Link>
            </div>
          </div>

          {/* Cột phải: Tóm tắt thanh toán (1 col) */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-md space-y-4">
              <h3 className="text-base font-extrabold text-[#2c1810] border-b border-stone-100 pb-3">
                Tổng Kết Đơn Hàng
              </h3>

              {/* Mã giảm giá */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value.toUpperCase());
                        if (promoMsg) setPromoMsg(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyPromo();
                        }
                      }}
                      placeholder="Mã giảm giá (WELCOME10)"
                      className="w-full pl-9 pr-3 py-2 text-xs uppercase font-semibold border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7e4d26] bg-[#faf7f2]/50 text-[#2c1810]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="bg-[#7e4d26] hover:bg-[#5a371b] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>

                {/* Gợi ý mã & Chip bấm nhanh */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span className="text-stone-400 font-medium">Gợi ý mã ưu đãi:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPromoInput('WELCOME10');
                        const res = applyPromo('WELCOME10');
                        setPromoMsg({ type: 'success', text: res.message });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold cursor-pointer transition text-[10px]"
                    >
                      WELCOME10 (-10%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPromoInput('WELCOME20');
                        const res = applyPromo('WELCOME20');
                        setPromoMsg({ type: 'success', text: res.message });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold cursor-pointer transition text-[10px]"
                    >
                      WELCOME20 (-20%)
                    </button>
                  </div>
                </div>

                {promoMsg && (
                  <div
                    className={`text-xs px-3 py-2 rounded-xl flex items-center justify-between ${
                      promoMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {promoMsg.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span>{promoMsg.text}</span>
                    </div>
                    {promoMsg.type === 'success' && (
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-stone-400 hover:text-rose-600 text-[10px] font-bold underline cursor-pointer ml-2"
                      >
                        Hủy mã
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2.5 text-sm text-stone-600 pt-2 border-t border-stone-100">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span className="font-semibold text-[#2c1810]">{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí đóng gói & phục vụ</span>
                  <span className="text-emerald-700 font-semibold">Miễn phí</span>
                </div>
                <div className="flex justify-between">
                  <span>Giảm giá khuyến mãi</span>
                  <span className={discountAmount > 0 ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                    {discountAmount > 0 ? `-${formatVND(discountAmount)}` : '0 đ'}
                  </span>
                </div>

                <div className="border-t border-stone-200 pt-3 mt-3 flex justify-between items-baseline">
                  <span className="text-base font-bold text-[#2c1810]">Thành tiền</span>
                  <span className="text-2xl font-black text-[#7e4d26]">{formatVND(total)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-[#7e4d26] hover:bg-[#5a371b] text-white font-extrabold text-sm py-4 rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>Tiến Hành Đặt Đơn</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 border-t border-stone-100 space-y-2 text-xs text-stone-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bảo mật giao dịch tiêu chuẩn ngân hàng</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tự động hủy đơn và hoàn tiền nếu có sự cố</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal VietQR Napas 24/7 */}
      {pendingOrder && (
        <VietQRModal
          isOpen={isModalOpen}
          orderId={pendingOrder.id}
          orderCode={pendingOrder.orderCode}
          amount={pendingOrder.totalAmount}
          method="CARD"
          onClose={() => setIsModalOpen(false)}
          onConfirmPayment={async () => {
            setIsModalOpen(false);
            router.push('/orders');
          }}
          onPaymentSuccess={() => {
            setIsModalOpen(false);
            router.push('/orders');
          }}
          onCancelOrder={handleCancelPendingOrder}
          submitting={false}
        />
      )}
    </div>
  );
}
