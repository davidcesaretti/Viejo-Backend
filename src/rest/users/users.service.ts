import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../repositories/user/user.repository';
import { Role } from '../../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  banned: boolean;
  createdAt?: Date;
}

export interface UserProfileResponse extends UserResponse {}
export interface UserSummaryResponse extends UserResponse {}

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.userRepository.findById(userId);
    return this.toResponse(user);
  }

  async findAll(): Promise<UserSummaryResponse[]> {
    const users = await this.userRepository.findAll();
    return users.map((u) => this.toResponse(u));
  }

  async findById(id: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(id);
    return this.toResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      roles: dto.role ? [dto.role] : [Role.Vendedor],
    });
    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const data: Parameters<UserRepository['updateFull']>[1] = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.roles !== undefined) data.roles = dto.roles;
    if (dto.banned !== undefined) data.banned = dto.banned;
    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    const user = await this.userRepository.updateFull(id, data);
    return this.toResponse(user);
  }

  async ban(id: string): Promise<UserResponse> {
    const user = await this.userRepository.updateFull(id, { banned: true });
    return this.toResponse(user);
  }

  async unban(id: string): Promise<UserResponse> {
    const user = await this.userRepository.updateFull(id, { banned: false });
    return this.toResponse(user);
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.userRepository.delete(id);
    return { message: 'Usuario eliminado correctamente' };
  }

  private toResponse(user: Awaited<ReturnType<UserRepository['findById']>>): UserResponse {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      roles: user.roles,
      banned: user.banned ?? false,
      createdAt: (user as unknown as { createdAt?: Date }).createdAt,
    };
  }
}
