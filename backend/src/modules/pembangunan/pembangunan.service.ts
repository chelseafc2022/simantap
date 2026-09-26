import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoleEnum } from '../../common/enums/role.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { EgovService } from '../../core/egov/egov.service';
import { CreatePaketDto } from './dto/create-paket.dto';
import { QueryPaketDto } from './dto/query-paket.dto';
import { QueryRealisasiDto } from './dto/query-realisasi.dto';
import { SetTargetsDto } from './dto/set-targets.dto';
import { UpdatePaketDto } from './dto/update-paket.dto';
import { BulkUpsertRealisasiDto, UpsertRealisasiDto } from './dto/upsert-realisasi.dto';

@Injectable()
export class PembangunanService {
  private readonly logger = new Logger(PembangunanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly egovService: EgovService,
  ) {}

  /**
   * Helper pengecekan hak akses scope OPD
   */
  private checkOpdAccess(user: any, opdId: string) {
    if (!user) return;
    const isSuperRole = [RoleEnum.ADMINISTRATOR, RoleEnum.PIMPINAN_DAERAH].includes(user.role);
    if (!isSuperRole && user.opdId && user.opdId !== opdId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke data OPD ini');
    }
  }

  /**
   * Mengambil daftar paket pembangunan dengan filter & paginasi
   */
  async findAll(query: QueryPaketDto, user?: any) {
    const {
      page = 1,
      limit = 10,
      search,
      tahunAnggaran = 2026,
      opdId,
      subUnitId,
      metodePemilihan,
      jenisPengadaan,
      sumberDana,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const andConditions: Prisma.PaketPembangunanWhereInput[] = [];

    // Filter tahun anggaran
    if (tahunAnggaran) {
      andConditions.push({ tahunAnggaran });
    }

    // Role-based OPD Scoping
    const isSuperRole = user?.role && [RoleEnum.ADMINISTRATOR, RoleEnum.PIMPINAN_DAERAH].includes(user.role);
    if (!isSuperRole && user?.opdId) {
      andConditions.push({ opdId: user.opdId });
    } else if (opdId && opdId !== 'ALL' && opdId !== 'all') {
      andConditions.push({ opdId });
    }

    // Filter Sub Unit Kerja
    if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
      andConditions.push({ subUnitId });
    }

    // Filter kategori pengadaan
    if (metodePemilihan) {
      andConditions.push({ metodePemilihan });
    }
    if (jenisPengadaan) {
      andConditions.push({ jenisPengadaan });
    }
    if (sumberDana) {
      andConditions.push({ sumberDana });
    }

    // Filter search text
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { namaPaket: { contains: q, mode: 'insensitive' } },
          { kodeRupKontrak: { contains: q, mode: 'insensitive' } },
          { nomorKontrak: { contains: q, mode: 'insensitive' } },
          { pemenangRekanan: { contains: q, mode: 'insensitive' } },
          { lokasiKegiatan: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.PaketPembangunanWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    // Dynamic sorting
    const orderBy: Prisma.PaketPembangunanOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [total, data] = await Promise.all([
      this.prisma.paketPembangunan.count({ where }),
      this.prisma.paketPembangunan.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          opd: {
            select: {
              id: true,
              kodeOpd: true,
              namaOpd: true,
              singkatan: true,
            },
          },
          subUnit: {
            select: {
              id: true,
              kodeSubUnit: true,
              namaSubUnit: true,
            },
          },
          targetBulanan: {
            orderBy: { bulan: 'asc' },
          },
          realisasiBulanan: {
            orderBy: { bulan: 'asc' },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Detail satu paket pembangunan
   */
  async findOne(id: string, user?: any) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id },
      include: {
        opd: true,
        subUnit: true,
        targetBulanan: {
          orderBy: { bulan: 'asc' },
        },
        realisasiBulanan: {
          orderBy: { bulan: 'asc' },
          include: {
            inputBy: {
              select: {
                id: true,
                namaLengkap: true,
                nip: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            namaLengkap: true,
            nip: true,
            role: true,
          },
        },
      },
    });

    if (!paket) {
      throw new NotFoundException(`Paket pembangunan dengan ID '${id}' tidak ditemukan`);
    }

    this.checkOpdAccess(user, paket.opdId);

    return paket;
  }

  /**
   * Tambah paket pembangunan baru beserta inisialisasi target bulanan B01-B12
   */
  async create(dto: CreatePaketDto, user?: any) {
    const isSuperRole = user?.role && [RoleEnum.ADMINISTRATOR, RoleEnum.PIMPINAN_DAERAH].includes(user.role);
    const assignedOpdId = !isSuperRole && user?.opdId ? user.opdId : dto.opdId;

    if (!assignedOpdId) {
      throw new BadRequestException('OPD penanggung jawab paket wajib diisi');
    }

    // Verifikasi keberadaan OPD
    const opdExists = await this.prisma.opd.findUnique({
      where: { id: assignedOpdId },
    });
    if (!opdExists) {
      throw new NotFoundException(`OPD dengan ID '${assignedOpdId}' tidak ditemukan di sistem`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Simpan data paket pembangunan
      const paket = await tx.paketPembangunan.create({
        data: {
          tahunAnggaran: dto.tahunAnggaran || 2026,
          opdId: assignedOpdId,
          subUnitId: dto.subUnitId || null,
          kodeRupKontrak: dto.kodeRupKontrak || null,
          namaPaket: dto.namaPaket.trim(),
          lokasiKegiatan: dto.lokasiKegiatan || null,
          metodePemilihan: dto.metodePemilihan || null,
          jenisPengadaan: dto.jenisPengadaan || null,
          nilaiPagu: dto.nilaiPagu,
          nilaiKontrak: dto.nilaiKontrak,
          sumberDana: dto.sumberDana || null,
          nomorKontrak: dto.nomorKontrak || null,
          tanggalMulai: dto.tanggalMulai ? new Date(dto.tanggalMulai) : null,
          tanggalSelesai: dto.tanggalSelesai ? new Date(dto.tanggalSelesai) : null,
          pemenangRekanan: dto.pemenangRekanan || null,
          keterangan: dto.keterangan || null,
          createdById: user?.id || null,
        },
      });

      // 2. Buat otomatis 12 baris target bulanan (B01 - B12)
      const targetItems = [];
      for (let bulan = 1; bulan <= 12; bulan++) {
        const item = dto.targetBulanan?.find((t) => t.bulan === bulan);
        targetItems.push({
          paketId: paket.id,
          bulan,
          targetFisik: item ? Number(item.targetFisik) : 0,
        });
      }

      await tx.targetBulanan.createMany({
        data: targetItems,
      });

      // 3. Catat audit trail
      if (user?.id) {
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'CREATE_PAKET_PEMBANGUNAN',
            resource: 'PAKET_PEMBANGUNAN',
            resourceId: paket.id,
            payload: {
              namaPaket: paket.namaPaket,
              nilaiKontrak: paket.nilaiKontrak,
              opdId: paket.opdId,
            },
          },
        });
      }

      return tx.paketPembangunan.findUnique({
        where: { id: paket.id },
        include: {
          opd: true,
          subUnit: true,
          targetBulanan: { orderBy: { bulan: 'asc' } },
        },
      });
    });
  }

