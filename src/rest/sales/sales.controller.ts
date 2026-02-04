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
import { Role } from '../../common/enums/role.enum';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(Role.Vendedor, Role.Administrador)
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create({
      clientId: dto.clientId,
      saleDate: dto.saleDate,
      items: dto.items,
      totalAmount: dto.totalAmount,
      notes: dto.notes,
    });
  }

  @Get()
  @Roles(Role.Vendedor, Role.Administrador)
  findByClient(
    @Query('clientId') clientId: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!clientId) {
      return { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(limitStr ?? '20', 10) || 20),
    );
    return this.salesService.findByClientId(clientId, page, limit);
  }

  @Get(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
