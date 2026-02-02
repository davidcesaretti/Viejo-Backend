import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBroadcastNotificationDto {
  @IsString()
  @MinLength(1, { message: 'El título es requerido' })
  title: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
