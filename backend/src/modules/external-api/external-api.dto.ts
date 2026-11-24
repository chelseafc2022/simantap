import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ExtPaketQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tahun?: number;

  @IsOptional()
  @IsString()
  opdId?: string;

  /** Awalan kode MAK, mis. 1.03.10.2.01.0053 (sub kegiatan) */
  @IsOptional()
  @IsString()
  mak?: string;

  /** ISO date-time; hanya paket yang datanya berubah sejak waktu ini */
  @IsOptional()
  @IsDateString()
  updatedSince?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
