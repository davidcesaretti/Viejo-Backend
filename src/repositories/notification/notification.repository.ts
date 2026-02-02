import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './notification.schema';

export interface CreateNotificationData {
  userId?: string;
  title: string;
  message?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface NotificationListResult {
  items: NotificationDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: CreateNotificationData): Promise<NotificationDocument> {
    const notification = new this.notificationModel(data);
    return notification.save();
  }

  async findByUserId(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<NotificationListResult> {
    const skip = (page - 1) * limit;
    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ userId: userId || { $in: [null, ''] } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<NotificationDocument[]>()
        .exec(),
      this.notificationModel.countDocuments({ userId }).exec(),
      this.notificationModel.countDocuments({ userId, read: false }).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    };
  }

  async findById(id: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findById(id).exec();
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: id, userId },
        { $set: { read: true } },
        { new: true },
      )
      .exec();
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel
      .updateMany({ userId, read: false }, { $set: { read: true } })
      .exec();
    return { modifiedCount: result.modifiedCount };
  }
}
