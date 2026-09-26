import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class RealisasiItemDto {
  @ApiProperty({ description: 'Bulan ke-1 s.d. 12', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  bulan: number;

  @ApiProperty({ description: 'Persentase realisasi fisik kumulatif (%)', example: 25.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  realisasiFisik: number;

  @ApiProperty({ description: 'Realisasi keuangan kumulatif (Rp)', example: 150000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  realisasiKeuangan: number;

  @ApiPropertyOptional({ description: 'Catatan kendala lapangan atau keterangan progres' })
  @IsOptional()
  @IsString()
  catatanOperator?: string;
}

export class UpsertRealisasiDto extends RealisasiItemDto {}

export class BulkUpsertRealisasiDto {
  @ApiProperty({ type: [RealisasiItemDto], description: 'Daftar realisasi bulanan' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RealisasiItemDto)
  items: RealisasiItemDto[];
}
