import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';
import Handlebars from 'handlebars';
import type { Transporter } from 'nodemailer';
import type { TemplateData } from './mailer.types';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private defaultFrom: string;
  private readonly templatesDir: string;

  constructor(private configService: ConfigService) {
    this.defaultFrom =
      this.configService.get<string>('MAIL_FROM') ??
      '"App" <noreply@localhost>';
    this.templatesDir = path.join(__dirname, 'templates');
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT') ?? 587;
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (!host || !user || !pass) {
      this.logger.warn(
        'Mail no configurado (MAIL_HOST, MAIL_USER, MAIL_PASS). Los correos no se enviarán.',
      );
      this.transporter = null;
      return;
    }

    const secure = this.configService.get<string>('MAIL_SECURE') === 'true';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  /**
   * Renderiza una plantilla HBS con los datos dados.
   */
  renderTemplate(templateName: string, data: TemplateData): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Plantilla no encontrada: ${templateName}.hbs`);
    }
    const templateStr = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateStr);
    const dataWithDefaults: TemplateData = {
      ...data,
      year: data.year ?? new Date().getFullYear().toString(),
      logo_url: data.logo_url ?? this.configService.get<string>('LOGO_URL', ''),
    };
    return template(dataWithDefaults);
  }

  /**
   * Envía un correo usando una plantilla HBS.
   * Ideal para bienvenida, reportes, etc.
   */
  async sendWithTemplate(
    to: string | string[],
    subject: string,
    templateName: string,
    templateData: TemplateData,
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>,
  ): Promise<boolean> {
    const html = this.renderTemplate(templateName, templateData);
    return this.sendMail({
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType:
          a.contentType ??
          (a.filename.endsWith('.xlsx')
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : undefined),
      })),
    });
  }

  /**
   * Envía un correo con archivo Excel adjunto (p. ej. reporte diario).
   * Para envíos diarios programados: llamar desde un cron/scheduler (ej. @nestjs/schedule)
   * o desde un endpoint que un cron externo invoque; generar el buffer Excel y pasar a excelBuffer/excelFilename.
   */
  async sendWithExcel(
    to: string | string[],
    subject: string,
    options: {
      html?: string;
      templateName?: string;
      templateData?: TemplateData;
      text?: string;
      excelBuffer: Buffer;
      excelFilename: string;
    },
  ): Promise<boolean> {
    let html = options.html;
    if (options.templateName && options.templateData) {
      html = this.renderTemplate(options.templateName, options.templateData);
    }
    return this.sendMail({
      to,
      subject,
      text: options.text,
      html,
      attachments: [
        {
          filename: options.excelFilename,
          content: options.excelBuffer,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });
  }

  /**
   * Envía un correo electrónico.
   * Si el mail no está configurado, resuelve sin error (no rompe la app).
   */
  async sendMail(options: SendMailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.debug(
        `Mail omitido (no configurado): ${options.subject} -> ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
      );
      return false;
    }

    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const mailOptions = {
      from: options.from ?? this.defaultFrom,
      to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Correo enviado: ${options.subject} -> ${to}`);
      return !!result.messageId;
    } catch (err) {
      this.logger.error(
        `Error enviando correo a ${to}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  /**
   * Comprueba si el servicio de correo está configurado y operativo.
   */
  isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Verifica la conexión con el servidor SMTP (útil para health checks).
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
