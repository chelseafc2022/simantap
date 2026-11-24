import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';

@Module({
  controllers: [ExternalApiController],
  providers: [ExternalApiService, ApiKeyGuard],
})
export class ExternalApiModule {}
