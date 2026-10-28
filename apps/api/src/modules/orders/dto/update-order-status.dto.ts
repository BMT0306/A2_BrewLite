import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái đơn hàng không được để trống' })
  status: OrderStatus;
}
