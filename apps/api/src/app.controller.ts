/**
 * @file app.controller.ts
 * @description Root Controller cung cấp endpoint trang chủ API phục vụ kiểm tra nhanh trạng thái
 * @author BrewLite Team - Assignment 2
 */

import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      name: 'BrewLite Backend REST API',
      status: 'online',
      service: 'brewlite-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      healthcheck: 'http://localhost:4000/health',
      endpoints: {
        health: '/health',
        products: '/products',
        auth: '/auth',
        orders: '/orders',
        payments: '/payments',
      },
    };
  }
}
