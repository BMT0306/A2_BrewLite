import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
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

    // 1. Check if idempotencyKey already exists in DB (Idempotent Replay)
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

    // 2. Fetch Order with Items
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID ${dto.orderId}`);
    }

    // 3. Handle Simulated Failure branch (Compensating Transaction & Stock Refund)
    if (dto.simulateFailure === true) {
      await this.prisma.$transaction(async (tx) => {
        // Record failed payment
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

        // Mark order as PAYMENT_FAILED
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAYMENT_FAILED },
        });

        // Compensating transaction: Re-increment inventory
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

    // 4. Handle Success branch (PAID & CONFIRMED)
    const transactionRef = `TXN_${dto.method}_${Date.now()}`;
    const paidAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
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

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED },
      });

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
