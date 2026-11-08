/**
 * @file health.controller.ts
 * @description API Health Check giám sát tính sẵn sàng của hệ thống phục vụ CI/CD Smoke Test & QA
 * @author Thành viên Phụ 3 - QA & Traceability Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  getHealth(): {
    status: string;
    service: string;
    timestamp: string;
    uptime: number;
  } {
    return {
      status: 'ok',
      service: 'brewlite-api',
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
    };
  }
}
