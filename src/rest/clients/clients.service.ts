import { Injectable } from '@nestjs/common';
import { ClientRepository } from '../../repositories/client/client.repository';
import { SaleRepository } from '../../repositories/sale/sale.repository';
import type { ClientDocument } from '../../repositories/client/client.schema';
import type { ClientListResult } from '../../repositories/client/client.repository';
import type { SaleDocument } from '../../repositories/sale/sale.schema';

export interface ClientResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientAccountSaleSummary {
  id: string;
  saleDate: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  itemsCount: number;
}

export interface ClientAccountResponse {
  client: ClientResponse;
  sales: ClientAccountSaleSummary[];
  totalDebt: number;
  totalSalesAmount: number;
  totalPaid: number;
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly saleRepository: SaleRepository,
  ) {}

  async create(dto: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    notes?: string;
  }): Promise<ClientResponse> {
    const client = await this.clientRepository.create(dto);
    return this.clientToResponse(client);
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<Omit<ClientListResult, 'items'> & { items: ClientResponse[] }> {
    const result = await this.clientRepository.findAll(page, limit);
    return {
      ...result,
      items: result.items.map((c) => this.clientToResponse(c)),
    };
  }

  async findOne(id: string): Promise<ClientResponse> {
    const client = await this.clientRepository.findById(id);
    return this.clientToResponse(client);
  }

  async getAccount(
    clientId: string,
    page = 1,
    limit = 50,
  ): Promise<ClientAccountResponse> {
    const client = await this.clientRepository.findById(clientId);
    const salesResult = await this.saleRepository.findByClientId(
      clientId,
      page,
      limit,
    );
    let totalDebt = 0;
    let totalSalesAmount = 0;
    let totalPaid = 0;
    const sales: ClientAccountSaleSummary[] = salesResult.items.map((s) => {
      const balance = s.totalAmount - s.amountPaid;
      totalDebt += balance;
      totalSalesAmount += s.totalAmount;
      totalPaid += s.amountPaid;
      return {
        id: s._id.toString(),
        saleDate:
          s.saleDate instanceof Date
            ? s.saleDate.toISOString()
            : new Date().toISOString(),
        totalAmount: s.totalAmount,
        amountPaid: s.amountPaid,
        balance,
        itemsCount: s.items?.length ?? 0,
      };
    });
    return {
      client: this.clientToResponse(client),
      sales,
      totalDebt,
      totalSalesAmount,
      totalPaid,
    };
  }

  async update(
    id: string,
    dto: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      notes?: string;
    },
  ): Promise<ClientResponse> {
    const client = await this.clientRepository.update(id, dto);
    return this.clientToResponse(client);
  }

  async remove(id: string): Promise<void> {
    await this.clientRepository.delete(id);
  }

  private clientToResponse(client: ClientDocument): ClientResponse {
    const createdAt = (client as { createdAt?: Date }).createdAt;
    const updatedAt = (client as { updatedAt?: Date }).updatedAt;
    return {
      id: client._id.toString(),
      name: client.name,
      email: client.email,
      phone: client.phone ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
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
