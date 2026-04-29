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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.Vendedor, Role.Administrador)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create({ name: dto.name, variants: dto.variants });
  }

  @Get()
  @Roles(Role.Vendedor, Role.Administrador)
  findAll(@Query('page') pageStr?: string, @Query('limit') limitStr?: string) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(limitStr ?? '20', 10) || 20),
    );
    return this.productsService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, { name: dto.name, variants: dto.variants });
  }

  @Delete(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
