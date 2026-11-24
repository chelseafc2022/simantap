import { Module } from '@nestjs/common';
import { MakSyncService } from './mak-sync.service';
import { RupSourceService } from './rup-source.service';
import { SirupController } from './sirup.controller';
import { SirupService } from './sirup.service';

@Module({
  controllers: [SirupController],
  providers: [SirupService, RupSourceService, MakSyncService],
  exports: [SirupService, MakSyncService],
})
export class SirupModule {}
