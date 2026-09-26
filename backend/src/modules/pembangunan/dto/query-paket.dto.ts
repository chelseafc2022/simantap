import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryPaketDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter tahun anggaran (default 2026)',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tahunAnggaran?: number;

  @ApiPropertyOptional({ description: 'Filter ID OPD' })
  @IsOptional()
  @IsString()
  opdId?: string;

  @ApiPropertyOptional({
    description: 'Filter metode pemilihan (E-Purchasing, Tender, dsb)',
  })
  @IsOptional()
  @IsString()
  metodePemilihan?: string;

  @ApiPropertyOptional({
    description: 'Filter jenis pengadaan (Pekerjaan Konstruksi, dsb)',
  })
  @IsOptional()
  @IsString()
  jenisPengadaan?: string;

  @ApiPropertyOptional({
    description: 'Filter sumber dana (DAU, DAK Fisik, dsb)',
  })
  @IsOptional()
  @IsString()
  sumberDana?: string;

  @ApiPropertyOptional({
    description: 'Filter Sub Unit Kerja / Bagian / Bidang',
  })
  @IsOptional()
  @IsString()
  subUnitId?: string;
}
