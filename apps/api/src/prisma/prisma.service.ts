import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[PrismaService] Connected to PostgreSQL Database.');
    } catch (err: any) {
      console.warn('[PrismaService] Direct DB connection failed during startup (will retry on query):', err?.message || err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
