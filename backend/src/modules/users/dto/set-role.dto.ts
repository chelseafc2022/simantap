import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RoleEnum } from '../../../common/enums/role.enum';

export class SetRoleDto {
  @ApiProperty({ example: '198001012005011001', description: 'NIP Pegawai ASN dari SIMPEG' })
  @IsNotEmpty({ message: 'NIP pegawai wajib diisi' })
  @IsString()
  nip: string;

  @ApiProperty({
    enum: RoleEnum,
    description: 'Role akses yang diberikan (7 Role RBAC SIMANTAP)',
  })
  @IsNotEmpty({ message: 'Role wajib diisi' })
  @IsEnum(RoleEnum, { message: 'Role tidak valid' })
  role: RoleEnum;

  @ApiPropertyOptional({ description: 'ID OPD di SIMANTAP (opsional, otomatis ditarik dari SIMPEG jika kosong)' })
  @IsOptional()
  @IsString()
  opdId?: string;

  @ApiPropertyOptional({ description: 'ID Sub Unit / Bidang (opsional)' })
  @IsOptional()
  @IsString()
  subUnitId?: string;
}

export class RevokeRoleDto {
  @ApiProperty({ example: '198001012005011001', description: 'NIP Pegawai yang akan dicabut hak aksesnya' })
  @IsNotEmpty({ message: 'NIP wajib diisi' })
  @IsString()
  nip: string;
}
