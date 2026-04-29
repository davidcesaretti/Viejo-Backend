import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SaleRepository } from '../../repositories/sale/sale.repository';
import { StockRepository } from '../../repositories/stock/stock.repository';
import { PaymentRepository } from '../../repositories/payment/payment.repository';
import { CashboxRepository } from '../../repositories/cashbox/cashbox.repository';
import type { SaleDocument } from '../../repositories/sale/sale.schema';
import type { SaleListResult } from '../../repositories/sale/sale.repository';

export interface SaleItemResponse {
  productId: string;
  stockId: string;
  productName: string;
  variantName: string;
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
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly stockRepository: StockRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly cashboxRepository: CashboxRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(dto: {
    clientId: string;
    saleDate?: string;
    items: Array<{
      productId: string;
      stockId: string;
      productName: string;
      variantName?: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      subtotal: number;
    }>;
    totalAmount: number;
    notes?: string;
    createdBy: string;
    initialPayment?: {
      amount: number;
      paymentMethod?: string;
      items?: Array<{ productId: string; stockId: string; productName: string; amount: number }>;
      notes?: string;
    };
  }): Promise<SaleResponse> {
    const saleDate = dto.saleDate ? new Date(dto.saleDate) : undefined;
    const session = await this.connection.startSession();
    session.startTransaction();
    let sale: SaleDocument;
    try {
      for (const item of dto.items) {
        await this.stockRepository.reduceQuantity(
          item.stockId,
          item.quantity,
          session,
        );
      }
      sale = await this.saleRepository.create(
        {
          clientId: dto.clientId,
          saleDate,
          items: dto.items.map((item) => ({
            productId: item.productId,
            stockId: item.stockId,
            productName: item.productName,
            variantName: item.variantName ?? '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent ?? 0,
            subtotal: item.subtotal,
          })),
          totalAmount: dto.totalAmount,
          notes: dto.notes,
        },
        session,
      );
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // Register initial payment outside the sale transaction (the sale is already committed)
    if (dto.initialPayment && dto.initialPayment.amount > 0) {
      await this.paymentRepository.create({
        saleId: sale._id.toString(),
        clientId: dto.clientId,
        amount: dto.initialPayment.amount,
        paymentMethod: dto.initialPayment.paymentMethod ?? 'cash',
        items: dto.initialPayment.items,
        notes: dto.initialPayment.notes,
      });
      await this.saleRepository.addPayment(
        sale._id.toString(),
        dto.initialPayment.amount,
      );
      await this.cashboxRepository.create({
        type: 'income',
        category: 'cobro',
        amount: dto.initialPayment.amount,
        description: `Cobro inicial de venta ${sale._id.toString()}`,
        createdBy: dto.createdBy,
      });
      // Reload the sale with updated amountPaid
      sale = await this.saleRepository.findById(sale._id.toString());
    }

    return this.toResponse(sale);
  }

  async findOne(id: string): Promise<SaleResponse> {
    const sale = await this.saleRepository.findById(id);
    return this.toResponse(sale);
  }

  async exportAll(
    clientId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{ items: SaleResponse[] }> {
    const docs = await this.saleRepository.findAllForExport(clientId, dateFrom, dateTo);
    return { items: docs.map((s) => this.toResponse(s)) };
  }

  async findAll(
    page: number,
    limit: number,
    clientId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Omit<SaleListResult, 'items'> & { items: SaleResponse[] }> {
    const result = await this.saleRepository.findAll(page, limit, clientId, dateFrom, dateTo);
    return {
      ...result,
      items: result.items.map((s) => this.toResponse(s)),
    };
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
      variantName: item.variantName ?? '',
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
