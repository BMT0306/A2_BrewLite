/**
 * @file payments.service.ts
 * @description Xử lý nghiệp vụ thanh toán không tiền mặt, chống trùng lặp Idempotency và giao dịch bù trừ (FR-06, UC-05)
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoyaltyTxType, OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async processPayment(idempotencyKey: string, dto: ProcessPaymentDto) {
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      throw new BadRequestException('Bắt buộc cung cấp Header "Idempotency-Key" (UUIDv4) để đảm bảo an toàn giao dịch');
    }

    const cleanKey = idempotencyKey.trim();

    // 1. Kiểm tra Idempotency (Chống thanh toán trùng lặp khi mạng chập chờn / replay)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: cleanKey },
      include: { order: true },
    });

    if (existingPayment) {
      console.log(`[PaymentsService] Idempotency-Key "${cleanKey}" already processed. Returning cached result.`);
      return {
        paymentId: existingPayment.id,
        orderId: existingPayment.orderId,
        orderStatus: existingPayment.order.status,
        paymentStatus: existingPayment.status,
        transactionRef: existingPayment.transactionRef,
        paidAt: existingPayment.paidAt,
        isIdempotentReplay: true,
      };
    }

    // 2. Tìm đơn hàng kèm danh sách chi tiết các món
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID ${dto.orderId}`);
    }

    if (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(`Đơn hàng #${order.orderCode || order.id} đã hoàn tất thanh toán trước đó.`);
    }

    // 3. Xử lý nhánh lỗi giả lập (Compensating Transaction & Tự động hoàn kho)
    if (dto.simulateFailure === true) {
      await this.prisma.$transaction(async (tx) => {
        // Ghi nhận giao dịch thanh toán thất bại
        await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey: cleanKey,
            method: dto.method,
            status: PaymentStatus.FAILED,
            amount: order.totalAmount,
            transactionRef: `FAIL_${dto.method}_${Date.now()}`,
          },
        });

        // Cập nhật trạng thái đơn hàng sang PAYMENT_FAILED
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAYMENT_FAILED },
        });

        // Giao dịch bù trừ (Compensating Transaction): Tự động cộng hoàn trả số lượng tồn kho
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: { increment: item.quantity },
            },
          });
        }
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message:
            'Thanh toán thất bại: Số dư ví không đủ hoặc thẻ bị từ chối. Giao dịch bù trừ đã tự động hoàn trả số lượng tồn kho sản phẩm.',
          orderId: order.id,
          orderStatus: OrderStatus.PAYMENT_FAILED,
          paymentStatus: PaymentStatus.FAILED,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // 4. Nhánh thanh toán thành công (Happy path)
    const transactionRef = `TXN_${dto.method}_${Date.now()}`;
    const paidAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Tạo bản ghi Payment PAID
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: cleanKey,
          method: dto.method,
          status: PaymentStatus.PAID,
          amount: order.totalAmount,
          transactionRef,
          paidAt,
        },
      });

      // Cập nhật trạng thái Order sang CONFIRMED
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED },
      });

      // Tích lũy Loyalty Points (Mỗi 10.000 VNĐ = 1 điểm thưởng)
      const txAny = tx as any;
      if (order.userId && txAny.loyaltyTransaction && txAny.user) {
        const pointsEarned = Math.floor(Number(order.totalAmount) / 10000);
        if (pointsEarned > 0) {
          await txAny.user.update({
            where: { id: order.userId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });

          await txAny.loyaltyTransaction.create({
            data: {
              userId: order.userId,
              orderId: order.id,
              points: pointsEarned,
              type: LoyaltyTxType.EARN,
              description: `Tích lũy ${pointsEarned} điểm thưởng từ đơn hàng ${order.orderCode || order.id}`,
            },
          });
        }
      }

      return payment;
    });

    return {
      paymentId: result.id,
      orderId: order.id,
      orderStatus: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      transactionRef: result.transactionRef,
      paidAt: result.paidAt,
      isIdempotentReplay: false,
    };
  }
}
