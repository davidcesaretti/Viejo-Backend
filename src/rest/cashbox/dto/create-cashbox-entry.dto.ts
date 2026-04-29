import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCashboxEntryDto {
  @IsIn(['income', 'expense'])
  type: 'income' | 'expense';

  @IsString()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  entryDate?: string;
}
