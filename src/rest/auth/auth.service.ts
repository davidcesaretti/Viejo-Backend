import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { UserDocument } from '../../repositories/user/user.schema';
import { UserRepository } from '../../repositories/user/user.repository';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { MailService } from '../../services/mail/mail.service';

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
    private mailService: MailService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user?.password) return null;
    if (user.banned) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  async findById(id: string): Promise<UserDocument | null> {
    try {
      const user = await this.userRepository.findById(id);
      if (user.banned) return null;
      return user;
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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user.password) {
      throw new BadRequestException('El usuario no tiene contraseña local');
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updateFull(userId, { password: hashed });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.userRepository.updateFull(user._id.toString(), {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: expiresAt,
    });

    const frontend =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontend.replace(/\/$/, '')}/reset-password?token=${token}`;
    await this.mailService.sendMail({
      to: user.email,
      subject: 'Recuperación de contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827;">
          <h2 style="margin-bottom: 8px;">Recuperación de contraseña</h2>
          <p style="margin-top: 0;">Hacé clic en el siguiente botón para crear una nueva contraseña:</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">
              Restablecer contraseña
            </a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">Este enlace vence en 30 minutos.</p>
        </div>
      `,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.userRepository.findByResetTokenHash(tokenHash);
    if (!user) {
      throw new BadRequestException('El token de recuperación es inválido o expiró');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updateFull(user._id.toString(), {
      password: hashed,
      resetPasswordTokenHash: undefined,
      resetPasswordExpiresAt: null,
    });
  }

  getCookieWithToken(token: string): string {
    const isProd = this.configService.get('NODE_ENV') === 'production';
    const maxAge =
      Number(this.configService.get<string>('JWT_EXPIRES_IN')) || 14400; // mismo que el token (4 horas)
    return `access_token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}${isProd ? '; Secure; SameSite=Strict' : ''}`;
  }

  getLogoutCookie(): string {
    return 'access_token=; HttpOnly; Path=/; Max-Age=0';
  }

  /**
   * Genera un token de corta duración solo para Socket.IO.
   * El frontend lo obtiene con la cookie httpOnly (credentials: include)
   * y lo usa en el handshake del socket, sin guardarlo en localStorage.
   */
  createSocketToken(user: UserDocument): string {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
    };
    const expiresIn =
      this.configService.get<number>('SOCKET_TOKEN_EXPIRES_IN') ?? 60;
    return this.jwtService.sign(payload, {
      expiresIn,
    });
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
