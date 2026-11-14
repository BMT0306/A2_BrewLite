/**
 * @file payments.controller.ts
 * @description API Controller xử lý thanh toán không tiền mặt và chống trùng lặp Idempotency
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async processPayment(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(idempotencyKey, dto);
  }

  /**
   * Endpoint Webhook nhận thông báo biến động số dư thực tế từ Cổng SePay (Napas 247)
   * Không yêu cầu JWT Bearer Token để máy chủ bên thứ 3 (my.sepay.vn) có thể gọi trực tiếp
   */
  @Post('sepay-webhook')
  @HttpCode(HttpStatus.OK)
  async handleSepayWebhook(@Body() body: Record<string, any>) {
    return this.paymentsService.handleSepayWebhook(body);
  }
}
