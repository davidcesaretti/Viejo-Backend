import { Injectable } from '@nestjs/common';
import { SaleRepository } from '../../repositories/sale/sale.repository';
import type { SaleDocument } from '../../repositories/sale/sale.schema';
import type { SaleListResult } from '../../repositories/sale/sale.repository';

export interface SaleItemResponse {
  productId: string;
  stockId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  subtotal: number;
}

export interface SaleResponse {
  id: string;
  clientId: string;
  client?: { id: string; name: string; email: string };
  saleDate: string;
  items: SaleItemResponse[];
  totalAmount: number;
  amountPaid: number;
  balance: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SalesService {
  constructor(private readonly saleRepository: SaleRepository) {}

  async create(dto: {
    clientId: string;
    saleDate?: string;
    items: Array<{
      productId: string;
      stockId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      subtotal: number;
    }>;
    totalAmount: number;
    notes?: string;
  }): Promise<SaleResponse> {
    const saleDate = dto.saleDate ? new Date(dto.saleDate) : undefined;
    const sale = await this.saleRepository.create({
      clientId: dto.clientId,
      saleDate,
      items: dto.items.map((item) => ({
        productId: item.productId,
        stockId: item.stockId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent ?? 0,
        subtotal: item.subtotal,
      })),
      totalAmount: dto.totalAmount,
      notes: dto.notes,
    });
    return this.toResponse(sale);
  }

  async findOne(id: string): Promise<SaleResponse> {
    const sale = await this.saleRepository.findById(id);
    return this.toResponse(sale);
  }

  async findByClientId(
    clientId: string,
    page: number,
    limit: number,
  ): Promise<Omit<SaleListResult, 'items'> & { items: SaleResponse[] }> {
    const result = await this.saleRepository.findByClientId(
      clientId,
      page,
      limit,
    );
    return {
      ...result,
      items: result.items.map((s) => this.toResponse(s)),
    };
  }

  private toResponse(sale: SaleDocument): SaleResponse {
    const createdAt = (sale as { createdAt?: Date }).createdAt;
    const updatedAt = (sale as { updatedAt?: Date }).updatedAt;
    const clientPopulated = sale.clientId as unknown as
      | { _id: unknown; name: string; email: string }
      | string;
    let clientId: string;
    let client: { id: string; name: string; email: string } | undefined;
    if (
      typeof clientPopulated === 'object' &&
      clientPopulated !== null &&
      'name' in clientPopulated
    ) {
      clientId = String(clientPopulated._id);
      client = {
        id: clientId,
        name: clientPopulated.name,
        email: clientPopulated.email,
      };
    } else {
      clientId = String(sale.clientId);
    }
    const items: SaleItemResponse[] = (sale.items ?? []).map((item) => ({
      productId: String(item.productId),
      stockId: String(item.stockId),
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent ?? 0,
      subtotal: item.subtotal,
    }));
    return {
      id: sale._id.toString(),
      clientId,
      client,
      saleDate:
        sale.saleDate instanceof Date
          ? sale.saleDate.toISOString()
          : new Date().toISOString(),
      items,
      totalAmount: sale.totalAmount,
      amountPaid: sale.amountPaid,
      balance: sale.totalAmount - sale.amountPaid,
      notes: sale.notes ?? '',
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
