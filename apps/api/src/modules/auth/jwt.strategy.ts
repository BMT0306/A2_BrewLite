/**
 * @file jwt.strategy.ts
 * @description Chiến lược Passport JWT trích xuất và giải mã Token từ Authorization Header
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'brewlite_super_secret_jwt_key_2026_production',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    if (this.prisma.isConnected) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
        });
        if (user) {
          return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          };
        }
      } catch {
        // Database connection fallback khi PostgreSQL offline
      }
    }

    const storedUser = this.storageService.getUserById(payload?.sub);
    if (storedUser) {
      return {
        id: storedUser.id,
        email: storedUser.email,
        fullName: storedUser.fullName,
        role: storedUser.role,
      };
    }

    if (payload && payload.sub) {
      return {
        id: payload.sub,
        email: payload.email || 'customer@brewlite.vn',
        fullName: payload.email ? payload.email.split('@')[0] : 'BrewLite User',
        role: payload.role || 'CUSTOMER',
      };
    }

    throw new UnauthorizedException('Tài khoản không tồn tại hoặc token không hợp lệ');
  }
}
