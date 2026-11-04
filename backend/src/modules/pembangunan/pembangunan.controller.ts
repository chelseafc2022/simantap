import { UpdatePencairanDto } from './dto/update-pencairan.dto';
import { CreatePencairanDto } from './dto/create-pencairan.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { CreatePaketDto } from './dto/create-paket.dto';
import { QueryPaketDto } from './dto/query-paket.dto';
import { QueryRealisasiDto } from './dto/query-realisasi.dto';
import { SetTargetsDto } from './dto/set-targets.dto';
import { UpdatePaketDto } from './dto/update-paket.dto';
import {
  BulkUpsertRealisasiDto,
  UpsertRealisasiDto,
} from './dto/upsert-realisasi.dto';
import { UpsertRealisasiMingguanDto } from './dto/upsert-realisasi-mingguan.dto';
import { PembangunanService } from './pembangunan.service';

// Semua role yang bisa membaca data (read-only roles)
const ALL_ROLES = [
  RoleEnum.ADMINISTRATOR,
  RoleEnum.ADMIN_SIRUP,
  RoleEnum.ADMIN_PERENCANAAN,
  RoleEnum.ADMIN_PPK,
  RoleEnum.BENDAHARA,
  RoleEnum.KEPALA_OPD,
  RoleEnum.PIMPINAN_DAERAH,
  RoleEnum.MONEV,
];

@ApiTags('Paket Pembangunan (Menu 1, 2 & 3)')
@ApiBearerAuth('bearer')
@Controller('pembangunan')
export class PembangunanController {
  constructor(private readonly pembangunanService: PembangunanService) {}

  @Public()
  @Get('constants')
  @ApiOperation({
    summary: 'Daftar konstanta metode pemilihan, jenis pengadaan, sumber dana',
  })
  getConstants() {
    return this.pembangunanService.getPengadaanConstants();
  }

