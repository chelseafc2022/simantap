import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
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

  // Trust proxy for reverse proxy (Nginx / HestiaCP) - CWE-778
  app.set('trust proxy', 1);

  // Security Headers via Helmet (CWE-693)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  // Sajikan folder uploads/ sebagai file statis (foto bukti fisik PPK)
  const uploadDir = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 5026);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const clientUrl = configService.get<string>(
    'app.clientUrl',
    'http://localhost:3000',
  );

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // CORS configuration
  const allowedOrigins = [
    clientUrl,
    'https://monalisa.konaweselatankab.go.id',
    'http://monalisa.konaweselatankab.go.id',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  if (clientUrl && clientUrl.includes(',')) {
    allowedOrigins.push(...clientUrl.split(',').map((u) => u.trim()));
  }

  app.enableCors({
    origin: allowedOrigins,
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

  // Swagger Documentation Setup (CWE-200)
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const enableSwagger = configService.get<string>('ENABLE_SWAGGER', 'true');

  if (nodeEnv !== 'production' || enableSwagger === 'true') {
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
        persistAuthorization: false, // Mencegah penyimpanan token permanen di browser dokumentasi
        docExpansion: 'list',
        filter: true,
      },
      customSiteTitle: 'MONALISA KONSEL API Documentation',
    });
  }

  await app.listen(port, '0.0.0.0');

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
