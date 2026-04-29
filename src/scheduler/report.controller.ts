import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../rest/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rest/auth/guards/roles.guard';
import { Roles } from '../rest/auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SalesReportScheduler } from './sales-report.scheduler';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly scheduler: SalesReportScheduler) {}

  /**
   * POST /reports/sales/send
   * Dispara el envío del reporte manualmente.
   * Body opcional: { "date": "2026-04-28" }
   */
  @Post('sales/send')
  @Roles(Role.Administrador)
  async sendReport(@Body('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : undefined;
    return this.scheduler.triggerManually(date);
  }
}
