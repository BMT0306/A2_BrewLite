/**
 * @file auth.controller.ts
 * @description API Controller xử lý đăng ký và đăng nhập người dùng (FR-04, UC-04)
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
