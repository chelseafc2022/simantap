import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '198001012005011001',
    description: 'NIP Pegawai ASN atau Alamat Email Dinas',
  })
  @IsNotEmpty({ message: 'NIP atau Email wajib diisi' })
  @IsString()
  nipOrEmail: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Kata sandi akun',
  })
  @IsNotEmpty({ message: 'Kata sandi wajib diisi' })
  @IsString()
  @MinLength(6, { message: 'Kata sandi minimal 6 karakter' })
  password: string;
}
