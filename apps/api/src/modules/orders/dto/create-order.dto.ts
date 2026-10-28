import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã sản phẩm không được để trống' })
  productId: string;

  @IsString()
  @IsNotEmpty({ message: 'Size không được để trống' })
  size: string;

  @IsArray()
  @IsOptional()
  toppings?: any[];

  @IsNumber()
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'Đơn giá không hợp lệ' })
  unitPrice: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  promotionCode?: string;
}
