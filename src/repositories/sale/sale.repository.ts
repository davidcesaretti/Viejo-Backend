import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { Sale, SaleDocument } from './sale.schema';

export interface SaleItemData {
  productId: string;
  stockId: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  subtotal: number;
}

export interface CreateSaleData {
  clientId: string;
  saleDate?: Date;
  items: SaleItemData[];
  totalAmount: number;
  notes?: string;
}

export interface SaleListResult {
  items: SaleDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SaleRepository {
  constructor(
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
  ) {}

  async create(data: CreateSaleData, session?: ClientSession): Promise<SaleDocument> {
    const sale = new this.saleModel({
      clientId: new Types.ObjectId(data.clientId),
      saleDate: data.saleDate ?? new Date(),
      items: data.items.map((item) => ({
        productId: new Types.ObjectId(item.productId),
        stockId: new Types.ObjectId(item.stockId),
        productName: item.productName,
        variantName: item.variantName ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent ?? 0,
        subtotal: item.subtotal,
      })),
      totalAmount: data.totalAmount,
      amountPaid: 0,
      notes: data.notes ?? '',
    });
    return sale.save({ session });
  }

  async findById(id: string): Promise<SaleDocument> {
    const sale = await this.saleModel
      .findById(id)
      .populate('clientId', 'name email')
      .exec();
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }
    return sale;
  }

  async findAllForExport(
    clientId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<SaleDocument[]> {
    const filter: Record<string, unknown> = {};
    if (clientId) filter.clientId = clientId;
    if (dateFrom || dateTo) {
      const df: Record<string, Date> = {};
      if (dateFrom) df.$gte = dateFrom;
      if (dateTo) df.$lte = dateTo;
      filter.saleDate = df;
    }
    return this.saleModel
      .find(filter)
      .populate('clientId', 'name email')
      .sort({ saleDate: -1 })
      .limit(10000)
      .exec();
  }

  async findAll(
    page = 1,
    limit = 30,
    clientId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<SaleListResult> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (clientId) filter.clientId = clientId;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) dateFilter.$lte = dateTo;
      filter.saleDate = dateFilter;
    }
    const [items, total] = await Promise.all([
      this.saleModel
        .find(filter)
        .populate('clientId', 'name email')
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.saleModel.countDocuments(filter).exec(),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findByClientId(
    clientId: string,
    page = 1,
    limit = 20,
  ): Promise<SaleListResult> {
    const skip = (page - 1) * limit;
    const filter = { clientId } as Record<string, unknown>;
    const [items, total] = await Promise.all([
      this.saleModel
        .find(filter)
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.saleModel.countDocuments(filter).exec(),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async addPayment(saleId: string, amount: number): Promise<SaleDocument> {
    const sale = await this.saleModel
      .findByIdAndUpdate(
        saleId,
        { $inc: { amountPaid: amount } },
        { new: true },
      )
      .exec();
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }
    return sale;
  }

  async updateNotes(saleId: string, notes: string): Promise<SaleDocument> {
    const sale = await this.saleModel
      .findByIdAndUpdate(saleId, { $set: { notes } }, { new: true })
      .exec();
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }
    return sale;
  }
}
