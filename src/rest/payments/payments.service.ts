import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentRepository } from '../../repositories/payment/payment.repository';
import { SaleRepository } from '../../repositories/sale/sale.repository';
import { CashboxRepository } from '../../repositories/cashbox/cashbox.repository';
import type { PaymentDocument } from '../../repositories/payment/payment.schema';
import type { PaymentListResult } from '../../repositories/payment/payment.repository';

export interface PaymentItemResponse {
  productId: string;
  stockId: string;
  productName: string;
  amount: number;
}

export interface PaymentResponse {
  id: string;
  saleId: string;
  clientId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  items: PaymentItemResponse[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly saleRepository: SaleRepository,
    private readonly cashboxRepository: CashboxRepository,
  ) {}

  async create(dto: {
    saleId: string;
    clientId: string;
    amount: number;
    paymentDate?: string;
    paymentMethod?: string;
    items?: Array<{ productId: string; stockId: string; productName: string; amount: number }>;
    notes?: string;
    createdBy: string;
  }): Promise<PaymentResponse> {
    const sale = await this.saleRepository.findById(dto.saleId);
    const balance = sale.totalAmount - sale.amountPaid;
    if (dto.amount > balance) {
      throw new BadRequestException(
        `El monto (${dto.amount}) no puede superar el saldo pendiente de la venta (${balance})`,
      );
    }
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : undefined;
    const payment = await this.paymentRepository.create({
      saleId: dto.saleId,
      clientId: dto.clientId,
      amount: dto.amount,
      paymentDate,
      paymentMethod: dto.paymentMethod ?? 'cash',
      items: dto.items,
      notes: dto.notes,
    });
    await this.saleRepository.addPayment(dto.saleId, dto.amount);
    await this.cashboxRepository.create({
      type: 'income',
      category: 'cobro',
      amount: dto.amount,
      description: `Cobro automático de venta ${dto.saleId}`,
      entryDate: paymentDate,
      createdBy: dto.createdBy,
      paymentId: payment._id.toString(),
    });
    return this.toResponse(payment);
  }

  async delete(id: string): Promise<void> {
    const payment = await this.paymentRepository.findById(id);
    await this.saleRepository.addPayment(String(payment.saleId), -payment.amount);
    await this.paymentRepository.delete(id);
    await this.cashboxRepository.deleteByPaymentId(id);
  }

  async findOne(id: string): Promise<PaymentResponse> {
    const payment = await this.paymentRepository.findById(id);
    return this.toResponse(payment);
  }

  async findBySaleId(saleId: string): Promise<PaymentResponse[]> {
    const items = await this.paymentRepository.findBySaleId(saleId);
    return items.map((p) => this.toResponse(p));
  }

  async findByClientId(
    clientId: string,
    page: number,
    limit: number,
  ): Promise<Omit<PaymentListResult, 'items'> & { items: PaymentResponse[] }> {
    const result = await this.paymentRepository.findByClientId(
      clientId,
      page,
      limit,
    );
    return {
      ...result,
      items: result.items.map((p) => this.toResponse(p)),
    };
  }

  private toResponse(payment: PaymentDocument): PaymentResponse {
    const createdAt = (payment as { createdAt?: Date }).createdAt;
    const updatedAt = (payment as { updatedAt?: Date }).updatedAt;
    const paymentDate = (payment as { paymentDate?: Date }).paymentDate;
    return {
      id: payment._id.toString(),
      saleId: String(payment.saleId),
      clientId: String(payment.clientId),
      amount: payment.amount,
      paymentDate:
        paymentDate instanceof Date
          ? paymentDate.toISOString()
          : new Date().toISOString(),
      paymentMethod: payment.paymentMethod ?? 'cash',
      items: (payment.items ?? []).map((it) => ({
        productId: String(it.productId),
        stockId: String(it.stockId),
        productName: it.productName,
        amount: it.amount,
      })),
      notes: payment.notes ?? '',
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
