import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 1 });
