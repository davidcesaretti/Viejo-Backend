import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateStockDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0, { message: 'La cantidad debe ser mayor o igual a 0' })
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'El precio debe ser mayor o igual a 0' })
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El descuento debe ser mayor o igual a 0' })
  @Max(100, { message: 'El descuento no puede ser mayor a 100' })
  discount?: number;

  @IsOptional()
  @IsString()
  variantName?: string;
}
