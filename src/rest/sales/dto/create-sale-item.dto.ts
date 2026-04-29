import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateSaleItemDto {
  @IsString()
  productId: string;

  @IsString()
  stockId: string;

  @IsString()
  @MinLength(1, { message: 'El nombre del producto es requerido' })
  productName: string;

  @IsOptional()
  @IsString()
  variantName?: string;

  @IsNumber()
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'El precio unitario debe ser mayor o igual a 0' })
  unitPrice: number;

  @IsNumber()
  @Min(0, { message: 'El descuento debe ser mayor o igual a 0' })
  @Max(100, { message: 'El descuento no puede ser mayor a 100' })
  discountPercent?: number;

  @IsNumber()
  @Min(0, { message: 'El subtotal debe ser mayor o igual a 0' })
  subtotal: number;
}
