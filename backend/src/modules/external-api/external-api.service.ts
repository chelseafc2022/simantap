import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { EgovService } from '../../core/egov/egov.service';
import { ExtPaketQueryDto } from './external-api.dto';

export type DokumenTipe = 'bukti-pencairan' | 'bukti-fisik' | 'monev-foto';

const DOKUMEN_DIR: Record<DokumenTipe, string> = {
  'bukti-pencairan': 'bukti-pencairan',
  'bukti-fisik': 'bukti-fisik',
  'monev-foto': 'monev',
};

const EXT_PREFIX = '/api/v1/ext';

/**
 * Layanan baca-saja untuk integrasi eksternal (mis. Inspektorat).
 * Tidak ada operasi tulis ke data paket/realisasi.
 */
@Injectable()
export class ExternalApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly egovService: EgovService,
  ) {}

  private opdInfo(opdId?: string | null) {
    const opd = this.egovService.getOpdById(opdId);
    return opd
      ? { id: opd.id, kode: opd.kodeOpd, nama: opd.namaOpd }
      : null;
  }

  private buildWhere(q: ExtPaketQueryDto): Prisma.PaketPembangunanWhereInput {
    const and: Prisma.PaketPembangunanWhereInput[] = [];
    if (q.tahun) and.push({ tahunAnggaran: q.tahun });
    if (q.opdId) and.push({ opdId: q.opdId });
    if (q.mak) and.push({ mak: { some: { mak: { startsWith: q.mak } } } });
    if (q.updatedSince) {
      const since = new Date(q.updatedSince);
      and.push({
        OR: [
          { updatedAt: { gte: since } },
          { mak: { some: { updatedAt: { gte: since } } } },
          { realisasiBulanan: { some: { updatedAt: { gte: since } } } },
          { realisasiMingguan: { some: { updatedAt: { gte: since } } } },
          { pencairanKeuangan: { some: { createdAt: { gte: since } } } },
          { monevLapangan: { some: { updatedAt: { gte: since } } } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private serializePaket(p: any) {
    return {
      id: p.id,
      tahunAnggaran: p.tahunAnggaran,
      kodeRup: p.kodeRupKontrak,
      namaPaket: p.namaPaket,
      opd: this.opdInfo(p.opdId),
      subUnit: p.subUnitId
        ? (() => {
            const s = this.egovService.getSubUnitById(p.subUnitId);
            return s ? { id: s.id, nama: (s as any).namaSubUnit ?? (s as any).nama ?? null } : null;
          })()
        : null,
      kelompokPaket: p.kelompokPaket,
      polaMonitoring: p.polaMonitoring,
      metodePemilihan: p.metodePemilihan,
      jenisPengadaan: p.jenisPengadaan,
      sumberDana: p.sumberDana,
      nilaiPagu: Number(p.nilaiPagu),
      nilaiKontrak: Number(p.nilaiKontrak),
      nomorKontrak: p.nomorKontrak,
      tanggalMulai: p.tanggalMulai,
      tanggalSelesai: p.tanggalSelesai,
      pemenangRekanan: p.pemenangRekanan,
      parentId: p.parentId,
      mak: (p.mak || []).map((m: any) => ({
        mak: m.mak,
        pagu: Number(m.pagu),
        sumberDana: m.sumberDana,
      })),
      updatedAt: p.updatedAt,
    };
  }

  async listPaket(q: ExtPaketQueryDto) {
    const page = q.page || 1;
    const limit = q.limit || 50;
    const where = this.buildWhere(q);

    const [total, rows] = await Promise.all([
      this.prisma.paketPembangunan.count({ where }),
      this.prisma.paketPembangunan.findMany({
        where,
        include: { mak: { orderBy: { createdAt: 'asc' } } },
        orderBy: [{ tahunAnggaran: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const ids = rows.map((r) => r.id);
    const [pencairan, realisasi] = ids.length
      ? await Promise.all([
          this.prisma.pencairanKeuangan.groupBy({
            by: ['paketId'],
            where: { paketId: { in: ids } },
            _sum: { nominal: true },
          }),
          this.prisma.realisasiBulanan.groupBy({
            by: ['paketId'],
            where: { paketId: { in: ids } },
            _max: { realisasiFisik: true },
          }),
        ])
      : [[], []];
    const pencairanMap = new Map(
      pencairan.map((x) => [x.paketId, Number(x._sum.nominal || 0)]),
    );
    const fisikMap = new Map(
      realisasi.map((x) => [x.paketId, x._max.realisasiFisik ?? 0]),
    );

    return {
      data: rows.map((r) => ({
        ...this.serializePaket(r),
        totalPencairan: pencairanMap.get(r.id) ?? 0,
        realisasiFisikTertinggi: fisikMap.get(r.id) ?? 0,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Daftar datar MAK ⇄ paket (satu baris per kode MAK). */
  async listMak(q: ExtPaketQueryDto) {
    const page = q.page || 1;
    const limit = q.limit || 100;
    const paketWhere = this.buildWhere({ ...q, mak: undefined });
    const where: Prisma.PaketMakWhereInput = {
      paket: paketWhere,
      ...(q.mak ? { mak: { startsWith: q.mak } } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.paketMak.count({ where }),
      this.prisma.paketMak.findMany({
        where,
        include: {
          paket: {
            select: {
              id: true,
              tahunAnggaran: true,
              kodeRupKontrak: true,
              namaPaket: true,
              opdId: true,
              nilaiPagu: true,
              nilaiKontrak: true,
            },
          },
        },
        orderBy: [{ mak: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((r) => ({
        mak: r.mak,
        paguMak: Number(r.pagu),
        sumberDana: r.sumberDana,
        paket: {
          id: r.paket.id,
          tahunAnggaran: r.paket.tahunAnggaran,
          kodeRup: r.paket.kodeRupKontrak,
          namaPaket: r.paket.namaPaket,
          opd: this.opdInfo(r.paket.opdId),
          nilaiPagu: Number(r.paket.nilaiPagu),
          nilaiKontrak: Number(r.paket.nilaiKontrak),
        },
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async findPaketOrFail(id: string) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id },
      include: { mak: { orderBy: { createdAt: 'asc' } } },
    });
    if (!paket) throw new NotFoundException('Paket tidak ditemukan');
    return paket;
  }

  async getPaket(id: string) {
    const paket = await this.findPaketOrFail(id);
    return this.serializePaket(paket);
  }

  async getRealisasi(id: string) {
    await this.findPaketOrFail(id);

    const [targetBulanan, targetMingguan, bulanan, mingguan, pencairan, monev] =
      await Promise.all([
        this.prisma.targetBulanan.findMany({
          where: { paketId: id },
          orderBy: { bulan: 'asc' },
        }),
        this.prisma.targetMingguan.findMany({
          where: { paketId: id },
          orderBy: [{ bulan: 'asc' }, { mingguKe: 'asc' }],
        }),
        this.prisma.realisasiBulanan.findMany({
          where: { paketId: id },
          orderBy: { bulan: 'asc' },
        }),
        this.prisma.realisasiMingguan.findMany({
          where: { paketId: id },
          orderBy: [{ bulan: 'asc' }, { mingguKe: 'asc' }],
        }),
        this.prisma.pencairanKeuangan.findMany({
          where: { paketId: id },
          orderBy: [{ bulan: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.monevLapangan.findMany({
          where: { paketId: id },
          orderBy: { tanggalMonev: 'asc' },
        }),
      ]);

    return {
      targetBulanan: targetBulanan.map((t: any) => ({
        bulan: t.bulan,
        targetFisik: t.targetFisik,
      })),
      targetMingguan: targetMingguan.map((t: any) => ({
        bulan: t.bulan,
        mingguKe: t.mingguKe,
        targetFisik: t.targetFisik,
      })),
      realisasiBulanan: bulanan.map((r) => ({
        bulan: r.bulan,
        realisasiFisik: r.realisasiFisik,
        realisasiKeuangan: Number(r.realisasiKeuangan),
        statusVerifikasi: r.statusVerifikasi,
        catatanVerifikasi: r.catatanVerifikasi,
        verifikasiAt: r.verifikasiAt,
        diajukanAt: r.diajukanAt,
        updatedAt: r.updatedAt,
      })),
      realisasiMingguan: mingguan.map((r) => ({
        bulan: r.bulan,
        mingguKe: r.mingguKe,
        realisasiFisik: r.realisasiFisik,
        realisasiKeuangan: Number(r.realisasiKeuangan),
        catatan: r.catatanOperator,
        updatedAt: r.updatedAt,
      })),
      pencairanKeuangan: pencairan.map((p) => ({
        id: p.id,
        bulan: p.bulan,
        nominal: Number(p.nominal),
        catatan: p.catatan,
        createdAt: p.createdAt,
      })),
      monevLapangan: monev.map((m) => ({
        id: m.id,
        tanggalMonev: m.tanggalMonev,
        progresFisik: m.progresFisik,
        kondisiFisik: m.kondisiFisik,
        permasalahan: m.permasalahan,
        saran: m.saran,
      })),
    };
  }

  async listDokumen(id: string) {
    await this.findPaketOrFail(id);

    const [bPencairan, bFisik, fotoMonev] = await Promise.all([
      this.prisma.buktiPencairan.findMany({
        where: { pencairan: { paketId: id } },
        include: { pencairan: { select: { id: true, bulan: true, nominal: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.buktiFisik.findMany({
        where: { realisasi: { paketId: id } },
        include: { realisasi: { select: { bulan: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.monevFoto.findMany({
        where: { monev: { paketId: id } },
        include: { monev: { select: { id: true, tanggalMonev: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const url = (tipe: DokumenTipe, docId: string) =>
      `${EXT_PREFIX}/dokumen/${tipe}/${docId}/download`;

    return [
      ...bPencairan.map((b) => ({
        id: b.id,
        tipe: 'bukti-pencairan' as const,
        keterangan: 'Bukti pencairan keuangan (SPJ/SP2D/nota)',
        namaFile: b.namaFile,
        mimeType: b.mimeType,
        ukuranBytes: b.ukuranBytes,
        deskripsi: b.deskripsi,
        bulan: b.pencairan.bulan,
        pencairanId: b.pencairan.id,
        nominalPencairan: Number(b.pencairan.nominal),
        createdAt: b.createdAt,
        downloadUrl: url('bukti-pencairan', b.id),
      })),
      ...bFisik.map((b) => ({
        id: b.id,
        tipe: 'bukti-fisik' as const,
        keterangan: 'Bukti/foto progres fisik',
        namaFile: b.namaFile,
        mimeType: b.mimeType,
        ukuranBytes: b.ukuranBytes,
        deskripsi: b.deskripsi,
        bulan: b.realisasi.bulan,
        mingguKe: b.mingguKe,
        createdAt: b.createdAt,
        downloadUrl: url('bukti-fisik', b.id),
      })),
      ...fotoMonev.map((f) => ({
        id: f.id,
        tipe: 'monev-foto' as const,
        keterangan: 'Foto monitoring lapangan (Tim MONEV)',
        namaFile: f.namaFile,
        mimeType: f.mimeType,
        ukuranBytes: f.ukuranBytes,
        tanggalMonev: f.monev.tanggalMonev,
        monevId: f.monev.id,
        createdAt: f.createdAt,
        downloadUrl: url('monev-foto', f.id),
      })),
    ];
  }

  async resolveDokumen(tipe: DokumenTipe, id: string) {
    let namaFile: string | null = null;
    let mimeType: string | null = null;
    let storedName: string | null = null;

    if (tipe === 'bukti-pencairan') {
      const d = await this.prisma.buktiPencairan.findUnique({ where: { id } });
      if (d) {
        namaFile = d.namaFile;
        mimeType = d.mimeType;
        storedName = basename(d.pathFile);
      }
    } else if (tipe === 'bukti-fisik') {
      const d = await this.prisma.buktiFisik.findUnique({ where: { id } });
      if (d) {
        namaFile = d.namaFile;
        mimeType = d.mimeType;
        storedName = basename(d.namaFile);
      }
    } else {
      const d = await this.prisma.monevFoto.findUnique({ where: { id } });
      if (d) {
        namaFile = d.namaFile;
        mimeType = d.mimeType;
        storedName = basename(d.namaFile);
      }
    }

    if (!storedName) throw new NotFoundException('Dokumen tidak ditemukan');

    const fullPath = join(process.cwd(), 'uploads', DOKUMEN_DIR[tipe], storedName);
    if (!existsSync(fullPath)) {
      throw new NotFoundException('Berkas dokumen tidak ada di penyimpanan');
    }
    return { fullPath, namaFile: namaFile || storedName, mimeType };
  }
}
