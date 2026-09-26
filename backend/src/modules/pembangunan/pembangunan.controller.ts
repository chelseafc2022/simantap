import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { VerifikasiRealisasiDto } from './dto/verifikasi-realisasi.dto';
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

  @Public()
  @Get('opd-options')
  @ApiOperation({
    summary: 'Daftar referensi OPD aktif untuk dropdown filter dan formulir',
  })
  getOpdOptions() {
    return this.pembangunanService.getOpdOptions();
  }

  @Public()
  @Get('sub-units')
  @ApiOperation({
    summary: 'Daftar Sub Unit Kerja berdasarkan OPD penanggung jawab',
  })
  getSubUnits(@Query('opdId') opdId?: string) {
    return this.pembangunanService.getSubUnitOptions(opdId);
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

  // ─── ANTRIAN VERIFIKASI untuk MONEV ─────────────────────────────────────
  @Get('monev/antrian')
  @Roles(
    RoleEnum.ADMINISTRATOR,
    RoleEnum.MONEV,
    RoleEnum.KEPALA_OPD,
    RoleEnum.PIMPINAN_DAERAH,
  )
  @ApiOperation({
    summary:
      'Daftar realisasi bulanan yang sudah diajukan PPK dan menunggu verifikasi MONEV',
  })
  getAntrianVerifikasi(
    @Query() query: QueryRealisasiDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.getAntrianVerifikasi(query, user);
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

  // ─── Ajukan Realisasi ke MONEV (PPK/Bendahara) ─────────────────────────
  @Patch(':id/realisasi/:bulan/ajukan')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK, RoleEnum.BENDAHARA)
  @ApiOperation({
    summary:
      'PPK/Bendahara mengajukan realisasi bulan tertentu ke MONEV untuk diverifikasi',
  })
  ajukanRealisasi(
    @Param('id') id: string,
    @Param('bulan') bulan: string,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.ajukanRealisasi(id, parseInt(bulan), user);
  }

  // ─── Verifikasi MONEV: ACC ───────────────────────────────────────────────
  @Patch(':id/realisasi/:bulan/acc')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.MONEV)
  @ApiOperation({
    summary:
      'MONEV menyetujui (ACC) realisasi yang diajukan PPK — data terkunci final',
  })
  accRealisasi(
    @Param('id') id: string,
    @Param('bulan') bulan: string,
    @Body() dto: VerifikasiRealisasiDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.accRealisasi(id, parseInt(bulan), dto, user);
  }

  // ─── Verifikasi MONEV: TOLAK ─────────────────────────────────────────────
  @Patch(':id/realisasi/:bulan/tolak')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.MONEV)
  @ApiOperation({
    summary:
      'MONEV menolak realisasi dengan mengisi alasan — data dikembalikan ke PPK',
  })
  tolakRealisasi(
    @Param('id') id: string,
    @Param('bulan') bulan: string,
    @Body() dto: VerifikasiRealisasiDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.tolakRealisasi(
      id,
      parseInt(bulan),
      dto,
      user,
    );
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
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `bukti-${uniqueSuffix}${extname(file.originalname)}`);
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
