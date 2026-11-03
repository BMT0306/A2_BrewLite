/**
 * @file update-order-status.dto.ts
 * @description Data Transfer Object cập nhật trạng thái đơn hàng
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái đơn hàng không được để trống' })
  status: OrderStatus;
}
