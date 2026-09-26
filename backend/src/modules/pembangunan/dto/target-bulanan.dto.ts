import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class TargetBulananItemDto {
  @ApiProperty({ description: 'Bulan ke (1 - 12)', example: 1 })
  @IsInt()
  @Min(1)
  @Max(12)
  bulan: number;

  @ApiProperty({ description: 'Target Fisik Kumulatif (%)', example: 10.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  targetFisik: number;
}
