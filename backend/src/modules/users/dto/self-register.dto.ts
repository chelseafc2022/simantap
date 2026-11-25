import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { RoleEnum } from '../../../common/enums/role.enum';

export class SelfRegisterDto {
  @ApiProperty({
    example: '198001012005011001',
    description: 'NIP Pegawai ASN dari SIMPEG',
  })
  @IsNotEmpty({ message: 'NIP pegawai wajib diisi' })
  @IsString()
  nip: string;

  @ApiPropertyOptional({
    enum: RoleEnum,
    description: 'Role akses tunggal (opsional)',
  })
  @IsOptional()
  @IsEnum(RoleEnum, { message: 'Role tidak valid' })
  role?: RoleEnum;

  @ApiPropertyOptional({
    type: [String],
    description: 'Daftar role akses OPD yang dipilih',
  })
  @IsOptional()
  @IsArray({ message: 'Roles harus berupa array' })
  @IsEnum(RoleEnum, { each: true, message: 'Role tidak valid' })
  roles?: RoleEnum[];
}
