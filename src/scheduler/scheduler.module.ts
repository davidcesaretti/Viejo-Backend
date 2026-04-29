import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { SaleRepositoryModule } from '../repositories/sale/sale.module';
import { SalesReportService } from './sales-report.service';
import { SalesReportScheduler } from './sales-report.scheduler';
import { ReportController } from './report.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    SaleRepositoryModule,
    // MailModule es @Global(), se inyecta automáticamente
  ],
  providers: [SalesReportService, SalesReportScheduler],
  controllers: [ReportController],
})
export class SchedulerModule {}
