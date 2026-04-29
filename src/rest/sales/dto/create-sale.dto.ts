import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSaleItemDto } from './create-sale-item.dto';

export const PAYMENT_METHODS = ['cash', 'transfer', 'check', 'other'] as const;

export class InitialPaymentItemDto {
  @IsString()
  productId: string;

  @IsString()
  stockId: string;

  @IsString()
  productName: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class InitialPaymentDto {
  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsOptional()
  @IsIn(PAYMENT_METHODS, { message: 'Método de pago inválido' })
  paymentMethod?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialPaymentItemDto)
  items?: InitialPaymentItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSaleDto {
  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  saleDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @IsNumber()
  @Min(0, { message: 'El total debe ser mayor o igual a 0' })
  totalAmount: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => InitialPaymentDto)
  initialPayment?: InitialPaymentDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
