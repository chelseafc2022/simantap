import { Global, Module } from '@nestjs/common';
import { EgovService } from './egov.service';

@Global()
@Module({
  providers: [EgovService],
  exports: [EgovService],
})
export class EgovModule {}
