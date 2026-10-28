'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Wallet, AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { apiFetch, getStoredToken } from '../../lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, clearCart } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'CARD'>('WALLET');
  const [note, setNote] = useState('');
  const [voucherCode, setVoucherCode] = useState('WELCOME10');
  const [simulateFailure, setSimulateFailure] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any>(null);

  const subtotal = getSubtotal();
  const discount = voucherCode.toUpperCase().trim() === 'WELCOME10' ? Math.min(subtotal * 0.1, 50000) : 0;
  const totalAmount = Math.max(0, subtotal - discount);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/login?redirect=/checkout');
    }
  }, [router]);

  if (items.length === 0 && !successInfo) {
    return (
      <div className="p-6 text-center space-y-3 my-auto min-h-[60vh] flex flex-col justify-center items-center">
        <p className="text-xs text-slate-500">Giỏ hàng rỗng, vui lòng chọn món trước khi đặt đơn.</p>
        <Link href="/" className="text-xs text-teal-700 font-bold hover:underline">
          Quay lại thực đơn
        </Link>
      </div>
    );
  }

  // Generate standard random UUIDv4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handlePlaceAndPayOrder = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Phase 1: Call POST /orders inside Database Transaction
      const orderPayload = {
        items: items.map((it) => ({
          productId: it.productId,
          size: it.size,
          toppings: it.toppings,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        note: note.trim() || undefined,
        promotionCode: voucherCode.trim() || undefined,
      };

      const orderRes = await apiFetch<any>('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      const orderId = orderRes.orderId;

      // Phase 2: Call POST /payments with Idempotency-Key header
      const idempotencyKey = generateUUID();

      const paymentRes = await apiFetch<any>(
        '/payments',
        {
          method: 'POST',
          body: JSON.stringify({
            orderId,
            method: paymentMethod,
            simulateFailure,
          }),
        },
        idempotencyKey,
      );

      // Success
      clearCart();
      setSuccessInfo(paymentRes);
      setTimeout(() => {
        router.push('/orders');
      }, 1500);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMsg(
        err.message || 'Giao dịch đặt đơn hoặc thanh toán không thành công. Vui lòng kiểm tra lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <Link href="/cart" className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-sm font-bold text-slate-800">Xác nhận & Thanh toán</h1>
        <div className="w-5" />
      </div>

      {/* Success Notification */}
      {successInfo && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-center space-y-2 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-emerald-900">Đặt hàng & Thanh toán Thành công!</h3>
          <p className="text-xs text-emerald-700">Mã đơn: {successInfo.orderId.slice(0, 8)}...</p>
          <p className="text-[11px] text-emerald-600">Đang chuyển tới màn hình theo dõi đơn...</p>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3.5 text-xs flex space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {/* Evaluator Simulation Control Panel */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center space-x-1.5 text-teal-900 font-bold text-xs">
          <Sparkles className="w-4 h-4 text-teal-700" />
          <span>Bảng điều khiển Giả lập Nghiệm thu (Giảng viên / QA):</span>
        </div>
        <p className="text-[11px] text-teal-800 leading-tight">
          Chọn kịch bản bên dưới để kiểm thử tính năng bù trừ hoàn kho (Compensating Transaction):
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setSimulateFailure(false)}
            className={`p-2 rounded-lg text-center text-xs font-bold border transition ${
              !simulateFailure
                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            ✓ Thanh toán Thành công
          </button>
          <button
            type="button"
            onClick={() => setSimulateFailure(true)}
            className={`p-2 rounded-lg text-center text-xs font-bold border transition ${
              simulateFailure
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            ⚠ Giả lập Thất bại (Hoàn kho)
          </button>
        </div>
      </div>

      {/* Order Items Preview */}
      <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-slate-700">Món đã chọn ({items.length})</h3>
        <div className="divide-y divide-slate-100 text-xs">
          {items.map((it) => (
            <div key={it.id} className="py-2 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-800">{it.name}</span>
                <span className="text-slate-400 text-[10px] block">
                  x{it.quantity} (Size {it.size})
                </span>
              </div>
              <span className="font-bold text-slate-900">{it.lineTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-slate-700">Phương thức thanh toán</h3>
        <div className="grid grid-cols-2 gap-2">
          <div
            onClick={() => setPaymentMethod('WALLET')}
            className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition ${
              paymentMethod === 'WALLET'
                ? 'border-teal-700 bg-teal-50/60 text-teal-800 font-bold'
                : 'border-slate-200 text-slate-700'
            }`}
          >
            <Wallet className="w-4 h-4 text-teal-700" />
            <div className="text-xs">
              <span className="block leading-none">Ví điện tử</span>
              <span className="text-[10px] text-slate-500 leading-tight">MoMo / ZaloPay</span>
            </div>
          </div>

          <div
            onClick={() => setPaymentMethod('CARD')}
            className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition ${
              paymentMethod === 'CARD'
                ? 'border-teal-700 bg-teal-50/60 text-teal-800 font-bold'
                : 'border-slate-200 text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4 text-teal-700" />
            <div className="text-xs">
              <span className="block leading-none">Thẻ ngân hàng</span>
              <span className="text-[10px] text-slate-500 leading-tight">Visa / Napas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Note & Voucher */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm space-y-3 text-xs">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mã khuyến mãi (Voucher)</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder="Nhập WELCOME10..."
              className="flex-1 text-xs p-2 rounded-lg border border-slate-200 uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-teal-700"
            />
            <button
              type="button"
              className="bg-slate-100 text-slate-700 text-xs px-3 py-2 rounded-lg font-semibold hover:bg-slate-200"
            >
              Áp dụng
            </button>
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Ghi chú cho Barista</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Ít đá, nhiều đường, giao tại bàn số 5..."
            className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </div>
      </div>

      {/* Bill Calculation */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Tạm tính tiền món:</span>
          <span>{subtotal.toLocaleString('vi-VN')} đ</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span>Giảm giá (WELCOME10):</span>
            <span>-{discount.toLocaleString('vi-VN')} đ</span>
          </div>
        )}
        <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
          <span>Tổng thanh toán:</span>
          <span className="text-teal-800">{totalAmount.toLocaleString('vi-VN')} đ</span>
        </div>
      </div>

      {/* Fixed Checkout CTA */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
        <button
          onClick={handlePlaceAndPayOrder}
          disabled={submitting}
          className="w-full bg-teal-700 hover:bg-teal-800 text-white py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-between shadow-lg transition active:scale-95 disabled:opacity-50"
        >
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-teal-300" />
            <span>{submitting ? 'Đang thực hiện giao dịch...' : 'Xác nhận Đặt & Thanh toán'}</span>
          </div>
          <span className="font-extrabold bg-teal-900/60 px-2.5 py-1 rounded-lg">
            {totalAmount.toLocaleString('vi-VN')} đ
          </span>
        </button>
      </div>
    </div>
  );
}