  @Get('opd-options')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Daftar referensi OPD aktif untuk dropdown filter dan formulir',
  })
  getOpdOptions(@CurrentUser() user: any) {
    return this.pembangunanService.getOpdOptions(user);
  }

  @Public()
  @Get('sub-units')
  @ApiOperation({
    summary: 'Daftar Sub Unit Kerja berdasarkan OPD penanggung jawab',
  })
  getSubUnits(@Query('opdId') opdId?: string) {
    return this.pembangunanService.getSubUnitOptions(opdId);
  }

  // ─── PERIODE & BATAS WAKTU INPUT (Cut-off) ──────────────────────────────
  @Get('periode')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Daftar batas waktu (cut-off) input realisasi 12 bulan',
  })
  getLockingPeriods(@Query('tahun') tahun?: string) {
    return this.pembangunanService.getLockingPeriods(
      tahun ? parseInt(tahun) : undefined,
    );
  }

  @Patch('periode/:bulan')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Update batas waktu atau toggle lock per bulan (Khusus Administrator)',
  })
  updateLockingPeriod(
    @Param('bulan') bulan: string,
    @Body() dto: { batasInput?: string; isLocked?: boolean; tahun?: number },
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.updateLockingPeriod(
      parseInt(bulan),
      dto,
      user,
    );
  }

  @Post('periode/reset-default')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Reset batas waktu input semua bulan ke tanggal 10 bulan berikutnya (Khusus Administrator)',
  })
  resetDefaultLockingPeriods(
    @Body('tahun') tahun: number,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.resetDefaultLockingPeriods(tahun, user);
  }

  @Post('periode/batch')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Aksi massal periode: Kunci Semua, Buka Semua, atau Atur Hari Cut-off Massal (Khusus Administrator)',
  })
  batchUpdateLockingPeriods(
    @Body()
    dto: {
      tahun?: number;
      action: 'LOCK_ALL' | 'UNLOCK_ALL' | 'SET_CUTOFF_DAY' | 'SET_CUSTOM_DATE';
      cutoffDay?: number;
      cutoffHour?: number;
      cutoffMinute?: number;
      customDate?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.batchUpdateLockingPeriods(dto, user);
  }

  // ─── MENU 2: Rekap Realisasi ────────────────────────────────────────────
  @Get('realisasi')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Rekapitulasi Realisasi Fisik & Keuangan bulanan (Menu 2)',
  })
  getRekapRealisasi(
    @Query() query: QueryRealisasiDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.getRekapRealisasi(query, user);
  }

  // ─── MENU 3: Laporan ────────────────────────────────────────────────────
  @Get('laporan/matriks')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Laporan Matriks 12 Bulan RFK (Menu 3)' })
  getLaporanMatriks(
    @Query() query: QueryRealisasiDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.getLaporanMatriks(query, user);
  }

  @Get('laporan/rekap-opd')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary:
      'Executive Summary Kinerja RFK dan Peringkat Keterlambatan per OPD',
  })
  getLaporanRekapOpd(
    @Query() query: QueryRealisasiDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.getLaporanRekapOpd(query, user);
  }

  // ─── MENU 1: Data Paket ─────────────────────────────────────────────────
  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary:
      'Daftar seluruh paket pembangunan terpaginasi dengan filter OPD, metode, dan tahun',
  })
  findAll(@Query() query: QueryPaketDto, @CurrentUser() user: any) {
    return this.pembangunanService.findAll(query, user);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary:
      'Detail lengkap satu paket pembangunan beserta 12 target bulanan dan riwayat realisasi',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pembangunanService.findOne(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_SIRUP)
  @ApiOperation({
    summary:
      'Tambah paket pembangunan baru (ADMIN_SIRUP) — data awal dari SiRUP LKPP',
  })
  @ApiResponse({
    status: 201,
    description: 'Paket pembangunan berhasil ditambahkan',
  })
  create(@Body() dto: CreatePaketDto, @CurrentUser() user: any) {
    return this.pembangunanService.create(dto, user);
  }

  @Put(':id')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_SIRUP, RoleEnum.ADMIN_PERENCANAAN)
  @ApiOperation({ summary: 'Perbarui data paket pembangunan (ADMIN_SIRUP / ADMIN_PERENCANAAN)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaketDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.update(id, dto, user);
  }

  @Patch(':id/targets')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PERENCANAAN)
  @ApiOperation({
    summary: 'Set target fisik kurva-S B01-B12 (hak khusus ADMIN_PERENCANAAN)',
  })
  setTargets(
    @Param('id') id: string,
    @Body() dto: SetTargetsDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.setTargets(id, dto, user);
  }

  // ─── Realisasi per paket ────────────────────────────────────────────────
  @Get(':id/realisasi')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary:
      'Riwayat lengkap realisasi 12 bulan + bukti fisik untuk satu paket',
  })
  getRealisasiPaket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pembangunanService.getRealisasiPaket(id, user);
  }

  @Post(':id/pencairan')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.BENDAHARA)
  @ApiOperation({
    summary: 'Tambah record pencairan dan hitung realisasi kumulatif otomatis',
  })
  tambahPencairan(
    @Param('id') id: string,
    @Body() dto: CreatePencairanDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.tambahPencairan(id, dto, user);
  }

  @Patch(':id/pencairan/:pencairanId')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.BENDAHARA)
  ubahPencairan(@Param('id') id: string, @Param('pencairanId') pencairanId: string,
    @Body() dto: UpdatePencairanDto, @CurrentUser() user: any) {
    return this.pembangunanService.ubahPencairan(id, pencairanId, dto, user);
  }

  @Delete(':id/pencairan/:pencairanId')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.BENDAHARA)
  hapusPencairan(@Param('id') id: string, @Param('pencairanId') pencairanId: string, @CurrentUser() user: any) {
    return this.pembangunanService.ubahPencairan(id, pencairanId, null, user);
  }

  @Put(':id/realisasi/:bulan/saldo')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.BENDAHARA)
  ubahSaldoRealisasi(@Param('id') id: string, @Param('bulan', ParseIntPipe) bulan: number,
    @Body() dto: UpdatePencairanDto, @CurrentUser() user: any) {
    return this.pembangunanService.ubahPencairan(id, null, dto, user, bulan);
  }

  @Delete(':id/realisasi-mingguan/:bulan/:minggu')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK, RoleEnum.BENDAHARA)
  hapusRealisasiMingguan(@Param('id') id: string, @Param('bulan', ParseIntPipe) bulan: number,
    @Param('minggu', ParseIntPipe) minggu: number, @CurrentUser() user: any) {
    return this.pembangunanService.hapusRealisasiMingguan(id, bulan, minggu, user);
  }

  @Put(':id/realisasi')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK, RoleEnum.BENDAHARA)
  @ApiOperation({
    summary:
      'Simpan/perbarui realisasi fisik & keuangan 1 bulan (PPK: fisik saja / Bendahara: keuangan saja)',
  })
  upsertRealisasi(
    @Param('id') id: string,
    @Body() dto: UpsertRealisasiDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.upsertRealisasi(id, dto, user);
  }

  @Put(':id/realisasi-mingguan')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK, RoleEnum.BENDAHARA)
  @ApiOperation({
    summary:
      'Simpan realisasi satu minggu dan sinkronkan rekap bulanannya untuk TEPRA',
  })
  upsertRealisasiMingguan(
    @Param('id') id: string,
    @Body() dto: UpsertRealisasiMingguanDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.upsertRealisasiMingguan(id, dto, user);
  }

  @Put(':id/realisasi/bulk')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK, RoleEnum.BENDAHARA)
  @ApiOperation({
    summary:
      'Simpan/perbarui realisasi beberapa bulan sekaligus (field-level: PPK/Bendahara)',
  })
  bulkUpsertRealisasi(
    @Param('id') id: string,
    @Body() dto: BulkUpsertRealisasiDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.bulkUpsertRealisasi(id, dto, user);
  }

  // ─── Upload Bukti Fisik (foto) oleh PPK ─────────────────────────────────
  @Post(':id/realisasi/:bulan/bukti')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(process.cwd(), 'uploads', 'bukti-fisik');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const uniqueId = randomUUID();
          cb(null, `bukti-${uniqueId}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp|gif|mp4|pdf)$/i;
        if (!allowed.test(extname(file.originalname))) {
          return cb(
            new Error(
              'Hanya file gambar (JPG, PNG, WEBP, GIF), video (MP4), atau PDF yang diizinkan',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // max 10 MB per file
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload foto/video/PDF bukti realisasi fisik lapangan oleh PPK (max 5 file, 10MB/file)',
  })
  @HttpCode(HttpStatus.CREATED)
  uploadBuktiFisik(
    @Param('id') id: string,
    @Param('bulan') bulan: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('deskripsi') deskripsi: string,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.uploadBuktiFisik(
      id,
      parseInt(bulan),
      files,
      deskripsi,
      user,
    );
  }

  @Post(':id/realisasi/:bulan/:minggu/bukti')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(process.cwd(), 'uploads', 'bukti-fisik');
          if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `bukti-${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp|gif|mp4|pdf)$/i;
        if (!allowed.test(extname(file.originalname))) {
          return cb(new Error('Format bukti fisik tidak didukung'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  uploadBuktiFisikMingguan(
    @Param('id') id: string,
    @Param('bulan') bulan: string,
    @Param('minggu') minggu: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('deskripsi') deskripsi: string,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.uploadBuktiFisik(
      id,
      parseInt(bulan),
      files,
      deskripsi,
      user,
      parseInt(minggu),
    );
  }

  // ─── Hapus Bukti Fisik ──────────────────────────────────────────────────
  @Delete('bukti/:buktiFisikId')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK)
  @ApiOperation({
    summary: 'Hapus satu bukti fisik (foto/video) yang sudah diupload',
  })
  deleteBuktiFisik(
    @Param('buktiFisikId') buktiFisikId: string,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.deleteBuktiFisik(buktiFisikId, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Hapus paket pembangunan (khusus ADMINISTRATOR, cascade seluruh data)',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pembangunanService.remove(id, user);
  }
}
