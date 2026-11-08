/**
 * @file jwt-auth.guard.ts
 * @description Guard bảo vệ các tuyến API nhạy cảm yêu cầu Bearer JWT Token
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Yêu cầu đăng nhập để thực hiện tác vụ này (401 Unauthorized)');
    }
    return user;
  }
}
