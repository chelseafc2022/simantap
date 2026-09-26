import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TargetBulananItemDto } from './target-bulanan.dto';

export class CreatePaketDto {
  @ApiPropertyOptional({
    description: 'Tahun Anggaran',
    default: 2026,
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tahunAnggaran?: number = 2026;

  @ApiProperty({ description: 'ID OPD penanggung jawab paket' })
  @IsNotEmpty({ message: 'OPD wajib dipilih' })
  @IsString()
  opdId: string;

  @ApiPropertyOptional({ description: 'ID Sub Unit kerja' })
  @IsOptional()
  @IsString()
  subUnitId?: string;

  @ApiPropertyOptional({ description: 'Kode RUP / Kode Kontrak SIRUP' })
  @IsOptional()
  @IsString()
  kodeRupKontrak?: string;

  @ApiProperty({ description: 'Nama Paket Pekerjaan / Pembangunan' })
  @IsNotEmpty({ message: 'Nama paket wajib diisi' })
  @IsString()
  namaPaket: string;

  @ApiPropertyOptional({ description: 'Lokasi Pekerjaan / Kegiatan' })
  @IsOptional()
  @IsString()
  lokasiKegiatan?: string;

  @ApiPropertyOptional({
    description:
      'Metode Pemilihan Pengadaan (E-Purchasing, Pengadaan Langsung, Tender, Swakelola, Penunjukan Langsung)',
    example: 'Tender',
  })
  @IsOptional()
  @IsString()
  metodePemilihan?: string;

  @ApiPropertyOptional({
    description:
      'Jenis Pengadaan (Pekerjaan Konstruksi, Pengadaan Barang, Jasa Konsultansi, Jasa Lainnya)',
    example: 'Pekerjaan Konstruksi',
  })
  @IsOptional()
  @IsString()
  jenisPengadaan?: string;

  @ApiProperty({ description: 'Nilai Pagu Anggaran (Rp)', example: 500000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Nilai pagu minimal 0' })
  nilaiPagu: number;

  @ApiProperty({
    description: 'Nilai Kontrak Hasil Pengadaan (Rp)',
    example: 485000000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Nilai kontrak minimal 0' })
  nilaiKontrak: number;

  @ApiPropertyOptional({
    description: 'Sumber Dana (DAU, DAK Fisik, DBH, PAD, dll)',
    example: 'DAU',
  })
  @IsOptional()
  @IsString()
  sumberDana?: string;

  @ApiPropertyOptional({ description: 'Nomor Kontrak / SPK' })
  @IsOptional()
  @IsString()
  nomorKontrak?: string;

  @ApiPropertyOptional({
    description: 'Tanggal Mulai Kontrak',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  tanggalMulai?: string;

  @ApiPropertyOptional({
    description: 'Tanggal Selesai Kontrak',
    example: '2026-10-31',
  })
  @IsOptional()
  @IsDateString()
  tanggalSelesai?: string;

  @ApiPropertyOptional({
    description: 'Nama Perusahaan / Penyedia / Rekanan Pemenang',
  })
  @IsOptional()
  @IsString()
  pemenangRekanan?: string;

  @ApiPropertyOptional({ description: 'Keterangan tambahan paket' })
  @IsOptional()
  @IsString()
  keterangan?: string;

  @ApiPropertyOptional({
    description: 'Daftar Target Fisik Bulanan (Bulan 1 sampai 12)',
    type: [TargetBulananItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TargetBulananItemDto)
  targetBulanan?: TargetBulananItemDto[];
}
