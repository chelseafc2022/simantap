import { Module } from '@nestjs/common';
import { SirupController } from './sirup.controller';
import { SirupService } from './sirup.service';

@Module({
  controllers: [SirupController],
  providers: [SirupService],
  exports: [SirupService],
})
export class SirupModule {}
