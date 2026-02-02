import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AuditType } from '../../common/enums/audit-type.enum';
import { EntityAction } from '../../common/enums/entity-action.enum';

export type AuditLogDocument = AuditLog & Document;

@Schema({ _id: true, timestamps: false })
export class RequestInfo {
  @Prop({ required: true })
  method: string;

  @Prop({ required: true })
  path: string;

  @Prop({ type: Object })
  query?: Record<string, unknown>;

  @Prop({ type: Object })
  body?: Record<string, unknown>;

  @Prop()
  statusCode?: number;

  @Prop()
  durationMs?: number;
}

@Schema({ _id: false })
export class EntityChangeInfo {
  @Prop({ required: true })
  entityType: string;

  @Prop({ required: true })
  entityId: string;

  @Prop({ required: true, enum: EntityAction })
  action: EntityAction;

  @Prop({ type: Object })
  before?: Record<string, unknown>;

  @Prop({ type: Object })
  after?: Record<string, unknown>;

  @Prop({ type: [String] })
  changes?: string[];
}

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ required: true, enum: AuditType })
  type: AuditType;

  @Prop({ required: true, default: () => new Date() })
  timestamp: Date;

  @Prop()
  userId?: string;

  @Prop()
  userEmail?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: RequestInfo })
  request?: RequestInfo;

  @Prop({ type: EntityChangeInfo })
  entityChange?: EntityChangeInfo;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ type: 1, timestamp: -1 });
AuditLogSchema.index({
  'entityChange.entityType': 1,
  'entityChange.entityId': 1,
});
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });
