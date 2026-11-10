'use client';

/**
 * @file orders/page.tsx
 * @description Màn hình Tra cứu Lịch sử Đơn hàng và Theo dõi Trạng thái Pha chế theo thời gian thực (UC-06)
 * @author Hoàng Minh Quân (Phụ 2) - Business Analyst 2 (SRS & Use-case Lead)
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
  Filter,
} from 'lucide-react';
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

type TabFilter = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Enhancements for UX / Evaluation
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
            Chờ thanh toán
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            Đã tiếp nhận
          </span>
        );
      case 'PREPARING':
        return (
          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
            Đang pha chế ☕
          </span>
        );
      case 'READY':
        return (
          <span className="bg-teal-100 text-teal-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            Sẵn sàng nhận 🎉
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            Đã hoàn tất ✓
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            Lỗi thanh toán (Hoàn kho)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
            Đã hủy đơn
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {status}
          </span>
        );
    }
  };

  const renderStatusStepper = (status: string) => {
    const steps = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];
    const labels = ['Xác nhận', 'Pha chế', 'Sẵn sàng', 'Đã lấy'];
    const currentIndex = steps.indexOf(status);

    if (status === 'PAYMENT_FAILED') {
      return (
        <div className="bg-rose-50 text-rose-700 text-[11px] p-2.5 rounded-xl border border-rose-200 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>Giao dịch thanh toán bị từ chối. Kho hàng đã được bù trừ hoàn trả nguyên vẹn.</span>
        </div>
      );
    }

    if (status === 'CANCELLED') {
      return (
        <div className="bg-slate-100 text-slate-600 text-[11px] p-2.5 rounded-xl flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span>Đơn hàng đã được ghi nhận hủy bỏ trong hệ thống.</span>
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

  // Filtered orders list based on Tab and Search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 'ACTIVE') {
        if (!['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) {
          return false;
        }
      } else if (activeTab === 'COMPLETED') {
        if (order.status !== 'COMPLETED') return false;
      } else if (activeTab === 'FAILED') {
        if (!['PAYMENT_FAILED', 'CANCELLED'].includes(order.status)) return false;
      }

      // Search query filter
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
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-sm font-bold text-slate-800">
            {isStaff ? 'Quản lý Đơn hàng (Staff View)' : 'Lịch sử & Theo dõi Đơn'}
          </h1>
          <p className="text-[10px] text-slate-400">
            {orders.length} đơn hàng được đồng bộ
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="text-slate-500 hover:text-teal-700 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center space-x-1 text-xs"
          title="Tải lại danh sách"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-700' : ''}`} />
          <span className="text-[10px]">Tải lại</span>
        </button>
      </div>

      {/* Staff banner */}
      {isStaff && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl p-2.5 text-xs flex items-center space-x-2">
          <span className="font-bold bg-indigo-700 text-white px-1.5 py-0.5 rounded text-[10px]">
            STAFF
          </span>
          <span>Bạn đang quản lý toàn bộ đơn hàng và có quyền cập nhật tiến trình chế biến.</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-2">
        <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'ALL'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'ACTIVE'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đang xử lý
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'COMPLETED'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đã xong
          </button>
          <button
            onClick={() => setActiveTab('FAILED')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'FAILED'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Lỗi / Hủy
          </button>
        </div>

        {/* Quick Search */}
        {orders.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã đơn hoặc tên món..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
            />
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm animate-pulse space-y-2"
            >
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

      {/* Empty State */}
      {!loading && !error && filteredOrders.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-3 my-auto min-h-[40vh] flex flex-col justify-center items-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">
            {searchQuery ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs">
            {searchQuery
              ? 'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tìm kiếm.'
              : 'Hãy vào thực đơn chọn món đồ uống yêu thích để trải nghiệm dịch vụ nhé!'}
          </p>
          {!searchQuery && (
            <Link
              href="/"
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition"
            >
              Đặt món ngay
            </Link>
          )}
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3 hover:border-teal-200 transition"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block font-mono">
                    {order.orderCode}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDateTime(order.createdAt)}
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
                      {formatCurrency(it.lineTotal)}
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
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>

                {/* Staff Quick Status Update Buttons */}
                {isStaff && (
                  <div className="flex space-x-1.5">
                    {order.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        disabled={updatingId === order.id}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95"
                      >
                        {updatingId === order.id ? '...' : 'Pha chế'}
                      </button>
                    )}
                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        disabled={updatingId === order.id}
                        className="bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95"
                      >
                        {updatingId === order.id ? '...' : 'Sẵn sàng'}
                      </button>
                    )}
                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        disabled={updatingId === order.id}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95"
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
