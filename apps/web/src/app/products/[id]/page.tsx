/**
 * @file products/[id]/page.tsx
 * @description Chi tiết món, tùy biến Size / Topping và hiển thị Công thức pha chế chuẩn vị (FR-02)
 *              - Giao diện 2 cột Responsive tuyệt đẹp trên máy tính
 *              - Tông màu Cà phê & Caramel sang trọng
 * @author Thành viên Chính 3: Bùi Minh Trung - Frontend & PWA Lead
 * @see docs/diagrams/activity-menu-cart.puml (Từ "Gửi request GET /products/:id" → "Lưu món vào Cart Store")
 * @see docs/ui-ux-frontend-specification.md (Mục 3.2)
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Sparkles, ChefHat, Check } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { formatVND } from '../../../lib/format';
import { useCartStore, calcUnitPrice, CartTopping } from '../../../store/useCartStore';

interface SizeOption {
  size: string;
  price: number;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  recipe?: string;
  category: string;
  basePrice: number;
  imageUrl: string;
  sizeOptions: SizeOption[];
  toppingOptions: CartTopping[];
  stockQuantity: number;
  isAvailable: boolean;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<SizeOption>({ size: 'S', price: 0 });
  const [toppings, setToppings] = useState<CartTopping[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    apiFetch<ProductDetail>(`/products/${id}`)
      .then((data) => {
        setProduct(data);
        if (data.sizeOptions && data.sizeOptions.length > 0) {
          setSize(data.sizeOptions[0]);
        }
      })
      .catch((err) => setError(err.message || 'Không thể tải chi tiết sản phẩm.'));
  }, [id]);

  if (error) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <p className="text-sm text-rose-600 font-bold">{error}</p>
        <Link href="/" className="inline-block text-sm text-[#7e4d26] font-extrabold hover:underline">
          ← Quay lại thực đơn chính
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse max-w-5xl mx-auto">
        <div className="h-80 md:h-[450px] bg-stone-200 rounded-3xl" />
        <div className="space-y-4">
          <div className="h-8 bg-stone-200 rounded w-3/4" />
          <div className="h-4 bg-stone-200 rounded w-full" />
          <div className="h-4 bg-stone-200 rounded w-2/3" />
          <div className="h-24 bg-stone-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stockQuantity <= 0 || !product.isAvailable;
  const isAtMaxStock = quantity >= product.stockQuantity;

  const unitPrice = calcUnitPrice(Number(product.basePrice), size.price, toppings);
  const totalPrice = unitPrice * quantity;

  const toggleTopping = (topping: CartTopping) => {
    const isSelected = toppings.some((t) => t.name === topping.name);
    setToppings(isSelected ? toppings.filter((t) => t.name !== topping.name) : [...toppings, topping]);
  };

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice: Number(product.basePrice),
      size: size.size,
      sizePrice: size.price,
      toppings,
      quantity,
      stockQuantity: product.stockQuantity,
    });
    router.push('/cart');
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Nút quay lại */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#7e4d26] bg-white px-3 py-1.5 rounded-full border border-amber-900/10 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại thực đơn</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Cột 1: Ảnh sản phẩm lớn */}
        <div className="relative rounded-3xl overflow-hidden shadow-lg border border-amber-900/10 bg-white">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-72 md:h-[480px] object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80';
            }}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-rose-600 text-white text-sm font-extrabold px-6 py-2 rounded-full uppercase tracking-wider shadow-lg">
                TẠM HẾT HÀNG
              </span>
            </div>
          )}
          <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-amber-200 text-xs font-bold px-3 py-1 rounded-full">
            {product.category}
          </span>
        </div>

        {/* Cột 2: Tùy biến món & Thông tin công thức */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-900/10 shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              {product.name}
            </h1>
            <p className="text-sm text-stone-600 mt-2 leading-relaxed">
              {product.description}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-2xl font-extrabold text-[#7e4d26]">
                {formatVND(unitPrice)}
              </span>
              <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full font-medium">
                Tồn kho: {product.stockQuantity} ly
              </span>
            </div>
          </div>

          {/* Công thức & Nguyên liệu Barista (Phần liên kết theo đề bài) */}
          {product.recipe && (
            <div className="bg-amber-50/80 border border-amber-900/15 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                <ChefHat className="w-4 h-4 text-amber-700" />
                <span>Thành phần nguyên liệu & Công thức chuẩn vị:</span>
              </div>
              <p className="text-xs text-amber-950/80 leading-relaxed font-medium">
                {product.recipe}
              </p>
            </div>
          )}

          {/* Chọn kích cỡ Size */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-stone-800 uppercase tracking-wide block">
              1. Chọn kích cỡ ly
            </label>
            <div className="grid grid-cols-3 gap-2">
              {product.sizeOptions.map((opt) => (
                <button
                  key={opt.size}
                  onClick={() => setSize(opt)}
                  disabled={isOutOfStock}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    size.size === opt.size
                      ? 'border-[#7e4d26] bg-[#faf3ea] text-[#7e4d26] font-extrabold shadow-2xs ring-1 ring-[#7e4d26]'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-amber-900/30'
                  }`}
                >
                  <span className="block text-sm">Size {opt.size}</span>
                  <span className="block text-[11px] text-stone-500 mt-0.5">
                    {opt.price > 0 ? `+${formatVND(opt.price)}` : 'Gốc'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chọn Topping */}
          {product.toppingOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-stone-800 uppercase tracking-wide block">
                2. Tùy chọn Topping đặc biệt
              </label>
              <div className="grid grid-cols-2 gap-2">
                {product.toppingOptions.map((top) => {
                  const isSelected = toppings.some((t) => t.name === top.name);
                  return (
                    <button
                      key={top.name}
                      onClick={() => toggleTopping(top)}
                      disabled={isOutOfStock}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[#7e4d26] bg-[#faf3ea] text-[#7e4d26] font-bold ring-1 ring-[#7e4d26]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-amber-900/30'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold">{top.name}</span>
                        <span className="block text-[11px] text-stone-500">+{formatVND(top.price)}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#7e4d26]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Số lượng */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-stone-800 uppercase tracking-wide">
                3. Số lượng ly
              </label>
              <div className="flex items-center gap-3 bg-stone-100 p-1.5 rounded-2xl">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOutOfStock || quantity <= 1}
                  className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-extrabold text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={isOutOfStock || isAtMaxStock}
                  className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!isOutOfStock && isAtMaxStock && (
              <p className="text-xs text-amber-700">Đã đạt giới hạn tồn kho ({product.stockQuantity} ly)</p>
            )}
          </div>

          {/* Nút thêm vào giỏ hàng */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full flex justify-between items-center bg-[#7e4d26] hover:bg-[#5e361b] text-white font-extrabold text-sm px-6 py-4 rounded-2xl shadow-md transition-all disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed"
          >
            <span>{isOutOfStock ? 'Sản phẩm tạm hết hàng' : 'Thêm vào giỏ hàng'}</span>
            {!isOutOfStock && <span>{formatVND(totalPrice)}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
