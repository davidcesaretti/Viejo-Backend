import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { Sale, SaleDocument, SaleItem } from './sale.schema';

export interface SaleItemData {
  productId: string;
  stockId: string;
  productName: string;
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

  async create(data: CreateSaleData): Promise<SaleDocument> {
    const sale = new this.saleModel({
      clientId: new MongooseSchema.Types.ObjectId(data.clientId),
      saleDate: data.saleDate ?? new Date(),
      items: data.items.map((item) => ({
        productId: new MongooseSchema.Types.ObjectId(item.productId),
        stockId: new MongooseSchema.Types.ObjectId(item.stockId),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent ?? 0,
        subtotal: item.subtotal,
      })),
      totalAmount: data.totalAmount,
      amountPaid: 0,
      notes: data.notes ?? '',
    });
    return sale.save();
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

  async findByClientId(
    clientId: string,
    page = 1,
    limit = 20,
  ): Promise<SaleListResult> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.saleModel
        .find({ clientId: new MongooseSchema.Types.ObjectId(clientId) })
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.saleModel
        .countDocuments({
          clientId: new MongooseSchema.Types.ObjectId(clientId),
        })
        .exec(),
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
