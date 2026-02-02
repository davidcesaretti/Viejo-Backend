import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../../repositories/user/user.schema';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateBroadcastNotificationDto } from './dto/create-broadcast-notification.dto';
import { Role } from '../../common/enums/role.enum';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: UserDocument,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(limitStr ?? '20', 10) || 20),
    );
    return this.notificationsService.listByUser(
      user._id.toString(),
      page,
      limit,
    );
  }

  @Patch(':id/read')
  markAsRead(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, user._id.toString());
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: UserDocument) {
    return this.notificationsService.markAllAsRead(user._id.toString());
  }

  /**
   * Crear notificación (solo administrador). Para enviar a un usuario específico.
   */
  @UseGuards(RolesGuard)
  @Roles(Role.Administrador)
  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  /**
   * Crear notificación broadcast (solo administrador). Se envía por Socket.IO a todos los clientes conectados.
   */
  @UseGuards(RolesGuard)
  @Roles(Role.Administrador)
  @Post('broadcast')
  createBroadcast(@Body() dto: CreateBroadcastNotificationDto) {
    return this.notificationsService.createBroadcast(dto);
  }
}
