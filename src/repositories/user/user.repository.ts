import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { Role } from '../../common/enums/role.enum';

export interface CreateUserData {
  email: string;
  password?: string;
  name: string;
  roles?: Role[];
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  roles?: Role[];
  banned?: boolean;
  password?: string;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date | null;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: CreateUserData): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: data.email }).exec();
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const user = new this.userModel(data);
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByResetTokenHash(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  /** Actualización parcial usada internamente (solo name). */
  async update(id: string, data: { name?: string }): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Actualización completa para administración (name, email, roles, banned, password). */
  async updateFull(id: string, data: UpdateUserData): Promise<UserDocument> {
    if (data.email) {
      const existing = await this.userModel
        .findOne({ email: data.email, _id: { $ne: id } })
        .exec();
      if (existing) throw new ConflictException('Ya existe un usuario con ese email');
    }
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Usuario no encontrado');
  }
}
