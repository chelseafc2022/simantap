import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMonevLapanganDto {
  @ApiPropertyOptional({ description: 'Tanggal pelaksanaan monitoring (default: hari ini)' })
  @IsOptional()
  @IsDateString()
  tanggalMonev?: string;

  @ApiPropertyOptional({ description: 'Capaian progres fisik hasil monitoring (%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Progres fisik harus berupa angka' })
  @Min(0, { message: 'Progres fisik minimal 0%' })
  @Max(100, { message: 'Progres fisik maksimal 100%' })
  progresFisik?: number;

  @ApiProperty({ description: 'Kondisi fisik kegiatan hasil monitoring' })
  @IsString()
  @IsNotEmpty({ message: 'Kondisi fisik kegiatan wajib diisi' })
  @MaxLength(5000)
  kondisiFisik: string;

  @ApiPropertyOptional({ description: 'Permasalahan di lapangan' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  permasalahan?: string;

  @ApiPropertyOptional({ description: 'Saran Tim MONEV' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  saran?: string;
}

export class UpdateMonevLapanganDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalMonev?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Progres fisik harus berupa angka' })
  @Min(0, { message: 'Progres fisik minimal 0%' })
  @Max(100, { message: 'Progres fisik maksimal 100%' })
  progresFisik?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Kondisi fisik kegiatan wajib diisi' })
  @MaxLength(5000)
  kondisiFisik?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  permasalahan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  saran?: string;

  @ApiPropertyOptional({ description: 'ID foto yang dihapus, dipisah koma' })
  @IsOptional()
  @IsString()
  hapusFotoIds?: string;
}
