import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { QueryPegawaiDirectoryDto } from './dto/query-pegawai.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { RevokeRoleDto, SetRoleDto } from './dto/set-role.dto';
import { UsersService } from './users.service';

@ApiTags('User Management & E-Gov SIMPEG')
@ApiBearerAuth('bearer')
@Roles(RoleEnum.ADMINISTRATOR)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary: 'Daftar pengguna aktif SIMANTAP dengan filter role dan OPD',
  })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('pegawai/lookup')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Lookup / Autocomplete Pegawai ASN langsung dari server E-Gov & SIMPEG',
    description:
      'Pencarian kata kunci minimal 3 karakter (NIP, Nama, atau OPD) untuk penugasan role.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Kata kunci pencarian NIP atau nama pegawai',
  })
  lookupPegawai(@Query('q') query: string) {
    return this.usersService.lookupPegawai(query || '');
  }

  @Get('pegawai/directory')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Direktori seluruh Pegawai ASN E-Gov & SIMPEG terpaginasi beserta status hak akses SIMANTAP',
  })
  getPegawaiDirectory(@Query() query: QueryPegawaiDirectoryDto) {
    return this.usersService.getPegawaiDirectory(query);
  }

  @Post('set-role')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary: 'Penetapan atau pembaruan hak akses Role Pengguna (7 Role RBAC)',
    description:
      'Mengadopsi mekanisme set_role konsel-setara. Otomatis menarik data dari E-Gov jika belum ada di lokal.',
  })
  @ApiResponse({ status: 200, description: 'Role berhasil diberikan' })
  setRole(@Body() dto: SetRoleDto, @CurrentUser('id') adminId: string) {
    return this.usersService.setRole(dto, adminId);
  }

  @Post('revoke-role')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Mencabut hak akses sistem SIMANTAP untuk pegawai (Non-aktifkan status, role tetap tersimpan)',
  })
  revokeRole(@Body() dto: RevokeRoleDto, @CurrentUser('id') adminId: string) {
    return this.usersService.revokeRole(dto.nip, adminId);
  }

  @Post('reset-to-default')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Mengembalikan role ke default (Belum Diberi Akses) dan membersihkan data dari SIMANTAP',
  })
  resetToDefault(
    @Body() dto: RevokeRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.resetToDefault(dto.nip, adminId);
  }

  @Get('pegawai/instansi')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Daftar Instansi / Unit Kerja dari database SIMPEG Konsel (READ-ONLY)',
  })
  getInstansi() {
    return this.usersService.getInstansiList();
  }

  @Get('pegawai/unit-kerja')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary: 'Daftar Sub Unit Kerja dari database SIMPEG Konsel (READ-ONLY)',
  })
  @ApiQuery({
    name: 'instansiId',
    required: false,
    description: 'ID Instansi untuk filter sub unit kerja',
  })
  getUnitKerja(@Query('instansiId') instansiId?: string) {
    return this.usersService.getUnitKerjaList(instansiId);
  }

  @Get('roles/master')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({ summary: 'Daftar master role resmi SIMANTAP dari database' })
  getMasterRoles() {
    return this.usersService.getMasterRoles();
  }

  @Put('roles/:id/matrix')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({ summary: 'Memperbarui matriks hak akses dan cakupan unit peran (Administrator)' })
  updateRoleMatrix(
    @Param('id') id: string,
    @Body() body: { aksesUnit: number; menus: any[]; catatanKewenangan?: string },
    @CurrentUser('id') adminUserId?: string,
  ) {
    return this.usersService.updateRoleMatrix(id, body, adminUserId);
  }

  @Get(':id')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({ summary: 'Mendapatkan data detail pengguna berdasarkan ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
