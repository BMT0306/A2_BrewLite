import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public isConnected: boolean = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      console.log('[PrismaService] Connected to PostgreSQL Database.');
    } catch (err: any) {
      this.isConnected = false;
      console.warn('[PrismaService] PostgreSQL offline. Activated high-speed in-memory store.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.isConnected = false;
  }
}
