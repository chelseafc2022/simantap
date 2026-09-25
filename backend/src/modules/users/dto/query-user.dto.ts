import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { RoleEnum } from '../../../common/enums/role.enum';

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({ enum: RoleEnum, description: 'Filter berdasarkan Role' })
  @IsOptional()
  @IsEnum(RoleEnum)
  role?: RoleEnum;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID OPD' })
  @IsOptional()
  @IsString()
  opdId?: string;
}
