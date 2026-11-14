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

  // 5. Create 12 Specialty Cafe Products (including out-of-stock items for testing)
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
      name: 'Bạc Xỉu Sài Gòn Kem Muối',
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
      name: 'Cà Phê Trứng Hà Nội Thượng Hạng',
      description: 'Cà phê phin truyền thống phối cùng lớp kem trứng gà tươi đánh bông béo ngậy.',
      category: 'Coffee',
      basePrice: 42000,
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
      ],
      toppingOptions: [
        { name: 'Bột cacao rắc mặt', price: 5000 },
        { name: 'Kem trứng thêm', price: 12000 },
      ],
      stockQuantity: 25,
      isAvailable: true,
    },
    {
      name: 'Cold Brew Cam Vàng Mật Ong',
      description: 'Cà phê ủ lạnh 18 tiếng từ hạt Arabica Cầu Đất kết hợp lát cam vàng và mật ong rừng.',
      category: 'Coffee',
      basePrice: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&q=80',
      sizeOptions: [
        { size: 'M', price: 0 },
        { size: 'L', price: 8000 },
      ],
      toppingOptions: [
        { name: 'Cam vàng lát sấy', price: 6000 },
        { name: 'Hạt chia hữu cơ', price: 5000 },
      ],
      stockQuantity: 35,
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
      name: 'Trà Sen Vàng Hạt Sen Long Nhãn',
      description: 'Trà Oolong thượng hạng kết hợp hạt sen Huế bùi ngọt, củ năng giòn rụm và kem sữa thơm mịn.',
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
      stockQuantity: 20,
      isAvailable: true,
    },
    {
      name: 'Trà Ô Long Dâu Tằm Macchiato',
      description: 'Trà ô long thanh khiết kết hợp mứt dâu tằm Đà Lạt chua ngọt tự nhiên, phủ lớp bọt sữa Macchiato béo mịn.',
      category: 'Tea',
      basePrice: 42000,
      imageUrl: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
        { size: 'L', price: 10000 },
      ],
      toppingOptions: [
        { name: 'Thạch dâu tằm', price: 7000 },
        { name: 'Macchiato thêm', price: 9000 },
      ],
      stockQuantity: 18,
      isAvailable: true,
    },
    {
      name: 'Trà Sữa Oolong Nướng Trân Châu Hoàng Kim',
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
      name: 'Trà Sữa Thái Đỏ Thạch Phô Mai',
      description: 'Trà đỏ Thái Lan truyền thống ủ đậm vị sữa thảo mộc cùng thạch phô mai tươi béo thơm tan trong miệng.',
      category: 'MilkTea',
      basePrice: 38000,
      imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
        { size: 'L', price: 10000 },
      ],
      toppingOptions: [
        { name: 'Viên phô mai tươi', price: 10000 },
        { name: 'Sương sáo đen', price: 6000 },
      ],
      stockQuantity: 30,
      isAvailable: true,
    },
    {
      name: 'Trà Sữa Khoai Môn Dừa Nướng',
      description: 'Cốt khoai môn nguyên củ nghiền mịn hòa quyện trà lài thơm dịu, phủ dừa nướng giòn rụm.',
      category: 'MilkTea',
      basePrice: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1558857563-b37df2dd4122?w=500&q=80',
      sizeOptions: [
        { size: 'S', price: 0 },
        { size: 'M', price: 6000 },
        { size: 'L', price: 10000 },
      ],
      toppingOptions: [
        { name: 'Dừa nướng giòn', price: 6000 },
        { name: 'Trân châu taro', price: 7000 },
      ],
      stockQuantity: 0, // TẠM HẾT HÀNG để test luồng hết hàng
      isAvailable: false,
    },
    {
      name: 'Matcha Đá Xay Kem Tuyết Nhật Bản',
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
      name: 'Caramel Choco Freeze Hạnh Nhân',
      description: 'Sốt chocolate đậm đặc xay tuyết đá mịn cùng sữa tươi và sốt sốt caramel thơm lừng, rắc hạnh nhân lát rang bùi béo.',
      category: 'Freeze',
      basePrice: 52000,
      imageUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=500&q=80',
      sizeOptions: [
        { size: 'M', price: 0 },
        { size: 'L', price: 8000 },
      ],
      toppingOptions: [
        { name: 'Hạnh nhân lát nướng', price: 8000 },
        { name: 'Kem whip béo', price: 8000 },
      ],
      stockQuantity: 22,
      isAvailable: true,
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
