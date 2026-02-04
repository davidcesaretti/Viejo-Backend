import { Module } from '@nestjs/common';
import { SaleRepositoryModule } from '../../repositories/sale/sale.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [SaleRepositoryModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
