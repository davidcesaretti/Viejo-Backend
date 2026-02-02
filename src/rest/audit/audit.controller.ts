import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../../repositories/user/user.schema';
import { AuditService } from './audit.service';
import { Role } from '../../common/enums/role.enum';
import { AuditType } from '../../common/enums/audit-type.enum';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Administrador)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  list(
    @CurrentUser() _user: UserDocument,
    @Query('type') type?: AuditType,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(limitStr ?? '50', 10) || 50),
    );
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    return this.auditService.list(
      { type, userId, entityType, entityId, from: fromDate, to: toDate },
      page,
      limit,
    );
  }

  @Get('logs/:id')
  getById(@CurrentUser() _user: UserDocument, @Param('id') id: string) {
    return this.auditService.getById(id);
  }
}
