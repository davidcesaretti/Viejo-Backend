import { Module } from '@nestjs/common';
import { ProductRepositoryModule } from '../../repositories/product/product.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [ProductRepositoryModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
