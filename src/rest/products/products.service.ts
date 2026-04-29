import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../repositories/product/product.repository';
import type { ProductDocument } from '../../repositories/product/product.schema';
import type { ProductListResult } from '../../repositories/product/product.repository';

export interface ProductResponse {
  id: string;
  name: string;
  variants: string[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly productRepository: ProductRepository) {}

  async create(dto: { name: string; variants?: string[] }): Promise<ProductResponse> {
    const product = await this.productRepository.create(dto);
    return this.toResponse(product);
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<Omit<ProductListResult, 'items'> & { items: ProductResponse[] }> {
    const result = await this.productRepository.findAll(page, limit);
    return {
      ...result,
      items: result.items.map((item) => this.toResponse(item)),
    };
  }

  async findOne(id: string): Promise<ProductResponse> {
    const product = await this.productRepository.findById(id);
    return this.toResponse(product);
  }

  async update(id: string, dto: { name?: string; variants?: string[] }): Promise<ProductResponse> {
    const product = await this.productRepository.update(id, dto);
    return this.toResponse(product);
  }

  async remove(id: string): Promise<void> {
    await this.productRepository.delete(id);
  }

  private toResponse(product: ProductDocument): ProductResponse {
    const createdAt = (product as { createdAt?: Date }).createdAt;
    const updatedAt = (product as { updatedAt?: Date }).updatedAt;
    return {
      id: product._id.toString(),
      name: product.name,
      variants: product.variants ?? [],
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
