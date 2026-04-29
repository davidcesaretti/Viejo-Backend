import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../../repositories/user/user.schema';
import { CashboxService } from './cashbox.service';
import { CreateCashboxEntryDto } from './dto/create-cashbox-entry.dto';

@Controller('cashbox')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashboxController {
  constructor(private readonly cashboxService: CashboxService) {}

  @Get()
  @Roles(Role.Vendedor, Role.Administrador)
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('type') type?: 'income' | 'expense',
    @Query('category') category?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? '30', 10) || 30));
    return this.cashboxService.findAll(page, limit, {
      type,
      category,
      dateFrom,
      dateTo,
    });
  }

  @Get('summary')
  @Roles(Role.Vendedor, Role.Administrador)
  summary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.cashboxService.getSummary({ dateFrom, dateTo });
  }

  @Post()
  @Roles(Role.Vendedor, Role.Administrador)
  create(@Body() dto: CreateCashboxEntryDto, @CurrentUser() user: UserDocument) {
    return this.cashboxService.create({
      type: dto.type,
      category: dto.category,
      description: dto.description,
      amount: dto.amount,
      entryDate: dto.entryDate,
      createdBy: user._id.toString(),
    });
  }

  @Delete(':id')
  @Roles(Role.Administrador)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.cashboxService.delete(id);
  }
}
