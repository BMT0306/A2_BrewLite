/**
 * @file page.tsx (Trang chủ Menu – "/")
 * @description Xem danh sách đồ uống, lọc theo danh mục & tìm kiếm (FR-01).
 *              Xử lý đủ 4 trạng thái: Loading / Error / Empty / Hết hàng.
 * @author Thành viên Chính 3: Bùi Minh Trung - Frontend & PWA Lead
 * @see docs/diagrams/activity-menu-cart.puml (Bước 1 → "Hiển thị danh sách món theo danh mục")
 * @see docs/ui-ux-frontend-specification.md (Mục 3.1)
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, AlertCircle, RefreshCw, Coffee } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatVND } from '../lib/format';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  imageUrl: string;
  stockQuantity: number;
  isAvailable: boolean;
}

const CATEGORIES = [
  { id: 'All', label: 'Tất cả' },
  { id: 'Coffee', label: 'Cà phê' },
  { id: 'Tea', label: 'Trà trái cây' },
  { id: 'MilkTea', label: 'Trà sữa' },
  { id: 'Freeze', label: 'Đá xay' },
];

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [keyword, setKeyword] = useState('');

  // Diagram: "Hiển thị Skeleton UI" → "Gửi request GET /products"
  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await apiFetch<Product[]>('/products'));
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối tới máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Lọc tức thì phía client theo danh mục + từ khóa (không cần tải lại trang)
  const visibleProducts = products.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      p.name.toLowerCase().includes(keyword.trim().toLowerCase()),
  );

  return (
    <div className="p-4 space-y-4">
      {/* Thanh tìm kiếm */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm kiếm đồ uống..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
      </div>

      {/* Tab danh mục */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              category === c.id ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 4 trạng thái giao diện theo diagram */}
      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={loadProducts} />
      ) : visibleProducts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visibleProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Các thành phần con ---------- */

function ProductCard({ product }: { product: Product }) {
  const isOutOfStock = product.stockQuantity <= 0 || !product.isAvailable;

  return (
    <Link
      href={`/products/${product.id}`}
      className={`relative bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm ${
        isOutOfStock ? 'opacity-60 grayscale' : ''
      }`}
    >
      {isOutOfStock && (
        <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          TẠM HẾT HÀNG
        </span>
      )}
      <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-cover" loading="lazy" />
      <div className="p-2.5">
        <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{product.name}</h3>
        <p className="text-[11px] text-slate-500 line-clamp-2">{product.description}</p>
        <p className="mt-1.5 text-sm font-extrabold text-teal-700">{formatVND(product.basePrice)}</p>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-2.5 space-y-2 animate-pulse">
          <div className="h-28 bg-slate-200 rounded-lg" />
          <div className="h-3 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center space-y-3">
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
      <p className="text-sm text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Thử lại
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
      <Coffee className="w-10 h-10 text-slate-300 mx-auto" />
      <p className="text-sm text-slate-600">Chưa có đồ uống nào phù hợp với tìm kiếm của bạn</p>
    </div>
  );
}
