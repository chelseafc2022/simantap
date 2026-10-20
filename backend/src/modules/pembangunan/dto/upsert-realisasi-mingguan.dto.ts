import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertRealisasiMingguanDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  bulan: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  mingguKe: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  realisasiFisik?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  realisasiKeuangan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatanOperator?: string;

  @ApiPropertyOptional({
    description: 'Nama atau uraian kegiatan aktual pada minggu ini',
  })
  @IsOptional()
  @IsString()
  uraianKegiatan?: string;
}
