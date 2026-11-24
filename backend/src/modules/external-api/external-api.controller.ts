import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ApiKeyGuard } from './api-key.guard';
import { ExtPaketQueryDto } from './external-api.dto';
import { DokumenTipe, ExternalApiService } from './external-api.service';

const TIPE_VALID: DokumenTipe[] = ['bukti-pencairan', 'bukti-fisik', 'monev-foto'];

/**
 * API eksternal READ-ONLY (mis. integrasi Inspektorat).
 * Otentikasi memakai header X-API-Key, bukan JWT.
 */
@ApiTags('External API (Read-Only)')
@ApiHeader({ name: 'X-API-Key', required: true })
@Public()
@UseGuards(ApiKeyGuard)
@Controller('ext')
export class ExternalApiController {
  constructor(private readonly service: ExternalApiService) {}

  @Get('paket')
  @ApiOperation({ summary: 'Daftar paket beserta MAK (mendukung updatedSince)' })
  listPaket(@Query() q: ExtPaketQueryDto) {
    return this.service.listPaket(q);
  }

  @Get('paket/:id')
  @ApiOperation({ summary: 'Detail satu paket beserta MAK' })
  getPaket(@Param('id') id: string) {
    return this.service.getPaket(id);
  }

  @Get('paket/:id/realisasi')
  @ApiOperation({ summary: 'Target, realisasi fisik/keuangan, pencairan, monev' })
  getRealisasi(@Param('id') id: string) {
    return this.service.getRealisasi(id);
  }

  @Get('paket/:id/dokumen')
  @ApiOperation({ summary: 'Daftar bukti dukung (metadata + tautan unduh)' })
  listDokumen(@Param('id') id: string) {
    return this.service.listDokumen(id);
  }

  @Get('mak')
  @ApiOperation({ summary: 'Daftar datar MAK dan paketnya (filter awalan MAK)' })
  listMak(@Query() q: ExtPaketQueryDto) {
    return this.service.listMak(q);
  }

  @Get('dokumen/:tipe/:id/download')
  @ApiOperation({ summary: 'Unduh berkas bukti dukung' })
  async download(
    @Param('tipe') tipe: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (!TIPE_VALID.includes(tipe as DokumenTipe)) {
      throw new BadRequestException(
        `Tipe dokumen harus salah satu dari: ${TIPE_VALID.join(', ')}`,
      );
    }
    const doc = await this.service.resolveDokumen(tipe as DokumenTipe, id);
    if (doc.mimeType) res.type(doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.namaFile)}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(doc.fullPath);
  }
}
