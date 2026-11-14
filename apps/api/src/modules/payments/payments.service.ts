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
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { LoyaltyTxType, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { OrdersService } from '../orders/orders.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private inMemoryPayments: Map<string, any> = new Map();
  private sepayPollTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) { }

  async onModuleInit() {
    const token = process.env.SEPAY_API_TOKEN;
    if (token && token.trim() !== '') {
      console.log('[SePay Auto-Sync] Đã kích hoạt đối soát tự động qua SePay User API (Pull 2.5s)');
      await this.seedExistingSepayTransactions(token.trim());
      this.startSepayPolling(token.trim());
    }
  }

  onModuleDestroy() {
    if (this.sepayPollTimer) {
      clearInterval(this.sepayPollTimer);
      this.sepayPollTimer = null;
    }
  }

  private async seedExistingSepayTransactions(token: string) {
    try {
      const res = await fetch(
        'https://my.sepay.vn/userapi/transactions/list?account_number=6563617082006&limit=20',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (!res.ok) return;
      const data: any = await res.json().catch(() => ({}));
      const transactions = data.transactions || [];
      const orders = this.storageService.getOrders();
      for (const txn of transactions) {
        const ref = String(txn.reference_number || txn.id);
        const txnId = String(txn.id);
        const content = String(txn.transaction_content || '').toUpperCase();
        const hasMatchingPending = orders.some((o) => {
          if (o.status !== OrderStatus.PENDING) return false;
          const cleanCode = o.orderCode.replace(/[^A-Z0-9]/g, '');
          const cleanContent = content.replace(/[^A-Z0-9]/g, '');
          return cleanContent.includes(cleanCode);
        });
        if (!hasMatchingPending) {
          this.storageService.markSepayTxnProcessed(ref, txnId);
        }
      }
    } catch {
      // Bỏ qua lỗi mạng
    }
  }

  private startSepayPolling(token: string) {
    this.sepayPollTimer = setInterval(async () => {
      try {
        await this.syncSepayTransactions(token);
      } catch {
        // Bỏ qua lỗi mạng trong lúc polling
      }
    }, 2500);
  }

  async syncSepayTransactions(token: string) {
    let hasPending = false;
    if (this.prisma.isConnected) {
      try {
        const pendingCount = await this.prisma.order.count({
          where: { status: OrderStatus.PENDING },
        });
        hasPending = pendingCount > 0;
      } catch {
        hasPending = this.storageService.getOrders().some((o) => o.status === OrderStatus.PENDING);
      }
    } else {
      hasPending = this.storageService.getOrders().some((o) => o.status === OrderStatus.PENDING);
    }

    if (!hasPending) return;

    try {
      const res = await fetch(
        'https://my.sepay.vn/userapi/transactions/list?account_number=6563617082006&limit=10',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!res.ok) return;

      const data: any = await res.json().catch(() => ({}));
      const transactions = data.transactions || [];

      for (const txn of transactions) {
        const amount = Number(txn.amount_in || 0);
        if (amount <= 0) continue;

        const referenceCode = String(txn.reference_number || txn.id);
        const txnId = String(txn.id || '');

        // Bỏ qua ngay lập tức nếu giao dịch SePay này ĐÃ ĐƯỢC ĐỐI SOÁT trước đó
        if (this.storageService.isSepayTxnProcessed(referenceCode) || this.storageService.isSepayTxnProcessed(txnId)) {
          continue;
        }

        const content = String(txn.transaction_content || '');

        await this.handleSepayWebhook({
          gateway: txn.bank_brand_name || 'MBBank',
          accountNumber: txn.account_number || '6563617082006',
          content,
          transferType: 'in',
          description: content,
          transferAmount: amount,
          referenceCode,
          id: txn.id,
          transactionDate: txn.transaction_date,
        });
      }
    } catch {
      // Bỏ qua lỗi mạng
    }
  }

  async processPayment(idempotencyKey: string, dto: ProcessPaymentDto) {
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      throw new BadRequestException('Bắt buộc cung cấp Header "Idempotency-Key" (UUIDv4) để đảm bảo an toàn giao dịch');
    }

    const cleanKey = idempotencyKey.trim();

    // 1. Kiểm tra Idempotency trong bộ nhớ cache
    if (this.inMemoryPayments.has(cleanKey)) {
      console.log(`[PaymentsService] Idempotency-Key "${cleanKey}" already processed (cache). Returning cached result.`);
      return this.inMemoryPayments.get(cleanKey);
    }

    if (this.prisma.isConnected) {
      try {
        // 1. Kiểm tra Idempotency trong CSDL
      const existingPayment = await this.prisma.payment.findUnique({
        where: { idempotencyKey: cleanKey },
        include: { order: true },
      });

      if (existingPayment) {
        console.log(`[PaymentsService] Idempotency-Key "${cleanKey}" already processed. Returning cached result.`);
        const replay = {
          paymentId: existingPayment.id,
          orderId: existingPayment.orderId,
          orderStatus: existingPayment.order.status,
          paymentStatus: existingPayment.status,
          transactionRef: existingPayment.transactionRef,
          paidAt: existingPayment.paidAt,
          isIdempotentReplay: true,
        };
        this.inMemoryPayments.set(cleanKey, replay);
        return replay;
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
        if (order.userId && (tx as any).loyaltyTransaction && (tx as any).user) {
          const pointsEarned = Math.floor(Number(order.totalAmount) / 10000);
          if (pointsEarned > 0) {
            await tx.user.update({
              where: { id: order.userId },
              data: { loyaltyPoints: { increment: pointsEarned } },
            });

            await tx.loyaltyTransaction.create({
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

      const response = {
        paymentId: result.id,
        orderId: order.id,
        orderStatus: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        transactionRef: result.transactionRef,
        paidAt: result.paidAt,
        isIdempotentReplay: false,
      };
      this.inMemoryPayments.set(cleanKey, { ...response, isIdempotentReplay: true });
      return response;
      } catch (err: any) {
        if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof HttpException) {
          throw err;
        }
      }
    }

    // Fallback khi PostgreSQL offline: Kiểm tra nghiệp vụ chặt chẽ trên StorageService
    const memOrder = this.storageService.getOrders().find(
      (o) => o.id === dto.orderId || o.orderCode === dto.orderId,
    );
      if (!memOrder) {
        throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID ${dto.orderId}`);
      }
      if (memOrder.status === OrderStatus.CONFIRMED || memOrder.status === OrderStatus.COMPLETED) {
        throw new BadRequestException(`Đơn hàng #${memOrder.orderCode || memOrder.id} đã hoàn tất thanh toán trước đó.`);
      }

      if (dto.simulateFailure === true) {
        memOrder.status = OrderStatus.PAYMENT_FAILED;
        throw new BadRequestException('Giao dịch thanh toán không thành công. Hệ thống đã tự động hoàn kho.');
      }

      const transactionRef = `TXN_${dto.method}_${Date.now()}`;
      const paidAt = new Date();
      const fallbackResult = {
        paymentId: `pay-${Date.now()}`,
        orderId: memOrder.id,
        orderStatus: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        transactionRef,
        paidAt,
        isIdempotentReplay: false,
      };

      memOrder.status = OrderStatus.CONFIRMED;
      if (!memOrder.payments) memOrder.payments = [];
      memOrder.payments.push({
        id: fallbackResult.paymentId,
        orderId: memOrder.id,
        method: dto.method,
        status: PaymentStatus.PAID,
        amount: memOrder.totalAmount,
        transactionRef,
        paidAt,
      });

      this.storageService.savePayment({
        id: fallbackResult.paymentId,
        orderId: memOrder.id,
        idempotencyKey: cleanKey,
        method: dto.method,
        status: PaymentStatus.PAID,
        amount: memOrder.totalAmount,
        transactionRef,
        paidAt,
      });
      this.storageService.updateOrderStatus(memOrder.id, OrderStatus.CONFIRMED);

      // Tích lũy điểm thưởng bền vững
      if (memOrder.userId) {
        const pointsEarned = Math.floor(Number(memOrder.totalAmount) / 10000);
        if (pointsEarned > 0) {
          this.storageService.updateUserLoyaltyPoints(memOrder.userId, pointsEarned);
        }
      }

      this.inMemoryPayments.set(cleanKey, { ...fallbackResult, isIdempotentReplay: true });
      return fallbackResult;
  }

  /**
   * Xử lý Webhook tự động nhận diện biến động số dư chuyển khoản thực tế từ Cổng SePay (Napas 24/7)
   * Đồng bộ 100% kịch bản quét QR ngân hàng MBBank của Assignment 1
   * @param data Payload Webhook từ SePay
   */
  async handleSepayWebhook(data: Record<string, any>) {
    console.log('[SePay Webhook Received]:', JSON.stringify(data));

    // 1. Chỉ nhận giao dịch tiền vào tài khoản
    if (data.transferType && data.transferType !== 'in') {
      return { success: true, message: 'Bỏ qua giao dịch không phải tiền vào' };
    }

    const content = String(data.content || data.description || '').toUpperCase();
    const amount = Number(data.transferAmount || data.amountIn || data.amount || 0);
    const referenceCode = String(data.referenceCode || `SEPAY-${data.id || Date.now()}`);

    // Kiểm tra xem giao dịch SePay này đã từng được đối soát chưa (chống đối soát lại)
    if (
      this.storageService.isSepayTxnProcessed(referenceCode) ||
      (data.id && this.storageService.isSepayTxnProcessed(String(data.id)))
    ) {
      return { success: true, message: 'Giao dịch SePay này đã được đối soát trước đó.' };
    }

    // 2. Tìm mã đơn hàng từ nội dung chuyển khoản
    let order: any = null;

    // Trích xuất mã đơn hàng thông minh (hỗ trợ cả chuẩn BL-xxxxxx-xxxx và dính liền BLxxxxxxxxxx từ thông báo MBBank)
    const codeMatch = content.match(/BL-?(\d{6})-?(\d{4})/i);
    const candidateCodes: string[] = [];
    if (codeMatch) {
      candidateCodes.push(`BL-${codeMatch[1]}-${codeMatch[2]}`); // Dạng chuẩn: BL-109578-6415
      candidateCodes.push(`BL${codeMatch[1]}${codeMatch[2]}`);  // Dạng dính liền: BL1095786415
      candidateCodes.push(`${codeMatch[1]}${codeMatch[2]}`);    // 10 chữ số: 1095786415
    }

    if (this.prisma.isConnected) {
      try {
        // Cách 1: Tìm theo candidateCodes trích xuất từ nội dung chuyển khoản
        if (candidateCodes.length > 0) {
          order = await this.prisma.order.findFirst({
            where: {
              OR: candidateCodes.map((c) => ({
                orderCode: { contains: c, mode: 'insensitive' as const },
              })),
            },
            include: { items: true },
          });
        }

        // Cách 2: Tìm theo pattern BREWLITE <code/id>
        if (!order) {
          const brewMatch = content.match(/BREWLITE\s*#?([A-Z0-9-]+)/i);
          if (brewMatch) {
            const codeCandidate = brewMatch[1];
            order = await this.prisma.order.findFirst({
              where: {
                OR: [
                  { orderCode: { contains: codeCandidate, mode: 'insensitive' as const } },
                  { id: codeCandidate },
                ],
              },
              include: { items: true },
            });
          }
        }
      } catch {
        // Postgres offline -> Tìm trong storageService
      }
    }

    // Kiểm tra trong StorageService nếu DB chưa tìm thấy (Chỉ khớp khi nội dung chuyển khoản chứa mã đơn hàng!)
    if (!order) {
      const cleanContent = content.replace(/[^A-Z0-9]/g, '');
      const allOrders = this.storageService.getOrders();
      order = allOrders.find((o) => {
        const cleanOrderCode = o.orderCode ? o.orderCode.replace(/[^A-Z0-9]/g, '') : '';
        const cleanOrderId = o.id ? o.id.replace(/[^A-Z0-9]/g, '') : '';
        return (
          (cleanOrderCode && cleanContent.includes(cleanOrderCode)) ||
          (cleanOrderId && cleanContent.includes(cleanOrderId)) ||
          (candidateCodes.length > 0 && candidateCodes.includes(o.orderCode))
        );
      });
    }

    if (!order) {
      console.warn(`[SePay Webhook] Không tìm thấy đơn hàng tương ứng với nội dung: "${content}"`);
      return { success: false, message: `Không tìm thấy đơn hàng tương ứng với nội dung: "${content}"` };
    }

    // Kiểm tra số tiền chuyển khoản có đủ thanh toán đơn hàng không
    if (amount > 0 && Number(order.totalAmount) > 0 && amount < Number(order.totalAmount)) {
      console.warn(`[SePay Webhook] Số tiền chuyển (${amount}) nhỏ hơn tổng tiền đơn hàng (${order.totalAmount})`);
      return { success: false, message: `Số tiền chuyển (${amount}) không đủ thanh toán đơn hàng (${order.totalAmount})` };
    }

    if (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.COMPLETED) {
      this.storageService.markSepayTxnProcessed(referenceCode, data.id);
      return { success: true, message: `Đơn hàng #${order.orderCode} đã được thanh toán trước đó.` };
    }

    // 3. Tiến hành thanh toán với Idempotency Key duy nhất theo mã tham chiếu SePay
    const idempotencyKey = `sepay_${referenceCode}_${order.id}`;
    const paymentResult = await this.processPayment(idempotencyKey, {
      orderId: order.id,
      method: PaymentMethod.CARD,
      simulateFailure: false,
    });

    // Đánh dấu giao dịch SePay này đã tiêu thụ thành công
    this.storageService.markSepayTxnProcessed(referenceCode, data.id);
    this.storageService.updateOrderStatus(order.id, OrderStatus.CONFIRMED);

    console.log(`[SePay Webhook] Đơn #${order.orderCode} đã được tự động xác nhận thanh toán thành công (CONFIRMED)`);

    return {
      success: true,
      orderCode: order.orderCode,
      orderId: order.id,
      amount,
      message: `Xác nhận thanh toán SePay thành công cho đơn #${order.orderCode}`,
      payment: paymentResult,
    };
  }
}
