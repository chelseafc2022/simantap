import { Module } from '@nestjs/common';
import { PembangunanController } from './pembangunan.controller';
import { PembangunanService } from './pembangunan.service';

@Module({
  controllers: [PembangunanController],
  providers: [PembangunanService],
  exports: [PembangunanService],
})
export class PembangunanModule {}
