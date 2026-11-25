import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { QueryPegawaiDirectoryDto } from './dto/query-pegawai.dto';
import { SelfRegisterDto } from './dto/self-register.dto';
import { UsersService } from './users.service';

@ApiTags('Registrasi Mandiri ASN (QR Code)')
@Public()
@Controller('users/self-register')
export class SelfRegisterController {
  constructor(private readonly usersService: UsersService) {}

  @Get('instansi')
  @ApiOperation({
    summary: 'Daftar Unit Kerja (OPD) untuk form registrasi mandiri',
  })
  getInstansi() {
    return this.usersService.getInstansiList();
  }

  @Get('unit-kerja')
  @ApiOperation({
    summary: 'Daftar Sub Unit Kerja berdasarkan instansiId',
  })
  @ApiQuery({ name: 'instansiId', required: false, type: String })
  getUnitKerja(@Query('instansiId') instansiId?: string) {
    return this.usersService.getUnitKerjaList(instansiId);
  }

  @Get('pegawai')
  @ApiOperation({
    summary:
      'Pencarian pegawai ASN (debounced) beserta status apakah sudah punya role',
  })
  searchPegawai(@Query() query: QueryPegawaiDirectoryDto) {
    query.limit = Math.min(Number(query.limit) || 20, 30);
    return this.usersService.getPegawaiDirectory(query);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrasi mandiri role OPD oleh pegawai setelah scan QR Code',
  })
  selfRegister(@Body() dto: SelfRegisterDto) {
    return this.usersService.selfRegister(dto);
  }
}
