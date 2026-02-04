import {
  Body,
  Controller,
  Delete,
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
import { Role } from '../../common/enums/role.enum';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @Roles(Role.Vendedor, Role.Administrador)
  create(@Body() dto: CreateStockDto) {
    return this.stockService.create(dto);
  }

  @Get()
  @Roles(Role.Vendedor, Role.Administrador)
  findAll(@Query('page') pageStr?: string, @Query('limit') limitStr?: string) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(limitStr ?? '20', 10) || 20),
    );
    return this.stockService.findAll(page, limit);
  }

  @Get('product/:productId')
  @Roles(Role.Vendedor, Role.Administrador)
  findByProductId(
    @Param('productId') productId: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(limitStr ?? '20', 10) || 20),
    );
    return this.stockService.findByProductId(productId, page, limit);
  }

  @Get(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  update(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.stockService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }
}
