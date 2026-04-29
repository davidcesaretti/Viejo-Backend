import { Module } from '@nestjs/common';
import { SaleRepositoryModule } from '../../repositories/sale/sale.module';
import { StockRepositoryModule } from '../../repositories/stock/stock.module';
import { PaymentRepositoryModule } from '../../repositories/payment/payment.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [SaleRepositoryModule, StockRepositoryModule, PaymentRepositoryModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
