/**
 * @file orders.service.ts
 * @description Xử lý nghiệp vụ đặt hàng nguyên tử trong Database Transaction và trừ tồn kho (FR-05, UC-05)
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    // Thực thi tạo đơn hàng nguyên tử bên trong Prisma Interactive Transaction
    return this.prisma.$transaction(async (tx) => {
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
  }

  async findUserOrders(userId: string, role?: string) {
    const where: Prisma.OrderWhereInput = {};
    // Khách hàng thông thường chỉ xem được đơn của chính mình; Staff và Manager có thể xem toàn bộ
    if (role !== 'STAFF' && role !== 'MANAGER') {
      where.userId = userId;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
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
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID ${id}`);
    }
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID ${id}`);
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: {
        items: true,
        payments: true,
      },
    });
  }
}
