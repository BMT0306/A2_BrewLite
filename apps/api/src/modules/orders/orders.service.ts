/**
 * @file orders.service.ts
 * @description Xử lý nghiệp vụ đặt hàng nguyên tử trong Database Transaction và trừ tồn kho (FR-05, UC-05)
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FALLBACK_PRODUCTS } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  public get inMemoryOrders(): any[] {
    return this.storageService.getOrders();
  }

  private enrichOrdersWithRecipe(orders: any[]) {
    return orders.map((o) => ({
      ...o,
      items: (o.items || []).map((it: any) => {
        const prodMatch = FALLBACK_PRODUCTS.find((p) => p.id === it.productId || p.name === it.product?.name);
        return {
          ...it,
          product: {
            ...(it.product || {}),
            recipe: it.product?.recipe || prodMatch?.recipe || 'Nguyên liệu tự nhiên tuyển chọn, pha chế theo công thức Barista BrewLite.',
          },
        };
      }),
    }));
  }

  async create(userId: string, dto: CreateOrderDto) {
    if (this.prisma.isConnected) {
      try {
        // Thực thi tạo đơn hàng nguyên tử bên trong Prisma Interactive Transaction
      return await this.prisma.$transaction(async (tx) => {
        let subtotal = new Prisma.Decimal(0);

        // 1. Kiểm tra tồn kho và trừ kho nguyên tử
        for (const item of dto.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new NotFoundException(`Không tìm thấy sản phẩm ${item.productId}`);
          }

          if (!product.isAvailable || product.stockQuantity < item.quantity) {
            throw new ConflictException(
              `Sản phẩm "${product.name}" hiện không đủ tồn kho (Còn lại: ${product.stockQuantity}, yêu cầu: ${item.quantity}). Vui lòng cập nhật giỏ hàng.`,
            );
          }

          // Trừ tồn kho nguyên tử cấp cơ sở dữ liệu
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: { decrement: item.quantity },
            },
          });

          const lineTotal = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
          subtotal = subtotal.add(lineTotal);
        }

        // 2. Xử lý mã voucher khuyến mãi (nếu có)
        let discountAmount = new Prisma.Decimal(0);
        let promotionId: string | null = null;
        if (dto.promotionCode) {
          const promo = await tx.promotion.findUnique({
            where: { code: dto.promotionCode.toUpperCase().trim() },
          });
          if (promo && promo.isActive && new Date() <= promo.validUntil) {
            promotionId = promo.id;
            const calcDiscount = subtotal.mul(promo.discountPercent).div(100);
            discountAmount = calcDiscount.greaterThan(promo.maxDiscountAmount)
              ? promo.maxDiscountAmount
              : calcDiscount;
          }
        }

        const totalAmount = subtotal.sub(discountAmount);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderCode = `BL-${Date.now().toString().slice(-6)}-${randomSuffix}`;

        // 3. Khởi tạo bản ghi Order kèm các OrderItems
        const order = await tx.order.create({
          data: {
            orderCode,
            userId,
            promotionId,
            status: OrderStatus.PENDING,
            subtotalAmount: subtotal,
            discountAmount,
            totalAmount,
            note: dto.note || null,
            items: {
              create: dto.items.map((item) => ({
                productId: item.productId,
                size: item.size,
                selectedToppings: item.toppings || [],
                quantity: item.quantity,
                unitPrice: new Prisma.Decimal(item.unitPrice),
                lineTotal: new Prisma.Decimal(item.unitPrice).mul(item.quantity),
              })),
            },
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        });

        // Tự động trừ số lượng ly tồn kho món đồ uống và trừ kho nguyên liệu theo định mức công thức BOM
        this.storageService.deductProductAndIngredients(order.orderCode, dto.items);

        return {
          orderId: order.id,
          orderCode: order.orderCode,
          status: order.status,
          subtotalAmount: order.subtotalAmount,
          discountAmount: order.discountAmount,
          totalAmount: order.totalAmount,
          itemsCount: order.items.length,
          createdAt: order.createdAt,
        };
      });
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof ConflictException) {
        throw err;
      }
    }
  }

  // Khi PostgreSQL offline, xử lý dự phòng trên bộ nhớ (In-memory fallback)
      let subtotal = 0;
      const orderItems = dto.items.map((item) => {
        const prod = FALLBACK_PRODUCTS.find((p) => p.id === item.productId) || {
          id: item.productId,
          name: 'Đồ uống BrewLite',
          basePrice: item.unitPrice,
          stockQuantity: 10,
          isAvailable: true,
        };

        // Kiểm tra tồn kho thời gian thực từ StorageService
        const currentStock = this.storageService.getProductStock(item.productId, prod.stockQuantity ?? 10);
        if (currentStock < item.quantity) {
          throw new ConflictException(
            `Sản phẩm "${prod.name}" hiện không đủ tồn kho (Còn lại: ${currentStock}, yêu cầu: ${item.quantity}). Vui lòng cập nhật giỏ hàng.`,
          );
        }

        const lineTotal = Number(item.unitPrice) * item.quantity;
        subtotal += lineTotal;
        return {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: item.productId,
          size: item.size,
          selectedToppings: item.toppings || [],
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal,
          product: {
            ...prod,
            stockQuantity: currentStock,
          },
        };
      });

      let discountAmount = 0;
      if (dto.promotionCode && dto.promotionCode.toUpperCase().trim() === 'WELCOME10') {
        discountAmount = Math.min(subtotal * 0.1, 50000);
      }
      const totalAmount = subtotal - discountAmount;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderCode = `BL-${Date.now().toString().slice(-6)}-${randomSuffix}`;
      const mockOrder = {
        id: `ord-${Date.now()}`,
        orderCode,
        userId,
        status: OrderStatus.PENDING,
        subtotalAmount: subtotal,
        discountAmount,
        totalAmount,
        note: dto.note || null,
        items: orderItems,
        payments: [],
        createdAt: new Date(),
      };

      // Tự động trừ số lượng ly tồn kho món đồ uống và trừ kho nguyên liệu theo định mức công thức BOM
      this.storageService.deductProductAndIngredients(mockOrder.orderCode, dto.items);
      this.storageService.saveOrder(mockOrder);

      return {
        orderId: mockOrder.id,
        orderCode: mockOrder.orderCode,
        status: mockOrder.status,
        subtotalAmount: mockOrder.subtotalAmount,
        discountAmount: mockOrder.discountAmount,
        totalAmount: mockOrder.totalAmount,
        itemsCount: mockOrder.items.length,
        createdAt: mockOrder.createdAt,
      };
  }

  async findUserOrders(userId: string, role?: string) {
    if (this.prisma.isConnected) {
      try {
        const where: Prisma.OrderWhereInput = {};
        if (role !== 'STAFF' && role !== 'MANAGER') {
          where.userId = userId;
        }

        const orders = await this.prisma.order.findMany({
          where,
          include: {
            items: {
              include: { product: true },
            },
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        if (orders && orders.length > 0) return this.enrichOrdersWithRecipe(orders);
      } catch {
        // Fallback
      }
    }
    const all = this.inMemoryOrders;
    if (role !== 'STAFF' && role !== 'MANAGER') {
      const userOrders = all.filter((o) => !o.userId || o.userId === userId);
      return this.enrichOrdersWithRecipe(userOrders);
    }
    return this.enrichOrdersWithRecipe(all);
  }

  async findOne(id: string) {
    if (this.prisma.isConnected) {
      try {
        const order = await this.prisma.order.findFirst({
          where: {
            OR: [{ id }, { orderCode: id }],
          },
          include: {
            items: {
              include: { product: true },
            },
            payments: true,
            user: {
              select: { id: true, fullName: true, email: true, phone: true },
            },
          },
        });
        if (order) return this.enrichOrdersWithRecipe([order])[0];
      } catch {
        // In-memory fallback
      }
    }

    const memoryOrder = this.inMemoryOrders.find((o) => o.id === id || o.orderCode === id);
    if (!memoryOrder) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID ${id}`);
    }
    return this.enrichOrdersWithRecipe([memoryOrder])[0];
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    if (this.prisma.isConnected) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id },
          include: { items: true, payments: true },
        });

        if (order) {
          // Xử lý Giao dịch bù trừ (Compensating Transaction) khi Hủy đơn hàng (Order Cancellation & Refund)
          if (dto.status === OrderStatus.CANCELLED) {
            return await this.prisma.$transaction(async (tx) => {
              // 1. Tự động hoàn lại số lượng tồn kho cho tất cả món trong đơn
              for (const item of order.items) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stockQuantity: { increment: item.quantity },
                  },
                });
              }

              // Hoàn trả số lượng ly tồn kho và hoàn trả nguyên liệu kho theo định mức BOM
              this.storageService.restoreProductAndIngredients(
                order.orderCode,
                order.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
              );

              // 2. Tự động hoàn tiền (Refund) các giao dịch thanh toán đã thành công
              for (const payment of order.payments) {
                if (payment.status === PaymentStatus.PAID) {
                  await tx.payment.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.REFUNDED },
                  });
                }
              }

              // 3. Cập nhật trạng thái đơn hàng sang CANCELLED
              const updated = await tx.order.update({
                where: { id },
                data: { status: OrderStatus.CANCELLED },
                include: { items: true, payments: true },
              });
              const hadPaid = order.payments.some((p) => p.status === PaymentStatus.PAID);
              return {
                ...updated,
                ...(hadPaid ? { refundStatus: 'REFUNDED' } : {}),
              };
            });
          }

          return await this.prisma.order.update({
            where: { id },
            data: { status: dto.status },
            include: {
              items: true,
              payments: true,
            },
          });
        }
      } catch {
        // In-memory fallback khi DB offline
      }
    }

    const memoryOrder = this.inMemoryOrders.find((o) => o.id === id);
    if (!memoryOrder) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID ${id}`);
    }
    memoryOrder.status = dto.status;
    if (dto.status === OrderStatus.CANCELLED) {
      // Hoàn trả số lượng ly tồn kho và hoàn trả nguyên liệu kho theo định mức BOM
      if (memoryOrder.items) {
        this.storageService.restoreProductAndIngredients(
          memoryOrder.orderCode,
          memoryOrder.items.map((it: any) => ({ productId: it.productId, quantity: it.quantity })),
        );
      }

      // Chỉ đánh dấu hoàn tiền nếu đơn hàng ĐÃ ĐƯỢC THANH TOÁN trước đó
      let wasPaid = false;
      if (memoryOrder.payments && memoryOrder.payments.length > 0) {
        memoryOrder.payments.forEach((p: any) => {
          if (p.status === 'PAID') {
            p.status = 'REFUNDED';
            wasPaid = true;
          }
        });
      }
      if (wasPaid) {
        memoryOrder.refundStatus = 'REFUNDED';
      } else {
        delete memoryOrder.refundStatus;
      }
    }
    this.storageService.updateOrderStatus(memoryOrder.id, dto.status, memoryOrder.refundStatus);
    return memoryOrder;
  }

  /**
   * Xóa đơn hàng nháp (PENDING) khi khách hàng bấm sửa món hoặc hủy thanh toán
   * Thực hiện Giao dịch bù trừ tự động hoàn trả số lượng tồn kho
   */
  async remove(id: string) {
    if (this.prisma.isConnected) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id },
          include: { items: true, payments: true },
        });

        if (order) {
          if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException('Chỉ có thể xóa bỏ đơn hàng đang ở trạng thái Chờ thanh toán (PENDING).');
          }

          return await this.prisma.$transaction(async (tx) => {
            // 1. Tự động hoàn lại số lượng tồn kho cho các món
            for (const item of order.items) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stockQuantity: { increment: item.quantity },
                },
              });
            }

            // Hoàn trả số lượng ly tồn kho và hoàn trả nguyên liệu kho theo định mức BOM
            this.storageService.restoreProductAndIngredients(
              order.orderCode,
              order.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
            );

            // 2. Xóa chi tiết đơn hàng và đơn hàng
            await tx.orderItem.deleteMany({ where: { orderId: id } });
            await tx.order.delete({ where: { id } });

            return { success: true, message: 'Đã hủy đơn nháp và hoàn trả tồn kho thành công', id };
          });
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        // In-memory fallback khi DB offline
      }
    }

    const memIndex = this.inMemoryOrders.findIndex((o) => o.id === id || o.orderCode === id);
    if (memIndex === -1) {
      return { success: true, message: 'Đơn hàng không tồn tại hoặc đã được xóa' };
    }

    const memOrder = this.inMemoryOrders[memIndex];
    if (memOrder.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể xóa bỏ đơn hàng đang ở trạng thái Chờ thanh toán (PENDING).');
    }

    // Hoàn trả số lượng ly tồn kho và hoàn trả nguyên liệu kho theo định mức BOM
    if (memOrder.items) {
      this.storageService.restoreProductAndIngredients(
        memOrder.orderCode,
        memOrder.items.map((it: any) => ({ productId: it.productId, quantity: it.quantity })),
      );
    }

    this.storageService.removeOrder(memOrder.id);
    return { success: true, message: 'Đã hủy đơn nháp và hoàn trả tồn kho thành công', id: memOrder.id };
  }
}
