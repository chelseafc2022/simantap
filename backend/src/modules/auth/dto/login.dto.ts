import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    example: '198001012005011001',
    description: 'NIP Pegawai ASN atau Alamat Email Dinas',
  })
  @IsOptional()
  @IsString()
  nipOrEmail?: string;

  @ApiPropertyOptional({
    example: '198001012005011001',
    description: 'Identifier akun (NIP atau Email)',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Kata sandi akun',
  })
  @IsNotEmpty({ message: 'Kata sandi wajib diisi' })
  @IsString()
  @MinLength(6, { message: 'Kata sandi minimal 6 karakter' })
  password: string;
}
