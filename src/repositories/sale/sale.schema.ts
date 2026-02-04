import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Client } from '../client/client.schema';

export type SaleDocument = Sale & Document;

@Schema({ _id: false })
export class SaleItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Stock', required: true })
  stockId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ default: 0, min: 0, max: 100 })
  discountPercent: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;
}

export const SaleItemSchema = SchemaFactory.createForClass(SaleItem);

@Schema({ timestamps: true, collection: 'sales' })
export class Sale {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Client.name,
    required: true,
    index: true,
  })
  clientId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: () => new Date() })
  saleDate: Date;

  @Prop({ type: [SaleItemSchema], required: true, default: [] })
  items: SaleItem[];

  @Prop({ required: true, min: 0, default: 0 })
  totalAmount: number;

  @Prop({ required: true, min: 0, default: 0 })
  amountPaid: number;

  @Prop({ default: '' })
  notes: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);

SaleSchema.index({ clientId: 1, saleDate: -1 });
SaleSchema.index({ clientId: 1 });
