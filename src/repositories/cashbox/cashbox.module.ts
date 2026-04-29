import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashboxEntry, CashboxEntrySchema } from './cashbox.schema';
import { CashboxRepository } from './cashbox.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashboxEntry.name, schema: CashboxEntrySchema },
    ]),
  ],
  providers: [CashboxRepository],
  exports: [CashboxRepository],
})
export class CashboxRepositoryModule {}
