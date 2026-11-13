/**
 * @file orders.service.spec.ts
 * @description Unit Test kiểm thử logic nghiệp vụ đặt hàng nguyên tử, trừ tồn kho và cập nhật trạng thái (UNIT-T02, UC-05)
 * @author Kỹ sư Trưởng / DevOps Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

describe('OrdersService (Unit Test: Atomic Transactions & Inventory)', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockProductInStock = {
    id: 'prod-001',
    name: 'Cà Phê Sữa Đá Sài Gòn',
    basePrice: 29000,
    stockQuantity: 10,
    isAvailable: true,
  };

  const mockProductOutOfStock = {
    id: 'prod-002',
    name: 'Trà Sữa Ô Long Nướng',
    basePrice: 38000,
    stockQuantity: 0,
    isAvailable: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation(async (callback) => {
              const tx = {
                product: {
                  findUnique: jest.fn().mockImplementation(({ where }) => {
                    if (where.id === 'prod-001') return Promise.resolve(mockProductInStock);
                    if (where.id === 'prod-002') return Promise.resolve(mockProductOutOfStock);
                    return Promise.resolve(null);
                  }),
                  update: jest.fn().mockResolvedValue({ ...mockProductInStock, stockQuantity: 9 }),
                },
                order: {
                  create: jest.fn().mockResolvedValue({
                    id: 'order-uuid-mock-1234',
                    orderCode: 'BL-TEST-1234',
                    status: OrderStatus.PENDING,
                    subtotalAmount: new Prisma.Decimal(35000),
                    discountAmount: new Prisma.Decimal(0),
                    totalAmount: new Prisma.Decimal(35000),
                    items: [
                      {
                        id: 'item-1',
                        productId: 'prod-001',
                        quantity: 1,
                        unitPrice: new Prisma.Decimal(35000),
                        product: mockProductInStock,
                      },
                    ],
                    createdAt: new Date(),
                  }),
                },
              };
              return callback(tx);
            }),
            order: {
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest.fn().mockResolvedValue({
                id: 'order-uuid-mock-1234',
                orderCode: 'BL-TEST-1234',
                status: OrderStatus.PENDING,
                items: [],
              }),
              update: jest.fn().mockImplementation(({ where, data }) => ({
                id: where.id,
                orderCode: 'BL-TEST-1234',
                status: data.status,
              })),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('UNIT-ORD-01: should create an order and deduct inventory inside transaction', async () => {
    const createOrderDto = {
      items: [
        {
          productId: 'prod-001',
          size: 'M',
          toppings: ['Trân châu đen'],
          quantity: 1,
          unitPrice: 35000,
        },
      ],
      note: 'Ít đường nhiều đá',
    };

    const order = await service.create('usr-customer-001', createOrderDto);

    expect(order).toBeDefined();
    expect(order.orderId).toBe('order-uuid-mock-1234');
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('UNIT-ORD-02: should throw ConflictException when item is out of stock', async () => {
    const outOfStockDto = {
      items: [
        {
          productId: 'prod-002',
          size: 'M',
          quantity: 2,
          unitPrice: 38000,
        },
      ],
    };

    await expect(service.create('usr-customer-001', outOfStockDto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('UNIT-ORD-03: should transition order status to COMPLETED', async () => {
    const updated = await service.updateStatus('order-uuid-mock-1234', {
      status: OrderStatus.COMPLETED,
    });

    expect(updated).toBeDefined();
    expect(updated.status).toBe(OrderStatus.COMPLETED);
  });
});

