import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './client.schema';

export interface CreateClientData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateClientData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface ClientListResult {
  items: ClientDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ClientRepository {
  constructor(
    @InjectModel(Client.name)
    private readonly clientModel: Model<ClientDocument>,
  ) {}

  async create(data: CreateClientData): Promise<ClientDocument> {
    const existing = await this.clientModel
      .findOne({ email: { $regex: new RegExp(`^${data.email}$`, 'i') } })
      .exec();
    if (existing) {
      throw new ConflictException('Ya existe un cliente con ese email');
    }
    const client = new this.clientModel({
      name: data.name,
      email: data.email,
      phone: data.phone ?? '',
      address: data.address ?? '',
      notes: data.notes ?? '',
    });
    return client.save();
  }

  async findById(id: string): Promise<ClientDocument> {
    const client = await this.clientModel.findById(id).exec();
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return client;
  }

  async findAll(page = 1, limit = 20): Promise<ClientListResult> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.clientModel.find().sort({ name: 1 }).skip(skip).limit(limit).exec(),
      this.clientModel.countDocuments().exec(),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async update(id: string, data: UpdateClientData): Promise<ClientDocument> {
    if (data.email) {
      const existing = await this.clientModel
        .findOne({
          _id: { $ne: id },
          email: { $regex: new RegExp(`^${data.email}$`, 'i') },
        })
        .exec();
      if (existing) {
        throw new ConflictException('Ya existe un cliente con ese email');
      }
    }
    const client = await this.clientModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return client;
  }

  async delete(id: string): Promise<void> {
    const result = await this.clientModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Cliente no encontrado');
    }
  }
}
