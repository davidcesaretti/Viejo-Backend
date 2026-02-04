import { Module } from '@nestjs/common';
import { ClientRepositoryModule } from '../../repositories/client/client.module';
import { SaleRepositoryModule } from '../../repositories/sale/sale.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [ClientRepositoryModule, SaleRepositoryModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
