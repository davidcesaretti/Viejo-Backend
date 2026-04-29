import { Module } from '@nestjs/common';
import { CashboxRepositoryModule } from '../../repositories/cashbox/cashbox.module';
import { CashboxController } from './cashbox.controller';
import { CashboxService } from './cashbox.service';

@Module({
  imports: [CashboxRepositoryModule],
  controllers: [CashboxController],
  providers: [CashboxService],
})
export class CashboxModule {}
