import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Sale } from '../sale/sale.schema';
import { Client } from '../client/client.schema';

export type PaymentDocument = Payment & Document;

@Schema({ _id: false })
export class PaymentItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Stock', required: true })
  stockId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, min: 0 })
  amount: number;
}

export const PaymentItemSchema = SchemaFactory.createForClass(PaymentItem);

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Sale.name,
    required: true,
    index: true,
  })
  saleId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Client.name,
    required: true,
    index: true,
  })
  clientId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, default: () => new Date() })
  paymentDate: Date;

  @Prop({ default: 'cash' })
  paymentMethod: string;

  /** Desglose por producto del pago */
  @Prop({ type: [PaymentItemSchema], default: [] })
  items: PaymentItem[];

  @Prop({ default: '' })
  notes: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ clientId: 1, paymentDate: -1 });