  /**
   * Perbarui paket pembangunan & perbarui target bulanan
   */
  async update(id: string, dto: UpdatePaketDto, user?: any) {
    const existing = await this.prisma.paketPembangunan.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Paket pembangunan dengan ID '${id}' tidak ditemukan`);
    }

    this.checkOpdAccess(user, existing.opdId);

    const isSuperRole = user?.role && [RoleEnum.ADMINISTRATOR, RoleEnum.PIMPINAN_DAERAH].includes(user.role);
    const assignedOpdId = !isSuperRole && user?.opdId ? user.opdId : dto.opdId || existing.opdId;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update data pokok paket
      const updatedPaket = await tx.paketPembangunan.update({
        where: { id },
        data: {
          tahunAnggaran: dto.tahunAnggaran !== undefined ? dto.tahunAnggaran : existing.tahunAnggaran,
          opdId: assignedOpdId,
          subUnitId: dto.subUnitId !== undefined ? dto.subUnitId : existing.subUnitId,
          kodeRupKontrak: dto.kodeRupKontrak !== undefined ? dto.kodeRupKontrak : existing.kodeRupKontrak,
          namaPaket: dto.namaPaket !== undefined ? dto.namaPaket.trim() : existing.namaPaket,
          lokasiKegiatan: dto.lokasiKegiatan !== undefined ? dto.lokasiKegiatan : existing.lokasiKegiatan,
          metodePemilihan: dto.metodePemilihan !== undefined ? dto.metodePemilihan : existing.metodePemilihan,
          jenisPengadaan: dto.jenisPengadaan !== undefined ? dto.jenisPengadaan : existing.jenisPengadaan,
          nilaiPagu: dto.nilaiPagu !== undefined ? dto.nilaiPagu : existing.nilaiPagu,
          nilaiKontrak: dto.nilaiKontrak !== undefined ? dto.nilaiKontrak : existing.nilaiKontrak,
          sumberDana: dto.sumberDana !== undefined ? dto.sumberDana : existing.sumberDana,
          nomorKontrak: dto.nomorKontrak !== undefined ? dto.nomorKontrak : existing.nomorKontrak,
          tanggalMulai: dto.tanggalMulai ? new Date(dto.tanggalMulai) : existing.tanggalMulai,
          tanggalSelesai: dto.tanggalSelesai ? new Date(dto.tanggalSelesai) : existing.tanggalSelesai,
          pemenangRekanan: dto.pemenangRekanan !== undefined ? dto.pemenangRekanan : existing.pemenangRekanan,
          keterangan: dto.keterangan !== undefined ? dto.keterangan : existing.keterangan,
        },
      });

      // 2. Update target bulanan jika disertakan
      if (dto.targetBulanan && dto.targetBulanan.length > 0) {
        for (const item of dto.targetBulanan) {
          await tx.targetBulanan.upsert({
            where: {
              paketId_bulan: {
                paketId: id,
                bulan: item.bulan,
              },
            },
            create: {
              paketId: id,
              bulan: item.bulan,
              targetFisik: Number(item.targetFisik),
            },
            update: {
              targetFisik: Number(item.targetFisik),
            },
          });
        }
      }

      // 3. Catat audit trail
      if (user?.id) {
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'UPDATE_PAKET_PEMBANGUNAN',
            resource: 'PAKET_PEMBANGUNAN',
            resourceId: id,
            payload: {
              namaPaket: updatedPaket.namaPaket,
              nilaiKontrak: updatedPaket.nilaiKontrak,
            },
          },
        });
      }

      return tx.paketPembangunan.findUnique({
        where: { id },
        include: {
          opd: true,
          subUnit: true,
          targetBulanan: { orderBy: { bulan: 'asc' } },
        },
      });
    });
  }

  /**
   * Hapus paket pembangunan (cascade hapus target & realisasi)
   */
  async remove(id: string, user?: any) {
    const existing = await this.prisma.paketPembangunan.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Paket pembangunan dengan ID '${id}' tidak ditemukan`);
    }

    this.checkOpdAccess(user, existing.opdId);

    await this.prisma.$transaction(async (tx) => {
      await tx.paketPembangunan.delete({
        where: { id },
      });

      if (user?.id) {
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'DELETE_PAKET_PEMBANGUNAN',
            resource: 'PAKET_PEMBANGUNAN',
            resourceId: id,
            payload: {
              namaPaket: existing.namaPaket,
              opdId: existing.opdId,
            },
          },
        });
      }
    });

    return { message: `Paket '${existing.namaPaket}' berhasil dihapus` };
  }

  /**
   * Set atau update Target Bulanan khusus suatu paket
   */
  async setTargets(id: string, dto: SetTargetsDto, user?: any) {
    const existing = await this.prisma.paketPembangunan.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Paket pembangunan dengan ID '${id}' tidak ditemukan`);
    }

    this.checkOpdAccess(user, existing.opdId);

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.targets) {
        await tx.targetBulanan.upsert({
          where: {
            paketId_bulan: {
              paketId: id,
              bulan: item.bulan,
            },
          },
          create: {
            paketId: id,
            bulan: item.bulan,
            targetFisik: Number(item.targetFisik),
          },
          update: {
            targetFisik: Number(item.targetFisik),
          },
        });
      }
    });

    return this.prisma.targetBulanan.findMany({
      where: { paketId: id },
      orderBy: { bulan: 'asc' },
    });
  }

  /**
   * Mengambil daftar referensi OPD dari lokal database untuk dropdown
   */
  async getOpdOptions() {
    return this.prisma.opd.findMany({
      where: { isActive: true },
      select: {
        id: true,
        kodeOpd: true,
        namaOpd: true,
        singkatan: true,
      },
      orderBy: { namaOpd: 'asc' },
    });
  }

  /**
   * Mengambil daftar Sub Unit Kerja berdasarkan OPD (sinkron dari SIMPEG)
   */
  async getSubUnitOptions(opdId?: string) {
    if (!opdId || opdId === 'ALL' || opdId === 'all') {
      return this.prisma.subUnit.findMany({
        select: {
          id: true,
          kodeSubUnit: true,
          namaSubUnit: true,
          opdId: true,
        },
        orderBy: { namaSubUnit: 'asc' },
      });
    }

    const opd = await this.prisma.opd.findUnique({
      where: { id: opdId },
    });
    if (!opd) return [];

    // Tarik daftar sub-unit dari SIMPEG
    const simpegSubUnits = await this.egovService.getUnitKerjaList(opd.kodeOpd);

    // Sinkronkan ke tabel lokal sub_unit
    for (const su of simpegSubUnits) {
      await this.prisma.subUnit.upsert({
        where: {
          opdId_kodeSubUnit: {
            opdId: opd.id,
            kodeSubUnit: su.id,
          },
        },
        create: {
          opdId: opd.id,
          kodeSubUnit: su.id,
          namaSubUnit: su.unitKerja,
        },
        update: {
          namaSubUnit: su.unitKerja,
        },
      });
    }

    return this.prisma.subUnit.findMany({
      where: { opdId: opd.id },
      select: {
        id: true,
        kodeSubUnit: true,
        namaSubUnit: true,
        opdId: true,
      },
      orderBy: { namaSubUnit: 'asc' },
    });
  }

  /**
   * Mengambil daftar konstanta referensi pengadaan (Metode, Jenis, Sumber Dana)
   */
  getPengadaanConstants() {
    return {
      metodePemilihan: [
        'E-Purchasing',
        'Pengadaan Langsung',
        'Tender',
        'Tender Cepat',
        'Seleksi',
        'Swakelola Tipe I',
        'Swakelola Tipe II',
        'Swakelola Tipe III',
        'Swakelola Tipe IV',
        'Penunjukan Langsung',
      ],
      jenisPengadaan: [
        'Pekerjaan Konstruksi',
        'Pengadaan Barang',
        'Jasa Konsultansi',
        'Jasa Lainnya',
      ],
      sumberDana: [
        'DAU (Dana Alokasi Umum)',
        'DAK Fisik',
        'DAK Non Fisik',
        'DBH (Dana Bagi Hasil)',
        'PAD (Pendapatan Asli Daerah)',
        'DID (Dana Insentif Daerah)',
        'Bantuan Keuangan Provinsi',
        'Pinjaman Daerah',
      ],
    };
  }

  // =========================================================================
  // REALISASI FISIK & KEUANGAN BULANAN (MENU 2)
  // =========================================================================

  /**
   * Rekapitulasi Realisasi Fisik & Keuangan untuk bulan pelaporan tertentu
   */
  async getRekapRealisasi(query: QueryRealisasiDto, user?: any) {
    const {
      page = 1,
      limit = 10,
      search,
      tahunAnggaran = 2026,
      bulan,
      opdId,
      subUnitId,
      metodePemilihan,
      statusDeviasi,
    } = query;

    const activeBulan = bulan ? Math.min(12, Math.max(1, Number(bulan))) : (new Date().getMonth() + 1);

    const andConditions: Prisma.PaketPembangunanWhereInput[] = [
      { tahunAnggaran: Number(tahunAnggaran) },
    ];

    // Filter scope role
    const isSuperRole = user?.role && [RoleEnum.ADMINISTRATOR, RoleEnum.PIMPINAN_DAERAH].includes(user.role);
    if (!isSuperRole && user?.opdId) {
      andConditions.push({ opdId: user.opdId });
    } else if (opdId && opdId !== 'ALL' && opdId !== 'all') {
      andConditions.push({ opdId });
    }

    if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
      andConditions.push({ subUnitId });
    }

    if (metodePemilihan && metodePemilihan !== 'ALL' && metodePemilihan !== 'all') {
      andConditions.push({ metodePemilihan });
    }

    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { namaPaket: { contains: q, mode: 'insensitive' } },
          { kodeRupKontrak: { contains: q, mode: 'insensitive' } },
          { nomorKontrak: { contains: q, mode: 'insensitive' } },
          { pemenangRekanan: { contains: q, mode: 'insensitive' } },
          { lokasiKegiatan: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.PaketPembangunanWhereInput = { AND: andConditions };

    // Ambil seluruh paket yang sesuai kriteria filter untuk perhitungan aggregat & deviasi
    const pakets = await this.prisma.paketPembangunan.findMany({
      where,
      orderBy: [
        { opd: { namaOpd: 'asc' } },
        { namaPaket: 'asc' },
      ],
      include: {
        opd: {
          select: {
            id: true,
            kodeOpd: true,
            namaOpd: true,
            singkatan: true,
          },
        },
        subUnit: {
          select: {
            id: true,
            kodeSubUnit: true,
            namaSubUnit: true,
          },
        },
        targetBulanan: {
          orderBy: { bulan: 'asc' },
        },
        realisasiBulanan: {
          orderBy: { bulan: 'asc' },
          include: {
            inputBy: {
              select: {
                id: true,
                namaLengkap: true,
                nip: true,
              },
            },
          },
        },
      },
    });

    // Proses kalkulasi target vs realisasi bulan berjalan
    const processed = pakets.map((paket) => {
      const targetItem = paket.targetBulanan.find((t) => t.bulan === activeBulan);
      const realisasiItem = paket.realisasiBulanan.find((r) => r.bulan === activeBulan);

      const nilaiPagu = Number(paket.nilaiPagu) || 0;
      const nilaiKontrak = Number(paket.nilaiKontrak) || 0;
      const targetFisik = targetItem ? Number(targetItem.targetFisik) : 0;
      const realisasiFisik = realisasiItem ? Number(realisasiItem.realisasiFisik) : 0;
      const realisasiKeuangan = realisasiItem ? Number(realisasiItem.realisasiKeuangan) : 0;
      const catatanOperator = realisasiItem?.catatanOperator || null;
      const inputBy = realisasiItem?.inputBy || null;
      const updatedAt = realisasiItem?.updatedAt || null;

      const deviasiFisik = parseFloat((realisasiFisik - targetFisik).toFixed(2));
      const persenKeuangan = nilaiKontrak > 0
        ? parseFloat(((realisasiKeuangan / nilaiKontrak) * 100).toFixed(2))
        : 0;

      // Status capaian berdasarkan standar deviasi fisik
      let status: 'BELUM_MULAI' | 'AMAN' | 'PERHATIAN' | 'KRITIS' = 'AMAN';
      if (targetFisik === 0 && realisasiFisik === 0) {
        status = 'BELUM_MULAI';
      } else if (deviasiFisik >= 0) {
        status = 'AMAN';
      } else if (deviasiFisik >= -10) {
        status = 'PERHATIAN';
      } else {
        status = 'KRITIS';
      }

      return {
        id: paket.id,
        namaPaket: paket.namaPaket,
        kodeRupKontrak: paket.kodeRupKontrak,
        nomorKontrak: paket.nomorKontrak,
        lokasiKegiatan: paket.lokasiKegiatan,
        metodePemilihan: paket.metodePemilihan,
        jenisPengadaan: paket.jenisPengadaan,
        sumberDana: paket.sumberDana,
        tanggalMulai: paket.tanggalMulai,
        tanggalSelesai: paket.tanggalSelesai,
        pemenangRekanan: paket.pemenangRekanan,
        nilaiPagu,
        nilaiKontrak,
        opd: paket.opd,
        subUnit: paket.subUnit,
        targetFisik,
        realisasiFisik,
        deviasiFisik,
        realisasiKeuangan,
        persenKeuangan,
        status,
        catatanOperator,
        inputBy,
        updatedAt,
      };
    });

    // Filter berdasarkan status deviasi jika dipilih
    const filtered = statusDeviasi && statusDeviasi !== 'ALL'
      ? processed.filter((item) => item.status === statusDeviasi)
      : processed;

    // Perhitungan Ringkasan / Stat Cards (Aggregat)
    const totalPagu = filtered.reduce((acc, cur) => acc + cur.nilaiPagu, 0);
    const totalKontrak = filtered.reduce((acc, cur) => acc + cur.nilaiKontrak, 0);
    const totalRealisasiKeuangan = filtered.reduce((acc, cur) => acc + cur.realisasiKeuangan, 0);
    const persenSerapanKeuangan = totalKontrak > 0
      ? parseFloat(((totalRealisasiKeuangan / totalKontrak) * 100).toFixed(2))
      : 0;

    const countStatus = {
      aman: filtered.filter((i) => i.status === 'AMAN').length,
      perhatian: filtered.filter((i) => i.status === 'PERHATIAN').length,
      kritis: filtered.filter((i) => i.status === 'KRITIS').length,
      belumMulai: filtered.filter((i) => i.status === 'BELUM_MULAI').length,
    };

    const avgTargetFisik = filtered.length > 0
      ? parseFloat((filtered.reduce((acc, cur) => acc + cur.targetFisik, 0) / filtered.length).toFixed(2))
      : 0;
    const avgRealisasiFisik = filtered.length > 0
      ? parseFloat((filtered.reduce((acc, cur) => acc + cur.realisasiFisik, 0) / filtered.length).toFixed(2))
      : 0;
    const avgDeviasiFisik = parseFloat((avgRealisasiFisik - avgTargetFisik).toFixed(2));

    // Paginasi array hasil
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedData = filtered.slice(skip, skip + Number(limit));
    const totalPages = Math.ceil(filtered.length / Number(limit)) || 1;

    return {
      data: paginatedData,
      summary: {
        activeBulan,
        totalPaket: filtered.length,
        totalPagu,
        totalKontrak,
        totalRealisasiKeuangan,
        persenSerapanKeuangan,
        avgTargetFisik,
        avgRealisasiFisik,
        avgDeviasiFisik,
        countStatus,
      },
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: filtered.length,
        totalPages,
      },
    };
  }

  /**
   * Mengambil riwayat realisasi 12 bulan untuk 1 paket pembangunan
   */
  async getRealisasiPaket(paketId: string, user?: any) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
      include: {
        opd: true,
        subUnit: true,
        targetBulanan: { orderBy: { bulan: 'asc' } },
        realisasiBulanan: {
          orderBy: { bulan: 'asc' },
          include: {
            inputBy: {
              select: {
                id: true,
                namaLengkap: true,
                nip: true,
              },
            },
          },
        },
      },
    });

    if (!paket) {
      throw new NotFoundException(`Paket pembangunan '${paketId}' tidak ditemukan`);
    }

    this.checkOpdAccess(user, paket.opdId);

    const nilaiKontrak = Number(paket.nilaiKontrak) || 0;
    const nilaiPagu = Number(paket.nilaiPagu) || 0;

    // Susun timeline 12 bulan (1..12)
    const timeline = Array.from({ length: 12 }, (_, idx) => {
      const bulan = idx + 1;
      const targetItem = paket.targetBulanan.find((t) => t.bulan === bulan);
      const realisasiItem = paket.realisasiBulanan.find((r) => r.bulan === bulan);

      const targetFisik = targetItem ? Number(targetItem.targetFisik) : 0;
      const realisasiFisik = realisasiItem ? Number(realisasiItem.realisasiFisik) : 0;
      const realisasiKeuangan = realisasiItem ? Number(realisasiItem.realisasiKeuangan) : 0;
      const deviasiFisik = parseFloat((realisasiFisik - targetFisik).toFixed(2));
      const persenKeuangan = nilaiKontrak > 0
        ? parseFloat(((realisasiKeuangan / nilaiKontrak) * 100).toFixed(2))
        : 0;

      let status: 'BELUM_MULAI' | 'AMAN' | 'PERHATIAN' | 'KRITIS' = 'AMAN';
      if (targetFisik === 0 && realisasiFisik === 0) {
        status = 'BELUM_MULAI';
      } else if (deviasiFisik >= 0) {
        status = 'AMAN';
      } else if (deviasiFisik >= -10) {
        status = 'PERHATIAN';
      } else {
        status = 'KRITIS';
      }

      return {
        bulan,
        targetFisik,
        realisasiFisik,
        deviasiFisik,
        realisasiKeuangan,
        persenKeuangan,
        catatanOperator: realisasiItem?.catatanOperator || '',
        inputBy: realisasiItem?.inputBy || null,
        updatedAt: realisasiItem?.updatedAt || null,
        status,
      };
    });

    return {
      paket: {
        id: paket.id,
        namaPaket: paket.namaPaket,
        tahunAnggaran: paket.tahunAnggaran,
        kodeRupKontrak: paket.kodeRupKontrak,
        nomorKontrak: paket.nomorKontrak,
        pemenangRekanan: paket.pemenangRekanan,
        lokasiKegiatan: paket.lokasiKegiatan,
        metodePemilihan: paket.metodePemilihan,
        jenisPengadaan: paket.jenisPengadaan,
        sumberDana: paket.sumberDana,
        nilaiPagu,
        nilaiKontrak,
        opd: paket.opd,
        subUnit: paket.subUnit,
        tanggalMulai: paket.tanggalMulai,
        tanggalSelesai: paket.tanggalSelesai,
      },
      timeline,
    };
  }

  /**
   * Menyimpan / memperbarui realisasi 1 bulan untuk sebuah paket
   */
  async upsertRealisasi(paketId: string, dto: UpsertRealisasiDto, user?: any) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket) {
      throw new NotFoundException(`Paket pembangunan '${paketId}' tidak ditemukan`);
    }

    this.checkOpdAccess(user, paket.opdId);

    const bulan = Math.min(12, Math.max(1, Number(dto.bulan)));
    const realisasiFisik = Math.min(100, Math.max(0, Number(dto.realisasiFisik) || 0));
    const realisasiKeuangan = Math.max(0, Number(dto.realisasiKeuangan) || 0);

    const record = await this.prisma.realisasiBulanan.upsert({
      where: {
        paketId_bulan: {
          paketId,
          bulan,
        },
      },
      create: {
        paketId,
        bulan,
        realisasiFisik,
        realisasiKeuangan,
        catatanOperator: dto.catatanOperator?.trim() || null,
        inputById: user?.id || null,
      },
      update: {
        realisasiFisik,
        realisasiKeuangan,
        catatanOperator: dto.catatanOperator !== undefined ? dto.catatanOperator.trim() || null : undefined,
        inputById: user?.id || null,
      },
      include: {
        inputBy: {
          select: {
            id: true,
            namaLengkap: true,
            nip: true,
          },
        },
      },
    });

    // Audit log
    if (user?.id) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPSERT_REALISASI_BULANAN',
          resource: 'REALISASI_BULANAN',
          resourceId: `${paketId}_B${bulan}`,
          payload: {
            paketId,
            bulan,
            realisasiFisik,
            realisasiKeuangan,
          },
        },
      });
    }

    return record;
  }

  /**
   * Menyimpan / memperbarui realisasi beberapa bulan sekaligus (Bulk)
   */
  async bulkUpsertRealisasi(paketId: string, dto: BulkUpsertRealisasiDto, user?: any) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket) {
      throw new NotFoundException(`Paket pembangunan '${paketId}' tidak ditemukan`);
    }

    this.checkOpdAccess(user, paket.opdId);

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const bulan = Math.min(12, Math.max(1, Number(item.bulan)));
        const realisasiFisik = Math.min(100, Math.max(0, Number(item.realisasiFisik) || 0));
        const realisasiKeuangan = Math.max(0, Number(item.realisasiKeuangan) || 0);

        await tx.realisasiBulanan.upsert({
          where: {
            paketId_bulan: {
              paketId,
              bulan,
            },
          },
          create: {
            paketId,
            bulan,
            realisasiFisik,
            realisasiKeuangan,
            catatanOperator: item.catatanOperator?.trim() || null,
            inputById: user?.id || null,
          },
          update: {
            realisasiFisik,
            realisasiKeuangan,
            catatanOperator: item.catatanOperator !== undefined ? item.catatanOperator.trim() || null : undefined,
            inputById: user?.id || null,
          },
        });
      }

      if (user?.id) {
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'BULK_UPSERT_REALISASI_BULANAN',
            resource: 'REALISASI_BULANAN',
            resourceId: paketId,
            payload: {
              totalBulanDiperbarui: dto.items.length,
            },
          },
        });
      }
    });

    return this.getRealisasiPaket(paketId, user);
  }

  /**
   * Laporan Matriks 12 Bulan RFK untuk seluruh paket pembangunan (Menu 3)
   */
  async getLaporanMatriks(query: QueryRealisasiDto, user?: any) {
    const {
      tahunAnggaran = new Date().getFullYear(),
      bulan = new Date().getMonth() + 1,
      opdId,
      subUnitId,
      metodePemilihan,
      statusDeviasi,
      search,
    } = query;

    const activeTahun = Number(tahunAnggaran);
    const activeBulan = Math.min(12, Math.max(1, Number(bulan)));

    const andConditions: Prisma.PaketPembangunanWhereInput[] = [
      { tahunAnggaran: activeTahun },
    ];

    const isSuperRole = user?.role && [RoleEnum.ADMINISTRATOR, RoleEnum.PIMPINAN_DAERAH].includes(user.role);
    if (!isSuperRole && user?.opdId) {
      andConditions.push({ opdId: user.opdId });
    } else if (opdId && opdId !== 'ALL') {
      andConditions.push({ opdId });
    }

    if (subUnitId && subUnitId !== 'ALL') {
      andConditions.push({ subUnitId });
    }

    if (metodePemilihan && metodePemilihan !== 'ALL') {
      andConditions.push({ metodePemilihan });
    }

    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { namaPaket: { contains: q, mode: 'insensitive' } },
          { kodeRupKontrak: { contains: q, mode: 'insensitive' } },
          { nomorKontrak: { contains: q, mode: 'insensitive' } },
          { pemenangRekanan: { contains: q, mode: 'insensitive' } },
          { lokasiKegiatan: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const pakets = await this.prisma.paketPembangunan.findMany({
      where: { AND: andConditions },
      orderBy: [
        { opd: { namaOpd: 'asc' } },
        { namaPaket: 'asc' },
      ],
      include: {
        opd: {
          select: {
            id: true,
            kodeOpd: true,
            namaOpd: true,
            singkatan: true,
          },
        },
        subUnit: {
          select: {
            id: true,
            kodeSubUnit: true,
            namaSubUnit: true,
          },
        },
        targetBulanan: {
          orderBy: { bulan: 'asc' },
        },
        realisasiBulanan: {
          orderBy: { bulan: 'asc' },
        },
      },
    });

    const items = pakets.map((paket) => {
      const nilaiPagu = Number(paket.nilaiPagu) || 0;
      const nilaiKontrak = Number(paket.nilaiKontrak) || 0;

      const timeline = Array.from({ length: 12 }, (_, idx) => {
        const b = idx + 1;
        const targetItem = paket.targetBulanan.find((t) => t.bulan === b);
        const realisasiItem = paket.realisasiBulanan.find((r) => r.bulan === b);

        const targetFisik = targetItem ? Number(targetItem.targetFisik) : 0;
        const realisasiFisik = realisasiItem ? Number(realisasiItem.realisasiFisik) : 0;
        const realisasiKeuangan = realisasiItem ? Number(realisasiItem.realisasiKeuangan) : 0;
        const deviasiFisik = parseFloat((realisasiFisik - targetFisik).toFixed(2));
        const persenKeuangan = nilaiKontrak > 0
          ? parseFloat(((realisasiKeuangan / nilaiKontrak) * 100).toFixed(2))
          : 0;

        let status: 'BELUM_MULAI' | 'AMAN' | 'PERHATIAN' | 'KRITIS' = 'AMAN';
        if (targetFisik === 0 && realisasiFisik === 0) {
          status = 'BELUM_MULAI';
        } else if (deviasiFisik >= 0) {
          status = 'AMAN';
        } else if (deviasiFisik >= -10) {
          status = 'PERHATIAN';
        } else {
          status = 'KRITIS';
        }

        return {
          bulan: b,
          targetFisik,
          realisasiFisik,
          deviasiFisik,
          realisasiKeuangan,
          persenKeuangan,
          status,
        };
      });

      const activeMonthData = timeline[activeBulan - 1];

      return {
        id: paket.id,
        namaPaket: paket.namaPaket,
        kodeRupKontrak: paket.kodeRupKontrak,
        nomorKontrak: paket.nomorKontrak,
        lokasiKegiatan: paket.lokasiKegiatan,
        metodePemilihan: paket.metodePemilihan,
        jenisPengadaan: paket.jenisPengadaan,
        sumberDana: paket.sumberDana,
        tanggalMulai: paket.tanggalMulai,
        tanggalSelesai: paket.tanggalSelesai,
        pemenangRekanan: paket.pemenangRekanan,
        nilaiPagu,
        nilaiKontrak,
        opd: paket.opd,
        subUnit: paket.subUnit,
        timeline,
        posisiEvaluasi: {
          bulan: activeBulan,
          targetFisik: activeMonthData.targetFisik,
          realisasiFisik: activeMonthData.realisasiFisik,
          deviasiFisik: activeMonthData.deviasiFisik,
          realisasiKeuangan: activeMonthData.realisasiKeuangan,
          persenKeuangan: activeMonthData.persenKeuangan,
          status: activeMonthData.status,
        },
      };
    });

    const filtered = statusDeviasi && statusDeviasi !== 'ALL'
      ? items.filter((item) => item.posisiEvaluasi.status === statusDeviasi)
      : items;

    return {
      tahunAnggaran: activeTahun,
      bulanEvaluasi: activeBulan,
      totalPaket: filtered.length,
      items: filtered,
    };
  }

  /**
   * Rekapitulasi Kinerja Pengadaan & RFK per OPD (Executive Summary)
   */
  async getLaporanRekapOpd(query: QueryRealisasiDto, user?: any) {
    const {
      tahunAnggaran = new Date().getFullYear(),
      bulan = new Date().getMonth() + 1,
    } = query;

    const activeTahun = Number(tahunAnggaran);
    const activeBulan = Math.min(12, Math.max(1, Number(bulan)));

    const opds = await this.prisma.opd.findMany({
      orderBy: { namaOpd: 'asc' },
      include: {
        paketPembangunan: {
          where: { tahunAnggaran: activeTahun },
          include: {
            targetBulanan: { where: { bulan: activeBulan } },
            realisasiBulanan: { where: { bulan: activeBulan } },
          },
        },
      },
    });

    const rekap = opds
      .filter((opd) => opd.paketPembangunan.length > 0)
      .map((opd) => {
        const totalPaket = opd.paketPembangunan.length;
        const totalPagu = opd.paketPembangunan.reduce((acc, p) => acc + (Number(p.nilaiPagu) || 0), 0);
        const totalKontrak = opd.paketPembangunan.reduce((acc, p) => acc + (Number(p.nilaiKontrak) || 0), 0);

        let sumTarget = 0;
        let sumRealisasiFisik = 0;
        let sumRealisasiKeuangan = 0;
        let countAman = 0;
        let countPerhatian = 0;
        let countKritis = 0;
        let countBelumMulai = 0;

        for (const p of opd.paketPembangunan) {
          const target = p.targetBulanan[0] ? Number(p.targetBulanan[0].targetFisik) : 0;
          const realFisik = p.realisasiBulanan[0] ? Number(p.realisasiBulanan[0].realisasiFisik) : 0;
          const realKeu = p.realisasiBulanan[0] ? Number(p.realisasiBulanan[0].realisasiKeuangan) : 0;
          const dev = parseFloat((realFisik - target).toFixed(2));

          sumTarget += target;
          sumRealisasiFisik += realFisik;
          sumRealisasiKeuangan += realKeu;

          if (target === 0 && realFisik === 0) countBelumMulai++;
          else if (dev >= 0) countAman++;
          else if (dev >= -10) countPerhatian++;
          else countKritis++;
        }

        const avgTargetFisik = parseFloat((sumTarget / totalPaket).toFixed(2));
        const avgRealisasiFisik = parseFloat((sumRealisasiFisik / totalPaket).toFixed(2));
        const avgDeviasiFisik = parseFloat((avgRealisasiFisik - avgTargetFisik).toFixed(2));
        const persenSerapanKeuangan = totalKontrak > 0
          ? parseFloat(((sumRealisasiKeuangan / totalKontrak) * 100).toFixed(2))
          : 0;

        return {
          opdId: opd.id,
          kodeOpd: opd.kodeOpd,
          namaOpd: opd.namaOpd,
          singkatan: opd.singkatan,
          totalPaket,
          totalPagu,
          totalKontrak,
          totalRealisasiKeuangan: sumRealisasiKeuangan,
          persenSerapanKeuangan,
          avgTargetFisik,
          avgRealisasiFisik,
          avgDeviasiFisik,
          countAman,
          countPerhatian,
          countKritis,
          countBelumMulai,
        };
      });

    return {
      tahunAnggaran: activeTahun,
      bulanEvaluasi: activeBulan,
      rekap,
    };
  }
}

