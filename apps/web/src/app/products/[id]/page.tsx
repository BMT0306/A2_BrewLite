'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useCartStore } from '../../../store/useCartStore';

interface SizeOption {
  size: string;
  price: number;
}

interface ToppingOption {
  name: string;
  price: number;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number | string;
  imageUrl: string;
  sizeOptions: SizeOption[];
  toppingOptions: ToppingOption[];
  stockQuantity: number;
  isAvailable: boolean;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSize, setSelectedSize] = useState<string>('S');
  const [selectedToppings, setSelectedToppings] = useState<ToppingOption[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [addedToast, setAddedToast] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        const data = await apiFetch<ProductDetail>(`/products/${id}`);
        setProduct(data);
        if (data.sizeOptions && data.sizeOptions.length > 0) {
          setSelectedSize(data.sizeOptions[0].size);
        }
      } catch (err: any) {
        setError(err.message || 'Không thể tải chi tiết sản phẩm.');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-full h-64 bg-slate-200 animate-pulse rounded-2xl" />
        <div className="h-6 bg-slate-200 rounded w-2/3 mx-auto" />
        <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-rose-600">{error || 'Không tìm thấy sản phẩm.'}</p>
        <Link href="/" className="text-xs text-teal-700 font-bold hover:underline">
          Quay lại thực đơn
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stockQuantity <= 0 || !product.isAvailable;
  const currentSizeOption = product.sizeOptions.find((s) => s.size === selectedSize) || {
    size: 'S',
    price: 0,
  };
  const toppingsTotal = selectedToppings.reduce((sum, t) => sum + Number(t.price), 0);
  const unitPrice = Number(product.basePrice) + Number(currentSizeOption.price) + toppingsTotal;
  const lineTotal = unitPrice * quantity;

  const handleToggleTopping = (topping: ToppingOption) => {
    const exists = selectedToppings.some((t) => t.name === topping.name);
    if (exists) {
      setSelectedToppings(selectedToppings.filter((t) => t.name !== topping.name));
    } else {
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      category: product.category,
      basePrice: Number(product.basePrice),
      size: selectedSize,
      sizePrice: Number(currentSizeOption.price),
      toppings: selectedToppings,
      quantity,
      unitPrice,
      stockQuantity: product.stockQuantity,
    });
    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      router.push('/cart');
    }, 600);
  };

  return (
    <div className="pb-8">
      {/* Top Bar with Back Button */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <Link href="/" className="p-1 rounded-full text-slate-700 hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tùy biến đồ uống</h2>
        <div className="w-5" />
      </div>

      {/* Hero Image */}
      <div className="relative w-full h-64 bg-slate-100 overflow-hidden">
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-rose-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
              TẠM HẾT HÀNG
            </span>
          </div>
        ) : (
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-mono">
            Tồn kho: {product.stockQuantity} ly
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Title & Description */}
        <div>
          <span className="text-xs text-teal-700 font-semibold uppercase tracking-wider block">
            {product.category}
          </span>
          <h1 className="text-lg font-bold text-slate-900 mt-0.5">{product.name}</h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{product.description}</p>
          <div className="text-base font-extrabold text-teal-800 mt-2">
            {Number(product.basePrice).toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* Size Selection */}
        {product.sizeOptions && product.sizeOptions.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Chọn Kích Cỡ (Size)</label>
            <div className="grid grid-cols-3 gap-2">
              {product.sizeOptions.map((opt) => {
                const isSelected = selectedSize === opt.size;
                return (
                  <button
                    key={opt.size}
                    type="button"
                    onClick={() => setSelectedSize(opt.size)}
                    className={`py-2 px-3 rounded-xl border text-center transition ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50 text-teal-800 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs block">Size {opt.size}</span>
                    <span className="text-[10px] text-slate-500 block">
                      {opt.price > 0 ? `+${Number(opt.price).toLocaleString('vi-VN')}đ` : 'Tiêu chuẩn'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Topping Selection */}
        {product.toppingOptions && product.toppingOptions.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Chọn Topping Thêm</label>
            <div className="space-y-2">
              {product.toppingOptions.map((top) => {
                const isChecked = selectedToppings.some((t) => t.name === top.name);
                return (
                  <div
                    key={top.name}
                    onClick={() => handleToggleTopping(top)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                      isChecked ? 'border-teal-600 bg-teal-50/60' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isChecked ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-medium text-slate-800">{top.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600">
                      +{Number(top.price).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity Counter */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-700">Số lượng ly:</span>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || isOutOfStock}
              className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-40"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-slate-800 w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
              disabled={quantity >= product.stockQuantity || isOutOfStock}
              className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {quantity >= product.stockQuantity && !isOutOfStock && (
          <p className="text-[11px] text-amber-600 flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Đã đạt số lượng tối đa có thể phục vụ ({product.stockQuantity} ly).</span>
          </p>
        )}

        {/* Add to Cart CTA */}
        <div className="pt-2">
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-between shadow-lg transition active:scale-95 ${
              isOutOfStock
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{isOutOfStock ? 'Sản phẩm tạm hết hàng' : 'Thêm vào giỏ hàng'}</span>
            </div>
            {!isOutOfStock && (
              <span className="font-extrabold text-teal-100">{lineTotal.toLocaleString('vi-VN')} đ</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
