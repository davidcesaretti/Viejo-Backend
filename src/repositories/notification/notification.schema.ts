import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: false, index: true })
  userId?: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  message: string;

  @Prop({ default: 'info' })
  type: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: Object })
  data?: Record<string, unknown>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
