import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../repositories/user/user.repository';

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export interface UserSummaryResponse {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.userRepository.findById(userId);
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      roles: user.roles,
    };
  }

  async findAll(): Promise<UserSummaryResponse[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      roles: user.roles,
    }));
  }
}
