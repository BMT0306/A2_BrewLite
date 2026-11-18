/**
 * @file products.controller.ts
 * @description API Controller tiếp nhận request danh mục món và tìm kiếm sản phẩm
 * @author Thành viên Phụ 1 - Business Analyst 1 (Scope & Data Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Controller, Get, Param, Patch, Post, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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

  @Get('categories')
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Get('inventory/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'MANAGER')
  async getInventoryOverview() {
    return this.productsService.getInventoryOverview();
  }

  @Post('inventory/restock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async restock(
    @Body('ingredientId') ingredientId?: string,
    @Body('productId') productId?: string,
    @Body('amount') amount?: number,
  ) {
    const num = Number(amount || 0);
    if (ingredientId) {
      return this.productsService.restockIngredient(ingredientId, num);
    }
    if (productId) {
      return this.productsService.restockProduct(productId, num);
    }
    return { success: false, message: 'Vui lòng cung cấp ingredientId hoặc productId' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async updateAvailability(
    @Param('id') id: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.productsService.updateAvailability(id, isAvailable);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async updateStock(
    @Param('id') id: string,
    @Body('stockQuantity') stockQuantity: number,
  ) {
    return this.productsService.updateStock(id, stockQuantity);
  }
}
