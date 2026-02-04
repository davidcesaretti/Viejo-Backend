import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sale, SaleSchema } from './sale.schema';
import { SaleRepository } from './sale.repository';
import { Client, ClientSchema } from '../client/client.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: Client.name, schema: ClientSchema },
    ]),
  ],
  providers: [SaleRepository],
  exports: [SaleRepository],
})
export class SaleRepositoryModule {}
