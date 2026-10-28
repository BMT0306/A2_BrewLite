'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, Clock, CheckCircle2, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { apiFetch, getStoredToken, getStoredUser } from '../../lib/api';

interface OrderItem {
  id: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: {
    name: string;
    imageUrl: string;
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

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    setCurrentUser(getStoredUser());
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Đã tiếp nhận</span>;
      case 'PREPARING':
        return <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">Đang pha chế</span>;
      case 'READY':
        return <span className="bg-teal-100 text-teal-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Sẵn sàng nhận</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Đã hoàn tất</span>;
      case 'PAYMENT_FAILED':
        return <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Thanh toán lỗi (Hoàn kho)</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-bold">{status}</span>;
    }
  };

  const renderStatusStepper = (status: string) => {
    const steps = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];
    const labels = ['Xác nhận', 'Pha chế', 'Sẵn sàng', 'Đã lấy'];
    const currentIndex = steps.indexOf(status);

    if (status === 'PAYMENT_FAILED') {
      return (
        <div className="bg-rose-50 text-rose-700 text-[11px] p-2 rounded-lg flex items-center space-x-1.5">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>Giao dịch thanh toán bị từ chối. Kho hàng đã được hoàn trả an toàn.</span>
        </div>
      );
    }

    return (
      <div className="pt-2 pb-1">
        <div className="flex justify-between relative">
          {labels.map((lbl, idx) => {
            const isDone = currentIndex >= idx;
            const isCurrent = currentIndex === idx;
            return (
              <div key={lbl} className="flex flex-col items-center flex-1 relative z-10">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isDone
                      ? 'bg-teal-700 text-white shadow'
                      : 'bg-slate-200 text-slate-500'
                  } ${isCurrent ? 'ring-2 ring-teal-400 scale-110' : ''}`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[9px] mt-1 text-center leading-none ${
                    isCurrent ? 'font-bold text-teal-800' : 'text-slate-400'
                  }`}
                >
                  {lbl}
                </span>
              </div>
            );
          })}
          {/* Connector Line */}
          <div className="absolute top-3 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
        </div>
      </div>
    );
  };

  const isStaff = currentUser?.role === 'STAFF' || currentUser?.role === 'MANAGER';

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h1 className="text-sm font-bold text-slate-800">
          {isStaff ? 'Quản lý Đơn hàng (Staff View)' : 'Lịch sử & Theo dõi Đơn'}
        </h1>
        <button
          onClick={fetchOrders}
          className="text-slate-500 hover:text-teal-700 p-1 transition"
          title="Tải lại danh sách"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Staff banner */}
      {isStaff && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl p-2.5 text-xs flex items-center space-x-2">
          <span className="font-bold bg-indigo-700 text-white px-1.5 py-0.5 rounded text-[10px]">STAFF</span>
          <span>Bạn đang xem toàn bộ đơn hàng của cửa hàng và có thể đổi trạng thái phục vụ.</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-12 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-rose-50 text-rose-700 text-xs p-4 rounded-xl border border-rose-200 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
          <p>{error}</p>
          <button
            onClick={fetchOrders}
            className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-3 my-auto min-h-[50vh] flex flex-col justify-center items-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Chưa có đơn hàng nào</h3>
          <p className="text-xs text-slate-500 max-w-xs">
            Bạn chưa đặt đơn nào. Hãy vào thực đơn để chọn những món đồ uống tươi ngon nhé!
          </p>
          <Link
            href="/"
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition"
          >
            Đặt món ngay
          </Link>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block font-mono">
                    {order.orderCode}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
                {getStatusBadge(order.status)}
              </div>

              {/* Status Stepper */}
              {renderStatusStepper(order.status)}

              {/* Items List */}
              <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 text-xs">
                {order.items.map((it) => (
                  <div key={it.id} className="flex justify-between items-center text-slate-700">
                    <span className="font-medium truncate pr-2">
                      {it.product?.name || 'Đồ uống'} (Size {it.size}) x{it.quantity}
                    </span>
                    <span className="font-bold text-slate-900 flex-shrink-0">
                      {Number(it.lineTotal).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
                {order.note && (
                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200">
                    Ghi chú: {order.note}
                  </p>
                )}
              </div>

              {/* Total & Staff Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Tổng thanh toán:</span>
                  <span className="font-extrabold text-teal-800 text-sm">
                    {Number(order.totalAmount).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* Staff Quick Status Update Buttons */}
                {isStaff && (
                  <div className="flex space-x-1.5">
                    {order.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        disabled={updatingId === order.id}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        {updatingId === order.id ? '...' : 'Pha chế'}
                      </button>
                    )}
                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        disabled={updatingId === order.id}
                        className="bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        {updatingId === order.id ? '...' : 'Sẵn sàng'}
                      </button>
                    )}
                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        disabled={updatingId === order.id}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        {updatingId === order.id ? '...' : 'Hoàn tất'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
