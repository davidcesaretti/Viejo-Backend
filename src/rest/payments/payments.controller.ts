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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { UserDocument } from '../../repositories/user/user.schema';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(Role.Vendedor, Role.Administrador)
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: UserDocument) {
    return this.paymentsService.create({
      saleId: dto.saleId,
      clientId: dto.clientId,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
      items: dto.items,
      notes: dto.notes,
      createdBy: user._id.toString(),
    });
  }

  @Delete(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.paymentsService.delete(id);
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
    return this.paymentsService.findByClientId(clientId, page, limit);
  }

  @Get('sale/:saleId')
  @Roles(Role.Vendedor, Role.Administrador)
  findBySale(@Param('saleId') saleId: string) {
    return this.paymentsService.findBySaleId(saleId);
  }

  @Get(':id')
  @Roles(Role.Vendedor, Role.Administrador)
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }
}
