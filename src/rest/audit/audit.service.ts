import { Injectable } from '@nestjs/common';
import { AuditRepository } from '../../repositories/audit/audit.repository';
import type { CreateAuditLogData } from '../../repositories/audit/audit.repository';
import type {
  AuditLogFilter,
  AuditLogListResult,
} from '../../repositories/audit/audit.repository';
import { AuditType } from '../../common/enums/audit-type.enum';
import { EntityAction } from '../../common/enums/entity-action.enum';

/** Campos que no deben guardarse en el body de auditoría (seguridad) */
const SENSITIVE_KEYS = [
  'password',
  'passwordConfirm',
  'token',
  'access_token',
  'refresh_token',
  'secret',
];

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  /**
   * Registra una petición HTTP. Usado por el interceptor global.
   */
  async logRequest(params: {
    method: string;
    path: string;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    statusCode?: number;
    durationMs?: number;
    userId?: string;
    userEmail?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    const data: CreateAuditLogData = {
      type: AuditType.Request,
      userId: params.userId,
      userEmail: params.userEmail,
      ip: params.ip,
      userAgent: params.userAgent,
      request: {
        method: params.method,
        path: params.path,
        query: params.query ? this.sanitize(params.query) : undefined,
        body: params.body ? this.sanitize(params.body) : undefined,
        statusCode: params.statusCode,
        durationMs: params.durationMs,
      },
    };
    await this.auditRepository.create(data);
  }

  /**
   * Registra un cambio en una entidad (crear, actualizar, eliminar).
   * Llamar desde el service correspondiente después de la operación.
   *
   * Ejemplo en un SaleService al editar una venta:
   *   await this.auditService.logEntityChange({
   *     entityType: 'Sale',
   *     entityId: sale.id,
   *     action: EntityAction.Update,
   *     before: oldSale,
   *     after: updatedSale,
   *     userId, userEmail,
   *   });
   */
  async logEntityChange(params: {
    entityType: string;
    entityId: string;
    action: EntityAction;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    changes?: string[];
    userId?: string;
    userEmail?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const data: CreateAuditLogData = {
      type: AuditType.EntityChange,
      userId: params.userId,
      userEmail: params.userEmail,
      ip: params.ip,
      userAgent: params.userAgent,
      entityChange: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        before: params.before ? this.sanitize(params.before) : undefined,
        after: params.after ? this.sanitize(params.after) : undefined,
        changes: params.changes,
      },
      metadata: params.metadata,
    };
    await this.auditRepository.create(data);
  }

  /**
   * Registra eventos de autenticación (login, logout, etc.).
   */
  async logAuth(params: {
    action: string;
    userId?: string;
    userEmail?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const data: CreateAuditLogData = {
      type: AuditType.Auth,
      userId: params.userId,
      userEmail: params.userEmail,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: { action: params.action, ...params.metadata },
    };
    await this.auditRepository.create(data);
  }

  /**
   * Lista registros de auditoría con filtros y paginación.
   */
  async list(
    filter: AuditLogFilter,
    page: number,
    limit: number,
  ): Promise<AuditLogListResult> {
    return this.auditRepository.findAll(filter, page, limit);
  }

  /**
   * Obtiene un registro por ID.
   */
  async getById(id: string) {
    return this.auditRepository.findById(id);
  }

  /**
   * Elimina datos sensibles de un objeto antes de guardarlo en auditoría.
   */
  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
        result[key] = '[REDACTED]';
      } else if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        result[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
