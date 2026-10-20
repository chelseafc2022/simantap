import { Module } from '@nestjs/common';
import { RupSourceService } from './rup-source.service';
import { SirupController } from './sirup.controller';
import { SirupService } from './sirup.service';

@Module({
  controllers: [SirupController],
  providers: [SirupService, RupSourceService],
  exports: [SirupService],
})
export class SirupModule {}
