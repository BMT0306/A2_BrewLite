/**
 * @file products.controller.ts
 * @description API Controller tiếp nhận request danh mục món và tìm kiếm sản phẩm
 * @author Thành viên Phụ 1 - Business Analyst 1 (Scope & Data Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(category, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
