import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

const USER_ROOM_PREFIX = 'user:';

interface SocketHandshake {
  auth?: { token?: string };
  query?: { token?: string; userId?: string };
  headers?: { authorization?: string };
}

export interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export interface NotificationPayload {
  id: string;
  userId: string;
  title: string;
  description?: string;
  message: string;
  type: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server): void {
    const secret =
      this.configService.get<string>('JWT_SECRET') ?? 'secret-change-in-prod';
    server.use(async (socket: Socket, next) => {
      try {
        const handshake = (socket as unknown as { handshake?: SocketHandshake })
          .handshake;
        let token =
          handshake?.auth?.token ??
          (handshake?.query as { token?: string })?.token ??
          (handshake?.headers?.authorization as string)?.replace?.(
            'Bearer ',
            '',
          );
        const queryUserId = (handshake?.query as { userId?: string })?.userId;

        if (queryUserId && !token) {
          (socket as AuthenticatedSocket).userId = queryUserId;
          return next();
        }
        if (!token) {
          return next(new Error('Token o userId requerido'));
        }
        const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
          secret,
        });
        (socket as AuthenticatedSocket).userId = payload.sub;
        next();
      } catch {
        next(new Error('Token inválido'));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket): void {
    const userId = client.userId;
    if (userId) {
      this.userSockets.set(userId, client.id);
      const room = `${USER_ROOM_PREFIX}${userId}`;
      client.join(room);
      this.logger.log(`Cliente conectado: ${client.id}, userId: ${userId}`);
    } else {
      this.logger.warn(`Cliente conectado sin userId: ${client.id}`);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const userId = Array.from(this.userSockets.entries()).find(
      ([, socketId]) => socketId === client.id,
    )?.[0];
    if (userId) this.userSockets.delete(userId);
    this.logger.log(
      `Cliente desconectado: ${client.id}${userId ? `, userId: ${userId}` : ''}`,
    );
  }

  @OnEvent('user.notification')
  handleUserNotification(payload: NotificationPayload): void {
    this.logger.log(`Enviando notificación a usuario: ${payload.userId}`);
    const room = `${USER_ROOM_PREFIX}${payload.userId}`;
    this.server.to(room).emit('notification', payload);
  }

  @OnEvent('broadcast.notification')
  handleBroadcastNotification(payload: NotificationPayload): void {
    this.logger.log('Enviando notificación a todos los clientes');
    this.server.emit('notification', payload);
  }

  /**
   * Envía una notificación en tiempo real al usuario (uso directo).
   */
  emitToUser(
    userId: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    const room = `${USER_ROOM_PREFIX}${userId}`;
    this.server.to(room).emit(event, payload);
  }

  /**
   * Envía una notificación a todos los clientes conectados.
   */
  emitToAll(event: string, payload: Record<string, unknown>): void {
    this.server.emit(event, payload);
  }
}
