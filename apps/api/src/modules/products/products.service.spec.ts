import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProductsService (Unit Test)', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'prod-uuid-1',
    name: 'Cà Phê Sữa Đá Sài Gòn',
    description: 'Robusta rang đậm đà',
    category: 'Coffee',
    basePrice: 29000,
    imageUrl: '/images/cf.jpg',
    sizeOptions: [{ size: 'S', price: 0 }, { size: 'M', price: 6000 }],
    toppingOptions: [{ name: 'Trân châu', price: 5000 }],
    stockQuantity: 50,
    isAvailable: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn().mockResolvedValue([mockProduct]),
              findUnique: jest.fn().mockImplementation(({ where }) => {
                if (where.id === mockProduct.id) return Promise.resolve(mockProduct);
                return Promise.resolve(null);
              }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll should return array of products', async () => {
    const products = await service.findAll();
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBe(1);
    expect(products[0].name).toBe('Cà Phê Sữa Đá Sài Gòn');
  });

  it('findOne should return product when found', async () => {
    const product = await service.findOne('prod-uuid-1');
    expect(product).toBeDefined();
    expect(product.id).toBe('prod-uuid-1');
  });

  it('findOne should throw NotFoundException when not found', async () => {
    await expect(service.findOne('invalid-id')).rejects.toThrow();
  });
});
