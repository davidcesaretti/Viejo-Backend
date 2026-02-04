import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Stock, StockSchema } from './stock.schema';
import { StockRepository } from './stock.repository';
import { Product, ProductSchema } from '../product/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Stock.name, schema: StockSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  providers: [StockRepository],
  exports: [StockRepository],
})
export class StockRepositoryModule {}
