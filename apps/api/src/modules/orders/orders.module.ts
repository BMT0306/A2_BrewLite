/**
 * @file orders.module.ts
 * @description Module quản lý phân hệ đơn hàng (Orders)
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
