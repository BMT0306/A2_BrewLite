/**
 * @file checkout/page.tsx
 * @description Đặt đơn & Thanh toán trực tuyến VietQR / MoMo (FR-05, FR-06)
 *              Chuẩn quy trình 2 giai đoạn theo Sequence Diagram:
 *              (1) POST /orders  → tạo đơn + trừ tồn kho trong Database Transaction
 *              (2) POST /payments → thanh toán kèm Idempotency-Key chống trùng lặp
 * @author Thành viên Chính 3: Bùi Minh Trung - Frontend & PWA Lead
 * @see docs/diagrams/sequence-checkout.puml
 * @see docs/ui-ux-frontend-specification.md (Mục 3.5)
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Coffee,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  QrCode,
  Clock,
} from 'lucide-react';
import { apiFetch, getStoredToken } from '../../lib/api';
import { formatVND } from '../../lib/format';
import { useCartStore, useCartHydrated, calcLineTotal } from '../../store/useCartStore';
import { VietQRModal } from '../../components/VietQRModal';

type PaymentMethod = 'CARD' | 'WALLET';

interface CreateOrderResponse {
  orderId: string;
  orderCode: string;
  totalAmount: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const { items, getSubtotal, clearCart } = useCartStore();

  const [method] = useState<PaymentMethod>('CARD');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // VietQR Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<CreateOrderResponse | null>(null);
  const [paidOrderCode, setPaidOrderCode] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?redirect=/checkout');
      return;
    }

    // Tra cứu xem có đơn hàng nào đang PENDING của user không để khôi phục hoặc tránh clone đơn
    apiFetch<any[]>('/orders')
      .then((userOrders) => {
        if (Array.isArray(userOrders)) {
          const activePending = userOrders.find((o) => o.status === 'PENDING');
          if (activePending) {
            setPendingOrder({
              orderId: activePending.id,
              orderCode: activePending.orderCode,
              totalAmount: activePending.totalAmount,
            });
          }
        }
      })
      .catch(() => {});
  }, [router]);

  // Bấm nút "Quét Mã VietQR & Thanh Toán" -> Mở lại nếu đã tạo hoặc Tạo đơn hàng mới
  const handleInitiateOrder = async () => {
    if (submitting) return;

    // Nếu đã tạo đơn hàng trước đó (khách đóng modal rồi mở lại), không clone thêm đơn mới
    if (pendingOrder) {
      try {
        const check = await apiFetch<any>(`/orders/${pendingOrder.orderId}`);
        if (check && check.status === 'PENDING') {
          setIsModalOpen(true);
          return;
        } else if (check && (check.status === 'CONFIRMED' || check.status === 'COMPLETED')) {
          handlePaymentSuccess();
          return;
        }
      } catch {
        // Đơn cũ không còn tồn tại
        setPendingOrder(null);
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Trước khi tạo đơn mới, xóa sạch các đơn PENDING cũ của tài khoản này để không clone đơn rác
      try {
        const existingOrders = await apiFetch<any[]>('/orders');
        if (Array.isArray(existingOrders)) {
          const oldPendings = existingOrders.filter((o) => o.status === 'PENDING');
          for (const old of oldPendings) {
            await apiFetch(`/orders/${old.id}`, { method: 'DELETE' }).catch(() => {});
          }
        }
      } catch {
        // Bỏ qua lỗi tra cứu phụ
      }

      // Giai đoạn 1: Tạo đơn hàng & trừ kho (Transaction ở Backend)
      const order = await apiFetch<CreateOrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((it) => ({
            productId: it.productId,
            size: it.size,
            toppings: it.toppings,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
          note: note.trim() || undefined,
        }),
      });

      setPendingOrder(order);
      setIsModalOpen(true);
    } catch (err: any) {
      setError(getErrorMessage(err));
      if (err.status === 401) {
        router.push('/login?redirect=/checkout');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý khi thanh toán thành công (Webhook SePay hoặc API đối soát)
  const handlePaymentSuccess = () => {
    clearCart();
    setIsModalOpen(false);
    if (pendingOrder) {
      setPaidOrderCode(pendingOrder.orderCode);
    }
    setTimeout(() => {
      router.push('/orders');
    }, 1200);
  };

  // Khách hàng bấm Sửa món / Quay lại sửa giỏ hàng: Xóa đơn nháp và hoàn trả tồn kho
  const handleCancelPendingOrderAndEdit = async () => {
    if (pendingOrder) {
      try {
        await apiFetch(`/orders/${pendingOrder.orderId}`, { method: 'DELETE' });
      } catch {
        // Bỏ qua nếu đơn đã bị xóa trước đó
      }
      setPendingOrder(null);
    }
    setIsModalOpen(false);
    router.push('/cart');
  };

  // Khách hàng xác nhận thanh toán trong Modal VietQR
  const handleConfirmPayment = async () => {
    if (!pendingOrder) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Kiểm tra trước trạng thái đơn hàng từ Backend API
      const currentOrder = await apiFetch<any>(`/orders/${pendingOrder.orderId}`).catch(() => null);
      if (
        currentOrder &&
        (currentOrder.status === 'CONFIRMED' ||
          currentOrder.status === 'COMPLETED' ||
          currentOrder.status === 'PAID')
      ) {
        handlePaymentSuccess();
        return;
      }

      // 2. Giai đoạn 2: Gọi POST /payments kèm Idempotency-Key
      const idempotencyKey = crypto.randomUUID();
      await apiFetch(
        '/payments',
        {
          method: 'POST',
          body: JSON.stringify({
            orderId: pendingOrder.orderId,
            method: 'CARD',
            simulateFailure: false,
          }),
        },
        idempotencyKey,
      );

      handlePaymentSuccess();
    } catch (err: any) {
      // 3. Kiểm tra lại nếu đơn hàng đã được Webhook SePay xác nhận
      try {
        const doubleCheck = await apiFetch<any>(`/orders/${pendingOrder.orderId}`);
        if (
          doubleCheck &&
          (doubleCheck.status === 'CONFIRMED' ||
            doubleCheck.status === 'COMPLETED' ||
            doubleCheck.status === 'PAID')
        ) {
          handlePaymentSuccess();
          return;
        }
      } catch {
        // Bỏ qua lỗi mạng tra cứu phụ
      }

      if (
        err.status === 400 ||
        (err.message &&
          (err.message.includes('đã hoàn tất') || err.message.includes('CONFIRMED')))
      ) {
        handlePaymentSuccess();
        return;
      }

      setError(getErrorMessage(err));
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) return null;

  // Thanh toán thành công
  if (paidOrderCode) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-[#faf7f2]">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-lg shadow-emerald-200">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-[#2c1810]">Thanh toán thành công!</h2>
        <p className="text-sm text-stone-600 mt-2">
          Mã đơn hàng của bạn:{' '}
          <span className="font-mono font-bold text-amber-800">#{paidOrderCode}</span>
        </p>
        <p className="text-xs text-stone-500 mt-1">
          Đơn hàng đã được thanh toán thành công! Barista đang chuẩn bị đồ uống. Đang chuyển tới lịch sử đơn hàng...
        </p>
      </div>
    );
  }

  // Giỏ hàng rỗng (chỉ hiển thị khi KHÔNG có đơn hàng đang chờ thanh toán và KHÔNG mở modal thanh toán)
  if (items.length === 0 && !pendingOrder && !isModalOpen) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-[#faf7f2] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
          <Coffee className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-[#2c1810]">Giỏ hàng của bạn đang trống</h2>
        <p className="text-sm text-stone-500 max-w-sm">
          Vui lòng chọn món đồ uống yêu thích trong thực đơn trước khi thực hiện thanh toán.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#7e4d26] hover:bg-[#5a371b] text-white text-sm font-bold px-6 py-3 rounded-xl transition shadow-md shadow-amber-900/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Khám phá Menu BrewLite</span>
        </Link>
      </div>
    );
  }

  const subtotal = items.length > 0 ? getSubtotal() : (pendingOrder ? pendingOrder.totalAmount : 0);

  return (
    <div className="bg-[#faf7f2] min-h-screen py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <Link href="/" className="hover:text-amber-800 transition">
                Thực đơn
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/cart" className="hover:text-amber-800 transition">
                Giỏ hàng
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-amber-900">Xác nhận thanh toán</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2c1810] tracking-tight">
              Xác Nhận & Thanh Toán Đơn Hàng
            </h1>
          </div>
          <button
            onClick={handleCancelPendingOrderAndEdit}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sửa giỏ hàng</span>
          </button>
        </div>

        {/* Banner nhắc đơn hàng PENDING đang chờ thanh toán nếu có */}
        {pendingOrder && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-[#2c1810] text-sm">
                  Bạn đang có đơn #{pendingOrder.orderCode} ({formatVND(pendingOrder.totalAmount)}) đang chờ thanh toán!
                </p>
                <p className="text-stone-500 text-xs mt-0.5">
                  Đơn hàng đang chờ thanh toán. Bạn có thể mở lại mã VietQR để thanh toán hoặc hủy đơn này nếu muốn chọn lại món.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#7e4d26] hover:bg-[#5a371b] text-white font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Tiếp tục thanh toán</span>
              </button>
              <button
                onClick={handleCancelPendingOrderAndEdit}
                className="bg-white hover:bg-stone-100 text-rose-700 border border-stone-200 font-bold px-3 py-2 rounded-xl transition cursor-pointer"
              >
                Hủy đơn cũ
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Giao dịch chưa hoàn tất</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {/* Cột trái: Chi tiết món & Ghi chú & Phương thức thanh toán (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Danh sách món đã chọn */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="text-base font-extrabold text-[#2c1810] flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-700" />
                  <span>Món đã chọn ({items.length})</span>
                </h2>
                <span className="text-xs text-stone-500 font-medium">Thanh toán an toàn 24/7</span>
              </div>

              <div className="divide-y divide-stone-100">
                {items.map((it) => (
                  <div key={it.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={it.imageUrl}
                        alt={it.name}
                        className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#2c1810] truncate">{it.name}</h4>
                        <p className="text-xs text-stone-500">
                          Size {it.size} · Số lượng: x{it.quantity}
                          {it.toppings.length > 0 && ` · ${it.toppings.map((t) => t.name).join(', ')}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-[#2c1810] shrink-0">
                      {formatVND(calcLineTotal(it))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chọn phương thức thanh toán */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#2c1810] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                  <span>Phương thức thanh toán</span>
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Tự động 24/7 qua SePay
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Chuyển khoản liên ngân hàng 24/7 quét mã chuẩn VietQR (Napas 247). Hệ thống tự động khớp tiền và xác nhận đơn tức thì.
              </p>

              <div className="p-4 rounded-xl border-2 border-[#7e4d26] bg-amber-50/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7e4d26] text-white flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#2c1810]">Chuyển khoản VietQR (Napas 247)</span>
                    <span className="block text-xs text-stone-500 mt-0.5">MBBank · 6563617082006 · TRAN LE MINH TAM</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#7e4d26] px-2.5 py-1 bg-amber-100/80 border border-amber-200 rounded-lg shrink-0">
                  Mặc định
                </span>
              </div>
            </div>

            {/* Ghi chú cho Barista */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm space-y-2">
              <label htmlFor="checkout-note" className="text-sm font-bold text-[#2c1810] block">
                Ghi chú cho Barista
              </label>
              <input
                id="checkout-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Ít ngọt, nhiều đá, giao tại bàn số 4 trên lầu..."
                className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7e4d26] bg-[#faf7f2]/50 text-[#2c1810]"
              />
            </div>
          </div>

          {/* Cột phải: Thẻ tóm tắt đơn hàng & Nút thanh toán (1 col) */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-md space-y-4">
              <h3 className="text-base font-extrabold text-[#2c1810] border-b border-stone-100 pb-3">
                Tóm Tắt Thanh Toán
              </h3>

              <div className="space-y-2.5 text-sm text-stone-600">
                <div className="flex justify-between">
                  <span>Tạm tính ({items.length} món)</span>
                  <span className="font-semibold text-[#2c1810]">{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí dịch vụ & đóng gói</span>
                  <span className="text-emerald-700 font-semibold">Miễn phí</span>
                </div>
                <div className="flex justify-between">
                  <span>Ưu đãi thành viên</span>
                  <span className="text-stone-400">0 đ</span>
                </div>

                <div className="border-t border-stone-200 pt-3 mt-3 flex justify-between items-baseline">
                  <span className="text-base font-bold text-[#2c1810]">Tổng cộng</span>
                  <span className="text-2xl font-black text-[#7e4d26]">{formatVND(subtotal)}</span>
                </div>
              </div>

              <button
                onClick={handleInitiateOrder}
                disabled={submitting}
                className="w-full bg-[#7e4d26] hover:bg-[#5a371b] text-white font-extrabold text-sm py-4 rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <QrCode className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Đang khởi tạo đơn...'
                    : pendingOrder
                    ? `Mở lại mã VietQR (#${pendingOrder.orderCode})`
                    : 'Quét Mã VietQR & Thanh Toán'}
                </span>
              </button>

              <div className="pt-2 border-t border-stone-100 space-y-2 text-xs text-stone-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bảo mật giao dịch tiêu chuẩn Napas 247</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tích lũy điểm thưởng thành viên sau khi thanh toán</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal VietQR Napas 24/7 đồng bộ tài khoản MBBank TRAN LE MINH TAM */}
      {pendingOrder && (
        <VietQRModal
          isOpen={isModalOpen}
          orderId={pendingOrder.orderId}
          orderCode={pendingOrder.orderCode}
          amount={pendingOrder.totalAmount}
          method={method}
          onClose={() => setIsModalOpen(false)}
          onConfirmPayment={handleConfirmPayment}
          onPaymentSuccess={handlePaymentSuccess}
          onCancelOrder={handleCancelPendingOrderAndEdit}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function getErrorMessage(err: any): string {
  switch (err.status) {
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 409:
      return err.message || 'Sản phẩm không đủ tồn kho, vui lòng cập nhật lại giỏ hàng.';
    case 402:
      return 'Thanh toán thất bại. Hệ thống đã tự động hoàn trả tồn kho sản phẩm.';
    default:
      return err.message || 'Giao dịch không thành công, vui lòng thử lại.';
  }
}
