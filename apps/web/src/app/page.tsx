/**
 * @file page.tsx (Trang chủ Menu – "/")
 * @description Xem danh sách đồ uống cao cấp BrewLite Specialty Roastery, lọc theo danh mục & tìm kiếm (FR-01).
 *              Xử lý đủ 4 trạng thái: Loading / Error / Empty / Hết hàng.
 * @author Thành viên Chính 3: Bùi Minh Trung - Frontend & PWA Lead
 * @see docs/diagrams/activity-menu-cart.puml (Bước 1 → "Hiển thị danh sách món theo danh mục")
 * @see docs/ui-ux-frontend-specification.md (Mục 3.1)
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, AlertCircle, RefreshCw, Coffee, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatVND } from '../lib/format';

interface Product {
  id: string;
  name: string;
  description: string;
  recipe?: string;
  category: string;
  basePrice: number;
  imageUrl: string;
  stockQuantity: number;
  isAvailable: boolean;
}

const CATEGORIES = [
  { id: 'All', label: 'Tất cả món' },
  { id: 'Coffee', label: 'Cà phê & Espresso' },
  { id: 'Tea', label: 'Trà trái cây tươi' },
  { id: 'MilkTea', label: 'Trà sữa & Macchiato' },
  { id: 'Freeze', label: 'Đá xay & Bánh ngọt' },
];

const DEFAULT_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80';

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [keyword, setKeyword] = useState('');

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

  const visibleProducts = products.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      p.name.toLowerCase().includes(keyword.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner Cafe - Nghệ thuật & Tinh tế */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1c120c] via-[#2c1810] to-[#140c07] text-white p-6 sm:p-10 shadow-lg border border-[#3d271c]">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="tracking-widest uppercase text-[10px]">Artisan Roastery & Botanical Bar</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Nghệ Thuật Cà Phê Thủ Công & Trà Nghệ Nhân
          </h1>
          <p className="text-xs sm:text-sm text-stone-300/90 leading-relaxed font-normal">
            Tuyển chọn từ những vùng thổ nhưỡng trứ danh Đắk Lắk và Cầu Đất, từng mẻ hạt được rang mộc tỉ mỉ nhằm giữ trọn từng tầng hương vị bản địa. Thưởng thức tách cà phê nguyên bản và trải nghiệm không gian đương đại tại BrewLite.
          </p>
        </div>
      </div>

      {/* Thanh tìm kiếm & Tabs lọc danh mục */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Tab danh mục */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                category === c.id
                  ? 'bg-[#7e4d26] text-white shadow-md shadow-amber-950/20 scale-[1.01]'
                  : 'bg-white text-stone-700 border border-stone-200/80 hover:border-amber-900/30 hover:bg-stone-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Thanh tìm kiếm */}
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm món đồ uống..."
            className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7e4d26] shadow-2xs"
          />
        </div>
      </div>

      {/* Lưới sản phẩm Responsive */}
      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={loadProducts} />
      ) : visibleProducts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {visibleProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Thẻ sản phẩm Card: Tối giản, sang trọng, không rối mắt ---------- */
function ProductCard({ product }: { product: Product }) {
  const isOutOfStock = product.stockQuantity <= 0 || !product.isAvailable;

  return (
    <Link
      href={`/products/${product.id}`}
      className={`group relative bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
        isOutOfStock ? 'opacity-70 grayscale-[30%]' : 'hover:-translate-y-1'
      }`}
    >
      <div>
        {/* Ảnh món */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-100">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_IMAGE_FALLBACK;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Badge hết hàng hoặc danh mục */}
          {isOutOfStock ? (
            <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wide">
              Tạm hết hàng
            </span>
          ) : (
            <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              {product.category}
            </span>
          )}

          {/* Badge tồn kho */}
          {!isOutOfStock && product.stockQuantity < 10 && (
            <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              Còn {product.stockQuantity} ly
            </span>
          )}
        </div>

        {/* Thông tin món: Tiêu đề & Mô tả ngắn gọn */}
        <div className="p-4 space-y-1.5">
          <h3 className="text-base font-bold text-stone-900 group-hover:text-[#7e4d26] transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>

      {/* Giá tiền & Nút Đặt món */}
      <div className="p-4 pt-2 flex items-center justify-between border-t border-stone-100 mt-2">
        <div>
          <span className="text-[10px] text-stone-400 block">Giá từ</span>
          <span className="text-base font-extrabold text-[#7e4d26]">
            {formatVND(product.basePrice)}
          </span>
        </div>

        <span
          className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1 ${
            isOutOfStock
              ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
              : 'bg-[#7e4d26] text-white group-hover:bg-[#5e361b]'
          }`}
        >
          <span>{isOutOfStock ? 'Hết hàng' : 'Đặt món'}</span>
        </span>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-3xl p-4 space-y-3 animate-pulse border border-stone-200/80">
          <div className="h-44 bg-stone-200 rounded-2xl" />
          <div className="h-4 bg-stone-200 rounded w-3/4" />
          <div className="h-3 bg-stone-200 rounded w-1/2" />
          <div className="h-8 bg-stone-100 rounded-xl mt-4" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto">
      <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
      <h3 className="text-base font-bold text-rose-900">Không thể tải thực đơn</h3>
      <p className="text-xs text-rose-700">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 bg-[#7e4d26] text-white text-xs font-bold px-5 py-2.5 rounded-2xl hover:bg-[#5e361b] transition shadow"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Thử lại</span>
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-stone-200/80 rounded-3xl p-12 text-center space-y-3 max-w-md mx-auto">
      <Coffee className="w-12 h-12 text-amber-800/40 mx-auto" />
      <h3 className="text-base font-bold text-stone-800">Không tìm thấy món phù hợp</h3>
      <p className="text-xs text-stone-500">
        Hãy thử chọn danh mục khác hoặc tìm kiếm với từ khóa khác nhé.
      </p>
    </div>
  );
}
