/**
 * @file seed.ts
 * @description Kịch bản nạp dữ liệu mẫu khởi tạo cơ sở dữ liệu BrewLite (Users, Products, Promotions, Sample Orders)
 * @author Thành viên Phụ 1 - Business Analyst 1 (Scope & Data Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { PrismaClient, UserRole, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding BrewLite Database...');

  // 1. Clean existing records in reverse dependency order
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash passwords
  const passwordHash = await bcrypt.hash('123456', 10);

  // 3. Create Users
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

  console.log(`Created accounts: Customer (${customer.email}), Staff (${staff.email}), Manager (${manager.email})`);

  // 4. Create Promotion
  const promo = await prisma.promotion.create({
    data: {
      code: 'WELCOME10',
      description: 'Giảm 10% tối đa 50.000đ cho đơn hàng chào mừng thành viên mới',
      discountPercent: 10.0,
      maxDiscountAmount: 50000.0,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      isActive: true,
    },
  });
  console.log(`Created promotion: ${promo.code}`);

  // 5. Create 6 Products (at least 1 out-of-stock item: stockQuantity: 0)
  const products = [
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
      stockQuantity: 0, // OUT OF STOCK ITEM TO TEST ACTIVITY DIAGRAM BRANCH
      isAvailable: false,
    },
  ];

  for (const item of products) {
    await prisma.product.create({
      data: item,
    });
  }
  console.log(`Created ${products.length} products (including 1 out-of-stock item: Trà Sen Vàng Long Nhãn)`);

  console.log('BrewLite Database Seeded Successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
