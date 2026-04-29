import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { Stock, StockDocument } from './stock.schema';

export interface CreateStockData {
  productId: string;
  quantity: number;
  price: number;
  discount?: number;
  variantName?: string;
}

export interface UpdateStockData {
  quantity?: number;
  price?: number;
  discount?: number;
  variantName?: string;
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
      productId: new Types.ObjectId(data.productId),
      quantity: data.quantity,
      price: data.price,
      discount: data.discount ?? 0,
      variantName: data.variantName ?? '',
    });
    return stock.save();
  }

  /**
   * Reduce la cantidad del stock (p. ej. al registrar una venta).
   * Falla si no hay stock suficiente. Atómico.
   */
  async reduceQuantity(
    stockId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<StockDocument> {
    if (amount <= 0) {
      throw new BadRequestException('La cantidad a descontar debe ser mayor a 0');
    }
    const options = session ? { new: true, session } : { new: true };
    const stock = await this.stockModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(stockId),
          quantity: { $gte: amount },
        },
        { $inc: { quantity: -amount } },
        options,
      )
      .populate('productId', 'name')
      .exec();
    if (!stock) {
      const existing = await this.stockModel.findById(stockId).exec();
      if (!existing) {
        throw new NotFoundException('Stock no encontrado');
      }
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${existing.quantity}, solicitado: ${amount}`,
      );
    }
    return stock;
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

  async findAll(
    page = 1,
    limit = 20,
    onlyAvailable = false,
  ): Promise<StockListResult> {
    const skip = (page - 1) * limit;
    const filter = onlyAvailable ? { quantity: { $gt: 0 } } : {};
    const filterCast = filter as Record<string, unknown>;
    const [items, total] = await Promise.all([
      this.stockModel
        .find(filterCast)
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stockModel.countDocuments(filterCast).exec(),
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
    onlyAvailable = false,
  ): Promise<StockListResult> {
    const skip = (page - 1) * limit;
    const filter = {
      productId,
      ...(onlyAvailable ? { quantity: { $gt: 0 } } : {}),
    } as Record<string, unknown>;
    const [items, total] = await Promise.all([
      this.stockModel
        .find(filter)
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stockModel.countDocuments(filter).exec(),
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
