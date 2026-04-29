import { Injectable } from '@nestjs/common';
import { CashboxRepository } from '../../repositories/cashbox/cashbox.repository';
import type { CashboxEntryDocument } from '../../repositories/cashbox/cashbox.schema';

export interface CashboxEntryResponse {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  entryDate: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

@Injectable()
export class CashboxService {
  constructor(private readonly cashboxRepository: CashboxRepository) {}

  async create(data: {
    type: 'income' | 'expense';
    category: string;
    description?: string;
    amount: number;
    entryDate?: string;
    createdBy: string;
  }): Promise<CashboxEntryResponse> {
    const created = await this.cashboxRepository.create({
      type: data.type,
      category: data.category,
      description: data.description,
      amount: data.amount,
      entryDate: data.entryDate ? new Date(data.entryDate) : undefined,
      createdBy: data.createdBy,
    });
    return this.toResponse(created);
  }

  async delete(id: string): Promise<void> {
    await this.cashboxRepository.delete(id);
  }

  async findAll(
    page: number,
    limit: number,
    filters?: {
      type?: 'income' | 'expense';
      category?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const result = await this.cashboxRepository.findAll(page, limit, {
      type: filters?.type,
      category: filters?.category,
      dateFrom: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters?.dateTo ? new Date(filters.dateTo) : undefined,
    });
    return {
      ...result,
      items: result.items.map((i) => this.toResponse(i)),
    };
  }

  async getSummary(filters?: { dateFrom?: string; dateTo?: string }) {
    return this.cashboxRepository.getSummary({
      dateFrom: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters?.dateTo ? new Date(filters.dateTo) : undefined,
    });
  }

  private toResponse(entry: CashboxEntryDocument): CashboxEntryResponse {
    const createdAt = (entry as unknown as { createdAt?: Date }).createdAt;
    const createdBy =
      typeof entry.createdBy === 'object' && entry.createdBy !== null
        ? (entry.createdBy as unknown as {
            _id?: { toString(): string };
            name?: string;
            email?: string;
          })
        : null;

    return {
      id: entry._id.toString(),
      type: entry.type,
      category: entry.category,
      description: entry.description ?? '',
      amount: entry.amount,
      entryDate: entry.entryDate.toISOString(),
      createdBy:
        createdBy && createdBy._id
          ? {
              id: createdBy._id.toString(),
              name: createdBy.name ?? '—',
              email: createdBy.email ?? '',
            }
          : null,
      createdAt:
        createdAt instanceof Date ? createdAt.toISOString() : new Date().toISOString(),
    };
  }
}
