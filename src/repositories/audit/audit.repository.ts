import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit.schema';
import { AuditType } from '../../common/enums/audit-type.enum';

export interface CreateAuditLogData {
  type: AuditType;
  timestamp?: Date;
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  request?: {
    method: string;
    path: string;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    statusCode?: number;
    durationMs?: number;
  };
  entityChange?: {
    entityType: string;
    entityId: string;
    action: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    changes?: string[];
  };
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  type?: AuditType;
  userId?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
}

export interface AuditLogListResult {
  items: AuditLogDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditRepository {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  async create(data: CreateAuditLogData): Promise<AuditLogDocument> {
    const entry = new this.auditModel({
      ...data,
      timestamp: data.timestamp ?? new Date(),
    });
    return entry.save();
  }

  async findAll(
    filter: AuditLogFilter = {},
    page = 1,
    limit = 50,
  ): Promise<AuditLogListResult> {
    const query: Record<string, unknown> = {};

    if (filter.type) query.type = filter.type;
    if (filter.userId) query.userId = filter.userId;
    if (filter.entityType) query['entityChange.entityType'] = filter.entityType;
    if (filter.entityId) query['entityChange.entityId'] = filter.entityId;
    if (filter.from || filter.to) {
      query.timestamp = {};
      if (filter.from)
        (query.timestamp as Record<string, Date>).$gte = filter.from;
      if (filter.to) (query.timestamp as Record<string, Date>).$lte = filter.to;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.auditModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean<AuditLogDocument[]>()
        .exec(),
      this.auditModel.countDocuments(query).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string): Promise<AuditLogDocument | null> {
    return this.auditModel.findById(id).lean().exec();
  }
}
