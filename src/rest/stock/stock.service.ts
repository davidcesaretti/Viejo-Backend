import { Injectable } from '@nestjs/common';
import { StockRepository } from '../../repositories/stock/stock.repository';
import type { StockDocument } from '../../repositories/stock/stock.schema';
import type { StockListResult } from '../../repositories/stock/stock.repository';

export interface StockResponse {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
  };
  quantity: number;
  price: number;
  discount: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class StockService {
  constructor(private readonly stockRepository: StockRepository) {}

  async create(dto: {
    productId: string;
    quantity: number;
    price: number;
    discount?: number;
  }): Promise<StockResponse> {
    const stock = await this.stockRepository.create(dto);
    return this.toResponse(stock);
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<Omit<StockListResult, 'items'> & { items: StockResponse[] }> {
    const result = await this.stockRepository.findAll(page, limit);
    return {
      ...result,
      items: result.items.map((item) => this.toResponse(item)),
    };
  }

  async findByProductId(
    productId: string,
    page: number,
    limit: number,
  ): Promise<Omit<StockListResult, 'items'> & { items: StockResponse[] }> {
    const result = await this.stockRepository.findByProductId(
      productId,
      page,
      limit,
    );
    return {
      ...result,
      items: result.items.map((item) => this.toResponse(item)),
    };
  }

  async findOne(id: string): Promise<StockResponse> {
    const stock = await this.stockRepository.findById(id);
    return this.toResponse(stock);
  }

  async update(
    id: string,
    dto: { quantity?: number; price?: number; discount?: number },
  ): Promise<StockResponse> {
    const stock = await this.stockRepository.update(id, dto);
    return this.toResponse(stock);
  }

  async remove(id: string): Promise<void> {
    await this.stockRepository.delete(id);
  }

  private toResponse(stock: StockDocument): StockResponse {
    const createdAt = (stock as { createdAt?: Date }).createdAt;
    const updatedAt = (stock as { updatedAt?: Date }).updatedAt;
    const populatedProduct = stock.productId as unknown as
      | { _id: unknown; name: string }
      | string;

    let productId: string;
    let product: { id: string; name: string } | undefined;

    if (
      typeof populatedProduct === 'object' &&
      populatedProduct !== null &&
      'name' in populatedProduct
    ) {
      productId = String(populatedProduct._id);
      product = {
        id: productId,
        name: populatedProduct.name,
      };
    } else {
      productId = String(stock.productId);
    }

    return {
      id: stock._id.toString(),
      productId,
      product,
      quantity: stock.quantity,
      price: stock.price,
      discount: stock.discount ?? 0,
      createdAt:
        createdAt instanceof Date
          ? createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        updatedAt instanceof Date
          ? updatedAt.toISOString()
          : new Date().toISOString(),
    };
  }
}
