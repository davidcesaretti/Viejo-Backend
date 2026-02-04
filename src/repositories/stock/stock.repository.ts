import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { Stock, StockDocument } from './stock.schema';

export interface CreateStockData {
  productId: string;
  quantity: number;
  price: number;
  discount?: number;
}

export interface UpdateStockData {
  quantity?: number;
  price?: number;
  discount?: number;
}

export interface StockListResult {
  items: StockDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class StockRepository {
  constructor(
    @InjectModel(Stock.name)
    private readonly stockModel: Model<StockDocument>,
  ) {}

  async create(data: CreateStockData): Promise<StockDocument> {
    const stock = new this.stockModel({
      productId: new MongooseSchema.Types.ObjectId(data.productId),
      quantity: data.quantity,
      price: data.price,
      discount: data.discount ?? 0,
    });
    return stock.save();
  }

  async findById(id: string): Promise<StockDocument> {
    const stock = await this.stockModel
      .findById(id)
      .populate('productId', 'name')
      .exec();
    if (!stock) {
      throw new NotFoundException('Stock no encontrado');
    }
    return stock;
  }

  async findAll(page = 1, limit = 20): Promise<StockListResult> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.stockModel
        .find()
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stockModel.countDocuments().exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findByProductId(
    productId: string,
    page = 1,
    limit = 20,
  ): Promise<StockListResult> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.stockModel
        .find({ productId: new MongooseSchema.Types.ObjectId(productId) })
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stockModel
        .countDocuments({
          productId: new MongooseSchema.Types.ObjectId(productId),
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

  async update(id: string, data: UpdateStockData): Promise<StockDocument> {
    const stock = await this.stockModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('productId', 'name')
      .exec();
    if (!stock) {
      throw new NotFoundException('Stock no encontrado');
    }
    return stock;
  }

  async delete(id: string): Promise<void> {
    const result = await this.stockModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Stock no encontrado');
    }
  }
}
