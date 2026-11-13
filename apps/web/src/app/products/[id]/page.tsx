/**
 * @file products/[id]/page.tsx
 * @description Xem chi tiết món, chọn Size / Topping / Số lượng và thêm vào giỏ (FR-02).
 * @author Thành viên Chính 3 - Frontend & PWA Lead
 * @see docs/diagrams/activity-menu-cart.puml (Từ "Gửi request GET /products/:id" → "Lưu món vào Cart Store")
 * @see docs/ui-ux-frontend-specification.md (Mục 3.2)
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
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

  // Diagram: "Gửi request GET /products/:id"
  useEffect(() => {
    apiFetch<ProductDetail>(`/products/${id}`)
      .then((data) => {
        setProduct(data);
        if (data.sizeOptions.length > 0) setSize(data.sizeOptions[0]);
      })
      .catch((err) => setError(err.message || 'Không thể tải chi tiết sản phẩm.'));
  }, [id]);

  if (error) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/" className="text-sm text-teal-700 font-bold">
          ← Quay lại thực đơn
        </Link>
      </div>
    );
  }

  if (!product) {
    return <div className="m-4 h-64 bg-slate-200 rounded-xl animate-pulse" />;
  }

  // Diagram: "stockQuantity <= 0 hoặc !isAvailable?" → Hết hàng
  const isOutOfStock = product.stockQuantity <= 0 || !product.isAvailable;
  const isAtMaxStock = quantity >= product.stockQuantity;

  // Diagram: "Tính đơn giá = (basePrice + giá Size + tổng giá Topping) * số lượng"
  const unitPrice = calcUnitPrice(Number(product.basePrice), size.price, toppings);
  const totalPrice = unitPrice * quantity;

  const toggleTopping = (topping: CartTopping) => {
    const isSelected = toppings.some((t) => t.name === topping.name);
    setToppings(isSelected ? toppings.filter((t) => t.name !== topping.name) : [...toppings, topping]);
  };

  // Diagram: "Nhấn Thêm vào giỏ hàng" → "Lưu món vào Cart Store (LocalStorage)"
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
    <div className="pb-6">
      <div className="relative">
        <img src={product.imageUrl} alt={product.name} className="w-full h-60 object-cover" />
        <Link href="/" className="absolute top-3 left-3 bg-white/90 rounded-full p-1.5">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white text-sm font-bold px-4 py-1.5 rounded-full">TẠM HẾT HÀNG</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* Thông tin món */}
        <div>
          <h1 className="text-lg font-bold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{product.description}</p>
          <p className="text-xs text-slate-500 mt-1">Còn lại: {product.stockQuantity} ly</p>
        </div>

        {/* Chọn Size */}
        <Section title="Chọn kích cỡ">
          <div className="grid grid-cols-3 gap-2">
            {product.sizeOptions.map((opt) => (
              <OptionButton
                key={opt.size}
                selected={size.size === opt.size}
                disabled={isOutOfStock}
                onClick={() => setSize(opt)}
                label={`Size ${opt.size}`}
                price={opt.price}
              />
            ))}
          </div>
        </Section>

        {/* Chọn Topping (chọn nhiều) */}
        {product.toppingOptions.length > 0 && (
          <Section title="Chọn topping">
            <div className="grid grid-cols-2 gap-2">
              {product.toppingOptions.map((top) => (
                <OptionButton
                  key={top.name}
                  selected={toppings.some((t) => t.name === top.name)}
                  disabled={isOutOfStock}
                  onClick={() => toggleTopping(top)}
                  label={top.name}
                  price={top.price}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Số lượng – Diagram: "Số lượng chọn > stockQuantity?" → giới hạn & cảnh báo */}
        <Section title="Số lượng">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(quantity - 1)}
              disabled={isOutOfStock || quantity <= 1}
              className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center disabled:opacity-40"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-bold">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              disabled={isOutOfStock || isAtMaxStock}
              className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {!isOutOfStock && isAtMaxStock && (
            <p className="text-xs text-orange-600 mt-2">Chỉ còn tối đa {product.stockQuantity} ly trong kho</p>
          )}
        </Section>

        {/* Nút thêm vào giỏ – bị vô hiệu hóa khi hết hàng */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="w-full flex justify-between items-center bg-teal-700 text-white font-bold text-sm px-4 py-3.5 rounded-xl disabled:bg-slate-300 disabled:text-slate-500"
        >
          <span>{isOutOfStock ? 'Sản phẩm tạm hết hàng' : 'Thêm vào giỏ hàng'}</span>
          {!isOutOfStock && <span>{formatVND(totalPrice)}</span>}
        </button>
      </div>
    </div>
  );
}

/* ---------- Các thành phần con ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-slate-700 mb-2">{title}</h2>
      {children}
    </div>
  );
}

interface OptionButtonProps {
  label: string;
  price: number;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

function OptionButton({ label, price, selected, disabled, onClick }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-xl border text-center disabled:opacity-50 ${
        selected ? 'border-teal-700 bg-teal-50 text-teal-800 font-bold' : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      <span className="block text-sm">{label}</span>
      <span className="block text-[11px] text-slate-500">{price > 0 ? `+${formatVND(price)}` : 'Mặc định'}</span>
    </button>
  );
}
