'use client';

/**
 * @file barista/page.tsx
 * @description Màn hình Điều phối Quầy Barista (KDS) & Quản lý Kho Nguyên Liệu, Định Mức Công Thức (BOM)
 *              - Phân quyền nghiêm ngặt theo chuẩn RBAC: Chỉ tài khoản STAFF / MANAGER mới có quyền truy cập
 *              - Màn hình KDS: Điều phối 4 bước thời gian thực (1. Đã thanh toán → 2. Pha chế → 3. Sẵn sàng → 4. Hoàn tất)
 *              - Kho Nguyên Liệu & Công Thức: Quản lý 13 nguyên liệu, liên kết định mức BOM, trừ/hoàn kho tự động, nhật ký StockLog
 *              - Quản lý Tồn Kho Món Nước: Kiểm soát số lượng ly theo thời gian thực
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / Chính 1 (System Architect & DevOps Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChefHat,
  Coffee,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  Package,
  Layers,
  History,
  Plus,
  AlertTriangle,
  Flame,
  Droplets,
  Boxes,
} from 'lucide-react';
import { apiFetch, getStoredToken, getStoredUser } from '../../lib/api';

interface OrderItem {
  id: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selectedToppings?: any[];
  product: {
    id?: string;
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

interface StoredIngredient {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  minThreshold: number;
}

interface StockLog {
  id: string;
  orderCode?: string;
  action: 'DEDUCT' | 'REFUND' | 'RESTOCK';
  description: string;
  createdAt: string;
}

interface ProductItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  stockQuantity: number;
  isAvailable: boolean;
  recipe?: string;
}

type MainTab = 'KDS' | 'INVENTORY' | 'PRODUCTS';
type OrderFilterTab = 'ACTIVE' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'ALL';

function BaristaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab chính
  const [mainTab, setMainTab] = useState<MainTab>('KDS');

  // Dữ liệu đơn hàng KDS
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderFilterTab>('ACTIVE');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Dữ liệu Kho & BOM
  const [ingredients, setIngredients] = useState<StoredIngredient[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [bomMap, setBomMap] = useState<Record<string, { ingredientId: string; amount: number }[]>>({});
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [restockingId, setRestockingId] = useState<string | null>(null);

  // Người dùng
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Kiểm tra URL query param (?tab=inventory hoặc ?tab=products)
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'inventory') setMainTab('INVENTORY');
    else if (tabParam === 'products') setMainTab('PRODUCTS');
    else if (tabParam === 'kds') setMainTab('KDS');
  }, [searchParams]);

  // Tải danh sách đơn hàng cho quầy KDS
  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setOrdersLoading(true);
      setOrdersError(null);
      const data = await apiFetch<Order[]>('/orders');
      setOrders(data);
    } catch (err: any) {
      if (!silent) {
        setOrdersError(err.message || 'Không thể tải danh sách đơn hàng cho quầy.');
      }
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  };

  // Tải tổng quan Kho nguyên liệu & BOM & StockLogs
  const fetchInventory = async (silent = false) => {
    try {
      if (!silent) setInventoryLoading(true);
      const data = await apiFetch<any>('/products/inventory/overview');
      if (data) {
        if (Array.isArray(data.ingredients)) setIngredients(data.ingredients);
        if (Array.isArray(data.stockLogs)) setStockLogs(data.stockLogs);
        if (data.bom) setBomMap(data.bom);
        if (Array.isArray(data.products)) setProducts(data.products);
      }
    } catch (err: any) {
      console.error('Fetch inventory error:', err);
    } finally {
      if (!silent) setInventoryLoading(false);
    }
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/login?redirect=/barista');
      return;
    }
    const user = getStoredUser();
    setCurrentUser(user);

    if (user?.role === 'STAFF' || user?.role === 'MANAGER') {
      fetchOrders();
      fetchInventory();

      // Đồng bộ thời gian thực mỗi 4 giây
      const timer = setInterval(() => {
        fetchOrders(true);
        fetchInventory(true);
      }, 4000);
      return () => clearInterval(timer);
    } else {
      setOrdersLoading(false);
    }
  }, [router]);

  // Cập nhật trạng thái đơn hàng (1 chạm)
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      setUpdatingId(orderId);
      await apiFetch<any>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await Promise.all([fetchOrders(true), fetchInventory(true)]);
    } catch (err: any) {
      alert(err.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setUpdatingId(null);
    }
  };

  // Nhập thêm nguyên liệu kho
  const handleRestockIngredient = async (ingredientId: string, amount: number) => {
    try {
      setRestockingId(ingredientId);
      await apiFetch<any>('/products/inventory/restock', {
        method: 'POST',
        body: JSON.stringify({ ingredientId, amount }),
      });
      await fetchInventory(true);
    } catch (err: any) {
      alert(err.message || 'Nhập kho thất bại');
    } finally {
      setRestockingId(null);
    }
  };

  // Nạp thêm số lượng ly món đồ uống
  const handleRestockProduct = async (productId: string, amount: number) => {
    try {
      setRestockingId(productId);
      await apiFetch<any>('/products/inventory/restock', {
        method: 'POST',
        body: JSON.stringify({ productId, amount }),
      });
      await fetchInventory(true);
    } catch (err: any) {
      alert(err.message || 'Cập nhật tồn kho món thất bại');
    } finally {
      setRestockingId(null);
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
        second: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const isStaff = currentUser?.role === 'STAFF' || currentUser?.role === 'MANAGER';

  // Thống kê số lượng đơn theo trạng thái
  const orderStats = useMemo(() => {
    return {
      confirmed: orders.filter((o) => o.status === 'CONFIRMED').length,
      preparing: orders.filter((o) => o.status === 'PREPARING').length,
      ready: orders.filter((o) => o.status === 'READY').length,
      completed: orders.filter((o) => o.status === 'COMPLETED').length,
      active: orders.filter((o) => ['CONFIRMED', 'PREPARING', 'READY'].includes(o.status)).length,
    };
  }, [orders]);

  // Bộ lọc danh sách đơn hàng KDS
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderFilter === 'ACTIVE') {
        if (!['CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) return false;
      } else if (orderFilter === 'CONFIRMED') {
        if (order.status !== 'CONFIRMED') return false;
      } else if (orderFilter === 'PREPARING') {
        if (order.status !== 'PREPARING') return false;
      } else if (orderFilter === 'READY') {
        if (order.status !== 'READY') return false;
      } else if (orderFilter === 'COMPLETED') {
        if (order.status !== 'COMPLETED') return false;
      }

      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchCode = order.orderCode.toLowerCase().includes(q);
        const matchItem = order.items.some((it) =>
          it.product?.name?.toLowerCase().includes(q),
        );
        return matchCode || matchItem;
      }
      return true;
    });
  }, [orders, orderFilter, orderSearchQuery]);

  // Thống kê cảnh báo kho nguyên liệu
  const inventoryStats = useMemo(() => {
    const lowCount = ingredients.filter((i) => i.stock <= i.minThreshold).length;
    const outCount = ingredients.filter((i) => i.stock <= 0).length;
    return {
      total: ingredients.length,
      low: lowCount,
      out: outCount,
    };
  }, [ingredients]);

  // Kiểm tra quyền hạn truy cập (RBAC Gate)
  if (!ordersLoading && currentUser && !isStaff) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-center p-6 bg-[#faf7f2] space-y-4">
        <div className="w-18 h-18 rounded-3xl bg-amber-100 flex items-center justify-center text-amber-800 shadow-sm">
          <ShieldAlert className="w-9 h-9 text-amber-800" />
        </div>
        <h2 className="text-2xl font-black text-[#2c1810]">Khu Vực Giới Hạn Quầy Barista & Quản Lý Kho</h2>
        <p className="text-sm text-stone-600 max-w-md">
          Bạn đang đăng nhập với vai trò <span className="font-bold text-[#7e4d26]">Khách Hàng ({currentUser.email})</span>.
          Giao diện điều phối công thức, trừ kho nguyên liệu và xử lý đơn pha chế chỉ dành cho tài khoản nhân viên quầy (Staff / Manager).
        </p>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 text-xs text-stone-700 max-w-md text-left space-y-1.5 shadow-xs">
          <p className="font-extrabold text-[#2c1810] flex items-center gap-1.5">
            <ChefHat className="w-4 h-4 text-amber-700" />
            <span>Tài khoản nhân viên kiểm thử demo:</span>
          </p>
          <p>Email: <span className="font-mono text-amber-900 font-bold">staff@brewlite.vn</span></p>
          <p>Mật khẩu: <span className="font-mono text-amber-900 font-bold">123456</span></p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href="/orders"
            className="bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold text-xs px-5 py-3 rounded-xl transition"
          >
            Quay về Đơn Hàng Của Tôi
          </Link>
          <Link
            href="/login?redirect=/barista"
            className="bg-[#7e4d26] hover:bg-[#5a371b] text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md flex items-center gap-2"
          >
            <ChefHat className="w-4 h-4" />
            <span>Đăng Nhập Tài Khoản Staff</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#faf7f2] min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#7e4d26] text-white flex items-center justify-center shadow-md">
              <ChefHat className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#2c1810] tracking-tight">
                Quầy Barista & Quản Lý Kho (KDS & BOM)
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Điều phối đơn hàng thời gian thực · Liên kết định mức công thức & Trừ kho nguyên liệu tự động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl">
              Nhân viên: {currentUser?.fullName || 'Barista Staff'} ({currentUser?.role})
            </span>
            <button
              onClick={() => {
                fetchOrders();
                fetchInventory();
              }}
              disabled={ordersLoading || inventoryLoading}
              className="bg-white hover:bg-stone-50 text-[#7e4d26] px-4 py-2 rounded-xl border border-stone-200 shadow-sm transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${(ordersLoading || inventoryLoading) ? 'animate-spin text-amber-700' : ''}`} />
              <span>Đồng bộ</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: KDS vs KHO NGUYÊN LIỆU vs TỒN KHO MÓN */}
        <div className="flex bg-stone-200/90 p-1.5 rounded-2xl text-xs sm:text-sm font-bold gap-1 shadow-inner">
          <button
            onClick={() => setMainTab('KDS')}
            className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              mainTab === 'KDS'
                ? 'bg-white text-[#7e4d26] shadow-sm font-black'
                : 'text-stone-600 hover:text-[#2c1810]'
            }`}
          >
            <ChefHat className="w-4 h-4 text-amber-700" />
            <span>Màn Hình Pha Chế (KDS)</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              mainTab === 'KDS' ? 'bg-amber-100 text-amber-900' : 'bg-stone-300 text-stone-700'
            }`}>
              {orderStats.active}
            </span>
          </button>

          <button
            onClick={() => setMainTab('INVENTORY')}
            className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              mainTab === 'INVENTORY'
                ? 'bg-white text-[#7e4d26] shadow-sm font-black'
                : 'text-stone-600 hover:text-[#2c1810]'
            }`}
          >
            <Package className="w-4 h-4 text-amber-700" />
            <span>Kho Nguyên Liệu & Công Thức (BOM)</span>
            {inventoryStats.low > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 animate-pulse">
                {inventoryStats.low} sắp hết
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab('PRODUCTS')}
            className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              mainTab === 'PRODUCTS'
                ? 'bg-white text-[#7e4d26] shadow-sm font-black'
                : 'text-stone-600 hover:text-[#2c1810]'
            }`}
          >
            <Boxes className="w-4 h-4 text-amber-700" />
            <span>Tồn Kho Món Nước ({products.length} món)</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: MÀN HÌNH PHA CHẾ (KDS) */}
        {/* ============================================================== */}
        {mainTab === 'KDS' && (
          <div className="space-y-6">
            {/* 4 Thẻ Trạng Thái Tiến Trình */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setOrderFilter('CONFIRMED')}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  orderFilter === 'CONFIRMED'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-blue-400'
                }`}
              >
                <span className="text-xs font-semibold block opacity-90">1. Đã thanh toán (Chờ làm)</span>
                <span className="text-2xl font-black">{orderStats.confirmed} đơn</span>
              </div>

              <div
                onClick={() => setOrderFilter('PREPARING')}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  orderFilter === 'PREPARING'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-amber-400'
                }`}
              >
                <span className="text-xs font-semibold block opacity-90">2. Đang pha chế ☕</span>
                <span className="text-2xl font-black">{orderStats.preparing} đơn</span>
              </div>

              <div
                onClick={() => setOrderFilter('READY')}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  orderFilter === 'READY'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-emerald-400'
                }`}
              >
                <span className="text-xs font-semibold block opacity-90">3. Sẵn sàng nhận 🎉</span>
                <span className="text-2xl font-black">{orderStats.ready} đơn</span>
              </div>

              <div
                onClick={() => setOrderFilter('COMPLETED')}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  orderFilter === 'COMPLETED'
                    ? 'bg-[#2c1810] text-white border-[#2c1810] shadow-md'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                }`}
              >
                <span className="text-xs font-semibold block opacity-90">4. Đã hoàn tất</span>
                <span className="text-2xl font-black">{orderStats.completed} đơn</span>
              </div>
            </div>

            {/* Bộ lọc và Tìm kiếm đơn KDS */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex bg-stone-200/80 p-1.5 rounded-2xl text-xs font-bold shrink-0 overflow-x-auto">
                <button
                  onClick={() => setOrderFilter('ACTIVE')}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                    orderFilter === 'ACTIVE'
                      ? 'bg-white text-[#7e4d26] shadow-sm'
                      : 'text-stone-600 hover:text-[#2c1810]'
                  }`}
                >
                  Cần xử lý ({orderStats.active})
                </button>
                <button
                  onClick={() => setOrderFilter('CONFIRMED')}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                    orderFilter === 'CONFIRMED'
                      ? 'bg-white text-[#7e4d26] shadow-sm'
                      : 'text-stone-600 hover:text-[#2c1810]'
                  }`}
                >
                  1. Đã thanh toán ({orderStats.confirmed})
                </button>
                <button
                  onClick={() => setOrderFilter('PREPARING')}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                    orderFilter === 'PREPARING'
                      ? 'bg-white text-[#7e4d26] shadow-sm'
                      : 'text-stone-600 hover:text-[#2c1810]'
                  }`}
                >
                  2. Pha chế ({orderStats.preparing})
                </button>
                <button
                  onClick={() => setOrderFilter('READY')}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                    orderFilter === 'READY'
                      ? 'bg-white text-[#7e4d26] shadow-sm'
                      : 'text-stone-600 hover:text-[#2c1810]'
                  }`}
                >
                  3. Sẵn sàng ({orderStats.ready})
                </button>
                <button
                  onClick={() => setOrderFilter('ALL')}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                    orderFilter === 'ALL'
                      ? 'bg-white text-[#7e4d26] shadow-sm'
                      : 'text-stone-600 hover:text-[#2c1810]'
                  }`}
                >
                  Tất cả ({orders.length})
                </button>
              </div>

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã đơn (#BL-...) hoặc tên món đồ uống..."
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#7e4d26] bg-white shadow-sm text-[#2c1810]"
                />
              </div>
            </div>

            {/* Danh sách đơn hàng KDS */}
            {ordersLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm animate-pulse space-y-3">
                    <div className="h-5 bg-stone-200 rounded w-1/4" />
                    <div className="h-16 bg-stone-100 rounded" />
                  </div>
                ))}
              </div>
            )}

            {!ordersLoading && ordersError && (
              <div className="bg-rose-50 text-rose-800 text-sm p-6 rounded-2xl border border-rose-200 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                <p className="font-semibold">{ordersError}</p>
                <button
                  onClick={() => fetchOrders()}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                >
                  Thử tải lại
                </button>
              </div>
            )}

            {!ordersLoading && !ordersError && filteredOrders.length === 0 && (
              <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center space-y-4 shadow-sm min-h-[35vh] flex flex-col justify-center items-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-[#7e4d26] flex items-center justify-center">
                  <ChefHat className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#2c1810]">
                  {orderSearchQuery ? 'Không tìm thấy đơn hàng phù hợp' : 'Hiện chưa có đơn nào ở trạng thái này'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 max-w-sm">
                  Màn hình KDS sẽ tự động hiển thị ngay khi khách hàng đặt và thanh toán đơn nước mới.
                </p>
              </div>
            )}

            {!ordersLoading && !ordersError && filteredOrders.length > 0 && (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const status = order.status;
                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl p-5 sm:p-6 border-2 transition shadow-sm space-y-4 ${
                        status === 'CONFIRMED'
                          ? 'border-blue-400 ring-2 ring-blue-100'
                          : status === 'PREPARING'
                          ? 'border-amber-400 ring-2 ring-amber-100'
                          : status === 'READY'
                          ? 'border-emerald-400 ring-2 ring-emerald-100'
                          : 'border-stone-200'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-[#2c1810] font-mono">
                            #{order.orderCode}
                          </span>
                          {status === 'CONFIRMED' && (
                            <span className="bg-blue-100 text-blue-900 border border-blue-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              1. Đã thanh toán (Chờ làm)
                            </span>
                          )}
                          {status === 'PREPARING' && (
                            <span className="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 animate-pulse shadow-xs">
                              <Coffee className="w-3.5 h-3.5" />
                              2. Đang pha chế ☕
                            </span>
                          )}
                          {status === 'READY' && (
                            <span className="bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-xs">
                              <Sparkles className="w-3.5 h-3.5" />
                              3. Sẵn sàng nhận 🎉
                            </span>
                          )}
                          {status === 'COMPLETED' && (
                            <span className="bg-stone-100 text-stone-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              4. Đã hoàn tất ✓
                            </span>
                          )}
                          {status === 'CANCELLED' && (
                            <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-bold">
                              Đã hủy & Hoàn tiền (Đã hoàn kho)
                            </span>
                          )}
                          {status === 'PENDING' && (
                            <span className="bg-amber-50 text-amber-900 border border-amber-300 text-xs px-2.5 py-1 rounded-full font-bold">
                              Chờ khách quét VietQR
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-stone-500">
                          <span>Đặt lúc: <strong className="text-stone-700">{formatDateTime(order.createdAt)}</strong></span>
                          <span className="text-stone-300">|</span>
                          <span>Tổng tiền: <strong className="text-[#7e4d26] text-sm font-black">{formatCurrency(order.totalAmount)}</strong></span>
                        </div>
                      </div>

                      {/* Drink Items with Full Barista Recipes */}
                      <div className="bg-[#faf7f2] rounded-2xl p-4 space-y-3">
                        {order.items.map((it) => (
                          <div key={it.id} className="border-b border-stone-200/70 last:border-0 pb-3 last:pb-0 space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-extrabold text-sm text-[#2c1810]">
                                  {it.product?.name || 'Đồ uống'}
                                </span>
                                <span className="ml-2 font-black text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-lg text-xs">
                                  Size {it.size}
                                </span>
                                <span className="ml-2 font-bold text-stone-600 text-xs">
                                  × {it.quantity} ly
                                </span>
                              </div>
                              <span className="text-xs font-bold text-stone-700">
                                {formatCurrency(it.lineTotal)}
                              </span>
                            </div>

                            {/* Barista Recipe Card */}
                            {it.product?.recipe && (
                              <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-stone-800 space-y-1 shadow-2xs">
                                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                                  <ChefHat className="w-4 h-4 text-amber-700 shrink-0" />
                                  <span>Công thức pha chế chuẩn vị (Barista Guide):</span>
                                </div>
                                <p className="font-mono text-[11px] text-stone-700 leading-relaxed font-medium">
                                  {it.product.recipe}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}

                        {order.note && (
                          <div className="p-2.5 rounded-xl bg-amber-100/60 border border-amber-200 text-xs text-amber-950 font-medium">
                            📝 <strong>Yêu cầu đặc biệt từ khách:</strong> {order.note}
                          </div>
                        )}
                      </div>

                      {/* KDS Action Workflow Buttons (1-Click State Transitions) */}
                      <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-3 border-t border-stone-100">
                        <span className="text-xs text-stone-400 font-mono hidden sm:inline">
                          Order ID: {order.id}
                        </span>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                          {(status === 'CONFIRMED' || status === 'PREPARING') && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                              disabled={updatingId === order.id}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                            >
                              {updatingId === order.id ? '...' : 'Hủy & Hoàn tiền (Hoàn kho)'}
                            </button>
                          )}

                          {status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                              disabled={updatingId === order.id}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer animate-pulse"
                            >
                              <Coffee className="w-4 h-4" />
                              <span>2. Bắt đầu pha chế ☕</span>
                            </button>
                          )}

                          {status === 'PREPARING' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'READY')}
                              disabled={updatingId === order.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>3. Báo sẵn sàng nhận món 🎉</span>
                            </button>
                          )}

                          {status === 'READY' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                              disabled={updatingId === order.id}
                              className="bg-[#2c1810] hover:bg-[#5a371b] text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>4. Hoàn tất bàn giao ✓</span>
                            </button>
                          )}

                          {status === 'COMPLETED' && (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              Đơn hàng đã giao thành công
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: KHO NGUYÊN LIỆU & ĐỊNH MỨC CÔNG THỨC (BOM WAREHOUSE) */}
        {/* ============================================================== */}
        {mainTab === 'INVENTORY' && (
          <div className="space-y-8">
            {/* Cảnh báo kho */}
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#2c1810]">
                    Kho Nguyên Liệu Bền Vững & Liên Kết BOM (Bill of Materials)
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Mỗi khi khách đặt đơn, hệ thống tự động trừ đồng thời số lượng ly món và trừ kho nguyên liệu thô theo công thức. Khi hủy đơn, hệ thống tự động hoàn kho nguyên vẹn.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-700">
                  Tổng nguyên liệu: <strong>{ingredients.length}</strong>
                </span>
                {inventoryStats.low > 0 ? (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{inventoryStats.low} nguyên liệu sắp hết</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kho nguyên liệu đầy đủ</span>
                  </span>
                )}
              </div>
            </div>

            {/* Phần 1: Bảng Lưới 13 Nguyên Liệu Thực Tế */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#2c1810] flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-amber-700" />
                    <span>1. Trạng Thái Kho Nguyên Liệu Thô (13 Loại)</span>
                  </h2>
                  <p className="text-xs text-stone-500">
                    Theo dõi số lượng tồn kho theo đơn vị (gram, ml, quả, miếng) và bấm nút nhập thêm nhanh
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ingredients.map((ing) => {
                  const isOut = ing.stock <= 0;
                  const isLow = ing.stock <= ing.minThreshold;
                  const percent = Math.min(100, Math.round((ing.stock / (ing.minThreshold * 3)) * 100));

                  return (
                    <div
                      key={ing.id}
                      className={`bg-white rounded-2xl p-5 border-2 shadow-sm space-y-3 transition ${
                        isOut
                          ? 'border-rose-400 bg-rose-50/20'
                          : isLow
                          ? 'border-amber-400 bg-amber-50/20'
                          : 'border-stone-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                            {ing.id} · {ing.category}
                          </span>
                          <h4 className="text-sm font-black text-[#2c1810] mt-0.5">{ing.name}</h4>
                        </div>

                        {isOut ? (
                          <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-rose-300 shrink-0">
                            Hết hàng
                          </span>
                        ) : isLow ? (
                          <span className="bg-amber-100 text-amber-900 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 shrink-0 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Sắp hết
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 shrink-0">
                            Đầy đủ
                          </span>
                        )}
                      </div>

                      {/* Thông số tồn kho */}
                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="text-2xl font-black text-[#7e4d26]">
                            {ing.stock.toLocaleString('vi-VN')}
                          </span>
                          <span className="text-xs font-bold text-stone-500 ml-1">{ing.unit}</span>
                        </div>
                        <span className="text-xs text-stone-400">
                          Ngưỡng an toàn: {ing.minThreshold} {ing.unit}
                        </span>
                      </div>

                      {/* Thanh Progress Bar */}
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(5, percent)}%` }}
                        />
                      </div>

                      {/* Nút nhập kho nhanh */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[11px] text-stone-400">Bổ sung nguyên liệu:</span>
                        <div className="flex items-center gap-1.5">
                          {ing.unit === 'g' && (
                            <>
                              <button
                                onClick={() => handleRestockIngredient(ing.id, 500)}
                                disabled={restockingId === ing.id}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[11px] px-2.5 py-1 rounded-lg transition"
                              >
                                +500g
                              </button>
                              <button
                                onClick={() => handleRestockIngredient(ing.id, 1000)}
                                disabled={restockingId === ing.id}
                                className="bg-[#7e4d26] hover:bg-[#5a371b] text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition"
                              >
                                +1kg
                              </button>
                            </>
                          )}
                          {ing.unit === 'ml' && (
                            <>
                              <button
                                onClick={() => handleRestockIngredient(ing.id, 500)}
                                disabled={restockingId === ing.id}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[11px] px-2.5 py-1 rounded-lg transition"
                              >
                                +500ml
                              </button>
                              <button
                                onClick={() => handleRestockIngredient(ing.id, 1000)}
                                disabled={restockingId === ing.id}
                                className="bg-[#7e4d26] hover:bg-[#5a371b] text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition"
                              >
                                +1 lít
                              </button>
                            </>
                          )}
                          {(ing.unit === 'quả' || ing.unit === 'miếng') && (
                            <button
                              onClick={() => handleRestockIngredient(ing.id, 20)}
                              disabled={restockingId === ing.id}
                              className="bg-[#7e4d26] hover:bg-[#5a371b] text-white font-bold text-[11px] px-3 py-1 rounded-lg transition"
                            >
                              +20 {ing.unit}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phần 2: Bảng Định Mức Công Thức BOM (Món Nước ↔ Nguyên Liệu Tiêu Hao) */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-[#2c1810] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-700" />
                  <span>2. Bảng Định Mức Công Thức BOM (Bill of Materials) Cho Từng Ly</span>
                </h2>
                <p className="text-xs text-stone-500">
                  Mỗi ly nước khách đặt sẽ kích hoạt trừ kho chính xác các định lượng nguyên liệu sau:
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#faf7f2] text-[#2c1810] border-b border-stone-200 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Món Đồ Uống</th>
                        <th className="py-3 px-4">Danh Mục</th>
                        <th className="py-3 px-4">Tồn Kho Hiện Tại</th>
                        <th className="py-3 px-4">Định Mức Trừ Nguyên Liệu Mỗi Ly (BOM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {products.map((prod) => {
                        const bomItems = bomMap[prod.id] || [];
                        return (
                          <tr key={prod.id} className="hover:bg-amber-50/40 transition">
                            <td className="py-3.5 px-4">
                              <span className="font-extrabold text-[#2c1810] block">{prod.name}</span>
                              <span className="text-[10px] text-stone-400 font-mono">{prod.id}</span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-amber-900">{prod.category}</td>
                            <td className="py-3.5 px-4">
                              <span className={`font-black text-sm ${prod.stockQuantity > 0 ? 'text-[#7e4d26]' : 'text-rose-600'}`}>
                                {prod.stockQuantity} ly
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {bomItems.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {bomItems.map((b) => {
                                    const ingMatch = ingredients.find((i) => i.id === b.ingredientId);
                                    return (
                                      <span
                                        key={b.ingredientId}
                                        className="bg-amber-50 text-amber-950 border border-amber-200/90 rounded-lg px-2 py-1 text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                                      >
                                        <span className="font-bold text-[#7e4d26]">-{b.amount}{ingMatch?.unit || ''}</span>
                                        <span>{ingMatch?.name || b.ingredientId}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-stone-400 italic">Định mức Barista tiêu chuẩn</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Phần 3: Lịch Sử Biến Động Kho Thời Gian Thực (Stock Deduction & Refund Logs) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#2c1810] flex items-center gap-2">
                    <History className="w-5 h-5 text-amber-700" />
                    <span>3. Nhật Ký Biến Động Kho Thời Gian Thực (Stock Logs)</span>
                  </h2>
                  <p className="text-xs text-stone-500">
                    Ghi vết tự động mọi thao tác: Khách đặt đơn (Xuất kho), Hủy đơn (Hoàn kho), Nhân viên nạp kho (Nhập kho)
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                {stockLogs.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs">
                    Chưa có nhật ký biến động kho nào. Hãy thử đặt 1 đơn nước để quan sát hệ thống tự động trừ kho!
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 max-h-[420px] overflow-y-auto">
                    {stockLogs.map((log) => {
                      const isDeduct = log.action === 'DEDUCT';
                      const isRefund = log.action === 'REFUND';
                      return (
                        <div key={log.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-stone-50 transition text-xs">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0 ${
                                isDeduct
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : isRefund
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {isDeduct ? 'Xuất Kho' : isRefund ? 'Hoàn Kho' : 'Nhập Kho'}
                            </span>
                            <div>
                              <p className="font-semibold text-stone-800 leading-snug">{log.description}</p>
                              {log.orderCode && (
                                <span className="font-mono text-stone-400 text-[11px] block mt-0.5">
                                  Mã đơn liên kết: #{log.orderCode}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-[11px] text-stone-400 font-mono shrink-0 self-end sm:self-center">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: QUẢN LÝ TỒN KHO MÓN NƯỚC (DRINK CUP STOCKS) */}
        {/* ============================================================== */}
        {mainTab === 'PRODUCTS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#2c1810] flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-amber-700" />
                  <span>Quản Lý Số Lượng Tồn Kho Từng Món (Ly Nước)</span>
                </h2>
                <p className="text-xs text-stone-500">
                  Khi khách đặt món, số ly sẽ giảm đi tương ứng. Nếu ly = 0, hệ thống tự động khóa món trên Menu.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm space-y-3 hover:border-amber-400 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                        {p.category}
                      </span>
                      <h4 className="text-sm font-black text-[#2c1810] mt-0.5">{p.name}</h4>
                    </div>
                    {p.stockQuantity > 0 ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                        Còn hàng
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-rose-300">
                        Hết món
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-xs text-stone-400 block">Số lượng ly còn lại</span>
                      <span className="text-2xl font-black text-[#7e4d26]">{p.stockQuantity} ly</span>
                    </div>
                    <span className="text-xs font-bold text-stone-600">{formatCurrency(p.basePrice)}</span>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-mono">{p.id}</span>
                    <button
                      onClick={() => handleRestockProduct(p.id, 20)}
                      disabled={restockingId === p.id}
                      className="bg-[#7e4d26] hover:bg-[#5a371b] text-white font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{restockingId === p.id ? '...' : '+20 ly'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BaristaPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#faf7f2] min-h-[60vh] flex items-center justify-center text-center p-6">
          <div className="animate-pulse space-y-2">
            <div className="w-10 h-10 border-4 border-[#7e4d26] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-stone-600">Đang tải dữ liệu quầy Barista & Kho...</p>
          </div>
        </div>
      }
    >
      <BaristaContent />
    </Suspense>
  );
}
