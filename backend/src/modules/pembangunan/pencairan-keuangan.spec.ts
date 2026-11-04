jest.mock('../../core/egov/egov.service', () => ({
  EgovService: class {},
  isExcludedOpd: () => false,
}));
import { PembangunanService } from './pembangunan.service';
import { Prisma } from '@prisma/client';
import { RoleEnum } from '../../common/enums/role.enum';

const admin = { role: RoleEnum.ADMINISTRATOR, id: 'operator' };
const dto = {
  id: 'pencairan-1',
  bulan: 6,
  nominal: 2000000,
  catatan: 'Bahan bakar tahap 1',
};
describe('Record pencairan keuangan', () => {
  let db: any;
  let service: PembangunanService;
  beforeEach(() => {
    db = {
      $queryRaw: jest.fn(),
      paketPembangunan: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'paket',
            opdId: 'opd',
            polaMonitoring: 'KEUANGAN',
            nilaiPagu: new Prisma.Decimal(20000000),
            tahunAnggaran: 2026,
          }),
      },
      pencairanKeuangan: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => data),
      },
      realisasiBulanan: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      lockingPeriod: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { create: jest.fn() },
    };
    db.$transaction = jest.fn().mockImplementation((fn) => fn(db));
    service = new PembangunanService(db, {} as any);
  });
  it('mencatat dua pencairan Juni dan menjumlahkan 2 juta + 5 juta menjadi 7 juta', async () => {
    await service.tambahPencairan('paket', dto, admin);
    const first = db.realisasiBulanan.upsert.mock.calls[0][0].create;
    expect(Number(first.realisasiKeuangan)).toBe(2000000);
    db.realisasiBulanan.findMany.mockResolvedValue([first]);
    await service.tambahPencairan(
      'paket',
      {
        ...dto,
        id: 'pencairan-2',
        nominal: 5000000,
        catatan: 'Bahan bakar tahap 2',
      },
      admin,
    );
    expect(
      Number(
        db.realisasiBulanan.upsert.mock.calls[1][0].update.realisasiKeuangan,
      ),
    ).toBe(7000000);
    expect(db.pencairanKeuangan.create).toHaveBeenCalledTimes(2);
    expect(db.pencairanKeuangan.create.mock.calls[1][0].data.catatan).toBe(
      'Bahan bakar tahap 2',
    );
  });
  it('menambahkan saldo bulan sebelumnya dan memperbarui laporan kumulatif bulan berikutnya', async () => {
    db.realisasiBulanan.findMany.mockResolvedValue([
      {
        bulan: 5,
        realisasiKeuangan: 3000000,
        statusVerifikasi: 'TERVERIFIKASI',
      },
      { bulan: 7, realisasiKeuangan: 8000000, statusVerifikasi: 'DRAFT' },
    ]);
    await service.tambahPencairan('paket', dto, admin);
    expect(
      Number(
        db.realisasiBulanan.upsert.mock.calls[0][0].create.realisasiKeuangan,
      ),
    ).toBe(5000000);
    expect(
      Number(
        db.realisasiBulanan.updateMany.mock.calls[0][0].data.realisasiKeuangan
          .increment,
      ),
    ).toBe(2000000);
    expect(db.realisasiBulanan.updateMany.mock.calls[0][0].where.bulan).toEqual(
      { gt: 6 },
    );
  });
  it('tidak menggandakan pencairan ketika request yang sama dikirim ulang', async () => {
    db.pencairanKeuangan.findUnique.mockResolvedValue({
      ...dto,
      paketId: 'paket',
    });
    await service.tambahPencairan('paket', dto, admin);
    expect(db.pencairanKeuangan.create).not.toHaveBeenCalled();
    expect(db.realisasiBulanan.upsert).not.toHaveBeenCalled();
  });
  it('menolak ID request sama dengan nominal berbeda', async () => {
    db.pencairanKeuangan.findUnique.mockResolvedValue({
      ...dto,
      paketId: 'paket',
      nominal: 5000000,
    });
    await expect(service.tambahPencairan('paket', dto, admin)).rejects.toThrow(
      'ID pencairan',
    );
  });
  it.each(['DRAFT', 'DIAJUKAN', 'TERVERIFIKASI', 'TERCATAT'])(
    'langsung mencatat pencairan tanpa alur verifikasi meski status lama %s',
    async (statusVerifikasi) => {
      db.realisasiBulanan.findMany.mockResolvedValue([
        { bulan: 6, realisasiKeuangan: 1000000, statusVerifikasi },
        { bulan: 7, realisasiKeuangan: 3000000, statusVerifikasi },
      ]);
      await service.tambahPencairan('paket', dto, { role: RoleEnum.BENDAHARA, opdId: 'opd' });
      expect(db.pencairanKeuangan.create).toHaveBeenCalledTimes(1);
      expect(db.realisasiBulanan.upsert.mock.calls[0][0]).toMatchObject({
        create: { statusVerifikasi: 'TERCATAT' },
        update: { statusVerifikasi: 'TERCATAT', diajukanAt: null, verifikasiAt: null, verifikasiOlehId: null },
      });
      expect(db.realisasiBulanan.updateMany.mock.calls[0][0].data.statusVerifikasi).toBe('TERCATAT');
    },
  );
  it('menolak total kumulatif di atas pagu tanpa membuat record', async () => {
    db.realisasiBulanan.findMany.mockResolvedValue([
      { bulan: 6, realisasiKeuangan: 19000000, statusVerifikasi: 'DRAFT' },
    ]);
    await expect(service.tambahPencairan('paket', dto, admin)).rejects.toThrow(
      'melebihi pagu',
    );
    expect(db.pencairanKeuangan.create).not.toHaveBeenCalled();
  });
  it('memeriksa pagu laporan bulan berikutnya juga', async () => {
    db.realisasiBulanan.findMany.mockResolvedValue([
      { bulan: 8, realisasiKeuangan: 19500000, statusVerifikasi: 'DRAFT' },
    ]);
    await expect(service.tambahPencairan('paket', dto, admin)).rejects.toThrow(
      'melebihi pagu',
    );
  });
  it('menolak input dari PPK dan akses lintas OPD', async () => {
    await expect(
      service.tambahPencairan('paket', dto, { role: RoleEnum.ADMIN_PPK }),
    ).rejects.toThrow('Bendahara');
    await expect(
      service.tambahPencairan('paket', dto, {
        role: RoleEnum.BENDAHARA,
        opdId: 'lain',
      }),
    ).rejects.toThrow();
    expect(db.pencairanKeuangan.create).not.toHaveBeenCalled();
  });
  it('mempertahankan batas waktu periode input untuk Bendahara', async () => {
    db.lockingPeriod.findMany.mockResolvedValue([
      { bulan: 6, isLocked: true, batasInput: new Date('2099-01-01') },
    ]);
    await expect(
      service.tambahPencairan('paket', dto, {
        role: RoleEnum.BENDAHARA,
        opdId: 'opd',
      }),
    ).rejects.toThrow('ditutup');
  });
  it('menolak nominal nol dan catatan kosong', async () => {
    await expect(
      service.tambahPencairan('paket', { ...dto, nominal: 0 }, admin),
    ).rejects.toThrow('lebih dari nol');
    await expect(
      service.tambahPencairan('paket', { ...dto, catatan: '  ' }, admin),
    ).rejects.toThrow('catatan');
  });
  it('tetap membuka realisasi lama saat tabel pencairan belum diaktifkan', async () => {
    db.paketPembangunan.findUnique.mockResolvedValue({
      id: 'paket', opdId: 'opd', polaMonitoring: 'KEUANGAN', nilaiPagu: 20000000, nilaiKontrak: 0,
      targetBulanan: [], targetMingguan: [], realisasiMingguan: [],
      realisasiBulanan: [{ bulan: 5, realisasiKeuangan: 3000000, realisasiFisik: 0, statusVerifikasi: 'DRAFT', buktiFisik: [] }],
    });
    db.pencairanKeuangan.findMany = jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Table missing', { code: 'P2021', clientVersion: '6.19.3' }));
    service = new PembangunanService(db, { getOpdById: () => null, getSubUnitById: () => null } as any);
    const result = await service.getRealisasiPaket('paket', admin);
    expect(result.pencairanTersedia).toBe(false);
    expect(result.timeline[5].realisasiKeuangan).toBe(3000000);
    expect(result.timeline[5].pencairan).toEqual([]);
  });

});
