import {
  Body,
  Controller,
  GET,
  HttpCode,
  HttpStatus,
  Param,
  PATCH,
  POST,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @POST()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, dto);
  }

  @GET()
  async findAll(@Request() req: any) {
    return this.ordersService.findUserOrders(req.user.id, req.user.role);
  }

  @GET(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @PATCH(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }
}
