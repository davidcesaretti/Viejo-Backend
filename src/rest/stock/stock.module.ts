import { Module } from '@nestjs/common';
import { StockRepositoryModule } from '../../repositories/stock/stock.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [StockRepositoryModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
