import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSaleItemDto } from './create-sale-item.dto';

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
  @IsString()
  notes?: string;
}
