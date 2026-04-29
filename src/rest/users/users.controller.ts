import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../../repositories/user/user.schema';
import { UsersService } from './users.service';
import { Role } from '../../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Perfil propio — cualquier usuario autenticado */
  @Get('profile')
  @Roles(Role.Vendedor, Role.Administrador)
  getProfile(@CurrentUser() user: UserDocument) {
    return this.usersService.getProfile(user._id.toString());
  }

  /** Listar todos los usuarios — solo administradores */
  @Get()
  @Roles(Role.Administrador)
  findAll() {
    return this.usersService.findAll();
  }

  /** Obtener un usuario por ID — solo administradores */
  @Get(':id')
  @Roles(Role.Administrador)
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  /** Crear un nuevo usuario — solo administradores */
  @Post()
  @Roles(Role.Administrador)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /** Actualizar datos de un usuario — solo administradores */
  @Patch(':id')
  @Roles(Role.Administrador)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /** Banear un usuario (desactiva su acceso) — solo administradores */
  @Patch(':id/ban')
  @Roles(Role.Administrador)
  ban(@Param('id') id: string) {
    return this.usersService.ban(id);
  }

  /** Desbanear un usuario — solo administradores */
  @Patch(':id/unban')
  @Roles(Role.Administrador)
  unban(@Param('id') id: string) {
    return this.usersService.unban(id);
  }

  /** Eliminar un usuario — solo administradores */
  @Delete(':id')
  @Roles(Role.Administrador)
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
