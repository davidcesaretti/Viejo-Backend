import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from './payment.schema';

export interface CreatePaymentItemData {
  productId: string;
  stockId: string;
  productName: string;
  amount: number;
}

export interface CreatePaymentData {
  saleId: string;
  clientId: string;
  amount: number;
  paymentDate?: Date;
  paymentMethod?: string;
  items?: CreatePaymentItemData[];
  notes?: string;
}

export interface PaymentListResult {
  items: PaymentDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async create(data: CreatePaymentData): Promise<PaymentDocument> {
    const payment = new this.paymentModel({
      saleId: new Types.ObjectId(data.saleId),
      clientId: new Types.ObjectId(data.clientId),
      amount: data.amount,
      paymentDate: data.paymentDate ?? new Date(),
      paymentMethod: data.paymentMethod ?? 'cash',
      items: (data.items ?? []).map((item) => ({
        productId: new Types.ObjectId(item.productId),
        stockId: new Types.ObjectId(item.stockId),
        productName: item.productName,
        amount: item.amount,
      })),
      notes: data.notes ?? '',
    });
    return payment.save();
  }

  async delete(id: string): Promise<void> {
    const payment = await this.paymentModel.findByIdAndDelete(id).exec();
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
  }

  async findById(id: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel
      .findById(id)
      .populate('saleId', 'totalAmount amountPaid saleDate')
      .populate('clientId', 'name email')
      .exec();
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  async findBySaleId(saleId: string): Promise<PaymentDocument[]> {
    const filter = { saleId } as Record<string, unknown>;
    return this.paymentModel.find(filter).sort({ paymentDate: -1 }).exec();
  }

  async findByClientId(
    clientId: string,
    page = 1,
    limit = 20,
  ): Promise<PaymentListResult> {
    const skip = (page - 1) * limit;
    const filter = { clientId } as Record<string, unknown>;
    const [items, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .populate('saleId', 'totalAmount amountPaid saleDate')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
