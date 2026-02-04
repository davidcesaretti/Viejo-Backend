import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({ timestamps: true, collection: 'clients' })
export class Client {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  email: string;

  @Prop({ default: '', trim: true })
  phone: string;

  @Prop({ default: '', trim: true })
  address: string;

  @Prop({ default: '' })
  notes: string;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

ClientSchema.index({ email: 1 });
ClientSchema.index({ name: 1 });
