import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { TargetBulananItemDto } from './target-bulanan.dto';

export class SetTargetsDto {
  @ApiProperty({
    description: 'Daftar Target Fisik Bulanan (Bulan 1 sampai 12)',
    type: [TargetBulananItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TargetBulananItemDto)
  targets: TargetBulananItemDto[];
}
