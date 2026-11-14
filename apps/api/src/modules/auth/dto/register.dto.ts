/**
 * @file register.dto.ts
 * @description Data Transfer Object đăng ký tài khoản khách hàng mới
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Định dạng email không hợp lệ (Ví dụ: name@brewlite.vn)' })
  @IsNotEmpty({ message: 'Địa chỉ email không được để trống' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải chứa ít nhất 6 ký tự' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @Matches(/^[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9\s']{2,50}$/, {
    message: 'Họ và tên không hợp lệ (phải từ 2-50 ký tự, chỉ chứa chữ cái và dấu cách, không chứa chữ số hay ký tự đặc biệt)',
  })
  fullName: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => typeof o.phone === 'string' && o.phone.trim().length > 0)
  @Matches(/^(0[3|5|7|8|9])[0-9]{8}$/, {
    message: 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số chuẩn mạng viễn thông Việt Nam: 03, 05, 07, 08, 09)',
  })
  phone?: string;
}
