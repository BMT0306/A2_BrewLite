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
