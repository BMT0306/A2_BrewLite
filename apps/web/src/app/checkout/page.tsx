/**
 * @file checkout/page.tsx
 * @description Đặt đơn & Thanh toán (FR-05, FR-06) – gồm 2 giai đoạn đúng theo Sequence Diagram:
 *              (1) POST /orders  → tạo đơn + trừ tồn kho trong Transaction
 *              (2) POST /payments → thanh toán có header Idempotency-Key
 * @author Thành viên Chính 3 - Frontend & PWA Lead
 * @see docs/diagrams/sequence-checkout.puml
 * @see docs/ui-ux-frontend-specification.md (Mục 3.5)
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wallet, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiFetch, getStoredToken } from '../../lib/api';
import { formatVND } from '../../lib/format';
import { useCartStore, useCartHydrated, calcLineTotal } from '../../store/useCartStore';

type PaymentMethod = 'WALLET' | 'CARD';

interface CreateOrderResponse {
  orderId: string;
  orderCode: string;
  totalAmount: number;
}

const PAYMENT_METHODS = [
  { id: 'WALLET' as const, label: 'Ví điện tử', sub: 'MoMo / ZaloPay', icon: Wallet },
  { id: 'CARD' as const, label: 'Thẻ ngân hàng', sub: 'Visa / Master', icon: CreditCard },
];

export default function CheckoutPage() {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const { items, getSubtotal, clearCart } = useCartStore();

  const [method, setMethod] = useState<PaymentMethod>('WALLET');
  const [note, setNote] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false); // Bảng giả lập cho giảng viên
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidOrderCode, setPaidOrderCode] = useState<string | null>(null);

  // Activity diagram: chưa có JWT → chuyển tới trang đăng nhập rồi quay lại /checkout
  useEffect(() => {
    if (!getStoredToken()) router.replace('/login?redirect=/checkout');
  }, [router]);

  const handlePlaceAndPay = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // ===== Giai đoạn 1: Tạo đơn hàng & trừ tồn kho (Transaction ở Backend) =====
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

      // ===== Giai đoạn 2: Thanh toán kèm Idempotency-Key (UUID mới cho mỗi lần đặt) =====
      const idempotencyKey = crypto.randomUUID();
      await apiFetch(
        '/payments',
        { method: 'POST', body: JSON.stringify({ orderId: order.orderId, method, simulateFailure }) },
        idempotencyKey,
      );

      // 200 OK → CONFIRMED + PAID: làm sạch giỏ & chuyển sang trang theo dõi đơn
      clearCart();
      setPaidOrderCode(order.orderCode);
      setTimeout(() => router.push('/orders'), 1500);
    } catch (err: any) {
      setError(getErrorMessage(err));
      if (err.status === 401) router.push('/login?redirect=/checkout');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) return null;

  // Thanh toán thành công
  if (paidOrderCode) {
    return (
      <div className="p-6 min-h-[60vh] flex flex-col items-center justify-center text-center gap-2">
        <CheckCircle2 className="w-14 h-14 text-green-600" />
        <h2 className="text-base font-bold text-slate-800">Đặt hàng & thanh toán thành công!</h2>
        <p className="text-sm text-slate-600">Mã đơn: {paidOrderCode}</p>
        <p className="text-xs text-slate-400">Đang chuyển tới trang theo dõi đơn...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-slate-500">Giỏ hàng trống, vui lòng chọn món trước.</p>
        <Link href="/" className="text-sm text-teal-700 font-bold">
          ← Quay lại thực đơn
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-base font-bold text-slate-800">Xác nhận & Thanh toán</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tóm tắt đơn hàng */}
      <Card title={`Món đã chọn (${items.length})`}>
        {items.map((it) => (
          <div key={it.id} className="flex justify-between text-sm py-1">
            <span className="text-slate-700">
              {it.name} <span className="text-slate-400">x{it.quantity} · Size {it.size}</span>
            </span>
            <span className="font-semibold">{formatVND(calcLineTotal(it))}</span>
          </div>
        ))}
        <div className="flex justify-between border-t mt-2 pt-2 font-extrabold">
          <span>Tổng thanh toán</span>
          <span className="text-teal-700">{formatVND(getSubtotal())}</span>
        </div>
      </Card>

      {/* Phương thức thanh toán */}
      <Card title="Phương thức thanh toán">
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map(({ id, label, sub, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className={`p-3 rounded-xl border flex items-center gap-2 text-left ${
                method === id ? 'border-teal-700 bg-teal-50' : 'border-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 text-teal-700" />
              <span>
                <span className="block text-sm font-bold">{label}</span>
                <span className="block text-[11px] text-slate-500">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Ghi chú */}
      <Card title="Ghi chú cho Barista">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ: ít đá, giao tại bàn số 5..."
          className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-700"
        />
      </Card>

      {/* Bảng điều khiển giả lập (Demo Control Panel) cho hội đồng nghiệm thu */}
      <Card title="Giả lập kết quả thanh toán (Demo)">
        <div className="grid grid-cols-2 gap-2 text-sm font-bold">
          <button
            onClick={() => setSimulateFailure(false)}
            className={`p-2 rounded-lg border ${!simulateFailure ? 'bg-green-600 text-white' : 'bg-white'}`}
          >
            ✓ Thành công
          </button>
          <button
            onClick={() => setSimulateFailure(true)}
            className={`p-2 rounded-lg border ${simulateFailure ? 'bg-red-600 text-white' : 'bg-white'}`}
          >
            ✗ Thất bại (hoàn kho)
          </button>
        </div>
      </Card>

      <button
        onClick={handlePlaceAndPay}
        disabled={submitting}
        className="w-full bg-teal-700 text-white font-bold text-sm py-3.5 rounded-xl disabled:opacity-50"
      >
        {submitting ? 'Đang xử lý giao dịch...' : error ? 'Thử thanh toán lại' : 'Đặt đơn & Thanh toán'}
      </button>
    </div>
  );
}

/**
 * Ánh xạ mã lỗi HTTP sang thông báo cho khách hàng (theo các nhánh "alt" của Sequence Diagram).
 * Khi lỗi 402, Backend đã hoàn kho & đơn cũ chuyển PAYMENT_FAILED → bấm "Thử lại" sẽ tạo đơn mới.
 */
function getErrorMessage(err: any): string {
  switch (err.status) {
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 409: // Hết hàng – Backend đã ROLLBACK, nội dung lỗi kèm tên món cần cập nhật
      return err.message || 'Sản phẩm không đủ tồn kho, vui lòng cập nhật giỏ hàng.';
    case 402:
      return 'Thanh toán thất bại. Tồn kho đã được hoàn trả, bạn có thể thử thanh toán lại.';
    default:
      return err.message || 'Giao dịch không thành công, vui lòng thử lại.';
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 mb-2">{title}</h2>
      {children}
    </div>
  );
}
