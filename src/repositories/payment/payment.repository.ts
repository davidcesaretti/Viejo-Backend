import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { Payment, PaymentDocument } from './payment.schema';

export interface CreatePaymentData {
  saleId: string;
  clientId: string;
  amount: number;
  paymentDate?: Date;
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
      saleId: new MongooseSchema.Types.ObjectId(data.saleId),
      clientId: new MongooseSchema.Types.ObjectId(data.clientId),
      amount: data.amount,
      paymentDate: data.paymentDate ?? new Date(),
      notes: data.notes ?? '',
    });
    return payment.save();
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
    return this.paymentModel
      .find({ saleId: new MongooseSchema.Types.ObjectId(saleId) })
      .sort({ paymentDate: -1 })
      .exec();
  }

  async findByClientId(
    clientId: string,
    page = 1,
    limit = 20,
  ): Promise<PaymentListResult> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.paymentModel
        .find({ clientId: new MongooseSchema.Types.ObjectId(clientId) })
        .populate('saleId', 'totalAmount amountPaid saleDate')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel
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
}
