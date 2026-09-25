import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import egovConfig from './config/egov.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import redisConfig from './config/redis.config';
import { validationSchema } from './config/validation.schema';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { PrismaModule } from './core/database/prisma.module';
import { EgovModule } from './core/egov/egov.module';
import { HealthModule } from './core/health/health.module';
import { MailModule } from './core/mail/mail.module';
import { QueueModule } from './core/queue/queue.module';
import { RedisModule } from './core/redis/redis.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, mailConfig, egovConfig],
      validationSchema,
    }),

    // Core Modules
    PrismaModule,
    RedisModule,
    QueueModule,
    MailModule,
    HealthModule,
    EgovModule,

    // Feature Modules
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Global Guards (JWT by default, check @Public and @Roles)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    // Global Filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
