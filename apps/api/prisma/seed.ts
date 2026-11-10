/**
 * @file seed.ts
 * @description Kịch bản nạp dữ liệu mẫu khởi tạo toàn bộ cơ sở dữ liệu BrewLite
 *              bao gồm Users, Products, Promotions, Sample Orders, Payments & Loyalty Transactions.
 * @author Thành viên Phụ 1: Chương Gia Thịnh - Business Analyst 1 (Scope & Data Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 *
 * Nguyên tắc thiết kế dữ liệu mẫu:
 * 1. Xóa dữ liệu theo thứ tự ngược của ràng buộc khóa ngoại (Referential Integrity).
 * 2. Đảm bảo ít nhất 1 sản phẩm hết hàng (stockQuantity = 0) để kiểm thử biên (Edge Case).
 * 3. Tạo đơn hàng mẫu ở nhiều trạng thái khác nhau để kiểm thử giao diện Barista & Order Tracking.
 * 4. Ghi nhận giao dịch tích điểm thành viên (LoyaltyTransaction) cho khách hàng mẫu.
 */

import {
  PrismaClient,
  UserRole,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  LoyaltyTxType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('  BREWLITE DATABASE SEED - Phụ 1: Chương Gia Thịnh');
  console.log('================================================================\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 1: DỌN SẠCH DỮ LIỆU CŨ THEO THỨ TỰ NGƯỢC KHÓA NGOẠI
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[1/7] Dọn sạch dữ liệu cũ...');
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Đã xóa sạch tất cả bản ghi.\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2: MÃ HÓA MẬT KHẨU MẪU BẰNG BCRYPT (Salt = 10)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[2/7] Mã hóa mật khẩu mẫu...');
  const passwordHash = await bcrypt.hash('123456', 10);
  console.log('  ✓ Mật khẩu chung "123456" đã được băm bcrypt.\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 3: TẠO 3 TÀI KHOẢN NGƯỜI DÙNG PHÂN QUYỀN (CUSTOMER / STAFF / MANAGER)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[3/7] Tạo tài khoản người dùng...');
  const customer = await prisma.user.create({
    data: {
      email: 'customer@brewlite.vn',
      passwordHash,
      fullName: 'Nguyễn Văn Khách',
      phone: '0901234567',
      role: UserRole.CUSTOMER,
      loyaltyPoints: 120,
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@brewlite.vn',
      passwordHash,
      fullName: 'Trần Thị Thu Ngân',
      phone: '0912345678',
      role: UserRole.STAFF,
      loyaltyPoints: 0,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@brewlite.vn',
      passwordHash,
      fullName: 'Lê Hoàng Quản Lý',
      phone: '0987654321',
      role: UserRole.MANAGER,
      loyaltyPoints: 50,
    },
  });

  console.log(`  ✓ CUSTOMER : ${customer.email} (${customer.fullName})`);
  console.log(`  ✓ STAFF    : ${staff.email} (${staff.fullName})`);
  console.log(`  ✓ MANAGER  : ${manager.email} (${manager.fullName})\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 4: TẠO MÃ KHUYẾN MÃI MẪU
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[4/7] Tạo chương trình khuyến mãi...');
  const promo = await prisma.promotion.create({
    data: {
      code: 'WELCOME10',
      description: 'Giảm 10% tối đa 50.000đ cho đơn hàng chào mừng thành viên mới',
      discountPercent: 10.0,
      maxDiscountAmount: 50000.0,
      validFrom: new Date('2026-01-01T00:00:00Z'),
      validUntil: new Date('2026-12-31T23:59:59Z'),
      isActive: true,
    },
  });
  console.log(`  ✓ PROMOTION: ${promo.code} (Giảm 10% - Tối đa 50k)\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 5: TẠO 6 SẢN PHẨM THỰC ĐƠN (4 DANH MỤC + 1 SẢN PHẨM HẾT HÀNG)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[5/7] Nạp danh mục 6 sản phẩm đồ uống...');
  const productsData = [
    {
      name: 'Cà Phê Sữa Đá Sài Gòn',
      description: 'Cà phê Robusta Đắk Lắk rang mộc đậm đà hòa quyện cùng sữa đặc béo ngậy.',
      category: 'Coffee',
      basePrice: 29000,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
        { size: 'L', price: 10000 },
      ],
      toppingOptions: [
        { name: 'Trân châu đen', price: 5000 },
        { name: 'Thạch cà phê', price: 6000 },
        { name: 'Kem cheese', price: 10000 },
      ],
      stockQuantity: 45,
      isAvailable: true,
    },
    {
      name: 'Bạc Xỉu Kem Muối',
      description: 'Sự cân bằng hoàn hảo giữa vị ngọt sữa, hương thơm cà phê và lớp kem béo mặn nhẹ.',
      category: 'Coffee',
      basePrice: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
        { size: 'L', price: 10000 },
      ],
      toppingOptions: [
        { name: 'Trân châu trắng', price: 6000 },
        { name: 'Thạch cà phê', price: 6000 },
      ],
      stockQuantity: 30,
      isAvailable: true,
    },
    {
      name: 'Trà Đào Cam Sả Tươi',
      description: 'Trà đen hảo hạng ủ lạnh cùng cam tươi, sả đập dập và đào ngâm giòn ngọt thanh mát.',
      category: 'Tea',
      basePrice: 39000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
        { size: 'L', price: 10000 },
      ],
      toppingOptions: [
        { name: 'Đào miếng giòn', price: 8000 },
        { name: 'Thạch nha đam', price: 6000 },
      ],
      stockQuantity: 25,
      isAvailable: true,
    },
    {
      name: 'Trà Sữa Oolong Nướng',
      description: 'Lá trà Oolong sao nhiệt tạo vị khói thơm lừng kết hợp sữa tươi thanh trùng béo ngậy.',
      category: 'MilkTea',
      basePrice: 42000,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
        { size: 'L', price: 10000 },
      ],
      toppingOptions: [
        { name: 'Trân châu đen hoàng kim', price: 6000 },
        { name: 'Pudding trứng', price: 8000 },
        { name: 'Kem cheese nướng', price: 10000 },
      ],
      stockQuantity: 40,
      isAvailable: true,
    },
    {
      name: 'Matcha Đá Xay Kem Tuyết',
      description: 'Bột trà xanh Uji Nhật Bản xay mịn cùng sữa béo và đá viên, phủ lớp kem whip mềm mịn.',
      category: 'Freeze',
      basePrice: 49000,
      imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
        { size: 'L', price: 10000 },
      ],
      toppingOptions: [
        { name: 'Đậu đỏ Azuki', price: 8000 },
        { name: 'Trân châu trắng', price: 6000 },
      ],
      stockQuantity: 20,
      isAvailable: true,
    },
    {
      // EDGE CASE: Sản phẩm hết hàng để kiểm thử nhánh Out-of-Stock trên Activity Diagram
      name: 'Trà Sen Vàng Long Nhãn (TẠM HẾT HÀNG)',
      description: 'Món đặc sản sen Huế thượng hạng thanh mát kết hợp long nhãn ngọt ngào thơm nức.',
      category: 'Tea',
      basePrice: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
        { size: 'L', price: 10000 },
      ],
      toppingOptions: [
        { name: 'Hạt sen bùi', price: 10000 },
        { name: 'Củ năng ngâm', price: 8000 },
      ],
      stockQuantity: 0,
      isAvailable: false,
    },
  ];

  const createdProducts: any[] = [];
  for (const item of productsData) {
    const product = await prisma.product.create({ data: item });
    createdProducts.push(product);
    const stockLabel = product.stockQuantity === 0 ? '(HẾT HÀNG)' : `Kho: ${product.stockQuantity}`;
    console.log(`  ✓ ${product.name} [${product.category}] ${product.basePrice}đ - ${stockLabel}`);
  }
  console.log(`  → Tổng cộng ${createdProducts.length} sản phẩm.\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 6: TẠO 3 ĐƠN HÀNG MẪU Ở CÁC TRẠNG THÁI KHÁC NHAU
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[6/7] Tạo 3 đơn hàng mẫu (COMPLETED / PREPARING / CONFIRMED)...');

  // --- ĐƠN 1: COMPLETED - Có mã khuyến mãi WELCOME10, thanh toán Ví ---
  const p1 = createdProducts[0]; // Cà Phê Sữa Đá Sài Gòn
  const p2 = createdProducts[1]; // Bạc Xỉu Kem Muối
  // unitPrice1 = 29000 (base) + 6000 (M) + 5000 (trân châu đen) = 40000
  // unitPrice2 = 35000 (base) + 0 (S) + 6000 (trân châu trắng) + 6000 (thạch cà phê) = 47000
  // subtotal = 40000 + 47000 = 87000
  // discount = min(87000 * 10%, 50000) = 8700
  // total = 87000 - 8700 = 78300
  const order1 = await prisma.order.create({
    data: {
      orderCode: 'BL-260101-1001',
      userId: customer.id,
      promotionId: promo.id,
      status: OrderStatus.COMPLETED,
      subtotalAmount: 87000,
      discountAmount: 8700,
      totalAmount: 78300,
      note: 'Ít đá, mang đi giúp mình',
      items: {
        create: [
          {
            productId: p1.id,
            size: 'M',
            selectedToppings: [{ name: 'Trân châu đen', price: 5000 }],
            quantity: 1,
            unitPrice: 40000,
            lineTotal: 40000,
          },
          {
            productId: p2.id,
            size: 'S',
            selectedToppings: [
              { name: 'Trân châu trắng', price: 6000 },
              { name: 'Thạch cà phê', price: 6000 },
            ],
            quantity: 1,
            unitPrice: 47000,
            lineTotal: 47000,
          },
        ],
      },
      payments: {
        create: [
          {
            idempotencyKey: 'seed-idem-key-001',
            method: PaymentMethod.WALLET,
            status: PaymentStatus.PAID,
            amount: 78300,
            transactionRef: 'TXN-WALLET-260101-001',
            paidAt: new Date('2026-01-01T08:35:00Z'),
          },
        ],
      },
    },
  });
  console.log(`  ✓ ĐƠN 1: ${order1.orderCode} | ${order1.status} | ${order1.totalAmount}đ (Ví + WELCOME10)`);

  // --- ĐƠN 2: PREPARING - Đang pha chế, thanh toán Thẻ ---
  const p4 = createdProducts[3]; // Trà Sữa Oolong Nướng
  // unitPrice = 42000 (base) + 6000 (M) + 6000 (trân châu) + 8000 (pudding) = 62000
  // quantity = 2 => lineTotal = 124000
  const order2 = await prisma.order.create({
    data: {
      orderCode: 'BL-260102-1002',
      userId: customer.id,
      status: OrderStatus.PREPARING,
      subtotalAmount: 124000,
      discountAmount: 0,
      totalAmount: 124000,
      note: 'Bàn số 4 - Lầu 1, cả 2 ly đều ít đường',
      items: {
        create: [
          {
            productId: p4.id,
            size: 'M',
            selectedToppings: [
              { name: 'Trân châu đen hoàng kim', price: 6000 },
              { name: 'Pudding trứng', price: 8000 },
            ],
            quantity: 2,
            unitPrice: 62000,
            lineTotal: 124000,
          },
        ],
      },
      payments: {
        create: [
          {
            idempotencyKey: 'seed-idem-key-002',
            method: PaymentMethod.CARD,
            status: PaymentStatus.PAID,
            amount: 124000,
            transactionRef: 'TXN-CARD-260102-002',
            paidAt: new Date('2026-01-02T09:15:00Z'),
          },
        ],
      },
    },
  });
  console.log(`  ✓ ĐƠN 2: ${order2.orderCode} | ${order2.status} | ${order2.totalAmount}đ (Thẻ)`);

  // --- ĐƠN 3: CONFIRMED - Vừa thanh toán xong, chờ Barista tiếp nhận ---
  const p5 = createdProducts[4]; // Matcha Đá Xay Kem Tuyết
  const p3 = createdProducts[2]; // Trà Đào Cam Sả Tươi
  // item1: 49000 + 10000 (L) + 8000 (đậu đỏ) = 67000
  // item2: 39000 + 6000 (M) + 8000 (đào miếng) + 6000 (thạch nha đam) = 59000
  // subtotal = 67000 + 59000 = 126000
  const order3 = await prisma.order.create({
    data: {
      orderCode: 'BL-260103-1003',
      userId: customer.id,
      status: OrderStatus.CONFIRMED,
      subtotalAmount: 126000,
      discountAmount: 0,
      totalAmount: 126000,
      note: 'Nhiều kem whip cho ly Matcha',
      items: {
        create: [
          {
            productId: p5.id,
            size: 'L',
            selectedToppings: [{ name: 'Đậu đỏ Azuki', price: 8000 }],
            quantity: 1,
            unitPrice: 67000,
            lineTotal: 67000,
          },
          {
            productId: p3.id,
            size: 'M',
            selectedToppings: [
              { name: 'Đào miếng giòn', price: 8000 },
              { name: 'Thạch nha đam', price: 6000 },
            ],
            quantity: 1,
            unitPrice: 59000,
            lineTotal: 59000,
          },
        ],
      },
      payments: {
        create: [
          {
            idempotencyKey: 'seed-idem-key-003',
            method: PaymentMethod.WALLET,
            status: PaymentStatus.PAID,
            amount: 126000,
            transactionRef: 'TXN-WALLET-260103-003',
            paidAt: new Date('2026-01-03T10:00:00Z'),
          },
        ],
      },
    },
  });
  console.log(`  ✓ ĐƠN 3: ${order3.orderCode} | ${order3.status} | ${order3.totalAmount}đ (Ví)\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 7: TẠO LỊCH SỬ TÍCH ĐIỂM THÀNH VIÊN (LOYALTY TRANSACTIONS)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[7/7] Ghi nhận lịch sử tích điểm thành viên...');
  await prisma.loyaltyTransaction.createMany({
    data: [
      {
        userId: customer.id,
        orderId: order1.id,
        points: 78,
        type: LoyaltyTxType.EARN,
        description: 'Tích điểm đơn BL-260101-1001 (78.300đ → 78 điểm)',
      },
      {
        userId: customer.id,
        orderId: order2.id,
        points: 124,
        type: LoyaltyTxType.EARN,
        description: 'Tích điểm đơn BL-260102-1002 (124.000đ → 124 điểm)',
      },
      {
        userId: customer.id,
        orderId: order3.id,
        points: 126,
        type: LoyaltyTxType.EARN,
        description: 'Tích điểm đơn BL-260103-1003 (126.000đ → 126 điểm)',
      },
      {
        userId: customer.id,
        orderId: null,
        points: -208,
        type: LoyaltyTxType.REDEEM,
        description: 'Đổi điểm lấy voucher giảm giá (trừ 208 điểm)',
      },
    ],
  });
  console.log('  ✓ 3 giao dịch EARN + 1 giao dịch REDEEM đã được ghi nhận.');
  console.log(`  ✓ Số dư điểm hiện tại của Customer: ${customer.loyaltyPoints} điểm\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // KẾT QUẢ TỔNG HỢP
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('================================================================');
  console.log('  NẠP DỮ LIỆU BREWLITE THÀNH CÔNG!');
  console.log('  ─────────────────────────────────────────────');
  console.log('  • 3 Tài khoản (Customer / Staff / Manager)');
  console.log('  • 1 Mã khuyến mãi WELCOME10');
  console.log('  • 6 Sản phẩm (4 danh mục + 1 hết hàng)');
  console.log('  • 3 Đơn hàng (COMPLETED / PREPARING / CONFIRMED)');
  console.log('  • 3 Giao dịch thanh toán (2 Ví + 1 Thẻ)');
  console.log('  • 4 Giao dịch tích điểm (3 EARN + 1 REDEEM)');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('Lỗi trong quá trình seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
