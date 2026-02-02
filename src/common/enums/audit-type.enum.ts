/**
 * Tipos de registro de auditoría.
 * Extender según surjan nuevos casos (ej: export, reporte, etc.).
 */
export enum AuditType {
  Request = 'request',
  EntityChange = 'entity_change',
  Auth = 'auth',
}
