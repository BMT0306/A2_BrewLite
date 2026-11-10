/**
 * @file process-payment.dto.ts
 * @description Data Transfer Object yêu cầu xử lý thanh toán đơn hàng
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class ProcessPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã đơn hàng orderId không được để trống' })
  orderId: string;

  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán phải là WALLET hoặc CARD' })
  @IsNotEmpty({ message: 'Phương thức thanh toán không được để trống' })
  method: PaymentMethod;

  @IsBoolean()
  @IsOptional()
  simulateFailure?: boolean;
}
