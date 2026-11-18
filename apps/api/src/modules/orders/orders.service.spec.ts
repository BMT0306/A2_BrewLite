/**
 * @file orders.service.spec.ts
 * @description Unit Test kiểm thử logic nghiệp vụ đặt hàng nguyên tử, trừ tồn kho và cập nhật trạng thái (UNIT-T02, UC-05)
 * @author Kỹ sư Trưởng / DevOps Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

describe('OrdersService (Unit Test: Atomic Transactions & Inventory)', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockProductInStock = {
    id: 'prod-001',
    name: 'Cà Phê Sữa Đá Sài Gòn',
    basePrice: 29000,
    sizeOptions: [
      { size: 'S', price: 0 },
      { size: 'M', price: 6000 },
      { size: 'L', price: 10000 },
    ],
    toppingOptions: [
      { name: 'Trân châu đen', price: 5000 },
    ],
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
            isConnected: true,
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
                  create: jest.fn().mockImplementation(({ data }) =>
                    Promise.resolve({
                      id: 'order-uuid-mock-1234',
                      orderCode: data.orderCode || 'BL-TEST-1234',
                      userId: data.userId,
                      status: OrderStatus.PENDING,
                      subtotalAmount: data.subtotalAmount,
                      discountAmount: data.discountAmount,
                      totalAmount: data.totalAmount,
                      items: [
                        {
                          id: 'item-1',
                          productId: 'prod-001',
                          quantity: 1,
                          unitPrice: data.subtotalAmount,
                          product: mockProductInStock,
                        },
                      ],
                      createdAt: new Date(),
                    }),
                  ),
                },
              };
              return callback(tx);
            }),
            order: {
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn().mockResolvedValue({
                id: 'order-uuid-mock-1234',
                orderCode: 'BL-TEST-1234',
                userId: 'usr-customer-B',
                status: OrderStatus.PENDING,
                items: [],
                payments: [],
              }),
              findUnique: jest.fn().mockResolvedValue({
                id: 'order-uuid-mock-1234',
                orderCode: 'BL-TEST-1234',
                userId: 'usr-customer-B',
                status: OrderStatus.PENDING,
                items: [],
                payments: [],
              }),
              update: jest.fn().mockImplementation(({ where, data }) => ({
                id: where.id,
                orderCode: 'BL-TEST-1234',
                status: data.status,
              })),
            },
          },
        },
        {
          provide: StorageService,
          useValue: {
            getProductStock: jest.fn().mockReturnValue(10),
            setProductStock: jest.fn(),
            deductProductAndIngredients: jest.fn().mockReturnValue({ success: true }),
            restoreProductAndIngredients: jest.fn().mockReturnValue({ success: true }),
            getOrders: jest.fn().mockReturnValue([]),
            saveOrder: jest.fn(),
            updateOrderStatus: jest.fn(),
            removeOrder: jest.fn().mockReturnValue(true),
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

  it('SEC-ORD-01: should ignore client-tampered unitPrice and topping price and charge authoritative DB price', async () => {
    const tamperedDto = {
      items: [
        {
          productId: 'prod-001',
          size: 'M', // +6000
          toppings: [{ name: 'Trân châu đen', price: -999999 }], // DB price = +5000
          quantity: 2,
          unitPrice: 1, // Client hacked to 1 VND
        },
      ],
    };

    const order = await service.create('usr-customer-A', tamperedDto);
    // Expected: (29000 + 6000 + 5000) * 2 = 80000
    expect(Number(order.subtotalAmount)).toBe(80000);
    expect(Number(order.totalAmount)).toBe(80000);
  });

  it('SEC-ORD-02: should block IDOR when User A tries to read User B order via findOne', async () => {
    await expect(
      service.findOne('order-uuid-mock-1234', { id: 'usr-customer-A', role: 'CUSTOMER' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('SEC-ORD-03: should block IDOR when User A tries to cancel User B order via updateStatus', async () => {
    await expect(
      service.updateStatus(
        'order-uuid-mock-1234',
        { status: OrderStatus.CANCELLED },
        { id: 'usr-customer-A', role: 'CUSTOMER' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('SEC-ORD-04: should block RBAC escalation when Customer tries to mark own order COMPLETED', async () => {
    await expect(
      service.updateStatus(
        'order-uuid-mock-1234',
        { status: OrderStatus.COMPLETED },
        { id: 'usr-customer-B', role: 'CUSTOMER' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});

