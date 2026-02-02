import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import type { UserDocument } from '../../repositories/user/user.schema';
import { Role } from '../../common/enums/role.enum';
import { AuditService } from '../audit/audit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setTokenCookie(res, result.cookie);
    return { user: result.user, access_token: result.access_token };
  }

  @Public()
  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(
    @Body() _dto: LoginDto,
    @Req() req: Request & { user: UserDocument },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(req.user);
    this.setTokenCookie(res, result.cookie);
    this.auditService
      .logAuth({
        action: 'login',
        userId: req.user._id.toString(),
        userEmail: req.user.email,
        ip: req.ip ?? req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      })
      .catch(() => {});
    return { user: result.user, access_token: result.access_token };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: UserDocument) {
    return this.authService.login(user).then((r) => r.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Administrador)
  @Get('admin-only')
  adminOnly(@CurrentUser() user: UserDocument) {
    return { message: 'Solo administradores', user: user.email };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser() user: UserDocument,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Set-Cookie', this.authService.getLogoutCookie());
    this.auditService
      .logAuth({
        action: 'logout',
        userId: user._id.toString(),
        userEmail: user.email,
        ip: req.ip ?? req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      })
      .catch(() => {});
    return { message: 'Sesión cerrada' };
  }

  private setTokenCookie(res: Response, cookie: string | undefined): void {
    if (cookie) {
      res.setHeader('Set-Cookie', cookie);
    }
  }
}
