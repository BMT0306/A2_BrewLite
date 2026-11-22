/**
 * @file roles.guard.ts
 * @description NestJS Guard thực thi kiểm tra phân quyền RBAC theo vai trò người dùng (CUSTOMER / STAFF / MANAGER)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user || !user.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập chức năng quản trị này (yêu cầu tài khoản Nhân viên Barista hoặc Quản lý).',
      );
    }

    return true;
  }
}
