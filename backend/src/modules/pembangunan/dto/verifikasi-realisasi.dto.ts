import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VerifikasiRealisasiDto {
  @ApiPropertyOptional({
    description: 'Catatan verifikasi MONEV (wajib diisi jika ditolak)',
  })
  @IsOptional()
  @IsString()
  catatanVerifikasi?: string;
}
