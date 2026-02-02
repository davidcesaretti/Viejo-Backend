import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { UserDocument } from '../../repositories/user/user.schema';
import { UserRepository } from '../../repositories/user/user.repository';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    roles: Role[];
  };
  access_token: string;
  cookie?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user?.password) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  async findById(id: string): Promise<UserDocument | null> {
    try {
      return await this.userRepository.findById(id);
    } catch {
      return null;
    }
  }

  async login(user: UserDocument): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
    };
    const access_token = this.jwtService.sign(payload);
    const cookie = this.getCookieWithToken(access_token);
    return {
      user: this.sanitizeUser(user),
      access_token,
      cookie,
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const roles = dto.role ? [dto.role] : [Role.Vendedor];
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      roles,
    });
    return this.login(user);
  }

  getCookieWithToken(token: string): string {
    const isProd = this.configService.get('NODE_ENV') === 'production';
    const maxAge = 60 * 60 * 24 * 7; // 7 días en segundos
    return `access_token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}${isProd ? '; Secure; SameSite=Strict' : ''}`;
  }

  getLogoutCookie(): string {
    return 'access_token=; HttpOnly; Path=/; Max-Age=0';
  }

  private sanitizeUser(user: UserDocument): AuthResponse['user'] {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      roles: user.roles,
    };
  }
}
