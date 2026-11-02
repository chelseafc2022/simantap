jest.mock('../../core/egov/egov.service', () => ({ EgovService: class {}, isExcludedOpd: () => false }));
import { PembangunanService } from './pembangunan.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QueryRealisasiDto } from './dto/query-realisasi.dto';
import { RoleEnum } from '../../common/enums/role.enum';

describe('Pola monitoring paket', () => {
  const paket = { id: 'paket', opdId: 'opd', polaMonitoring: 'KEUANGAN', nilaiPagu: 1000, tahunAnggaran: 2026 };
  let prisma: any;
  let service: PembangunanService;
  beforeEach(() => {
    prisma = {
      paketPembangunan: { findUnique: jest.fn().mockResolvedValue(paket), create: jest.fn().mockResolvedValue(paket) },
      realisasiBulanan: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockImplementation(({ create }) => create) },
      lockingPeriod: { findUnique: jest.fn().mockResolvedValue(null) },
      targetBulanan: { createMany: jest.fn() },
      $transaction: jest.fn().mockImplementation(fn => fn(prisma)),
    };
    service = new PembangunanService(prisma, { getOpdById: () => ({ id: 'opd' }), getSubUnitById: () => null } as any);
  });
  it('menyimpan anggaran rutin tanpa penyedia, kontrak, atau target mingguan', async () => {
    await service.create({ opdId: 'opd', namaPaket: 'Belanja rutin', nilaiPagu: 1000, nilaiKontrak: 0, polaMonitoring: 'KEUANGAN' });
    expect(prisma.paketPembangunan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ polaMonitoring: 'KEUANGAN', pemenangRekanan: null, nilaiKontrak: 0 }) }));
  });
  it('menolak target mingguan pada pola keuangan saja', async () => {
    await expect(service.create({ opdId: 'opd', namaPaket: 'Rutin', nilaiPagu: 1000, nilaiKontrak: 0, polaMonitoring: 'KEUANGAN', targetMingguan: [{} as any] })).rejects.toThrow(BadRequestException);
  });
  it('tetap mensyaratkan kontrak dan penyedia untuk target mingguan pembangunan', async () => {
    await expect(service.create({ opdId: 'opd', namaPaket: 'Gedung', nilaiPagu: 1000, nilaiKontrak: 0, polaMonitoring: 'FISIK_KEUANGAN', targetMingguan: [{} as any] })).rejects.toThrow('Nilai kontrak dan penyedia');
  });
  it('menyimpan nominal kumulatif tanpa mengakumulasi ulang dan tanpa fisik', async () => {
    const result = await service.upsertRealisasi('paket', { bulan: 3, realisasiKeuangan: 400 }, { role: RoleEnum.ADMINISTRATOR });
    expect(result).toMatchObject({ bulan: 3, realisasiKeuangan: 400, realisasiFisik: 0 });
  });
  it('mengeluarkan paket keuangan dari rata-rata fisik dan tetap menjumlahkan uangnya', async () => {
    prisma.paketPembangunan.findMany = jest.fn().mockResolvedValue([
      { ...paket, namaPaket: 'Rutin', nilaiKontrak: 0, targetBulanan: [], targetMingguan: [], realisasiBulanan: [{ bulan: 3, realisasiFisik: 0, realisasiKeuangan: 300 }] },
      { ...paket, id: 'gedung', namaPaket: 'Gedung', polaMonitoring: 'FISIK_KEUANGAN', nilaiKontrak: 900, targetBulanan: [{ bulan: 3, targetFisik: 60 }], targetMingguan: [], realisasiBulanan: [{ bulan: 3, realisasiFisik: 50, realisasiKeuangan: 400 }] },
    ]);
    const result = await service.getRekapRealisasi(Object.assign(new QueryRealisasiDto(), { bulan: 3, tahunAnggaran: 2026 }));
    expect(result.summary).toMatchObject({ avgTargetFisik: 60, avgRealisasiFisik: 50, totalRealisasiKeuangan: 700 });
    expect(result.summary.availableMonths).toHaveLength(12);
    expect(result.data.find(p => p.id === 'paket')?.status).toBe('KEUANGAN');
  });
  it('menolak realisasi di atas pagu' , async () => {
    await expect(service.upsertRealisasi('paket', { bulan: 3, realisasiKeuangan: 1001 }, { role: RoleEnum.ADMINISTRATOR })).rejects.toThrow('melebihi pagu');
    expect(prisma.realisasiBulanan.upsert).not.toHaveBeenCalled();
  });
  it('menolak realisasi fisik dan endpoint mingguan untuk paket keuangan', async () => {
    await expect(service.upsertRealisasi('paket', { bulan: 3, realisasiFisik: 10 }, { role: RoleEnum.ADMINISTRATOR })).rejects.toThrow('tidak menggunakan realisasi fisik');
    await expect(service.upsertRealisasiMingguan('paket', {} as any, { role: RoleEnum.ADMINISTRATOR })).rejects.toThrow('input keuangan bulanan');
  });
  it('mempertahankan penguncian bulan terverifikasi untuk bendahara', async () => {
    prisma.realisasiBulanan.findUnique.mockResolvedValue({ statusVerifikasi: 'TERVERIFIKASI' });
    await expect(service.upsertRealisasi('paket', { bulan: 3, realisasiKeuangan: 300 }, { role: RoleEnum.BENDAHARA, opdId: 'opd' })).rejects.toThrow(ForbiddenException);
  });
});
