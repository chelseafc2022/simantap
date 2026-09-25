import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryPegawaiDirectoryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter berdasarkan nama OPD / Instansi SIMPEG' })
  @IsOptional()
  @IsString()
  opdName?: string;
}
