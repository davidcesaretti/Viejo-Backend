import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password?: string;

  @Prop({ default: '' })
  name: string;

  @Prop({ type: [String], enum: Role, default: [Role.Vendedor] })
  roles: Role[];

  @Prop({ default: false })
  banned: boolean;

  @Prop()
  resetPasswordTokenHash?: string;

  @Prop()
  resetPasswordExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
