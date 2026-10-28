'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, AlertCircle, RefreshCw, Coffee, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number | string;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/products';
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const data = await apiFetch<Product[]>(url);
      setProducts(data);
    } catch (err: any) {
      console.error('Fetch products error:', err);
      setError(err.message || 'Không thể tải danh sách sản phẩm. Vui lòng kiểm tra kết nối API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const formatPrice = (price: number | string) => {
    return Number(price).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="p-4 space-y-4">
      {/* Banner / Promotion header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-600 rounded-2xl p-4 text-white shadow-md">
        <span className="text-[10px] bg-teal-900/60 text-teal-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
          Ưu đãi hôm nay
        </span>
        <h2 className="text-lg font-bold mt-1">Giảm 10% với mã WELCOME10</h2>
        <p className="text-xs text-teal-100 mt-0.5">Áp dụng cho mọi đồ uống khi đặt trên PWA BrewLite</p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm đồ uống, cà phê, trà..."
          className="w-full bg-slate-100 text-slate-800 placeholder-slate-400 text-xs rounded-xl pl-9 pr-20 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600 border border-slate-200"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-teal-700 hover:bg-teal-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition"
        >
          Tìm
        </button>
      </form>

      {/* Category Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all font-medium ${
              selectedCategory === cat.id
                ? 'bg-teal-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content Rendering: 4 States */}

      {/* 1. Loading State (Skeleton Cards) */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm animate-pulse space-y-2">
              <div className="w-full h-28 bg-slate-200 rounded-lg" />
              <div className="h-3.5 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="flex justify-between items-center pt-1">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="w-6 h-6 bg-slate-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Error State */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-rose-800">Không thể kết nối đến máy chủ</h3>
          <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
          <button
            onClick={fetchProducts}
            className="inline-flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs px-4 py-2 rounded-xl font-medium shadow transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* 3. Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <Coffee className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700">Chưa có đồ uống nào</h3>
          <p className="text-xs text-slate-500">
            Không tìm thấy sản phẩm phù hợp với bộ lọc hoặc từ khóa tìm kiếm của bạn.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="text-xs text-teal-700 font-semibold hover:underline pt-2 block"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}

      {/* 4. Products Grid with Out-of-Stock handling */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => {
            const isOutOfStock = product.stockQuantity <= 0 || !product.isAvailable;
            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm flex flex-col transition relative ${
                  isOutOfStock ? 'opacity-70 grayscale-[30%]' : 'hover:shadow-md'
                }`}
              >
                {/* Out of stock badge */}
                {isOutOfStock && (
                  <div className="absolute top-2 left-2 z-10 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    TẠM HẾT HÀNG
                  </div>
                )}

                {/* Stock badge for available products */}
                {!isOutOfStock && (
                  <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                    Còn: {product.stockQuantity}
                  </div>
                )}

                {/* Product Image */}
                <Link
                  href={isOutOfStock ? '#' : `/products/${product.id}`}
                  className="block relative w-full h-32 bg-slate-100 overflow-hidden"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                </Link>

                {/* Info */}
                <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                  <div>
                    <span className="text-[10px] text-teal-700 font-semibold uppercase tracking-wider block">
                      {product.category}
                    </span>
                    <Link
                      href={isOutOfStock ? '#' : `/products/${product.id}`}
                      className="text-xs font-bold text-slate-800 line-clamp-1 hover:text-teal-700"
                    >
                      {product.name}
                    </Link>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                    <span className="text-xs font-extrabold text-teal-800">
                      {formatPrice(product.basePrice)}
                    </span>
                    {isOutOfStock ? (
                      <span className="text-[10px] text-rose-500 font-medium">Hết hàng</span>
                    ) : (
                      <Link
                        href={`/products/${product.id}`}
                        className="w-7 h-7 bg-teal-700 hover:bg-teal-800 text-white rounded-full flex items-center justify-center shadow transition active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
