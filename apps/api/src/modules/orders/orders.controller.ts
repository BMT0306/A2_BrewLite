/**
 * @file orders.controller.ts
 * @description API Controller xử lý đặt hàng, tra cứu lịch sử và cập nhật trạng thái đơn hàng
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, dto);
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest, @Query('all') all?: string) {
    const viewAll =
      (all === 'true' || all === '1') &&
      (req.user.role === 'STAFF' || req.user.role === 'MANAGER');
    return this.ordersService.findUserOrders(
      req.user.id,
      viewAll ? req.user.role : 'CUSTOMER',
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.remove(id, req.user.id);
  }
}
