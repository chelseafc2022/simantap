import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { RoleEnum } from '../../../common/enums/role.enum';

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: RoleEnum,
    description: 'Filter berdasarkan Role',
  })
  @IsOptional()
  @IsEnum(RoleEnum)
  role?: RoleEnum;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID OPD' })
  @IsOptional()
  @IsString()
  opdId?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan ID Instansi / Unit Kerja dari SIMPEG',
  })
  @IsOptional()
  @IsString()
  instansiId?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan ID Sub Unit Kerja dari SIMPEG',
  })
  @IsOptional()
  @IsString()
  unitKerjaId?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status akun (AKTIF, NON_AKTIF, TERKUNCI)',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
