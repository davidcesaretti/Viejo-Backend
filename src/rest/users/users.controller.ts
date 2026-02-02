import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../../repositories/user/user.schema';
import { UsersService } from './users.service';
import { Role } from '../../common/enums/role.enum';

/**
 * El id y el rol del usuario siempre se obtienen del token JWT (req.user),
 * nunca del body ni de parámetros. @CurrentUser() devuelve el usuario
 * cargado por JwtStrategy tras validar el token.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @Roles(Role.Vendedor, Role.Administrador)
  getProfile(@CurrentUser() user: UserDocument) {
    return this.usersService.getProfile(user._id.toString());
  }

  @Get()
  @Roles(Role.Administrador)
  findAll(@CurrentUser() _user: UserDocument) {
    return this.usersService.findAll();
  }
}
