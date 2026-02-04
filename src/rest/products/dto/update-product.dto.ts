import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1, {
    message: 'El nombre del producto debe tener al menos 1 carácter',
  })
  name?: string;
}
