import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleEnum.ADMINISTRATOR, RoleEnum.PIMPINAN_DAERAH)
  @ApiOperation({
    summary: 'Daftar pengguna aktif SIMANTAP dengan filter role dan OPD',
  })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('pegawai/lookup')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary: 'Lookup / Autocomplete Pegawai ASN langsung dari server E-Gov & SIMPEG',
    description: 'Pencarian kata kunci minimal 3 karakter (NIP, Nama, atau OPD) untuk penugasan role.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Kata kunci pencarian NIP atau nama pegawai' })
  lookupPegawai(@Query('q') query: string) {
    return this.usersService.lookupPegawai(query || '');
  }

  @Get('pegawai/directory')
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary: 'Direktori seluruh Pegawai ASN E-Gov & SIMPEG terpaginasi beserta status hak akses SIMANTAP',
  })
  getPegawaiDirectory(@Query() query: QueryPegawaiDirectoryDto) {
    return this.usersService.getPegawaiDirectory(query);
  }

  @Post('set-role')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary: 'Penetapan atau pembaruan hak akses Role Pengguna (7 Role RBAC)',
    description: 'Mengadopsi mekanisme set_role konsel-setara. Otomatis menarik data dari E-Gov jika belum ada di lokal.',
  })
  @ApiResponse({ status: 200, description: 'Role berhasil diberikan' })
  setRole(
    @Body() dto: SetRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.setRole(dto, adminId);
  }

  @Post('revoke-role')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.ADMINISTRATOR)
  @ApiOperation({
    summary: 'Mencabut hak akses sistem SIMANTAP untuk pegawai (Non-aktifkan)',
  })
  revokeRole(
    @Body() dto: RevokeRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.revokeRole(dto.nip, adminId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan data detail pengguna berdasarkan ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
