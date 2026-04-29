import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../user/user.schema';
import { Payment } from '../payment/payment.schema';

export type CashboxEntryDocument = CashboxEntry & Document;

@Schema({ timestamps: true, collection: 'cashbox_entries' })
export class CashboxEntry {
  @Prop({ required: true, enum: ['income', 'expense'] })
  type: 'income' | 'expense';

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true, default: () => new Date() })
  entryDate: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Payment.name,
    required: false,
    sparse: true,
    index: true,
  })
  paymentId?: MongooseSchema.Types.ObjectId;
}

export const CashboxEntrySchema = SchemaFactory.createForClass(CashboxEntry);

CashboxEntrySchema.index({ entryDate: -1 });
CashboxEntrySchema.index({ type: 1, entryDate: -1 });
CashboxEntrySchema.index({ category: 1, entryDate: -1 });
