import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token yang didapat saat proses login sebelumnya',
  })
  @IsNotEmpty({ message: 'Refresh token wajib diisi' })
  @IsString()
  refreshToken: string;
}
