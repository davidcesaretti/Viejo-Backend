import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CashboxEntry, CashboxEntryDocument } from './cashbox.schema';

export interface CreateCashboxEntryData {
  type: 'income' | 'expense';
  category: string;
  description?: string;
  amount: number;
  entryDate?: Date;
  createdBy: string;
  paymentId?: string;
}

export interface CashboxListResult {
  items: CashboxEntryDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CashboxRepository {
  constructor(
    @InjectModel(CashboxEntry.name)
    private readonly cashboxModel: Model<CashboxEntryDocument>,
  ) {}

  async create(data: CreateCashboxEntryData): Promise<CashboxEntryDocument> {
    const entry = new this.cashboxModel({
      type: data.type,
      category: data.category,
      description: data.description ?? '',
      amount: data.amount,
      entryDate: data.entryDate ?? new Date(),
      createdBy: new Types.ObjectId(data.createdBy),
      ...(data.paymentId ? { paymentId: new Types.ObjectId(data.paymentId) } : {}),
    });
    return entry.save();
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.cashboxModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Movimiento de caja no encontrado');
  }

  async deleteByPaymentId(paymentId: string): Promise<void> {
    await this.cashboxModel
      .findOneAndDelete({
        paymentId: new Types.ObjectId(paymentId),
      } as Record<string, unknown>)
      .exec();
  }

  async findAll(
    page = 1,
    limit = 30,
    filters?: {
      type?: 'income' | 'expense';
      category?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<CashboxListResult> {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};
    if (filters?.type) query.type = filters.type;
    if (filters?.category) query.category = filters.category;
    if (filters?.dateFrom || filters?.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filters.dateFrom) dateFilter.$gte = filters.dateFrom;
      if (filters.dateTo) dateFilter.$lte = filters.dateTo;
      query.entryDate = dateFilter;
    }

    const [items, total] = await Promise.all([
      this.cashboxModel
        .find(query)
        .populate('createdBy', 'name email')
        .sort({ entryDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.cashboxModel.countDocuments(query).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSummary(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    income: number;
    expense: number;
    balance: number;
  }> {
    const match: Record<string, unknown> = {};
    if (filters?.dateFrom || filters?.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filters.dateFrom) dateFilter.$gte = filters.dateFrom;
      if (filters.dateTo) dateFilter.$lte = filters.dateTo;
      match.entryDate = dateFilter;
    }

    const rows = await this.cashboxModel.aggregate<
      { _id: 'income' | 'expense'; total: number }
    >([
      { $match: match },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    const income = rows.find((r) => r._id === 'income')?.total ?? 0;
    const expense = rows.find((r) => r._id === 'expense')?.total ?? 0;
    return {
      income,
      expense,
      balance: income - expense,
    };
  }
}
