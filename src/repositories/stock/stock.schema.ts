import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Product } from '../product/product.schema';

export type StockDocument = Stock & Document;

@Schema({ timestamps: true, collection: 'stock' })
export class Stock {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Product.name,
    required: true,
    index: true,
  })
  productId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: 0, min: 0, max: 100 })
  discount?: number;

  /** Variante asignada a este lote (ej. "Chica", "1L"). Vacío si el producto no tiene variantes. */
  @Prop({ default: '' })
  variantName: string;
}

export const StockSchema = SchemaFactory.createForClass(Stock);

StockSchema.index({ productId: 1, createdAt: -1 });
