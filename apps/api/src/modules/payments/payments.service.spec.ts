/**
 * @file payments.service.spec.ts
 * @description Unit Test kiểm thử logic thanh toán và chống trùng lặp Idempotency (UNIT-T03)
 * @author Thành viên Phụ 3 - QA & Traceability Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('PaymentsService (Unit Test: Idempotency & Stock Logic)', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  const mockOrder = {
    id: 'order-uuid-1',
    orderCode: 'BL-TEST-001',
    userId: 'user-uuid-1',
    status: OrderStatus.PENDING,
    subtotalAmount: 35000,
    discountAmount: 0,
    totalAmount: 35000,
    items: [
      { id: 'item-1', productId: 'prod-1', quantity: 1, unitPrice: 35000 },
    ],
  };

  const existingPayment = {
    id: 'pay-uuid-cached',
    orderId: 'order-uuid-1',
    idempotencyKey: 'idempotency-uuid-fixed',
    method: PaymentMethod.WALLET,
    status: PaymentStatus.PAID,
    amount: 35000,
    transactionRef: 'TXN_CACHED_999',
    paidAt: new Date(),
    order: mockOrder,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: {
            isConnected: true,
            payment: {
              findUnique: jest.fn().mockImplementation(({ where }) => {
                if (where.idempotencyKey === 'idempotency-uuid-fixed') {
                  return Promise.resolve(existingPayment);
                }
                return Promise.resolve(null);
              }),
            },
            order: {
              findUnique: jest.fn().mockResolvedValue(mockOrder),
            },
            $transaction: jest.fn().mockImplementation(async (callback) => {
              return callback({
                payment: {
                  create: jest.fn().mockResolvedValue({
                    id: 'new-pay-id',
                    orderId: mockOrder.id,
                    idempotencyKey: 'new-key',
                    method: PaymentMethod.WALLET,
                    status: PaymentStatus.PAID,
                    amount: mockOrder.totalAmount,
                    transactionRef: 'TXN_WALLET_OK',
                    paidAt: new Date(),
                  }),
                },
                order: {
                  update: jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.CONFIRMED }),
                },
                product: {
                  update: jest.fn().mockResolvedValue({}),
                },
              });
            }),
          },
        },
        {
          provide: StorageService,
          useValue: {
            savePayment: jest.fn(),
            getOrders: jest.fn().mockReturnValue([]),
            updateOrderStatus: jest.fn(),
            isSepayTxnProcessed: jest.fn().mockReturnValue(false),
            markSepayTxnProcessed: jest.fn(),
            restoreProductAndIngredients: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should throw BadRequestException if idempotencyKey is missing', async () => {
    await expect(
      service.processPayment('', { orderId: 'order-1', method: PaymentMethod.WALLET }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return cached result without charging again if idempotencyKey already exists', async () => {
    const res = await service.processPayment('idempotency-uuid-fixed', {
      orderId: 'order-uuid-1',
      method: PaymentMethod.WALLET,
    });
    expect(res.isIdempotentReplay).toBe(true);
    expect(res.transactionRef).toBe('TXN_CACHED_999');
    expect(res.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it('should process new payment successfully when idempotencyKey is new', async () => {
    const res = await service.processPayment('new-unique-key-1234', {
      orderId: 'order-uuid-1',
      method: PaymentMethod.WALLET,
      simulateFailure: false,
    });
    expect(res.isIdempotentReplay).toBe(false);
    expect(res.orderStatus).toBe(OrderStatus.CONFIRMED);
    expect(res.paymentStatus).toBe(PaymentStatus.PAID);
  });
});
