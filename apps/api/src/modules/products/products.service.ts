/**
 * @file products.service.ts
 * @description Xử lý nghiệp vụ truy vấn danh mục sản phẩm đồ uống và chi tiết món
 * @author Thành viên Phụ 1 - Business Analyst 1 (Scope & Data Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService, PRODUCT_RECIPE_BOM } from '../../common/storage/storage.service';

export const FALLBACK_PRODUCTS = [
  {
    id: 'prod-001-cf-sua-da',
    name: 'Cà Phê Sữa Đá Sài Gòn',
    description: 'Cà phê Robusta Đắk Lắk rang mộc đậm đà hòa quyện cùng sữa đặc béo ngậy.',
    recipe: '25g Cốt cà phê Robusta Đắk Lắk rang mộc, 30ml Sữa đặc Ngôi Sao, 20ml Sữa tươi thanh trùng, 150g Đá bi tinh khiết.',
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
    name: 'Bạc Xỉu Sài Gòn Kem Muối',
    description: 'Sự cân bằng hoàn hảo giữa vị ngọt sữa, hương thơm cà phê và lớp kem béo mặn nhẹ.',
    recipe: '40ml Sữa đặc, 80ml Sữa tươi không đường, 15ml Cốt cà phê phin, 30ml Kem sữa muối mặn béo ngậy đánh bông.',
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
    recipe: '120ml Nước cốt trà đen Lâm Đồng, 20ml Si-rô đào Pháp, 1 quả Cam sành tươi mọng nước, 1 cây Sả đập dập, 2 miếng Đào ngâm giòn.',
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
    recipe: '130ml Cốt trà Oolong sao nhiệt tạo hương khói, 30g Bột sữa New Zealand, 20ml Nước đường phèn mía hữu cơ.',
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
    name: 'Matcha Uji Đá Xay Kem Tuyết',
    description: 'Bột trà xanh Uji Nhật Bản xay mịn cùng sữa béo và đá viên, phủ lớp kem whip mềm mịn.',
    recipe: '5g Bột Matcha Uji Ceremonial Nhật Bản, 30ml Nước ấm 80°C, 120ml Sữa tươi, Đá bi xay mịn, Kem tươi whipping.',
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
    recipe: '100ml Cốt trà Ô Long mộc, 25ml Nước vải tươi ngâm, 4 hạt Sen hầm đường phèn, 2 quả Vải thiều mọng nước.',
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
  {
    id: 'prod-007-cf-den-da',
    name: 'Cà Phê Đen Đá Pha Phin',
    description: 'Vị đắng đượm hương hoa quả khô của hạt cà phê Robusta & Arabica Cầu Đất rang mộc.',
    recipe: '30g Cốt cà phê Robusta & Arabica Cầu Đất rang mộc, 10g Đường mía tự nhiên, 150g Đá viên tinh khiết.',
    category: 'Coffee',
    basePrice: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80',
    sizeOptions: [
      { size: 'S', price: 0 },
      { size: 'M', price: 5000 },
      { size: 'L', price: 8000 },
    ],
    toppingOptions: [
      { name: 'Thạch cà phê', price: 6000 },
    ],
    stockQuantity: 50,
    isAvailable: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-008-cf-muoi-hue',
    name: 'Cà Phê Muối Xứ Huế',
    description: 'Cà phê phin truyền thống kết hợp lớp kem mặn béo ngậy tạo nên hương vị bùng nổ.',
    recipe: '35ml Cốt cà phê Robusta Đắk Lắk, 20ml Sữa đặc, 40ml Lớp kem mặn béo ngậy đánh bông, Bột cacao rắc bề mặt.',
    category: 'Coffee',
    basePrice: 38000,
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&q=80',
    sizeOptions: [
      { size: 'S', price: 0 },
      { size: 'M', price: 6000 },
      { size: 'L', price: 10000 },
    ],
    toppingOptions: [
      { name: 'Trân châu đen', price: 5000 },
      { name: 'Kem mặn thêm', price: 8000 },
    ],
    stockQuantity: 35,
    isAvailable: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-009-tra-dau-tay-oi-hong',
    name: 'Trà Dâu Tây Ổi Hồng Nhiệt Đới',
    description: 'Trà xanh lài dịu nhẹ kết hợp mứt ổi hồng thơm lừng và dâu tây Đà Lạt tươi giòn.',
    recipe: '120ml Trà xanh lài Tây Bắc, 25ml Mứt ổi hồng tự nhiên, 3 quả Dâu tây Đà Lạt nghiền nhẹ, 1 lát Chanh vàng.',
    category: 'Tea',
    basePrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=500&q=80',
    sizeOptions: [
      { size: 'S', price: 0 },
      { size: 'M', price: 6000 },
      { size: 'L', price: 10000 },
    ],
    toppingOptions: [
      { name: 'Thạch nha đam', price: 6000 },
      { name: 'Trân châu trắng', price: 6000 },
    ],
    stockQuantity: 30,
    isAvailable: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-010-tra-sua-duong-den',
    name: 'Trà Sữa Trân Châu Đường Đen',
    description: 'Sữa tươi Dalat Milk thanh trùng kết hợp trân châu thủ công nấu cùng đường mía đen mật ngọt ngào.',
    recipe: '150ml Sữa tươi thanh trùng Dalat Milk, 60g Trân châu thủ công nấu cùng mật mía đường đen dẻo thơm.',
    category: 'MilkTea',
    basePrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1558857563-b37df2dd4122?w=500&q=80',
    sizeOptions: [
      { size: 'S', price: 0 },
      { size: 'M', price: 6000 },
      { size: 'L', price: 10000 },
    ],
    toppingOptions: [
      { name: 'Trân châu đường đen thêm', price: 8000 },
      { name: 'Kem cheese', price: 10000 },
    ],
    stockQuantity: 40,
    isAvailable: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-011-freeze-caramel',
    name: 'Freeze Cà Phê Caramel Đá Xay',
    description: 'Cà phê đá xay mịn màng cùng sốt caramel béo ngọt, phủ lớp kem tươi whipping mềm mịn bên trên.',
    recipe: '45ml Cốt cà phê Espresso nguyên bản, 25ml Sốt Caramel béo, 40ml Sữa đặc, Đá bi xay tuyết, Phủ kem whipping.',
    category: 'Freeze',
    basePrice: 52000,
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&q=80',
    sizeOptions: [
      { size: 'S', price: 0 },
      { size: 'M', price: 6000 },
      { size: 'L', price: 10000 },
    ],
    toppingOptions: [
      { name: 'Thạch cà phê', price: 6000 },
      { name: 'Sốt caramel thêm', price: 5000 },
    ],
    stockQuantity: 25,
    isAvailable: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'prod-012-croissant-bo-toi',
    name: 'Bánh Croissant Bơ Tỏi Nướng Giòn',
    description: 'Bánh sừng bò ngàn lớp thơm lừng bơ Pháp cao cấp, nướng giòn rụm bên ngoài và mềm ẩm bên trong.',
    recipe: 'Bột mì Pháp T55 lên men tự nhiên, Bơ lạt cao cấp AOP Elle & Vire, Sốt bơ tỏi lá mùi tây oregano nướng 180°C.',
    category: 'Freeze',
    basePrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80',
    sizeOptions: [
      { size: 'Tiêu chuẩn', price: 0 },
    ],
    toppingOptions: [
      { name: 'Phô mai Cheddar nướng chảy', price: 10000 },
    ],
    stockQuantity: 20,
    isAvailable: true,
    createdAt: new Date('2026-01-01'),
  },
];

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

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
    if (this.prisma.isConnected) {
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
          return products.map((p) => {
            const match = FALLBACK_PRODUCTS.find((f) => f.name === p.name || f.id === p.id);
            const stock = this.storageService.getProductStock(p.id, p.stockQuantity);
            return {
              ...p,
              stockQuantity: stock,
              isAvailable: stock > 0,
              recipe: (p as any).recipe || match?.recipe || 'Nguyên liệu tự nhiên tuyển chọn, pha chế theo công thức Barista BrewLite.',
            };
          });
        }
      } catch {
        // Fallback
      }
    }

    const rawList = this.filterFallback(FALLBACK_PRODUCTS, category, search);
    return rawList.map((p) => {
      const stock = this.storageService.getProductStock(p.id, p.stockQuantity);
      return {
        ...p,
        stockQuantity: stock,
        isAvailable: stock > 0,
      };
    });
  }

  async findOne(id: string) {
    if (this.prisma.isConnected) {
      try {
        const product = await this.prisma.product.findUnique({
          where: { id },
        });
        if (product) {
          const match = FALLBACK_PRODUCTS.find((f) => f.name === product.name || f.id === product.id);
          const stock = this.storageService.getProductStock(product.id, product.stockQuantity);
          return {
            ...product,
            stockQuantity: stock,
            isAvailable: stock > 0,
            recipe: (product as any).recipe || match?.recipe || 'Nguyên liệu tự nhiên tuyển chọn, pha chế theo công thức Barista BrewLite.',
          };
        }
      } catch {
        // Khi DB PostgreSQL chưa khởi chạy, kiểm tra fallback
      }
    }

    const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id);
    if (!fallback) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với mã ID ${id}`);
    }
    const stock = this.storageService.getProductStock(fallback.id, fallback.stockQuantity);
    return {
      ...fallback,
      stockQuantity: stock,
      isAvailable: stock > 0,
    };
  }

  async getCategories(): Promise<{ category: string; count: number }[]> {
    if (this.prisma.isConnected) {
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
        // Fallback
      }
    }

    const categoryMap = new Map<string, number>();
    for (const product of FALLBACK_PRODUCTS) {
      categoryMap.set(product.category, (categoryMap.get(product.category) || 0) + 1);
    }
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

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
      const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id);
      if (fallback) {
        fallback.isAvailable = isAvailable;
        return fallback;
      }
      throw new NotFoundException(`Không tìm thấy sản phẩm với mã ID "${id}".`);
    }
  }

  async updateStock(id: string, stockQuantity: number) {
    if (stockQuantity < 0) {
      throw new BadRequestException('Số lượng tồn kho không được âm.');
    }

    this.storageService.setProductStock(id, stockQuantity);

    try {
      const product = await this.prisma.product.findUnique({ where: { id } });
      if (product) {
        return await this.prisma.product.update({
          where: { id },
          data: {
            stockQuantity,
            isAvailable: stockQuantity > 0,
          },
        });
      }
    } catch {
      // In-memory fallback
    }

    const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id);
    if (fallback) {
      fallback.stockQuantity = stockQuantity;
      fallback.isAvailable = stockQuantity > 0;
      return fallback;
    }
    return { id, stockQuantity, isAvailable: stockQuantity > 0 };
  }

  getInventoryOverview() {
    const rawList = this.filterFallback(FALLBACK_PRODUCTS);
    return {
      ingredients: this.storageService.getIngredients(),
      stockLogs: this.storageService.getStockLogs().slice(0, 30),
      bom: PRODUCT_RECIPE_BOM,
      products: rawList.map((p) => {
        const stock = this.storageService.getProductStock(p.id, p.stockQuantity);
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          basePrice: p.basePrice,
          stockQuantity: stock,
          isAvailable: stock > 0,
          recipe: p.recipe,
        };
      }),
    };
  }

  restockIngredient(ingredientId: string, amount: number) {
    return this.storageService.restockIngredient(ingredientId, amount);
  }

  restockProduct(productId: string, amount: number) {
    return this.storageService.restockProduct(productId, amount);
  }
}
