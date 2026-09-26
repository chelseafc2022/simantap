import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_VERSION,
} from './common/constants/app.constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Sajikan folder uploads/ sebagai file statis (foto bukti fisik PPK)
  const uploadDir = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 4000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const clientUrl = configService.get<string>(
    'app.clientUrl',
    'http://localhost:3000',
  );

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // CORS configuration
  app.enableCors({
    origin: [clientUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription(APP_DESCRIPTION)
    .setVersion(APP_VERSION)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Masukkan JWT Token (tanpa kata Bearer di depannya)',
        in: 'header',
      },
      'bearer',
    )
    .addTag(
      'Authentication',
      'Endpoint otentikasi, login NIP/Email, refresh token, profil',
    )
    .addTag(
      'Health',
      'Endpoint pemantauan kesehatan server, basis data, dan memori',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
    },
    customSiteTitle: 'SIMANTAP API Documentation',
  });

  await app.listen(port);

  logger.log(`========================================================`);
  logger.log(
    `🚀 ${APP_NAME} berjalan pada: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(`📚 Dokumentasi Swagger API:   http://localhost:${port}/docs`);
  logger.log(
    `🩺 Health Check Endpoint:     http://localhost:${port}/${apiPrefix}/health`,
  );
  logger.log(`========================================================`);
}

void bootstrap();
