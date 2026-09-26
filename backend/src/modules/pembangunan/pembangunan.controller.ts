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
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { SetTargetsDto } from './dto/set-targets.dto';
import { UpdatePaketDto } from './dto/update-paket.dto';
import { PembangunanService } from './pembangunan.service';

@ApiTags('Paket Pembangunan (Menu 1)')
@ApiBearerAuth('bearer')
@Controller('pembangunan')
export class PembangunanController {
  constructor(private readonly pembangunanService: PembangunanService) {}

  @Public()
  @Get('constants')
  @ApiOperation({
    summary: 'Daftar konstanta pilihan metode pemilihan, jenis pengadaan, dan sumber dana',
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
    summary: 'Daftar Sub Unit Kerja / Bagian / Bidang berdasarkan OPD penanggung jawab',
  })
  getSubUnits(@Query('opdId') opdId?: string) {
    return this.pembangunanService.getSubUnitOptions(opdId);
  }

  @Get()
  @Roles(
    RoleEnum.ADMINISTRATOR,
    RoleEnum.ADMIN_PPK,
    RoleEnum.ADMIN_SIRUP,
    RoleEnum.ADMIN_PERENCANAAN,
    RoleEnum.KEPALA_OPD,
    RoleEnum.PIMPINAN_DAERAH,
  )
  @ApiOperation({
    summary: 'Daftar seluruh paket pembangunan terpaginasi dengan filter OPD, metode, dan tahun',
  })
  findAll(@Query() query: QueryPaketDto, @CurrentUser() user: any) {
    return this.pembangunanService.findAll(query, user);
  }

  @Get(':id')
  @Roles(
    RoleEnum.ADMINISTRATOR,
    RoleEnum.ADMIN_PPK,
    RoleEnum.ADMIN_SIRUP,
    RoleEnum.ADMIN_PERENCANAAN,
    RoleEnum.KEPALA_OPD,
    RoleEnum.PIMPINAN_DAERAH,
  )
  @ApiOperation({
    summary: 'Detail lengkap satu paket pembangunan beserta 12 target bulanan dan riwayat realisasi',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pembangunanService.findOne(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK, RoleEnum.ADMIN_SIRUP)
  @ApiOperation({
    summary: 'Tambah data paket pembangunan baru dan inisialisasi target fisik B01-B12',
  })
  @ApiResponse({ status: 201, description: 'Paket pembangunan berhasil ditambahkan' })
  create(@Body() dto: CreatePaketDto, @CurrentUser() user: any) {
    return this.pembangunanService.create(dto, user);
  }

  @Put(':id')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK, RoleEnum.ADMIN_SIRUP)
  @ApiOperation({
    summary: 'Perbarui data paket pembangunan beserta target fisik bulanan',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaketDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.update(id, dto, user);
  }

  @Patch(':id/targets')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK, RoleEnum.ADMIN_SIRUP)
  @ApiOperation({
    summary: 'Perbarui khusus tabel target fisik bulanan (B01-B12) untuk paket pembangunan tertentu',
  })
  setTargets(
    @Param('id') id: string,
    @Body() dto: SetTargetsDto,
    @CurrentUser() user: any,
  ) {
    return this.pembangunanService.setTargets(id, dto, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PPK)
  @ApiOperation({
    summary: 'Hapus data paket pembangunan (cascade menghapus seluruh target & realisasi bulanan)',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pembangunanService.remove(id, user);
  }
}
