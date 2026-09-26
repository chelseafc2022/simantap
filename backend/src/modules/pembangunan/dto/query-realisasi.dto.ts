import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryRealisasiDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter tahun anggaran (default 2026)', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tahunAnggaran?: number;

  @ApiPropertyOptional({ description: 'Bulan pelaporan 1-12 (default: bulan berjalan)', example: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  bulan?: number;

  @ApiPropertyOptional({ description: 'Filter ID OPD' })
  @IsOptional()
  @IsString()
  opdId?: string;

  @ApiPropertyOptional({ description: 'Filter Sub Unit Kerja / Bagian / Bidang' })
  @IsOptional()
  @IsString()
  subUnitId?: string;

  @ApiPropertyOptional({ description: 'Filter metode pemilihan (E-Purchasing, Tender, dsb)' })
  @IsOptional()
  @IsString()
  metodePemilihan?: string;

  @ApiPropertyOptional({ description: 'Filter status deviasi capaian (ALL, AMAN, PERHATIAN, KRITIS)', example: 'ALL' })
  @IsOptional()
  @IsString()
  statusDeviasi?: string;
}
