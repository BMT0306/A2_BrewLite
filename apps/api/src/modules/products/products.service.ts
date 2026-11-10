/**
 * @file products.service.ts
 * @description Service xử lý toàn bộ nghiệp vụ truy vấn, lọc, tìm kiếm và quản trị danh mục sản phẩm.
 *              Tích hợp cơ chế Fallback dữ liệu mẫu khi PostgreSQL chưa khởi chạy (Demo-friendly).
 *
 * Chức năng cốt lõi:
 * - findAll():            Lấy danh sách sản phẩm + lọc danh mục + tìm kiếm từ khóa (FR-01)
 * - findOne():            Lấy chi tiết sản phẩm theo ID + cấu hình size/topping (FR-02)
 * - getCategories():      Thống kê danh mục sản phẩm kèm số lượng
 * - updateAvailability(): Bật/tắt trạng thái bán sản phẩm (Staff/Manager)
 * - updateStock():        Cập nhật số lượng tồn kho (Manager)
 *
 * @author Thành viên Phụ 1: Chương Gia Thịnh - Business Analyst 1 (Scope & Data Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Dữ liệu mẫu dự phòng (Fallback) khi PostgreSQL chưa khởi chạy.
 * Đảm bảo ứng dụng frontend luôn có dữ liệu menu để hiển thị ngay cả khi không có DB.
 * Khớp 100% với dữ liệu trong seed.ts.
 */
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

  /**
   * Lọc dữ liệu Fallback theo danh mục và từ khóa tìm kiếm.
   * Dùng khi PostgreSQL không khả dụng.
   */
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

  /**
   * Lấy danh sách sản phẩm với bộ lọc danh mục và tìm kiếm từ khóa.
   * Hỗ trợ lọc theo category (Coffee, Tea, MilkTea, Freeze) và tìm kiếm case-insensitive.
   * Khi DB lỗi hoặc trống, tự động chuyển sang dữ liệu Fallback.
   *
   * @param category  Danh mục sản phẩm để lọc (tùy chọn, truyền "All" hoặc bỏ trống = toàn bộ)
   * @param search    Từ khóa tìm kiếm theo tên/mô tả (tùy chọn, case-insensitive)
   * @returns         Mảng danh sách sản phẩm, sắp xếp theo ngày tạo giảm dần
   */
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
      // Nếu DB trống (chưa seed), trả về Fallback
      return this.filterFallback(FALLBACK_PRODUCTS, category, search);
    } catch {
      // Khi DB PostgreSQL chưa khởi chạy, kích hoạt bộ dữ liệu mẫu dự phòng
      return this.filterFallback(FALLBACK_PRODUCTS, category, search);
    }
  }

  /**
   * Lấy chi tiết một sản phẩm theo ID.
   * Bao gồm đầy đủ sizeOptions, toppingOptions và thông tin tồn kho.
   *
   * @param id  UUID của sản phẩm
   * @returns   Object chi tiết sản phẩm
   * @throws    NotFoundException nếu không tìm thấy sản phẩm
   */
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

    // Tìm trong Fallback khi DB không khả dụng hoặc không tìm thấy
    const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id);
    if (!fallback) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với mã ID "${id}".`);
    }
    return fallback;
  }

  /**
   * Lấy danh sách các danh mục sản phẩm kèm số lượng sản phẩm mỗi danh mục.
   * Phục vụ giao diện Menu: hiển thị tab lọc danh mục + badge đếm sản phẩm.
   *
   * @returns Mảng object { category, count } sắp xếp theo tên danh mục (A-Z)
   */
  async getCategories(): Promise<{ category: string; count: number }[]> {
    try {
      const result = await this.prisma.product.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { category: 'asc' },
      });

      if (result && result.length > 0) {
        return result.map((r) => ({
          category: r.category,
          count: r._count.id,
        }));
      }
    } catch {
      // Fallback khi DB không khả dụng
    }

    // Thống kê từ Fallback data
    const categoryMap = new Map<string, number>();
    for (const product of FALLBACK_PRODUCTS) {
      categoryMap.set(product.category, (categoryMap.get(product.category) || 0) + 1);
    }
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  /**
   * Cập nhật trạng thái sẵn sàng (bật/tắt bán) của sản phẩm.
   * Dành cho Staff/Manager khi cần tạm ngừng bán món.
   *
   * @param id            UUID của sản phẩm
   * @param isAvailable   Trạng thái mới (true = đang bán, false = tạm ngừng)
   * @returns             Object sản phẩm đã cập nhật
   * @throws              NotFoundException nếu không tìm thấy sản phẩm
   */
  async updateAvailability(id: string, isAvailable: boolean) {
    try {
      const product = await this.prisma.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Không tìm thấy sản phẩm với mã ID "${id}".`);
      }

      return await this.prisma.product.update({
        where: { id },
        data: { isAvailable },
      });
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException(`Không tìm thấy sản phẩm với mã ID "${id}" hoặc lỗi kết nối CSDL.`);
    }
  }

  /**
   * Cập nhật số lượng tồn kho của sản phẩm.
   * Dành cho Manager khi nhập thêm hàng hoặc điều chỉnh kho.
   * Tự động bật isAvailable = true nếu tồn kho > 0, hoặc tắt nếu = 0.
   *
   * @param id              UUID của sản phẩm
   * @param stockQuantity   Số lượng tồn kho mới (phải >= 0)
   * @returns               Object sản phẩm đã cập nhật
   * @throws                NotFoundException nếu không tìm thấy sản phẩm
   * @throws                BadRequestException nếu stockQuantity < 0
   */
  async updateStock(id: string, stockQuantity: number) {
    if (stockQuantity < 0) {
      throw new BadRequestException('Số lượng tồn kho không được âm.');
    }

    try {
      const product = await this.prisma.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Không tìm thấy sản phẩm với mã ID "${id}".`);
      }

      return await this.prisma.product.update({
        where: { id },
        data: {
          stockQuantity,
          // Tự động đồng bộ trạng thái: hết kho = ngừng bán, có kho = mở bán
          isAvailable: stockQuantity > 0,
        },
      });
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new NotFoundException(`Không tìm thấy sản phẩm với mã ID "${id}" hoặc lỗi kết nối CSDL.`);
    }
  }
}
