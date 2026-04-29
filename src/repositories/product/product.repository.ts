import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';

export interface CreateProductData {
  name: string;
  variants?: string[];
}

export interface UpdateProductData {
  name?: string;
  variants?: string[];
}

export interface ProductListResult {
  items: ProductDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(data: CreateProductData): Promise<ProductDocument> {
    const existing = await this.productModel
      .findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } })
      .exec();
    if (existing) {
      throw new ConflictException('Ya existe un producto con ese nombre');
    }
    const product = new this.productModel({
      name: data.name,
      variants: data.variants ?? [],
    });
    return product.save();
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  async findAll(page = 1, limit = 20): Promise<ProductListResult> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.productModel.find().sort({ name: 1 }).skip(skip).limit(limit).exec(),
      this.productModel.countDocuments().exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async update(id: string, data: UpdateProductData): Promise<ProductDocument> {
    if (data.name) {
      const existing = await this.productModel
        .findOne({
          _id: { $ne: id },
          name: { $regex: new RegExp(`^${data.name}$`, 'i') },
        })
        .exec();
      if (existing) {
        throw new ConflictException('Ya existe un producto con ese nombre');
      }
    }
    const product = await this.productModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  async delete(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Producto no encontrado');
    }
  }
}
