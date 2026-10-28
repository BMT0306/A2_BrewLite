import { create } from 'zustand';

export interface CartTopping {
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // Composite ID
  productId: string;
  name: string;
  imageUrl: string;
  category: string;
  basePrice: number;
  size: string;
  sizePrice: number;
  toppings: CartTopping[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  stockQuantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'lineTotal'>) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
}

const STORAGE_KEY = 'brewlite_cart_v1';

const getInitialItems = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveItems = (items: CartItem[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
  }
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: getInitialItems(),

  addItem: (newItem) => {
    const toppingsKey = (newItem.toppings || [])
      .map((t) => t.name)
      .sort()
      .join(',');
    const compositeId = `${newItem.productId}_${newItem.size}_${toppingsKey}`;
    const toppingsTotal = (newItem.toppings || []).reduce((sum, t) => sum + Number(t.price), 0);
    const unitPrice = Number(newItem.basePrice) + Number(newItem.sizePrice) + toppingsTotal;

    const currentItems = get().items;
    const existingIndex = currentItems.findIndex((it) => it.id === compositeId);

    let updatedItems: CartItem[];
    if (existingIndex > -1) {
      updatedItems = [...currentItems];
      const existing = updatedItems[existingIndex];
      const maxQty = existing.stockQuantity;
      const newQty = Math.min(existing.quantity + newItem.quantity, maxQty);
      updatedItems[existingIndex] = {
        ...existing,
        quantity: newQty,
        unitPrice,
        lineTotal: unitPrice * newQty,
      };
    } else {
      const lineTotal = unitPrice * newItem.quantity;
      updatedItems = [
        ...currentItems,
        {
          ...newItem,
          id: compositeId,
          unitPrice,
          lineTotal,
        },
      ];
    }

    set({ items: updatedItems });
    saveItems(updatedItems);
  },

  updateQuantity: (id: string, delta: number) => {
    const currentItems = get().items;
    const updatedItems = currentItems
      .map((item) => {
        if (item.id === id) {
          const targetQty = item.quantity + delta;
          if (targetQty <= 0) return null;
          const cappedQty = Math.min(targetQty, item.stockQuantity);
          return {
            ...item,
            quantity: cappedQty,
            lineTotal: item.unitPrice * cappedQty,
          };
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    set({ items: updatedItems });
    saveItems(updatedItems);
  },

  removeItem: (id: string) => {
    const updatedItems = get().items.filter((it) => it.id !== id);
    set({ items: updatedItems });
    saveItems(updatedItems);
  },

  clearCart: () => {
    set({ items: [] });
    saveItems([]);
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.lineTotal, 0);
  },
}));
