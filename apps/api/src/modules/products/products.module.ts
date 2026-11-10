/**
 * @file products.module.ts
 * @description NestJS Module đóng gói toàn bộ nghiệp vụ quản lý danh mục sản phẩm đồ uống BrewLite.
 *              Đăng ký ProductsController (REST API) và ProductsService (Business Logic).
 *              Export ProductsService cho các module khác (OrdersModule) tái sử dụng.
 * @author Thành viên Phụ 1: Chương Gia Thịnh - Business Analyst 1 (Scope & Data Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
