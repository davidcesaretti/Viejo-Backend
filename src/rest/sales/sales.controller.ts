import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import type { UserDocument } from '../../repositories/user/user.schema';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(Role.Vendedor, Role.Administrador)
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: UserDocument) {
    return this.salesService.create({
      clientId: dto.clientId,
      saleDate: dto.saleDate,
      items: dto.items,
      totalAmount: dto.totalAmount,
      notes: dto.notes,
      createdBy: user._id.toString(),
      initialPayment: dto.initialPayment
        ? {
            amount: dto.initialPayment.amount,
            paymentMethod: dto.initialPayment.paymentMethod,
            items: dto.initialPayment.items,
            notes: dto.initialPayment.notes,
          }
        : undefined,
    });
  }

  @Get()
  @Roles(Role.Vendedor, Role.Administrador)
  findAll(
    @Query('clientId') clientId?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('dateFrom') dateFromStr?: string,
    @Query('dateTo') dateToStr?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(limitStr ?? '30', 10) || 30),
    );
    // dateFrom = start of that day (00:00:00), dateTo = end of that day (23:59:59)
    const dateFrom = dateFromStr ? new Date(`${dateFromStr}T00:00:00.000Z`) : undefined;
    const dateTo = dateToStr ? new Date(`${dateToStr}T23:59:59.999Z`) : undefined;
    return this.salesService.findAll(
      page,
      limit,
      clientId || undefined,
      dateFrom,
      dateTo,
    );
  }

  @Get('export')
  @Roles(Role.Vendedor, Role.Administrador)
  exportAll(
    @Query('clientId') clientId?: string,
    @Query('dateFrom') dateFromStr?: string,
    @Query('dateTo') dateToStr?: string,
  ) {
    const dateFrom = dateFromStr ? new Date(`${dateFromStr}T00:00:00.000Z`) : undefined;
    const dateTo = dateToStr ? new Date(`${dateToStr}T23:59:59.999Z`) : undefined;
    return this.salesService.exportAll(clientId || undefined, dateFrom, dateTo);
  }

  @Get(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
