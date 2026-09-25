import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleEnum } from '../../../common/enums/role.enum';

export class RegisterUserDto {
  @ApiProperty({ example: '198001012005011001', description: 'Nomor Induk Pegawai (NIP)' })
  @IsNotEmpty({ message: 'NIP wajib diisi' })
  @IsString()
  nip: string;

  @ApiProperty({ example: 'Ir. H. Ahmad Fauzan, M.Si' })
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi' })
  @IsString()
  namaLengkap: string;

  @ApiProperty({ example: 'Kabag Administrasi Pembangunan' })
  @IsNotEmpty({ message: 'Jabatan wajib diisi' })
  @IsString()
  jabatan: string;

  @ApiProperty({ example: 'ahmad.fauzan@konaweselatankab.go.id' })
  @IsNotEmpty({ message: 'Email dinas wajib diisi' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsNotEmpty({ message: 'Kata sandi wajib diisi' })
  @IsString()
  @MinLength(6, { message: 'Kata sandi minimal 6 karakter' })
  password: string;

  @ApiProperty({ enum: RoleEnum, default: RoleEnum.ADMIN_PPK })
  @IsEnum(RoleEnum, { message: 'Role tidak valid' })
  role: RoleEnum;

  @ApiPropertyOptional({ description: 'ID OPD instansi' })
  @IsOptional()
  @IsString()
  opdId?: string;

  @ApiPropertyOptional({ description: 'ID Sub Unit / Bidang' })
  @IsOptional()
  @IsString()
  subUnitId?: string;
}
