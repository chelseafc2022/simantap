import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    RedisService,
    { provide: 'REDIS_CACHE_SERVICE', useExisting: RedisService },
  ],
  exports: [RedisService, 'REDIS_CACHE_SERVICE'],
})
export class RedisModule {}
