import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1, { message: 'El nombre del producto es requerido' })
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variants?: string[];
}
