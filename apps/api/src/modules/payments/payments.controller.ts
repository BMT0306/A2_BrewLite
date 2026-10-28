import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  POST,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @POST()
  @HttpCode(HttpStatus.OK)
  async processPayment(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(idempotencyKey, dto);
  }
}
