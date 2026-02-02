import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationRepository } from '../../repositories/notification/notification.repository';
import type { NotificationListResult } from '../../repositories/notification/notification.repository';
import type { NotificationDocument } from '../../repositories/notification/notification.schema';

export interface NotificationResponse {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crea una notificación, la persiste y emite evento para Socket.IO (user.notification).
   */
  async create(dto: {
    userId: string;
    title: string;
    message?: string;
    type?: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.create({
      userId: dto.userId,
      title: dto.title,
      message: dto.message ?? '',
      type: dto.type ?? 'info',
      data: dto.data,
    });
    const payload = this.toResponse(notification);
    this.eventEmitter.emit('user.notification', {
      ...payload,
      description: payload.message,
      timestamp: payload.createdAt,
      isRead: payload.read,
      metadata: payload.data,
    });
    return payload;
  }

  /**
   * Crea una notificación y la envía a todos los clientes (broadcast).
   */
  async createBroadcast(dto: {
    title: string;
    message?: string;
    type?: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.create({
      userId: '',
      title: dto.title,
      message: dto.message ?? '',
      type: dto.type ?? 'info',
      data: dto.data,
    });
    const payload = this.toResponse(notification);
    this.eventEmitter.emit('broadcast.notification', {
      ...payload,
      userId: '',
      description: payload.message,
      timestamp: payload.createdAt,
      isRead: payload.read,
      metadata: payload.data,
    });
    return payload;
  }

  async listByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<NotificationListResult> {
    return this.notificationRepository.findByUserId(userId, page, limit);
  }

  async markAsRead(id: string, userId: string): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.markAsRead(
      id,
      userId,
    );
    return this.toResponse(notification);
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    return this.notificationRepository.markAllAsRead(userId);
  }

  private toResponse(
    doc: NotificationDocument & { createdAt?: Date },
  ): NotificationResponse {
    const createdAt = (doc as { createdAt?: Date }).createdAt;
    return {
      id: doc._id.toString(),
      userId: doc.userId ?? '',
      title: doc.title,
      message: doc.message ?? '',
      type: doc.type ?? 'info',
      read: doc.read ?? false,
      data: doc.data,
      createdAt:
        createdAt instanceof Date
          ? createdAt.toISOString()
          : new Date().toISOString(),
    };
  }
}
