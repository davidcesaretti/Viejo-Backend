import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './rest/auth/auth.module';
import { UsersModule } from './rest/users/users.module';
import { AuditModule } from './rest/audit/audit.module';
import { NotificationsModule } from './rest/notifications/notifications.module';
import { ProductsModule } from './rest/products/products.module';
import { StockModule } from './rest/stock/stock.module';
import { ClientsModule } from './rest/clients/clients.module';
import { SalesModule } from './rest/sales/sales.module';
import { PaymentsModule } from './rest/payments/payments.module';
import { CashboxModule } from './rest/cashbox/cashbox.module';
import { MailModule } from './services/mail/mail.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { JwtAuthGuard } from './rest/auth/guards/jwt-auth.guard';
import { RolesGuard } from './rest/auth/guards/roles.guard';
import { AuditInterceptor } from './rest/audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ??
          'mongodb://localhost:27017/viejo-backend',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    AuditModule,
    NotificationsModule,
    ProductsModule,
    StockModule,
    ClientsModule,
    SalesModule,
    PaymentsModule,
    CashboxModule,
    MailModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
