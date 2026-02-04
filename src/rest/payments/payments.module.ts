import { Module } from '@nestjs/common';
import { PaymentRepositoryModule } from '../../repositories/payment/payment.module';
import { SaleRepositoryModule } from '../../repositories/sale/sale.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PaymentRepositoryModule, SaleRepositoryModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
