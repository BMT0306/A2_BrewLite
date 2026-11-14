'use client';

/**
 * @file orders/page.tsx
 * @description Màn hình Tra cứu Lịch sử Đơn hàng và Theo dõi Trạng thái Pha chế theo thời gian thực (UC-06)
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / Chính 1 (System Architect & DevOps Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Coffee,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  QrCode,
  ChefHat,
  Check,
} from 'lucide-react';
import { apiFetch, getStoredToken, getStoredUser } from '../../lib/api';
import { VietQRModal } from '../../components/VietQRModal';

interface OrderItem {
  id: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: {
    name: string;
    imageUrl: string;
    recipe?: string;
  };
}

interface Order {
  id: string;
  orderCode: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  note?: string;
  createdAt: string;
  items: OrderItem[];
  payments: any[];
}

type TabFilter = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Order[]>('/orders');
      setOrders(data);
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      setError(err.message || 'Không thể tải lịch sử đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/login?redirect=/orders');
      return;
    }
    const user = getStoredUser();
    setCurrentUser(user);
    fetchOrders();
  }, [router]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      setUpdatingId(orderId);
      await apiFetch<any>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmPaymentFromOrders = async () => {
    if (!payingOrder) return;
    setSubmittingPayment(true);
    try {
      // 1. Kiểm tra trước trạng thái đơn hàng từ Backend API
      const check = await apiFetch<any>(`/orders/${payingOrder.id}`).catch(() => null);
      if (check && (check.status === 'CONFIRMED' || check.status === 'COMPLETED' || check.status === 'PAID')) {
        setPayingOrder(null);
        await fetchOrders();
        return;
      }

      // 2. Giai đoạn 2: Gọi POST /payments kèm Idempotency-Key
      const idempotencyKey = crypto.randomUUID();
      await apiFetch(
        '/payments',
        {
          method: 'POST',
          body: JSON.stringify({
            orderId: payingOrder.id,
            method: 'CARD',
            simulateFailure: false,
          }),
        },
        idempotencyKey,
      );
      setPayingOrder(null);
      await fetchOrders();
    } catch (err: any) {
      // Nếu đơn hàng đã được Webhook SePay xác nhận trước đó
      setPayingOrder(null);
      await fetchOrders();
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDeletePendingOrder = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này và hoàn trả tồn kho?')) return;
    try {
      setUpdatingId(orderId);
      await apiFetch(`/orders/${orderId}`, { method: 'DELETE' });
      if (payingOrder?.id === orderId) {
        setPayingOrder(null);
      }
      await fetchOrders();
    } catch (err: any) {
      // Fallback nếu method DELETE chưa hỗ trợ, cập nhật CANCELLED
      await handleUpdateStatus(orderId, 'CANCELLED');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = (val: number | string) => {
    return Number(val || 0).toLocaleString('vi-VN') + ' đ';
  };

  const formatDateTime = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (order: Order) => {
    switch (order.status) {
      case 'PENDING':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2.5 py-1 rounded-full font-bold">
            Chờ thanh toán
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã thanh toán ✓
          </span>
        );
      case 'PREPARING':
        return (
          <span className="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full font-bold animate-pulse shadow-sm">
            Đang pha chế ☕
          </span>
        );
      case 'READY':
        return (
          <span className="bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
            Sẵn sàng nhận 🎉
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold">
            Đã hoàn tất ✓
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs px-2.5 py-1 rounded-full font-bold">
            Lỗi thanh toán (Hoàn kho)
          </span>
        );
      case 'CANCELLED': {
        const wasRefunded =
          (order as any).refundStatus === 'REFUNDED' ||
          (order.payments && order.payments.some((p: any) => p.status === 'REFUNDED' || p.status === 'PAID'));
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs px-2.5 py-1 rounded-full font-bold">
            {wasRefunded ? 'Đã hủy & Hoàn tiền' : 'Đã hủy'}
          </span>
        );
      }
      default:
        return (
          <span className="bg-stone-100 text-stone-800 text-xs px-2.5 py-1 rounded-full font-bold">
            {order.status}
          </span>
        );
    }
  };

  const renderStatusStepper = (order: Order) => {
    const status = order.status;
    const steps = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];
    const labels = ['Đã thanh toán', 'Pha chế', 'Sẵn sàng', 'Hoàn tất'];
    const currentIndex = steps.indexOf(status);

    if (status === 'CANCELLED') {
      const wasRefunded =
        (order as any).refundStatus === 'REFUNDED' ||
        (order.payments && order.payments.some((p: any) => p.status === 'REFUNDED' || p.status === 'PAID'));
      return (
        <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-xl border border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {wasRefunded
                ? 'Đơn hàng đã được hủy thành công. Hệ thống đã hoàn tiền cho bạn.'
                : 'Đơn hàng đã được hủy thành công.'}
            </span>
          </div>
          <Link
            href="/"
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg shrink-0 ml-2 transition"
          >
            Đặt lại món
          </Link>
        </div>
      );
    }

    if (status === 'PAYMENT_FAILED') {
      return (
        <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-xl border border-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>Giao dịch thanh toán bị gián đoạn. Kho hàng đã được bù trừ hoàn trả nguyên vẹn.</span>
        </div>
      );
    }

    return (
      <div className="pt-3 pb-2">
        <div className="flex justify-between relative max-w-md mx-auto">
          {labels.map((lbl, idx) => {
            const isDone = currentIndex >= idx;
            const isCurrent = currentIndex === idx;
            return (
              <div key={lbl} className="flex flex-col items-center flex-1 relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isDone
                      ? 'bg-[#7e4d26] text-white shadow-sm'
                      : 'bg-stone-200 text-stone-500'
                  } ${isCurrent ? 'ring-4 ring-amber-300 scale-110' : ''}`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[11px] mt-1.5 text-center leading-tight ${
                    isCurrent ? 'font-extrabold text-[#7e4d26]' : 'text-stone-400 font-medium'
                  }`}
                >
                  {lbl}
                </span>
              </div>
            );
          })}
          {/* Connecting line */}
          <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-stone-200 -z-0" />
        </div>
      </div>
    );
  };

  const isStaff = currentUser?.role === 'STAFF' || currentUser?.role === 'MANAGER';

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeTab === 'ACTIVE') {
        if (!['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) {
          return false;
        }
      } else if (activeTab === 'COMPLETED') {
        if (order.status !== 'COMPLETED') return false;
      } else if (activeTab === 'FAILED') {
        if (!['PAYMENT_FAILED', 'CANCELLED'].includes(order.status)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = order.orderCode.toLowerCase().includes(q);
        const matchItem = order.items.some((it) =>
          it.product?.name?.toLowerCase().includes(q),
        );
        return matchCode || matchItem;
      }
      return true;
    });
  }, [orders, activeTab, searchQuery]);

  return (
    <div className="bg-[#faf7f2] min-h-screen py-6 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2c1810] tracking-tight">
              Lịch Sử & Theo Dõi Đơn Hàng
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Đồng bộ dữ liệu thời gian thực · Bạn có tổng cộng {orders.length} đơn hàng
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isStaff && (
              <Link
                href="/barista"
                className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs font-bold"
              >
                <ChefHat className="w-4 h-4" />
                <span>Sang Quầy Barista (KDS)</span>
              </Link>
            )}
            <button
              onClick={() => fetchOrders()}
              disabled={loading}
              className="bg-white hover:bg-stone-50 text-[#7e4d26] px-4 py-2 rounded-xl border border-stone-200 shadow-sm transition flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-700' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Staff Notice if logged in as staff */}
        {isStaff && (
          <div className="bg-amber-900 text-amber-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-black bg-amber-600 text-white px-2 py-0.5 rounded-md text-xs uppercase tracking-wider shrink-0">
                STAFF
              </span>
              <p className="text-xs leading-relaxed">
                Bạn đang đăng nhập tài khoản nhân viên. Để xem chi tiết công thức chuẩn vị từng món và điều phối trạng thái pha chế, vui lòng truy cập Màn hình Quầy Barista (KDS).
              </p>
            </div>
            <Link
              href="/barista"
              className="bg-white hover:bg-amber-50 text-[#7e4d26] font-bold text-xs px-3.5 py-2 rounded-xl shrink-0 transition"
            >
              Mở Quầy Barista →
            </Link>
          </div>
        )}

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-stone-200/80 p-1.5 rounded-2xl text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'ALL'
                  ? 'bg-white text-[#7e4d26] shadow-sm'
                  : 'text-stone-600 hover:text-[#2c1810]'
              }`}
            >
              Tất cả ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'ACTIVE'
                  ? 'bg-white text-[#7e4d26] shadow-sm'
                  : 'text-stone-600 hover:text-[#2c1810]'
              }`}
            >
              Đang xử lý
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'COMPLETED'
                  ? 'bg-white text-[#7e4d26] shadow-sm'
                  : 'text-stone-600 hover:text-[#2c1810]'
              }`}
            >
              Đã xong
            </button>
            <button
              onClick={() => setActiveTab('FAILED')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'FAILED'
                  ? 'bg-white text-[#7e4d26] shadow-sm'
                  : 'text-stone-600 hover:text-[#2c1810]'
              }`}
            >
              Hủy / Lỗi
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã đơn (ví dụ: ORD-...) hoặc tên món đồ uống..."
              className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#7e4d26] bg-white shadow-sm text-[#2c1810]"
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm animate-pulse space-y-3"
              >
                <div className="h-5 bg-stone-200 rounded w-1/4" />
                <div className="h-4 bg-stone-100 rounded w-1/3" />
                <div className="h-16 bg-stone-50 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-rose-50 text-rose-800 text-sm p-6 rounded-2xl border border-rose-200 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchOrders}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
            >
              Thử tải lại
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-12 text-center space-y-4 shadow-sm min-h-[45vh] flex flex-col justify-center items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-[#7e4d26] flex items-center justify-center">
              <ClipboardList className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#2c1810]">
              {searchQuery ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-sm">
              {searchQuery
                ? 'Hãy thử tìm kiếm với mã đơn khác hoặc kiểm tra lại bộ lọc.'
                : 'Thưởng thức những tách cà phê thơm ngon tại BrewLite bằng cách đặt món ngay!'}
            </p>
            {!searchQuery && (
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-[#7e4d26] hover:bg-[#5a371b] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition"
              >
                <Coffee className="w-4 h-4" />
                <span>Đặt món ngay</span>
              </Link>
            )}
          </div>
        )}

        {/* Orders List */}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-sm space-y-4 hover:border-amber-400 transition"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-[#2c1810] font-mono">
                        #{order.orderCode}
                      </span>
                      {getStatusBadge(order)}
                    </div>
                    <span className="text-xs text-stone-400 mt-0.5 block">
                      Đặt lúc: {formatDateTime(order.createdAt)}
                    </span>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xs text-stone-400 block">Tổng tiền</span>
                    <span className="text-lg font-black text-[#7e4d26]">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Status Stepper */}
                {renderStatusStepper(order)}

                {/* Items List */}
                <div className="bg-[#faf7f2] rounded-2xl p-4 space-y-2 text-xs">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex justify-between items-center text-stone-700">
                      <span className="font-semibold truncate pr-3 text-[#2c1810]">
                        {it.product?.name || 'Đồ uống'} (Size {it.size}) × {it.quantity}
                      </span>
                      <span className="font-bold text-[#7e4d26] shrink-0">
                        {formatCurrency(it.lineTotal)}
                      </span>
                    </div>
                  ))}
                  {order.note && (
                    <p className="text-xs text-stone-500 italic pt-2 border-t border-stone-200">
                      Ghi chú: {order.note}
                    </p>
                  )}
                </div>

                {/* Bottom Actions - Chỉ dành cho Khách hàng */}
                <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-3 border-t border-stone-100">
                  <span className="text-xs text-stone-400 hidden sm:inline">
                    Idempotent Order ID: <span className="font-mono text-stone-600">{order.id.slice(0, 8)}...</span>
                  </span>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    {order.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleDeletePendingOrder(order.id)}
                          disabled={updatingId === order.id}
                          className="text-stone-500 hover:text-rose-700 bg-stone-100 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                        >
                          {updatingId === order.id ? 'Đang hủy...' : 'Hủy đơn hàng'}
                        </button>
                        <button
                          onClick={() => setPayingOrder(order)}
                          className="bg-[#7e4d26] hover:bg-[#5a371b] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer animate-pulse"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Quét mã VietQR thanh toán ngay</span>
                        </button>
                      </>
                    )}

                    {order.status === 'CONFIRMED' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500 hidden sm:inline">
                          Đã chuyển yêu cầu tới quầy pha chế
                        </span>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                          disabled={updatingId === order.id}
                          className="text-stone-500 hover:text-rose-700 bg-stone-100 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
                        >
                          {updatingId === order.id ? 'Đang hủy...' : 'Đổi món (Hủy & Hoàn tiền)'}
                        </button>
                      </div>
                    )}

                    {order.status === 'PREPARING' && (
                      <span className="text-amber-800 bg-amber-50 border border-amber-200 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                        <Coffee className="w-4 h-4 animate-bounce text-amber-600" />
                        Barista đang chuẩn bị món...
                      </span>
                    )}

                    {order.status === 'READY' && (
                      <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Mời bạn đến quầy nhận đồ uống!
                      </span>
                    )}

                    {order.status === 'COMPLETED' && (
                      <span className="text-stone-500 text-xs font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Đã giao thành công · Cảm ơn bạn!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal VietQR Napas 24/7 đồng bộ tài khoản MBBank TRAN LE MINH TAM */}
      {payingOrder && (
        <VietQRModal
          isOpen={!!payingOrder}
          orderId={payingOrder.id}
          orderCode={payingOrder.orderCode}
          amount={payingOrder.totalAmount}
          method="CARD"
          onClose={() => setPayingOrder(null)}
          onConfirmPayment={handleConfirmPaymentFromOrders}
          onPaymentSuccess={async () => {
            setPayingOrder(null);
            await fetchOrders();
          }}
          onCancelOrder={() => handleDeletePendingOrder(payingOrder.id)}
          submitting={submittingPayment}
        />
      )}
    </div>
  );
}
