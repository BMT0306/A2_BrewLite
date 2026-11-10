/**
 * @file products.controller.ts
 * @description API Controller xử lý toàn bộ request liên quan đến danh mục sản phẩm đồ uống BrewLite.
 *              Cung cấp các endpoint REST chuẩn cho:
 *              - Liệt kê & Lọc danh mục sản phẩm (FR-01)
 *              - Xem chi tiết sản phẩm & tùy chọn (FR-02)
 *              - Lấy danh sách danh mục phân loại
 *              - Cập nhật trạng thái & tồn kho sản phẩm (Staff/Manager)
 * @author Thành viên Phụ 1: Chương Gia Thịnh - Business Analyst 1 (Scope & Data Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /products
   * Lấy danh sách sản phẩm đồ uống có hỗ trợ lọc theo danh mục và tìm kiếm từ khóa.
   *
   * @query category  Tên danh mục lọc (Coffee, Tea, MilkTea, Freeze). Truyền "All" hoặc bỏ trống để lấy toàn bộ.
   * @query search    Từ khóa tìm kiếm theo tên hoặc mô tả sản phẩm (case-insensitive).
   * @returns         Mảng danh sách sản phẩm phù hợp điều kiện lọc.
   *
   * @example GET /products
   * @example GET /products?category=Coffee
   * @example GET /products?search=matcha
   * @example GET /products?category=Tea&search=đào
   */
  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(category, search);
  }

  /**
   * GET /products/categories
   * Lấy danh sách các danh mục sản phẩm hiện có trong hệ thống kèm số lượng sản phẩm mỗi danh mục.
   *
   * @returns Mảng các object { category, count } sắp xếp theo tên danh mục.
   *
   * @example Response:
   * [
   *   { "category": "Coffee", "count": 2 },
   *   { "category": "Freeze", "count": 1 },
   *   { "category": "MilkTea", "count": 1 },
   *   { "category": "Tea", "count": 2 }
   * ]
   */
  @Get('categories')
  async getCategories() {
    return this.productsService.getCategories();
  }

  /**
   * GET /products/:id
   * Lấy chi tiết một sản phẩm theo ID, bao gồm thông tin sizeOptions và toppingOptions.
   *
   * @param id  UUID của sản phẩm cần tra cứu.
   * @returns   Object chi tiết sản phẩm.
   * @throws    NotFoundException (404) nếu không tìm thấy sản phẩm với ID đã cho.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /**
   * PATCH /products/:id/availability
   * Cập nhật trạng thái sẵn sàng (bật/tắt) của sản phẩm.
   * Dành cho Staff hoặc Manager khi cần tạm ngừng bán món (hết nguyên liệu, bảo trì menu).
   *
   * @param id            UUID của sản phẩm.
   * @body  isAvailable   Trạng thái mới (true = đang bán, false = tạm ngừng).
   * @returns             Object sản phẩm đã cập nhật.
   */
  @Patch(':id/availability')
  @HttpCode(HttpStatus.OK)
  async updateAvailability(
    @Param('id') id: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.productsService.updateAvailability(id, isAvailable);
  }

  /**
   * PATCH /products/:id/stock
   * Cập nhật số lượng tồn kho của sản phẩm.
   * Dành cho Manager khi nhập thêm hàng hoặc điều chỉnh kho.
   *
   * @param id              UUID của sản phẩm.
   * @body  stockQuantity   Số lượng tồn kho mới (>= 0).
   * @returns               Object sản phẩm đã cập nhật.
   */
  @Patch(':id/stock')
  @HttpCode(HttpStatus.OK)
  async updateStock(
    @Param('id') id: string,
    @Body('stockQuantity') stockQuantity: number,
  ) {
    return this.productsService.updateStock(id, stockQuantity);
  }
}
