import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryPegawaiDirectoryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter berdasarkan nama OPD / Instansi SIMPEG' })
  @IsOptional()
  @IsString()
  opdName?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID Instansi / Unit Kerja SIMPEG' })
  @IsOptional()
  @IsString()
  instansiId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID Sub Unit Kerja SIMPEG' })
  @IsOptional()
  @IsString()
  unitKerjaId?: string;
}
