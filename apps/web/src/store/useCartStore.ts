/**
 * @file useCartStore.ts
 * @description Kho trạng thái Giỏ hàng (FR-03) – lưu bền vững vào LocalStorage.
 * @author Thành viên Chính 3 - Frontend & PWA Lead
 * @see docs/ui-ux-frontend-specification.md (Mục 4 - State Management)
 * @see docs/diagrams/activity-menu-cart.puml ("Lưu món vào Cart Store (LocalStorage) & Cập nhật tổng tiền")
 */

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartTopping {
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // = productId + size + toppings → món trùng cấu hình sẽ gộp chung 1 dòng
  productId: string;
  name: string;
  imageUrl: string;
  size: string;
  sizePrice: number;
  basePrice: number;
  toppings: CartTopping[];
  unitPrice: number;
  quantity: number;
  stockQuantity: number; // Dùng để giới hạn số lượng tối đa
}

export type NewCartItem = Omit<CartItem, 'id' | 'unitPrice'>;

/** Công thức đơn giá (FR-02): basePrice + giá Size + tổng giá Topping */
export function calcUnitPrice(basePrice: number, sizePrice: number, toppings: CartTopping[]): number {
  const toppingsTotal = toppings.reduce((sum, t) => sum + t.price, 0);
  return basePrice + sizePrice + toppingsTotal;
}

/** Thành tiền 1 dòng (FR-03): lineTotal = unitPrice * quantity */
export function calcLineTotal(item: CartItem): number {
  return item.unitPrice * item.quantity;
}

function buildItemId(item: NewCartItem): string {
  const toppingKey = item.toppings.map((t) => t.name).sort().join('+');
  return `${item.productId}_${item.size}_${toppingKey}`;
}

/** Giới hạn số lượng trong khoảng [1, stockQuantity] */
function clampQuantity(quantity: number, stockQuantity: number): number {
  return Math.max(1, Math.min(quantity, stockQuantity));
}

interface CartState {
  items: CartItem[];
  addItem: (item: NewCartItem) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      // Thêm món mới, hoặc cộng dồn số lượng nếu đã có món cùng cấu hình
      addItem: (newItem) => {
        const id = buildItemId(newItem);
        const existing = get().items.find((it) => it.id === id);

        if (existing) {
          get().updateQuantity(id, existing.quantity + newItem.quantity);
          return;
        }

        const item: CartItem = {
          ...newItem,
          id,
          unitPrice: calcUnitPrice(newItem.basePrice, newItem.sizePrice, newItem.toppings),
          quantity: clampQuantity(newItem.quantity, newItem.stockQuantity),
        };
        set({ items: [...get().items, item] });
      },

      updateQuantity: (itemId, quantity) => {
        set({
          items: get().items.map((it) =>
            it.id === itemId ? { ...it, quantity: clampQuantity(quantity, it.stockQuantity) } : it,
          ),
        });
      },

      removeItem: (itemId) => {
        set({ items: get().items.filter((it) => it.id !== itemId) });
      },

      // Gọi sau khi thanh toán thành công
      clearCart: () => set({ items: [] }),

      getSubtotal: () => get().items.reduce((sum, it) => sum + calcLineTotal(it), 0),
    }),
    {
      name: 'brewlite_cart_v1', // Khóa LocalStorage theo đặc tả
      skipHydration: true, // Chỉ đọc LocalStorage ở trình duyệt (tránh lỗi hydration của Next.js)
    },
  ),
);

/**
 * Nạp giỏ hàng từ LocalStorage sau khi component được mount ở trình duyệt.
 * Trả về `true` khi dữ liệu giỏ hàng đã sẵn sàng để hiển thị.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  return hydrated;
}
