/**
 * @file roles.decorator.ts
 * @description Custom Decorator khai báo danh sách vai trò (RBAC) được phép truy cập Endpoint
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
