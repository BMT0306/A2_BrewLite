/**
 * @file products.service.ts
 * @description Xử lý nghiệp vụ truy vấn danh mục sản phẩm đồ uống và chi tiết món
 * @author Thành viên Phụ 1 - Business Analyst 1 (Scope & Data Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const FALLBACK_PRODUCTS = [
  {
    id: 'prod-001-cf-sua-da',
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
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-002-bac-xiu-kem-muoi',
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
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-003-tra-dao-cam-sa',
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
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-004-tra-sua-oolong',
    name: 'Trà Sữa Oolong Nướng',
    description: 'Lá trà Oolong sao nhiệt tạo vị khói thơm lừng kết hợp sữa tươi thanh trùng béo ngậy.',
    category: 'MilkTea',
    basePrice: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1558857563-b37cfb433cf5?w=500&q=80',
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
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-005-matcha-da-xay',
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
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-006-tra-sen-vang',
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
    createdAt: new Date('2026-01-01'),
  },
];

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private filterFallback(items: typeof FALLBACK_PRODUCTS, category?: string, search?: string) {
    let result = [...items];
    if (category && category !== 'All') {
      result = result.filter((item) => item.category === category);
    }
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
      );
    }
    return result;
  }

  async findAll(category?: string, search?: string) {
    try {
      const where: any = {};
      if (category && category !== 'All') {
        where.category = category;
      }
      if (search && search.trim() !== '') {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const products = await this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      if (products && products.length > 0) {
        return products;
      }
      return this.filterFallback(FALLBACK_PRODUCTS, category, search);
    } catch {
      // Khi DB PostgreSQL chưa khởi chạy, kích hoạt bộ dữ liệu mẫu dự phòng
      return this.filterFallback(FALLBACK_PRODUCTS, category, search);
    }
  }

  async findOne(id: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });
      if (product) {
        return product;
      }
    } catch {
      // Khi DB PostgreSQL chưa khởi chạy, kiểm tra fallback
    }

    const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id);
    if (!fallback) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với mã ID ${id}`);
    }
    return fallback;
  }
}
