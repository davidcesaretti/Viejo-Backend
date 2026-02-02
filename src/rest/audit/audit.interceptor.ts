import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import type { UserDocument } from '../../repositories/user/user.schema';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: UserDocument }>();
    const response = http.getResponse();
    const start = Date.now();

    const logRequest = () => {
      const durationMs = Date.now() - start;
      const statusCode = response.statusCode;
      const userId = request.user?._id?.toString();
      const userEmail = request.user?.email;
      const body =
        request.body && typeof request.body === 'object'
          ? { ...request.body }
          : undefined;

      this.auditService
        .logRequest({
          method: request.method,
          path: request.originalUrl || request.url,
          query: request.query as Record<string, unknown>,
          body,
          statusCode,
          durationMs,
          userId,
          userEmail,
          ip: request.ip || request.socket?.remoteAddress,
          userAgent: request.headers['user-agent'],
        })
        .catch(() => {
          // No fallar la petición si falla el registro de auditoría
        });
    };

    response.once('finish', logRequest);

    return next.handle();
  }
}
