import { Controller, GET } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @GET()
  getHealth() {
    return {
      status: 'ok',
      service: 'brewlite-api',
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
    };
  }
}
