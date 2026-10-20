import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SirupService } from './sirup.service';

export class SyncOpdDto {
  @IsOptional()
  @IsNumber()
  tahun?: number;

  @IsOptional()
  @IsString()
  opdId?: string;

  @IsOptional()
  @IsBoolean()
  onlyPembangunan?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kodeRupList?: string[];
}

export class ResetPaketDto {
  @IsOptional()
  @IsNumber()
  tahun?: number;

  @IsOptional()
  @IsString()
  opdId?: string;
}

@ApiTags('RUP Konsel Setara Integration')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sirup')
export class SirupController {
  constructor(private readonly sirupService: SirupService) {}

  @Get('summary')
  @Roles(
    RoleEnum.ADMINISTRATOR,
    RoleEnum.ADMIN_SIRUP,
    RoleEnum.ADMIN_PERENCANAAN,
    RoleEnum.ADMIN_PPK,
    RoleEnum.BENDAHARA,
    RoleEnum.KEPALA_OPD,
    RoleEnum.PIMPINAN_DAERAH,
    RoleEnum.MONEV,
  )
  @ApiOperation({ summary: 'Ambil ringkasan total pagu dan paket RUP daerah' })
  @ApiQuery({ name: 'tahun', required: false, type: String })
  async getSummary(@Query('tahun') tahun?: string) {
    return this.sirupService.getSummary(tahun);
  }

  @Get('satker-options')
  @Roles(
    RoleEnum.ADMINISTRATOR,
    RoleEnum.ADMIN_SIRUP,
    RoleEnum.ADMIN_PERENCANAAN,
    RoleEnum.ADMIN_PPK,
    RoleEnum.BENDAHARA,
    RoleEnum.KEPALA_OPD,
    RoleEnum.PIMPINAN_DAERAH,
    RoleEnum.MONEV,
  )
  @ApiOperation({
    summary: 'Daftar satuan kerja dari tabel RUP Konsel Setara',
  })
  async getSatkerOptions() {
    return this.sirupService.getSatkerOptions();
  }

  @Get('search')
  @Roles(
    RoleEnum.ADMINISTRATOR,
    RoleEnum.ADMIN_SIRUP,
    RoleEnum.ADMIN_PERENCANAAN,
    RoleEnum.ADMIN_PPK,
    RoleEnum.BENDAHARA,
    RoleEnum.KEPALA_OPD,
    RoleEnum.PIMPINAN_DAERAH,
    RoleEnum.MONEV,
  )
  @ApiOperation({ summary: 'Cari paket RUP berdasarkan kode atau nama paket' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'tahun', required: false, type: String })
  @ApiQuery({ name: 'satker', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchPaket(
    @Query('q') q?: string,
    @Query('tahun') tahun?: string,
    @Query('satker') satker?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sirupService.searchPaket({
      q,
      tahun,
      satker,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('preview-opd')
  @Roles(
    RoleEnum.ADMINISTRATOR,
    RoleEnum.ADMIN_SIRUP,
    RoleEnum.ADMIN_PERENCANAAN,
    RoleEnum.KEPALA_OPD,
    RoleEnum.MONEV,
  )
  @ApiOperation({ summary: 'Pratinjau daftar paket SiRUP milik OPD' })
  @ApiQuery({ name: 'tahun', required: false, type: Number })
  @ApiQuery({ name: 'opdId', required: false, type: String })
  async getPreviewOpd(
    @Query('tahun') tahun?: string,
    @Query('opdId') opdId?: string,
    @CurrentUser() user?: any,
  ) {
    const isSuperRole = [
      RoleEnum.ADMINISTRATOR,
      RoleEnum.PIMPINAN_DAERAH,
      RoleEnum.MONEV,
    ].includes(user?.role);

    if (!isSuperRole && opdId && opdId !== user?.opdId) {
      throw new ForbiddenException(
        'Anda hanya memiliki izin untuk melihat pratinjau data OPD Anda sendiri',
      );
    }

    const targetOpdId = isSuperRole
      ? (opdId || user?.opdId || 'ALL')
      : user?.opdId;

    if (!targetOpdId) {
      throw new BadRequestException('ID OPD wajib disertakan');
    }

    const targetTahun = tahun ? parseInt(tahun, 10) : 2026;
    return this.sirupService.getPreviewPaketOpd({
      tahun: targetTahun,
      opdId: targetOpdId,
    });
  }

  @Post('sync-opd')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_SIRUP, RoleEnum.MONEV)
  @ApiOperation({
    summary: 'Sinkronisasi massal paket dari tabel RUP ke MONALISA',
  })
  async syncOpd(
    @Body() dto: SyncOpdDto,
    @CurrentUser() user?: any,
  ) {
    const isSuperRole = [
      RoleEnum.ADMINISTRATOR,
      RoleEnum.PIMPINAN_DAERAH,
      RoleEnum.MONEV,
    ].includes(user?.role);

    // Kunci OPD: Pengguna dinas HANYA BISA sinkronisasi OPD-nya sendiri
    // Administrator bisa sinkronkan spesifik OPD atau 'ALL' (Semua OPD)
    if (!isSuperRole && dto.opdId && dto.opdId !== user?.opdId) {
      throw new ForbiddenException(
        'Anda hanya memiliki izin untuk menyinkronkan data OPD Anda sendiri',
      );
    }

    const targetOpdId = isSuperRole
      ? (dto.opdId || user?.opdId || 'ALL')
      : user?.opdId;

    if (!targetOpdId) {
      throw new BadRequestException('ID OPD wajib disertakan');
    }

    const targetTahun = dto.tahun || 2026;
    return this.sirupService.syncPaketByOpd({
      tahun: targetTahun,
      opdId: targetOpdId,
      userId: user?.id,
      onlyPembangunan: dto.onlyPembangunan !== false,
      kodeRupList: dto.kodeRupList,
    });
  }

  @Get('paket/:kodeRup')
  @Roles(
    RoleEnum.ADMINISTRATOR,
    RoleEnum.ADMIN_SIRUP,
    RoleEnum.ADMIN_PERENCANAAN,
    RoleEnum.ADMIN_PPK,
    RoleEnum.BENDAHARA,
    RoleEnum.KEPALA_OPD,
    RoleEnum.PIMPINAN_DAERAH,
    RoleEnum.MONEV,
  )
  @ApiOperation({
    summary: 'Ambil detail spesifik paket SiRUP berdasarkan kode RUP untuk auto-fill',
  })
  @ApiParam({ name: 'kodeRup', description: 'Kode RUP dari SiRUP LKPP' })
  @ApiQuery({ name: 'tahun', required: false, type: String })
  async getPaketByKodeRup(
    @Param('kodeRup') kodeRup: string,
    @Query('tahun') tahun?: string,
  ) {
    return this.sirupService.getPaketByKodeRup(kodeRup, tahun);
  }

  @Post('reset-paket')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary: 'Reset / kosongkan seluruh paket pembangunan menjadi 0 (Khusus Administrator)',
  })
  async resetPaket(
    @Body() dto: ResetPaketDto,
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === RoleEnum.ADMINISTRATOR;
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Hanya Administrator yang memiliki wewenang untuk mengosongkan data paket MONALISA',
      );
    }

    const targetTahun = dto.tahun || 2026;
    return this.sirupService.resetPaket({
      tahun: targetTahun,
      opdId: dto.opdId || 'ALL',
      userId: user?.id,
    });
  }
}
