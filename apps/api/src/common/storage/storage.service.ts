/**
 * @file storage.service.ts
 * @description Hệ thống lưu trữ dữ liệu bền vững (JSON File Persistence Store) cho BrewLite
 *              Bảo toàn dữ liệu tài khoản, giỏ hàng, đơn hàng và lịch sử giao dịch SePay
 *              kể cả khi khởi động lại server hoặc ở chế độ In-Memory độc lập (không cần PostgreSQL).
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / Chính 1 (System Architect & DevOps Lead)
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  loyaltyPoints: number;
  phone?: string | null;
  passwordHash: string;
}

export interface StoredIngredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minThreshold: number;
  category: string;
}

export interface StockLog {
  id: string;
  orderCode?: string;
  action: 'DEDUCT' | 'RESTOCK' | 'REFUND';
  description: string;
  createdAt: string;
}

export const DEFAULT_INGREDIENTS: StoredIngredient[] = [
  { id: 'ING-CF-ROBUSTA', name: 'Cà phê hạt Robusta Đắk Lắk', unit: 'g', stock: 5000, minThreshold: 500, category: 'Cà phê' },
  { id: 'ING-SUA-DAC', name: 'Sữa đặc Ngôi Sao Phương Nam', unit: 'ml', stock: 4000, minThreshold: 400, category: 'Sữa' },
  { id: 'ING-SUA-TUOI', name: 'Sữa tươi thanh trùng DalatMilk', unit: 'ml', stock: 6000, minThreshold: 600, category: 'Sữa' },
  { id: 'ING-TRA-DEN', name: 'Cốt trà đen Lâm Đồng', unit: 'ml', stock: 5000, minThreshold: 500, category: 'Trà' },
  { id: 'ING-TRA-OOLONG', name: 'Cốt trà Oolong sao nhiệt', unit: 'ml', stock: 5000, minThreshold: 500, category: 'Trà' },
  { id: 'ING-SIRO-DAO', name: 'Si-rô đào Pháp Teisseire', unit: 'ml', stock: 2000, minThreshold: 200, category: 'Si-rô' },
  { id: 'ING-CAM-TUOI', name: 'Cam sành tươi mọng nước', unit: 'quả', stock: 50, minThreshold: 10, category: 'Trái cây' },
  { id: 'ING-DAO-NGAM', name: 'Đào ngâm giòn đóng hộp', unit: 'miếng', stock: 100, minThreshold: 20, category: 'Trái cây' },
  { id: 'ING-BOT-MATCHA', name: 'Bột Matcha Uji Nhật Bản', unit: 'g', stock: 1000, minThreshold: 100, category: 'Trà' },
  { id: 'ING-KEM-MUOI', name: 'Kem sữa muối béo mặn', unit: 'ml', stock: 3000, minThreshold: 300, category: 'Topping' },
  { id: 'ING-DUONG-MIA', name: 'Nước đường mía hữu cơ', unit: 'ml', stock: 5000, minThreshold: 500, category: 'Đường' },
  { id: 'ING-DA-BI', name: 'Đá bi tinh khiết', unit: 'g', stock: 20000, minThreshold: 2000, category: 'Đá' },
  { id: 'ING-TRAN-CHAU', name: 'Trân châu đen hoàng kim', unit: 'g', stock: 3000, minThreshold: 300, category: 'Topping' },
];

export const DEFAULT_PRODUCT_STOCKS: Record<string, number> = {
  'prod-001-cf-sua-da': 45,
  'prod-002-bac-xiu-kem-muoi': 30,
  'prod-003-tra-dao-cam-sa': 25,
  'prod-004-tra-sua-oolong': 40,
  'prod-005-matcha-da-xay': 20,
  'prod-006-tra-sen-vang': 0,
  'prod-007-cf-den-da': 50,
  'prod-008-cf-muoi-hue': 35,
  'prod-009-tra-dau-tay-oi-hong': 30,
  'prod-010-latte-hanh-nhan': 25,
  'prod-011-caramel-macchiato': 25,
  'prod-012-croissant-bo-toi': 20,
};

export const PRODUCT_RECIPE_BOM: Record<string, { ingredientId: string; amount: number; unit: string }[]> = {
  'prod-001-cf-sua-da': [
    { ingredientId: 'ING-CF-ROBUSTA', amount: 25, unit: 'g' },
    { ingredientId: 'ING-SUA-DAC', amount: 30, unit: 'ml' },
    { ingredientId: 'ING-SUA-TUOI', amount: 20, unit: 'ml' },
    { ingredientId: 'ING-DA-BI', amount: 150, unit: 'g' },
  ],
  'prod-002-bac-xiu-kem-muoi': [
    { ingredientId: 'ING-SUA-DAC', amount: 40, unit: 'ml' },
    { ingredientId: 'ING-SUA-TUOI', amount: 80, unit: 'ml' },
    { ingredientId: 'ING-CF-ROBUSTA', amount: 15, unit: 'g' },
    { ingredientId: 'ING-KEM-MUOI', amount: 30, unit: 'ml' },
    { ingredientId: 'ING-DA-BI', amount: 150, unit: 'g' },
  ],
  'prod-003-tra-dao-cam-sa': [
    { ingredientId: 'ING-TRA-DEN', amount: 120, unit: 'ml' },
    { ingredientId: 'ING-SIRO-DAO', amount: 20, unit: 'ml' },
    { ingredientId: 'ING-CAM-TUOI', amount: 1, unit: 'quả' },
    { ingredientId: 'ING-DAO-NGAM', amount: 2, unit: 'miếng' },
    { ingredientId: 'ING-DA-BI', amount: 150, unit: 'g' },
  ],
  'prod-004-tra-sua-oolong': [
    { ingredientId: 'ING-TRA-OOLONG', amount: 130, unit: 'ml' },
    { ingredientId: 'ING-SUA-TUOI', amount: 50, unit: 'ml' },
    { ingredientId: 'ING-DUONG-MIA', amount: 20, unit: 'ml' },
    { ingredientId: 'ING-DA-BI', amount: 150, unit: 'g' },
  ],
  'prod-005-matcha-da-xay': [
    { ingredientId: 'ING-BOT-MATCHA', amount: 15, unit: 'g' },
    { ingredientId: 'ING-SUA-TUOI', amount: 120, unit: 'ml' },
    { ingredientId: 'ING-DUONG-MIA', amount: 20, unit: 'ml' },
    { ingredientId: 'ING-DA-BI', amount: 150, unit: 'g' },
  ],
  'prod-006-tra-sen-vang': [
    { ingredientId: 'ING-TRA-OOLONG', amount: 100, unit: 'ml' },
    { ingredientId: 'ING-DA-BI', amount: 150, unit: 'g' },
  ],
  'prod-007-cf-den-da': [
    { ingredientId: 'ING-CF-ROBUSTA', amount: 30, unit: 'g' },
    { ingredientId: 'ING-DUONG-MIA', amount: 10, unit: 'ml' },
    { ingredientId: 'ING-DA-BI', amount: 150, unit: 'g' },
  ],
  'prod-008-cf-muoi-hue': [
    { ingredientId: 'ING-CF-ROBUSTA', amount: 35, unit: 'g' },
    { ingredientId: 'ING-SUA-DAC', amount: 20, unit: 'ml' },
    { ingredientId: 'ING-KEM-MUOI', amount: 40, unit: 'ml' },
    { ingredientId: 'ING-DA-BI', amount: 150, unit: 'g' },
  ],
  'prod-009-tra-dau-tay-oi-hong': [
    { ingredientId: 'ING-TRA-DEN', amount: 120, unit: 'ml' },
    { ingredientId: 'ING-SIRO-DAO', amount: 25, unit: 'ml' },
    { ingredientId: 'ING-DA-BI', amount: 150, unit: 'g' },
  ],
  'prod-010-latte-hanh-nhan': [
    { ingredientId: 'ING-CF-ROBUSTA', amount: 20, unit: 'g' },
    { ingredientId: 'ING-SUA-TUOI', amount: 150, unit: 'ml' },
  ],
  'prod-011-caramel-macchiato': [
    { ingredientId: 'ING-CF-ROBUSTA', amount: 25, unit: 'g' },
    { ingredientId: 'ING-SUA-TUOI', amount: 130, unit: 'ml' },
    { ingredientId: 'ING-DUONG-MIA', amount: 20, unit: 'ml' },
  ],
  'prod-012-croissant-bo-toi': [
    { ingredientId: 'ING-DUONG-MIA', amount: 10, unit: 'ml' },
  ],
};

export interface BrewLiteStoreData {
  users: StoredUser[];
  orders: any[];
  payments: any[];
  processedSepayTxnIds: string[];
  stockOverrides: Record<string, number>;
  ingredients: StoredIngredient[];
  stockLogs: StockLog[];
}

@Injectable()
export class StorageService implements OnModuleInit {
  private filePath: string = '';
  private data: BrewLiteStoreData = {
    users: [],
    orders: [],
    payments: [],
    processedSepayTxnIds: [],
    stockOverrides: { ...DEFAULT_PRODUCT_STOCKS },
    ingredients: [...DEFAULT_INGREDIENTS],
    stockLogs: [],
  };

  onModuleInit() {
    this.initFilePath();
    this.load();
  }

  private initFilePath() {
    const candidateDirs = [
      path.resolve(process.cwd(), 'data'),
      path.resolve(process.cwd(), 'apps', 'api', 'data'),
      path.resolve(__dirname, '..', '..', '..', 'data'),
    ];

    let chosenDir = candidateDirs[0];
    for (const d of candidateDirs) {
      if (fs.existsSync(d)) {
        chosenDir = d;
        break;
      }
    }

    if (!fs.existsSync(chosenDir)) {
      try {
        fs.mkdirSync(chosenDir, { recursive: true });
      } catch {
        // Fallback thư mục hiện tại nếu không tạo được
        chosenDir = process.cwd();
      }
    }

    this.filePath = path.join(chosenDir, 'brewlite-store.json');
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          payments: Array.isArray(parsed.payments) ? parsed.payments : [],
          processedSepayTxnIds: Array.isArray(parsed.processedSepayTxnIds) ? parsed.processedSepayTxnIds : [],
          stockOverrides:
            parsed.stockOverrides && Object.keys(parsed.stockOverrides).length > 0
              ? { ...DEFAULT_PRODUCT_STOCKS, ...parsed.stockOverrides }
              : { ...DEFAULT_PRODUCT_STOCKS },
          ingredients:
            Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0
              ? parsed.ingredients
              : [...DEFAULT_INGREDIENTS],
          stockLogs: Array.isArray(parsed.stockLogs) ? parsed.stockLogs : [],
        };
      }
    } catch (err: any) {
      console.warn('[StorageService] Không thể đọc file lưu trữ hiện có, sẽ khởi tạo mới:', err?.message || err);
    }

    this.ensureDefaultUsers();
    this.persist();
  }

  private persist() {
    try {
      if (!this.filePath) this.initFilePath();
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[StorageService] Lỗi khi ghi dữ liệu bền vững:', err?.message || err);
    }
  }

  private ensureDefaultUsers() {
    const defaultAccounts: StoredUser[] = [
      {
        id: 'usr-customer-001',
        email: 'customer@brewlite.vn',
        fullName: 'Nguyễn Văn Khách',
        role: 'CUSTOMER',
        loyaltyPoints: 120,
        phone: '0901234567',
        passwordHash: bcrypt.hashSync('123456', 10),
      },
      {
        id: 'usr-staff-001',
        email: 'staff@brewlite.vn',
        fullName: 'Trần Thị Thu Ngân',
        role: 'STAFF',
        loyaltyPoints: 0,
        phone: '0912345678',
        passwordHash: bcrypt.hashSync('123456', 10),
      },
      {
        id: 'usr-manager-001',
        email: 'manager@brewlite.vn',
        fullName: 'Lê Hoàng Quản Lý',
        role: 'MANAGER',
        loyaltyPoints: 0,
        phone: '0923456789',
        passwordHash: bcrypt.hashSync('123456', 10),
      },
    ];

    for (const def of defaultAccounts) {
      const idx = this.data.users.findIndex((u) => u.email.toLowerCase() === def.email.toLowerCase());
      if (idx === -1) {
        this.data.users.push(def);
      }
    }
  }

  // --- QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG ---
  getUsers(): StoredUser[] {
    return this.data.users;
  }

  getUserByEmail(email: string): StoredUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  saveUser(user: StoredUser) {
    const idx = this.data.users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id);
    if (idx >= 0) {
      this.data.users[idx] = user;
    } else {
      this.data.users.push(user);
    }
    this.persist();
  }

  updateUserLoyaltyPoints(userId: string, pointsDelta: number) {
    const user = this.data.users.find((u) => u.id === userId);
    if (user) {
      user.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0) + pointsDelta);
      this.persist();
    }
  }

  // --- QUẢN LÝ ĐƠN HÀNG (ORDERS) ---
  getOrders(): any[] {
    return this.data.orders;
  }

  saveOrder(order: any) {
    const idx = this.data.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      this.data.orders[idx] = order;
    } else {
      this.data.orders.unshift(order);
    }
    this.persist();
  }

  updateOrderStatus(id: string, status: string, refundStatus?: string): any {
    const order = this.data.orders.find((o) => o.id === id || o.orderCode === id);
    if (order) {
      order.status = status;
      if (refundStatus) {
        order.refundStatus = refundStatus;
      }
      this.persist();
      return order;
    }
    return null;
  }

  removeOrder(id: string): boolean {
    const idx = this.data.orders.findIndex((o) => o.id === id || o.orderCode === id);
    if (idx >= 0) {
      this.data.orders.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // --- QUẢN LÝ GIAO DỊCH THANH TOÁN (PAYMENTS) ---
  getPayments(): any[] {
    return this.data.payments;
  }

  savePayment(payment: any) {
    const idx = this.data.payments.findIndex((p) => p.id === payment.id || (payment.idempotencyKey && p.idempotencyKey === payment.idempotencyKey));
    if (idx >= 0) {
      this.data.payments[idx] = payment;
    } else {
      this.data.payments.push(payment);
    }
    this.persist();
  }

  // --- CHỐNG TRÙNG LẶP & ĐỐI SOÁT SEPAY TRANSACTION IDS ---
  isSepayTxnProcessed(idOrRef: string | number | undefined | null): boolean {
    if (!idOrRef) return false;
    const clean = String(idOrRef).trim();
    if (!clean) return false;
    return this.data.processedSepayTxnIds.includes(clean);
  }

  markSepayTxnProcessed(...idsOrRefs: (string | number | undefined | null)[]) {
    let changed = false;
    for (const val of idsOrRefs) {
      if (!val) continue;
      const clean = String(val).trim();
      if (clean && !this.data.processedSepayTxnIds.includes(clean)) {
        this.data.processedSepayTxnIds.push(clean);
        changed = true;
      }
    }
    if (changed) {
      this.persist();
    }
  }

  // --- QUẢN LÝ TỒN KHO SẢN PHẨM & KHO NGUYÊN LIỆU (BOM RECIPE LINK) ---
  getStockOverride(productId: string): number | undefined {
    return this.data.stockOverrides[productId];
  }

  setStockOverride(productId: string, stock: number) {
    this.data.stockOverrides[productId] = Math.max(0, stock);
    this.persist();
  }

  getProductStock(productId: string, defaultStock = 45): number {
    if (this.data.stockOverrides[productId] !== undefined) {
      return this.data.stockOverrides[productId];
    }
    const def = DEFAULT_PRODUCT_STOCKS[productId] ?? defaultStock;
    this.data.stockOverrides[productId] = def;
    return def;
  }

  setProductStock(productId: string, stock: number) {
    this.data.stockOverrides[productId] = Math.max(0, stock);
    this.persist();
  }

  getIngredients(): StoredIngredient[] {
    if (!this.data.ingredients || this.data.ingredients.length === 0) {
      this.data.ingredients = [...DEFAULT_INGREDIENTS];
    }
    return this.data.ingredients;
  }

  getStockLogs(): StockLog[] {
    return this.data.stockLogs || [];
  }

  deductProductAndIngredients(orderCode: string, items: { productId: string; quantity: number }[]) {
    const deductedDesc: string[] = [];

    // 1. Trừ số lượng ly tồn kho món đồ uống
    for (const item of items) {
      const current = this.getProductStock(item.productId);
      const next = Math.max(0, current - item.quantity);
      this.setProductStock(item.productId, next);
      deductedDesc.push(`-${item.quantity} ly (${item.productId}, còn: ${next} ly)`);

      // 2. Trừ nguyên liệu kho theo công thức BOM
      const bomItems = PRODUCT_RECIPE_BOM[item.productId] || [];
      for (const bom of bomItems) {
        const ing = this.data.ingredients.find((i) => i.id === bom.ingredientId);
        if (ing) {
          const used = bom.amount * item.quantity;
          ing.stock = Math.max(0, ing.stock - used);
          deductedDesc.push(`-${used}${ing.unit} ${ing.name}`);
        }
      }
    }

    const logEntry: StockLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderCode,
      action: 'DEDUCT',
      description: `Xuất kho tạo đơn #${orderCode}: ${deductedDesc.join(', ')}`,
      createdAt: new Date().toISOString(),
    };

    if (!this.data.stockLogs) this.data.stockLogs = [];
    this.data.stockLogs.unshift(logEntry);
    this.persist();

    return { success: true, log: logEntry.description };
  }

  restoreProductAndIngredients(orderCode: string, items: { productId: string; quantity: number }[]) {
    const restoredDesc: string[] = [];

    // 1. Hoàn trả số lượng ly tồn kho món đồ uống
    for (const item of items) {
      const current = this.getProductStock(item.productId);
      const next = current + item.quantity;
      this.setProductStock(item.productId, next);
      restoredDesc.push(`+${item.quantity} ly (${item.productId}, tồn mới: ${next} ly)`);

      // 2. Hoàn trả nguyên liệu kho theo công thức BOM
      const bomItems = PRODUCT_RECIPE_BOM[item.productId] || [];
      for (const bom of bomItems) {
        const ing = this.data.ingredients.find((i) => i.id === bom.ingredientId);
        if (ing) {
          const restored = bom.amount * item.quantity;
          ing.stock += restored;
          restoredDesc.push(`+${restored}${ing.unit} ${ing.name}`);
        }
      }
    }

    const logEntry: StockLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderCode,
      action: 'REFUND',
      description: `Hoàn kho hủy đơn #${orderCode}: ${restoredDesc.join(', ')}`,
      createdAt: new Date().toISOString(),
    };

    if (!this.data.stockLogs) this.data.stockLogs = [];
    this.data.stockLogs.unshift(logEntry);
    this.persist();

    return { success: true, log: logEntry.description };
  }

  restockIngredient(ingredientId: string, amount: number) {
    const ing = this.data.ingredients.find((i) => i.id === ingredientId);
    if (ing) {
      ing.stock += amount;
      const logEntry: StockLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action: 'RESTOCK',
        description: `Nhập kho nguyên liệu: +${amount}${ing.unit} ${ing.name} (Tồn mới: ${ing.stock}${ing.unit})`,
        createdAt: new Date().toISOString(),
      };
      if (!this.data.stockLogs) this.data.stockLogs = [];
      this.data.stockLogs.unshift(logEntry);
      this.persist();
      return ing;
    }
    return null;
  }

  restockProduct(productId: string, amount: number) {
    const current = this.getProductStock(productId);
    const next = current + amount;
    this.setProductStock(productId, next);
    const logEntry: StockLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: 'RESTOCK',
      description: `Bổ sung số lượng món ${productId}: +${amount} ly (Tồn mới: ${next} ly)`,
      createdAt: new Date().toISOString(),
    };
    if (!this.data.stockLogs) this.data.stockLogs = [];
    this.data.stockLogs.unshift(logEntry);
    this.persist();
    return next;
  }
}
