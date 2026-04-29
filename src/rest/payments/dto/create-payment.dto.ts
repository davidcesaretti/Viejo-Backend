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

export const PAYMENT_METHODS = ['cash', 'transfer', 'check', 'other'] as const;
export type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

export class CreatePaymentItemDto {
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

export class CreatePaymentDto {
  @IsString()
  saleId: string;

  @IsString()
  clientId: string;

  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsIn(PAYMENT_METHODS, { message: 'Método de pago inválido' })
  paymentMethod?: PaymentMethodType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentItemDto)
  items?: CreatePaymentItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
