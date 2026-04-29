import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../services/mail/mail.service';
import { SalesReportService } from './sales-report.service';

@Injectable()
export class SalesReportScheduler {
  private readonly logger = new Logger(SalesReportScheduler.name);

  constructor(
    private readonly salesReportService: SalesReportService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Se ejecuta todos los días a las 00:05 hs.
   * Genera el Excel de las ventas del día anterior y lo envía por email.
   */
  @Cron('0 5 0 * * *', { name: 'daily-sales-report', timeZone: 'America/Argentina/Buenos_Aires' })
  async sendDailySalesReport(): Promise<void> {
    if (!this.mailService.isConfigured()) {
      this.logger.warn('Reporte diario omitido: mail no configurado (revisar .env)');
      return;
    }

    // Calcular "ayer" en zona horaria Argentina
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateFrom = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      0, 0, 0, 0,
    );
    const dateTo = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      23, 59, 59, 999,
    );

    const dayLabel = `${dateFrom.getDate().toString().padStart(2, '0')}/${(dateFrom.getMonth() + 1).toString().padStart(2, '0')}/${dateFrom.getFullYear()}`;
    const filename = `ventas_${dateFrom.getFullYear()}-${String(dateFrom.getMonth() + 1).padStart(2, '0')}-${String(dateFrom.getDate()).padStart(2, '0')}.xlsx`;

    this.logger.log(`Generando reporte diario de ventas para ${dayLabel}...`);

    try {
      const excelBuffer = await this.salesReportService.generateExcelBuffer(dateFrom, dateTo);

      const to = this.configService.get<string>('REPORT_MAIL_TO') ?? 'davucesaretti@gmail.com';

      const html = `
        <div style="font-family: Calibri, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1f2937;">
          <div style="background: #3730a3; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: #fff; font-size: 20px;">📊 Reporte de Ventas</h1>
            <p style="margin: 6px 0 0; color: #c7d2fe; font-size: 14px;">${dayLabel}</p>
          </div>
          <div style="background: #f5f3ff; padding: 24px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0e7ff; border-top: none;">
            <p style="margin: 0 0 12px; font-size: 15px;">
              Hola, adjunto encontrás el Excel con el detalle de ventas del día <strong>${dayLabel}</strong>.
            </p>
            <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280;">
              El archivo incluye el detalle por cliente y producto, los cobros registrados y un resumen de ganancias por producto.
            </p>
            <div style="background: #fff; border: 1px solid #e0e7ff; border-radius: 6px; padding: 16px;">
              <p style="margin: 0; font-size: 13px; color: #4f46e5; font-weight: 600;">
                📎 ${filename}
              </p>
            </div>
            <p style="margin: 20px 0 0; font-size: 12px; color: #9ca3af;">
              Este correo fue generado automáticamente por el sistema de gestión.
            </p>
          </div>
        </div>
      `;

      const sent = await this.mailService.sendWithExcel(
        to,
        `Ventas del día ${dayLabel}`,
        {
          html,
          excelBuffer,
          excelFilename: filename,
        },
      );

      if (sent) {
        this.logger.log(`Reporte diario enviado a ${to} (${dayLabel})`);
      }
    } catch (err) {
      this.logger.error(
        `Error generando/enviando reporte diario: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Método público para disparar el reporte manualmente (útil para testing).
   */
  async triggerManually(date?: Date): Promise<{ ok: boolean; message: string }> {
    const target = date ?? new Date(Date.now() - 86400000); // ayer por defecto
    const dateFrom = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
    const dateTo = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);

    try {
      const excelBuffer = await this.salesReportService.generateExcelBuffer(dateFrom, dateTo);
      const to = this.configService.get<string>('REPORT_MAIL_TO') ?? 'davucesaretti@gmail.com';
      const dayLabel = `${dateFrom.getDate().toString().padStart(2, '0')}/${(dateFrom.getMonth() + 1).toString().padStart(2, '0')}/${dateFrom.getFullYear()}`;
      const filename = `ventas_manual_${dateFrom.getFullYear()}-${String(dateFrom.getMonth() + 1).padStart(2, '0')}-${String(dateFrom.getDate()).padStart(2, '0')}.xlsx`;

      await this.mailService.sendWithExcel(to, `[Manual] Ventas del día ${dayLabel}`, {
        html: `<p>Reporte manual de ventas para <strong>${dayLabel}</strong>. Ver archivo adjunto.</p>`,
        excelBuffer,
        excelFilename: filename,
      });
      return { ok: true, message: `Reporte enviado a ${to}` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }
}
