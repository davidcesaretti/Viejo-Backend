import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  /** Variantes del producto (ej. "Chica", "Grande", "1L", "500ml"). */
  @Prop({ type: [String], default: [] })
  variants: string[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
