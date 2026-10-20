import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class TargetMingguanItemDto {
  @ApiProperty({ description: 'Bulan kalender (1-12)', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  bulan: number;

  @ApiProperty({ description: 'Urutan minggu pada bulan', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  mingguKe: number;

  @ApiProperty({ example: '2026-03-12' })
  @IsDateString()
  tanggalMulai: string;

  @ApiProperty({ example: '2026-03-18' })
  @IsDateString()
  tanggalSelesai: string;

  @ApiPropertyOptional({ description: 'Nama atau uraian kegiatan minggu ini' })
  @IsOptional()
  @IsString()
  uraianKegiatan?: string;

  @ApiProperty({ description: 'Target fisik kumulatif minggu ini (%)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  targetFisik: number;
}
