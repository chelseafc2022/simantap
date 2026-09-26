import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusVerifikasi } from '@prisma/client';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { RoleEnum } from '../../common/enums/role.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { EgovService } from '../../core/egov/egov.service';
import { CreatePaketDto } from './dto/create-paket.dto';
import { QueryPaketDto } from './dto/query-paket.dto';
import { QueryRealisasiDto } from './dto/query-realisasi.dto';
import { SetTargetsDto } from './dto/set-targets.dto';
import { UpdatePaketDto } from './dto/update-paket.dto';
import {
  BulkUpsertRealisasiDto,
  UpsertRealisasiDto,
} from './dto/upsert-realisasi.dto';
import { VerifikasiRealisasiDto } from './dto/verifikasi-realisasi.dto';

@Injectable()
export class PembangunanService {
  private readonly logger = new Logger(PembangunanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly egovService: EgovService,
  ) {}

  /**
   * Helper pengecekan hak akses scope OPD & Sub Unit Kerja
   */
  private checkOpdAccess(user: any, opdId: string, subUnitId?: string | null) {
    if (!user) return;
    const isSuperRole = [
      RoleEnum.ADMINISTRATOR,
      RoleEnum.PIMPINAN_DAERAH,
      RoleEnum.MONEV,
    ].includes(user.role);
    if (isSuperRole) return;

    if (user.opdId && user.opdId !== opdId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke data OPD ini');
    }

    if (user.subUnitId && user.role !== RoleEnum.KEPALA_OPD) {
      if (!subUnitId || user.subUnitId !== subUnitId) {
        throw new ForbiddenException(
          'Anda hanya memiliki hak akses untuk data pada Sub Unit Kerja Anda',
        );
      }
    }
  }

  /**
   * Helper untuk membentuk filter scope OPD / Sub Unit Kerja pada query database
   */
  private buildScopeFilter(user?: any): Prisma.PaketPembangunanWhereInput {
    const userRoles: RoleEnum[] =
      user?.roles && user.roles.length > 0
        ? user.roles
        : user?.role
          ? [user.role]
          : [];

    if (userRoles.length === 0) return {};

    const isSuperRole = userRoles.some((r) =>
      [
        RoleEnum.ADMINISTRATOR,
        RoleEnum.PIMPINAN_DAERAH,
        RoleEnum.MONEV,
      ].includes(r),
    );

    if (isSuperRole) return {};

    // Semua role non-super HANYA bisa melihat yang di-upload di sub unit kerja masing-masing
    if (!userRoles.includes(RoleEnum.KEPALA_OPD)) {
      if (user.subUnitId) {
        return { subUnitId: user.subUnitId };
      }
      return { subUnitId: 'UNASSIGNED_SUB_UNIT' };
    }

    // Jika Kepala OPD, kunci ke OPD penanggung jawab
    if (user.opdId) {
      return { opdId: user.opdId };
    }

    return {};
  }

  /**
   * Helper: apakah user boleh mengedit data (bukan role read-only)
   */
  private getSuperRoles() {
    return [RoleEnum.ADMINISTRATOR, RoleEnum.PIMPINAN_DAERAH, RoleEnum.MONEV];
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

    // Role-based OPD & SubUnit Scoping (Administrator & MONEV can see all)
    const scopeFilter = this.buildScopeFilter(user);
    if (scopeFilter.subUnitId) {
      andConditions.push({ subUnitId: scopeFilter.subUnitId });
    } else if (scopeFilter.opdId) {
      andConditions.push({ opdId: scopeFilter.opdId });
      if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
        andConditions.push({ subUnitId });
      }
    } else {
      if (opdId && opdId !== 'ALL' && opdId !== 'all') {
        andConditions.push({ opdId });
      }
      if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
        andConditions.push({ subUnitId });
      }
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

    const enrichedData = data.map((paket) => ({
      ...paket,
      opd: this.egovService.getOpdById(paket.opdId),
      subUnit: this.egovService.getSubUnitById(paket.subUnitId),
    }));

    return {
      data: enrichedData,
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
      throw new NotFoundException(
        `Paket pembangunan dengan ID '${id}' tidak ditemukan`,
      );
    }

    this.checkOpdAccess(user, paket.opdId, paket.subUnitId);

    return {
      ...paket,
      opd: this.egovService.getOpdById(paket.opdId),
      subUnit: this.egovService.getSubUnitById(paket.subUnitId),
    };
  }

  /**
   * Tambah paket pembangunan baru beserta inisialisasi target bulanan B01-B12
   */
  async create(dto: CreatePaketDto, user?: any) {
    const isSuperRole =
      user?.role &&
      [
        RoleEnum.ADMINISTRATOR,
        RoleEnum.PIMPINAN_DAERAH,
        RoleEnum.MONEV,
      ].includes(user.role);
    const assignedOpdId = !isSuperRole && user?.opdId ? user.opdId : dto.opdId;
    const assignedSubUnitId =
      !isSuperRole && user?.subUnitId && user.role !== RoleEnum.KEPALA_OPD
        ? user.subUnitId
        : dto.subUnitId;

    if (!assignedOpdId) {
      throw new BadRequestException('OPD penanggung jawab paket wajib diisi');
    }

    // Verifikasi keberadaan OPD di SIMPEG
    const opdExists = this.egovService.getOpdById(assignedOpdId);
    if (!opdExists) {
      throw new NotFoundException(
        `OPD dengan ID '${assignedOpdId}' tidak ditemukan di SIMPEG`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Simpan data paket pembangunan
      const paket = await tx.paketPembangunan.create({
        data: {
          tahunAnggaran: dto.tahunAnggaran || 2026,
          opdId: assignedOpdId,
          subUnitId: assignedSubUnitId || null,
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
          tanggalSelesai: dto.tanggalSelesai
            ? new Date(dto.tanggalSelesai)
            : null,
          pemenangRekanan: dto.pemenangRekanan || null,
          keterangan: dto.keterangan || null,
          createdById: user?.id || null,
        },
      });

      // 2. Buat otomatis 12 baris target bulanan (B01 - B12)
      // Hanya ADMINISTRATOR & ADMIN_PERENCANAAN yang berwenang menetapkan target kurva fisik.
      // Jika diinput oleh ADMIN_SIRUP, seluruh target bulanan diinisialisasi 0% menunggu input Admin Perencanaan.
      const canSetTargets =
        !user?.role ||
        [RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PERENCANAAN].includes(
          user.role,
        );

      const targetItems = [];
      for (let bulan = 1; bulan <= 12; bulan++) {
        const item = canSetTargets
          ? dto.targetBulanan?.find((t) => t.bulan === bulan)
          : null;
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

      const createdPaket = await tx.paketPembangunan.findUnique({
        where: { id: paket.id },
        include: {
          targetBulanan: { orderBy: { bulan: 'asc' } },
        },
      });

      return {
        ...createdPaket,
        opd: this.egovService.getOpdById(createdPaket?.opdId),
        subUnit: this.egovService.getSubUnitById(createdPaket?.subUnitId),
      };
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
      throw new NotFoundException(
        `Paket pembangunan dengan ID '${id}' tidak ditemukan`,
      );
    }

    this.checkOpdAccess(user, existing.opdId, existing.subUnitId);

    const isSuperRole =
      user?.role &&
      [
        RoleEnum.ADMINISTRATOR,
        RoleEnum.PIMPINAN_DAERAH,
        RoleEnum.MONEV,
      ].includes(user.role);
    const assignedOpdId =
      !isSuperRole && user?.opdId ? user.opdId : dto.opdId || existing.opdId;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update data pokok paket
      const updatedPaket = await tx.paketPembangunan.update({
        where: { id },
        data: {
          tahunAnggaran:
            dto.tahunAnggaran !== undefined
              ? dto.tahunAnggaran
              : existing.tahunAnggaran,
          opdId: assignedOpdId,
          subUnitId:
            dto.subUnitId !== undefined ? dto.subUnitId : existing.subUnitId,
          kodeRupKontrak:
            dto.kodeRupKontrak !== undefined
              ? dto.kodeRupKontrak
              : existing.kodeRupKontrak,
          namaPaket:
            dto.namaPaket !== undefined
              ? dto.namaPaket.trim()
              : existing.namaPaket,
          lokasiKegiatan:
            dto.lokasiKegiatan !== undefined
              ? dto.lokasiKegiatan
              : existing.lokasiKegiatan,
          metodePemilihan:
            dto.metodePemilihan !== undefined
              ? dto.metodePemilihan
              : existing.metodePemilihan,
          jenisPengadaan:
            dto.jenisPengadaan !== undefined
              ? dto.jenisPengadaan
              : existing.jenisPengadaan,
          nilaiPagu:
            dto.nilaiPagu !== undefined ? dto.nilaiPagu : existing.nilaiPagu,
          nilaiKontrak:
            dto.nilaiKontrak !== undefined
              ? dto.nilaiKontrak
              : existing.nilaiKontrak,
          sumberDana:
            dto.sumberDana !== undefined ? dto.sumberDana : existing.sumberDana,
          nomorKontrak:
            dto.nomorKontrak !== undefined
              ? dto.nomorKontrak
              : existing.nomorKontrak,
          tanggalMulai: dto.tanggalMulai
            ? new Date(dto.tanggalMulai)
            : existing.tanggalMulai,
          tanggalSelesai: dto.tanggalSelesai
            ? new Date(dto.tanggalSelesai)
            : existing.tanggalSelesai,
          pemenangRekanan:
            dto.pemenangRekanan !== undefined
              ? dto.pemenangRekanan
              : existing.pemenangRekanan,
          keterangan:
            dto.keterangan !== undefined ? dto.keterangan : existing.keterangan,
        },
      });

      // 2. Update target bulanan jika disertakan dan role berwenang (ADMINISTRATOR / ADMIN_PERENCANAAN)
      const canUpdateTargets =
        !user?.role ||
        [RoleEnum.ADMINISTRATOR, RoleEnum.ADMIN_PERENCANAAN].includes(
          user.role,
        );

      if (canUpdateTargets && dto.targetBulanan && dto.targetBulanan.length > 0) {
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

      const updated = await tx.paketPembangunan.findUnique({
        where: { id },
        include: {
          targetBulanan: { orderBy: { bulan: 'asc' } },
        },
      });

      return {
        ...updated,
        opd: this.egovService.getOpdById(updated?.opdId),
        subUnit: this.egovService.getSubUnitById(updated?.subUnitId),
      };
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
      throw new NotFoundException(
        `Paket pembangunan dengan ID '${id}' tidak ditemukan`,
      );
    }

    this.checkOpdAccess(user, existing.opdId, existing.subUnitId);

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
      throw new NotFoundException(
        `Paket pembangunan dengan ID '${id}' tidak ditemukan`,
      );
    }

    this.checkOpdAccess(user, existing.opdId, existing.subUnitId);

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
  /**
   * Mengambil daftar referensi OPD aktif dari SIMPEG
   */
  async getOpdOptions() {
    return this.egovService.getOpdOptions();
  }

  /**
   * Mengambil daftar Sub Unit Kerja langsung dari SIMPEG berdasarkan OPD
   */
  async getSubUnitOptions(opdId?: string) {
    return this.egovService.getSubUnitOptions(opdId);
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

    const activeBulan = bulan
      ? Math.min(12, Math.max(1, Number(bulan)))
      : new Date().getMonth() + 1;

    const andConditions: Prisma.PaketPembangunanWhereInput[] = [
      { tahunAnggaran: Number(tahunAnggaran) },
    ];

    // Filter scope role (Administrator & MONEV can see all)
    const scopeFilter = this.buildScopeFilter(user);
    if (scopeFilter.subUnitId) {
      andConditions.push({ subUnitId: scopeFilter.subUnitId });
    } else if (scopeFilter.opdId) {
      andConditions.push({ opdId: scopeFilter.opdId });
      if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
        andConditions.push({ subUnitId });
      }
    } else {
      if (opdId && opdId !== 'ALL' && opdId !== 'all') {
        andConditions.push({ opdId });
      }
      if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
        andConditions.push({ subUnitId });
      }
    }

    if (
      metodePemilihan &&
      metodePemilihan !== 'ALL' &&
      metodePemilihan !== 'all'
    ) {
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
      orderBy: [{ opdId: 'asc' }, { namaPaket: 'asc' }],
      include: {
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
      const targetItem = paket.targetBulanan.find(
        (t) => t.bulan === activeBulan,
      );
      const realisasiItem = paket.realisasiBulanan.find(
        (r) => r.bulan === activeBulan,
      );

      const nilaiPagu = Number(paket.nilaiPagu) || 0;
      const nilaiKontrak = Number(paket.nilaiKontrak) || 0;
      const targetFisik = targetItem ? Number(targetItem.targetFisik) : 0;
      const realisasiFisik = realisasiItem
        ? Number(realisasiItem.realisasiFisik)
        : 0;
      const realisasiKeuangan = realisasiItem
        ? Number(realisasiItem.realisasiKeuangan)
        : 0;
      const catatanOperator = realisasiItem?.catatanOperator || null;
      const inputBy = realisasiItem?.inputBy || null;
      const updatedAt = realisasiItem?.updatedAt || null;

      const deviasiFisik = parseFloat(
        (realisasiFisik - targetFisik).toFixed(2),
      );
      const persenKeuangan =
        nilaiKontrak > 0
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
        opd: this.egovService.getOpdById(paket.opdId),
        subUnit: this.egovService.getSubUnitById(paket.subUnitId),
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
    const filtered =
      statusDeviasi && statusDeviasi !== 'ALL'
        ? processed.filter((item) => item.status === statusDeviasi)
        : processed;

    // Perhitungan Ringkasan / Stat Cards (Aggregat)
    const totalPagu = filtered.reduce((acc, cur) => acc + cur.nilaiPagu, 0);
    const totalKontrak = filtered.reduce(
      (acc, cur) => acc + cur.nilaiKontrak,
      0,
    );
    const totalRealisasiKeuangan = filtered.reduce(
      (acc, cur) => acc + cur.realisasiKeuangan,
      0,
    );
    const persenSerapanKeuangan =
      totalKontrak > 0
        ? parseFloat(((totalRealisasiKeuangan / totalKontrak) * 100).toFixed(2))
        : 0;

    const countStatus = {
      aman: filtered.filter((i) => i.status === 'AMAN').length,
      perhatian: filtered.filter((i) => i.status === 'PERHATIAN').length,
      kritis: filtered.filter((i) => i.status === 'KRITIS').length,
      belumMulai: filtered.filter((i) => i.status === 'BELUM_MULAI').length,
    };

    const avgTargetFisik =
      filtered.length > 0
        ? parseFloat(
            (
              filtered.reduce((acc, cur) => acc + cur.targetFisik, 0) /
              filtered.length
            ).toFixed(2),
          )
        : 0;
    const avgRealisasiFisik =
      filtered.length > 0
        ? parseFloat(
            (
              filtered.reduce((acc, cur) => acc + cur.realisasiFisik, 0) /
              filtered.length
            ).toFixed(2),
          )
        : 0;
    const avgDeviasiFisik = parseFloat(
      (avgRealisasiFisik - avgTargetFisik).toFixed(2),
    );

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
   * Mengambil riwayat realisasi 12 bulan untuk 1 paket pembangunan — termasuk bukti fisik
   */
  async getRealisasiPaket(paketId: string, user?: any) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
      include: {
        targetBulanan: { orderBy: { bulan: 'asc' } },
        realisasiBulanan: {
          orderBy: { bulan: 'asc' },
          include: {
            inputBy: {
              select: { id: true, namaLengkap: true, nip: true },
            },
            verifikasiOleh: {
              select: { id: true, namaLengkap: true, nip: true, role: true },
            },
            buktiFisik: {
              orderBy: { createdAt: 'asc' },
              include: {
                uploadOleh: {
                  select: { id: true, namaLengkap: true, nip: true },
                },
              },
            },
          },
        },
      },
    });

    if (!paket) {
      throw new NotFoundException(
        `Paket pembangunan '${paketId}' tidak ditemukan`,
      );
    }

    this.checkOpdAccess(user, paket.opdId, paket.subUnitId);

    const nilaiKontrak = Number(paket.nilaiKontrak) || 0;
    const nilaiPagu = Number(paket.nilaiPagu) || 0;

    const timeline = Array.from({ length: 12 }, (_, idx) => {
      const bulan = idx + 1;
      const targetItem = paket.targetBulanan.find((t) => t.bulan === bulan);
      const realisasiItem = paket.realisasiBulanan.find(
        (r) => r.bulan === bulan,
      );

      const targetFisik = targetItem ? Number(targetItem.targetFisik) : 0;
      const realisasiFisik = realisasiItem
        ? Number(realisasiItem.realisasiFisik)
        : 0;
      const realisasiKeuangan = realisasiItem
        ? Number(realisasiItem.realisasiKeuangan)
        : 0;
      const deviasiFisik = parseFloat(
        (realisasiFisik - targetFisik).toFixed(2),
      );
      const persenKeuangan =
        nilaiKontrak > 0
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
        // Verifikasi MONEV
        statusVerifikasi: realisasiItem?.statusVerifikasi || 'DRAFT',
        catatanVerifikasi: realisasiItem?.catatanVerifikasi || null,
        verifikasiOleh: realisasiItem?.verifikasiOleh || null,
        verifikasiAt: realisasiItem?.verifikasiAt || null,
        diajukanAt: realisasiItem?.diajukanAt || null,
        // Bukti fisik lapangan
        buktiFisik:
          realisasiItem?.buktiFisik?.map((b) => ({
            id: b.id,
            namaFile: b.namaFile,
            pathFile: `/uploads/bukti-fisik/${b.namaFile.split('/').pop()}`,
            mimeType: b.mimeType,
            ukuranBytes: b.ukuranBytes,
            deskripsi: b.deskripsi,
            uploadOleh: b.uploadOleh,
            createdAt: b.createdAt,
          })) || [],
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
        opd: this.egovService.getOpdById(paket.opdId),
        subUnit: this.egovService.getSubUnitById(paket.subUnitId),
        tanggalMulai: paket.tanggalMulai,
        tanggalSelesai: paket.tanggalSelesai,
      },
      timeline,
    };
  }

  /**
   * Menyimpan / memperbarui realisasi 1 bulan (dengan field-level protection)
   * - ADMIN_PPK: hanya boleh mengisi realisasiFisik
   * - BENDAHARA : hanya boleh mengisi realisasiKeuangan
   * - ADMINISTRATOR: boleh mengisi keduanya
   */
  async upsertRealisasi(paketId: string, dto: UpsertRealisasiDto, user?: any) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket)
      throw new NotFoundException(
        `Paket pembangunan '${paketId}' tidak ditemukan`,
      );

    this.checkOpdAccess(user, paket.opdId, paket.subUnitId);

    const bulan = Math.min(12, Math.max(1, Number(dto.bulan)));
    const userRoles: RoleEnum[] =
      user?.roles && user.roles.length > 0
        ? user.roles
        : user?.role
          ? [user.role]
          : [];
    const userRole: RoleEnum = user?.role || userRoles[0];
    const isPPK = userRoles.includes(RoleEnum.ADMIN_PPK);
    const isBendahara = userRoles.includes(RoleEnum.BENDAHARA);
    const isAdmin = userRoles.includes(RoleEnum.ADMINISTRATOR);

    // Cek status verifikasi — jika sudah TERVERIFIKASI, tidak boleh diubah tanpa unlock
    const existing = await this.prisma.realisasiBulanan.findUnique({
      where: { paketId_bulan: { paketId, bulan } },
    });
    if (
      existing?.statusVerifikasi === StatusVerifikasi.TERVERIFIKASI &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        'Data bulan ini sudah terverifikasi oleh MONEV dan terkunci. Hubungi Administrator untuk membuka kunci.',
      );
    }

    // Field-level protection
    let realisasiFisik: number | undefined;
    let realisasiKeuangan: number | undefined;
    if (isAdmin || (isPPK && isBendahara)) {
      realisasiFisik = Math.min(
        100,
        Math.max(0, Number(dto.realisasiFisik) || 0),
      );
      realisasiKeuangan = Math.max(0, Number(dto.realisasiKeuangan) || 0);
    } else if (isPPK) {
      realisasiFisik = Math.min(
        100,
        Math.max(0, Number(dto.realisasiFisik) || 0),
      );
      realisasiKeuangan = existing ? Number(existing.realisasiKeuangan) : 0; // pertahankan angka keuangan existing
    } else if (isBendahara) {
      realisasiFisik = existing ? Number(existing.realisasiFisik) : 0; // pertahankan angka fisik existing
      realisasiKeuangan = Math.max(0, Number(dto.realisasiKeuangan) || 0);
    } else {
      throw new ForbiddenException(
        'Akses ditolak: Akun Anda tidak memiliki peran PPK atau Bendahara untuk menginput realisasi',
      );
    }

    const record = await this.prisma.realisasiBulanan.upsert({
      where: { paketId_bulan: { paketId, bulan } },
      create: {
        paketId,
        bulan,
        realisasiFisik,
        realisasiKeuangan,
        catatanOperator: dto.catatanOperator?.trim() || null,
        inputById: user?.id || null,
        statusVerifikasi: StatusVerifikasi.DRAFT,
      },
      update: {
        realisasiFisik,
        realisasiKeuangan,
        catatanOperator:
          dto.catatanOperator !== undefined
            ? dto.catatanOperator.trim() || null
            : undefined,
        inputById: user?.id || null,
        // Reset ke DRAFT jika data diubah setelah diajukan (kecuali oleh ADMINISTRATOR)
        statusVerifikasi:
          existing?.statusVerifikasi === StatusVerifikasi.DIAJUKAN &&
          userRole !== RoleEnum.ADMINISTRATOR
            ? StatusVerifikasi.DRAFT
            : undefined,
        diajukanAt:
          existing?.statusVerifikasi === StatusVerifikasi.DIAJUKAN &&
          userRole !== RoleEnum.ADMINISTRATOR
            ? null
            : undefined,
      },
      include: {
        inputBy: { select: { id: true, namaLengkap: true, nip: true } },
      },
    });

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
            userRole,
          },
        },
      });
    }
    return record;
  }

  /**
   * Bulk upsert realisasi beberapa bulan (dengan field-level protection)
   */
  async bulkUpsertRealisasi(
    paketId: string,
    dto: BulkUpsertRealisasiDto,
    user?: any,
  ) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket)
      throw new NotFoundException(
        `Paket pembangunan '${paketId}' tidak ditemukan`,
      );

    this.checkOpdAccess(user, paket.opdId, paket.subUnitId);

    const userRoles: RoleEnum[] =
      user?.roles && user.roles.length > 0
        ? user.roles
        : user?.role
          ? [user.role]
          : [];
    const userRole: RoleEnum = user?.role || userRoles[0];
    const isPPK = userRoles.includes(RoleEnum.ADMIN_PPK);
    const isBendahara = userRoles.includes(RoleEnum.BENDAHARA);
    const isAdmin = userRoles.includes(RoleEnum.ADMINISTRATOR);

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const bulan = Math.min(12, Math.max(1, Number(item.bulan)));

        // Cek apakah sudah TERVERIFIKASI
        const existing = await tx.realisasiBulanan.findUnique({
          where: { paketId_bulan: { paketId, bulan } },
        });
        if (
          existing?.statusVerifikasi === StatusVerifikasi.TERVERIFIKASI &&
          !isAdmin
        ) {
          continue; // skip bulan yang sudah terkunci
        }

        // Field-level protection
        let realisasiFisik: number;
        let realisasiKeuangan: number;
        if (isAdmin || (isPPK && isBendahara)) {
          realisasiFisik = Math.min(
            100,
            Math.max(0, Number(item.realisasiFisik) || 0),
          );
          realisasiKeuangan = Math.max(0, Number(item.realisasiKeuangan) || 0);
        } else if (isPPK) {
          realisasiFisik = Math.min(
            100,
            Math.max(0, Number(item.realisasiFisik) || 0),
          );
          realisasiKeuangan = existing ? Number(existing.realisasiKeuangan) : 0;
        } else if (isBendahara) {
          realisasiFisik = existing ? Number(existing.realisasiFisik) : 0;
          realisasiKeuangan = Math.max(0, Number(item.realisasiKeuangan) || 0);
        } else {
          continue;
        }

        await tx.realisasiBulanan.upsert({
          where: { paketId_bulan: { paketId, bulan } },
          create: {
            paketId,
            bulan,
            realisasiFisik,
            realisasiKeuangan,
            catatanOperator: item.catatanOperator?.trim() || null,
            inputById: user?.id || null,
            statusVerifikasi: StatusVerifikasi.DRAFT,
          },
          update: {
            realisasiFisik,
            realisasiKeuangan,
            catatanOperator:
              item.catatanOperator !== undefined
                ? item.catatanOperator.trim() || null
                : undefined,
            inputById: user?.id || null,
            statusVerifikasi:
              existing?.statusVerifikasi === StatusVerifikasi.DIAJUKAN &&
              userRole !== RoleEnum.ADMINISTRATOR
                ? StatusVerifikasi.DRAFT
                : undefined,
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
            payload: { totalBulanDiperbarui: dto.items.length, userRole },
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

    // Filter scope role (Administrator & MONEV can see all)
    const scopeFilter = this.buildScopeFilter(user);
    if (scopeFilter.subUnitId) {
      andConditions.push({ subUnitId: scopeFilter.subUnitId });
    } else if (scopeFilter.opdId) {
      andConditions.push({ opdId: scopeFilter.opdId });
      if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
        andConditions.push({ subUnitId });
      }
    } else {
      if (opdId && opdId !== 'ALL') {
        andConditions.push({ opdId });
      }
      if (subUnitId && subUnitId !== 'ALL') {
        andConditions.push({ subUnitId });
      }
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
      orderBy: [{ opdId: 'asc' }, { namaPaket: 'asc' }],
      include: {
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
        const realisasiFisik = realisasiItem
          ? Number(realisasiItem.realisasiFisik)
          : 0;
        const realisasiKeuangan = realisasiItem
          ? Number(realisasiItem.realisasiKeuangan)
          : 0;
        const deviasiFisik = parseFloat(
          (realisasiFisik - targetFisik).toFixed(2),
        );
        const persenKeuangan =
          nilaiKontrak > 0
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
        opd: this.egovService.getOpdById(paket.opdId),
        subUnit: this.egovService.getSubUnitById(paket.subUnitId),
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

    const filtered =
      statusDeviasi && statusDeviasi !== 'ALL'
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

    const isSuperRole = [
      RoleEnum.ADMINISTRATOR,
      RoleEnum.PIMPINAN_DAERAH,
      RoleEnum.MONEV,
    ].includes(user?.role);

    const whereConditions: Prisma.PaketPembangunanWhereInput = {
      tahunAnggaran: activeTahun,
      ...(!isSuperRole && user?.opdId ? { opdId: user.opdId } : {}),
      ...(!isSuperRole && user?.subUnitId && user?.role !== RoleEnum.KEPALA_OPD
        ? { subUnitId: user.subUnitId }
        : {}),
    };

    const pakets = await this.prisma.paketPembangunan.findMany({
      where: whereConditions,
      include: {
        targetBulanan: { where: { bulan: activeBulan } },
        realisasiBulanan: { where: { bulan: activeBulan } },
      },
    });

    // Grouping berdasarkan opdId
    const opdGroups = new Map<string, typeof pakets>();
    for (const p of pakets) {
      const list = opdGroups.get(p.opdId) || [];
      list.push(p);
      opdGroups.set(p.opdId, list);
    }

    const rekap = Array.from(opdGroups.entries()).map(([opdId, groupPakets]) => {
      const opdInfo = this.egovService.getOpdById(opdId);
      const totalPaket = groupPakets.length;
      const totalPagu = groupPakets.reduce(
        (acc, p) => acc + (Number(p.nilaiPagu) || 0),
        0,
      );
      const totalKontrak = groupPakets.reduce(
        (acc, p) => acc + (Number(p.nilaiKontrak) || 0),
        0,
      );

      let sumTarget = 0;
      let sumRealisasiFisik = 0;
      let sumRealisasiKeuangan = 0;
      let countAman = 0;
      let countPerhatian = 0;
      let countKritis = 0;
      let countBelumMulai = 0;

      for (const p of groupPakets) {
        const target = p.targetBulanan[0]
          ? Number(p.targetBulanan[0].targetFisik)
          : 0;
        const realFisik = p.realisasiBulanan[0]
          ? Number(p.realisasiBulanan[0].realisasiFisik)
          : 0;
        const realKeu = p.realisasiBulanan[0]
          ? Number(p.realisasiBulanan[0].realisasiKeuangan)
          : 0;
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
      const avgRealisasiFisik = parseFloat(
        (sumRealisasiFisik / totalPaket).toFixed(2),
      );
      const avgDeviasiFisik = parseFloat(
        (avgRealisasiFisik - avgTargetFisik).toFixed(2),
      );
      const persenSerapanKeuangan =
        totalKontrak > 0
          ? parseFloat(
              ((sumRealisasiKeuangan / totalKontrak) * 100).toFixed(2),
            )
          : 0;

      return {
        opdId,
        kodeOpd: opdInfo?.kodeOpd || opdId,
        namaOpd: opdInfo?.namaOpd || opdId,
        singkatan: opdInfo?.singkatan || '',
        totalPaket,
        totalPagu,
        totalKontrak,
        avgTargetFisik,
        avgRealisasiFisik,
        avgDeviasiFisik,
        totalRealisasiKeuangan: sumRealisasiKeuangan,
        persenSerapanKeuangan,
        rekapStatus: {
          aman: countAman,
          perhatian: countPerhatian,
          kritis: countKritis,
          belumMulai: countBelumMulai,
        },
      };
    });

    return {
      tahunAnggaran: activeTahun,
      bulanEvaluasi: activeBulan,
      rekap,
    };
  }

  /**
   * PPK/Bendahara mengajukan realisasi bulan tertentu ke MONEV
   */
  async ajukanRealisasi(paketId: string, bulan: number, user?: any) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket)
      throw new NotFoundException(`Paket '${paketId}' tidak ditemukan`);
    this.checkOpdAccess(user, paket.opdId, paket.subUnitId);

    const realisasi = await this.prisma.realisasiBulanan.findUnique({
      where: { paketId_bulan: { paketId, bulan } },
    });
    if (!realisasi)
      throw new NotFoundException(
        `Data realisasi Bulan ${bulan} belum ada. Isi dulu sebelum diajukan.`,
      );
    if (realisasi.statusVerifikasi === StatusVerifikasi.TERVERIFIKASI) {
      throw new BadRequestException(
        'Data ini sudah terverifikasi oleh MONEV dan tidak perlu diajukan ulang.',
      );
    }
    if (realisasi.statusVerifikasi === StatusVerifikasi.DIAJUKAN) {
      throw new BadRequestException('Data ini sudah dalam antrian MONEV.');
    }

    const updated = await this.prisma.realisasiBulanan.update({
      where: { paketId_bulan: { paketId, bulan } },
      data: {
        statusVerifikasi: StatusVerifikasi.DIAJUKAN,
        diajukanAt: new Date(),
      },
    });

    if (user?.id) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'AJUKAN_REALISASI',
          resource: 'REALISASI_BULANAN',
          resourceId: `${paketId}_B${bulan}`,
          payload: { paketId, bulan },
        },
      });
    }
    return {
      message: `Realisasi Bulan ${bulan} berhasil diajukan ke MONEV untuk diverifikasi.`,
      data: updated,
    };
  }

  /**
   * MONEV/Administrator menyetujui (ACC) realisasi
   */
  async accRealisasi(
    paketId: string,
    bulan: number,
    dto: VerifikasiRealisasiDto,
    user?: any,
  ) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket)
      throw new NotFoundException(`Paket '${paketId}' tidak ditemukan`);

    const realisasi = await this.prisma.realisasiBulanan.findUnique({
      where: { paketId_bulan: { paketId, bulan } },
    });
    if (!realisasi)
      throw new NotFoundException(
        `Data realisasi Bulan ${bulan} tidak ditemukan.`,
      );
    if (realisasi.statusVerifikasi !== StatusVerifikasi.DIAJUKAN) {
      throw new BadRequestException(
        'Hanya realisasi dengan status DIAJUKAN yang dapat di-ACC.',
      );
    }

    const updated = await this.prisma.realisasiBulanan.update({
      where: { paketId_bulan: { paketId, bulan } },
      data: {
        statusVerifikasi: StatusVerifikasi.TERVERIFIKASI,
        catatanVerifikasi: dto.catatanVerifikasi?.trim() || null,
        verifikasiOlehId: user?.id || null,
        verifikasiAt: new Date(),
      },
    });

    if (user?.id) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'ACC_REALISASI_MONEV',
          resource: 'REALISASI_BULANAN',
          resourceId: `${paketId}_B${bulan}`,
          payload: { paketId, bulan, catatan: dto.catatanVerifikasi },
        },
      });
    }
    return {
      message: `Realisasi Bulan ${bulan} berhasil diverifikasi (ACC) oleh MONEV. Data terkunci.`,
      data: updated,
    };
  }

  /**
   * MONEV/Administrator menolak realisasi (dikembalikan ke PPK)
   */
  async tolakRealisasi(
    paketId: string,
    bulan: number,
    dto: VerifikasiRealisasiDto,
    user?: any,
  ) {
    if (!dto.catatanVerifikasi?.trim()) {
      throw new BadRequestException(
        'Alasan penolakan wajib diisi saat menolak realisasi.',
      );
    }

    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket)
      throw new NotFoundException(`Paket '${paketId}' tidak ditemukan`);

    const realisasi = await this.prisma.realisasiBulanan.findUnique({
      where: { paketId_bulan: { paketId, bulan } },
    });
    if (!realisasi)
      throw new NotFoundException(
        `Data realisasi Bulan ${bulan} tidak ditemukan.`,
      );
    if (realisasi.statusVerifikasi !== StatusVerifikasi.DIAJUKAN) {
      throw new BadRequestException(
        'Hanya realisasi dengan status DIAJUKAN yang dapat ditolak.',
      );
    }

    const updated = await this.prisma.realisasiBulanan.update({
      where: { paketId_bulan: { paketId, bulan } },
      data: {
        statusVerifikasi: StatusVerifikasi.DITOLAK,
        catatanVerifikasi: dto.catatanVerifikasi.trim(),
        verifikasiOlehId: user?.id || null,
        verifikasiAt: new Date(),
      },
    });

    if (user?.id) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'TOLAK_REALISASI_MONEV',
          resource: 'REALISASI_BULANAN',
          resourceId: `${paketId}_B${bulan}`,
          payload: { paketId, bulan, alasanPenolakan: dto.catatanVerifikasi },
        },
      });
    }
    return {
      message: `Realisasi Bulan ${bulan} ditolak oleh MONEV. Data dikembalikan ke PPK untuk diperbaiki.`,
      data: updated,
    };
  }

  /**
   * Upload bukti fisik (foto/video) oleh PPK
   */
  async uploadBuktiFisik(
    paketId: string,
    bulan: number,
    files: Express.Multer.File[],
    deskripsi: string,
    user?: any,
  ) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket)
      throw new NotFoundException(`Paket '${paketId}' tidak ditemukan`);
    this.checkOpdAccess(user, paket.opdId, paket.subUnitId);

    if (!files || files.length === 0) {
      throw new BadRequestException('Tidak ada file yang diupload.');
    }

    // Pastikan realisasi bulanan sudah ada — buat jika belum
    let realisasi = await this.prisma.realisasiBulanan.findUnique({
      where: { paketId_bulan: { paketId, bulan } },
    });
    if (!realisasi) {
      realisasi = await this.prisma.realisasiBulanan.create({
        data: { paketId, bulan, inputById: user?.id || null },
      });
    }

    // Hitung jumlah bukti yang sudah ada
    const existingCount = await this.prisma.buktiFisik.count({
      where: { realisasiId: realisasi.id },
    });
    if (existingCount + files.length > 5) {
      // Hapus file yang baru diupload karena melebihi batas
      for (const file of files) {
        if (existsSync(file.path)) await unlink(file.path).catch(() => {});
      }
      throw new BadRequestException(
        `Batas maksimal 5 foto per bulan sudah tercapai (saat ini: ${existingCount}).`,
      );
    }

    const saved = await this.prisma.$transaction(
      files.map((file) =>
        this.prisma.buktiFisik.create({
          data: {
            realisasiId: realisasi.id,
            namaFile: file.filename,
            pathFile: file.path,
            mimeType: file.mimetype,
            ukuranBytes: file.size,
            deskripsi: deskripsi?.trim() || null,
            uploadOlehId: user?.id || null,
          },
        }),
      ),
    );

    return {
      message: `${files.length} file bukti fisik berhasil diupload untuk Bulan ${bulan}.`,
      data: saved.map((b) => ({
        id: b.id,
        namaFile: b.namaFile,
        mimeType: b.mimeType,
        ukuranBytes: b.ukuranBytes,
        deskripsi: b.deskripsi,
      })),
    };
  }

  /**
   * Hapus satu bukti fisik
   */
  async deleteBuktiFisik(buktiFisikId: string, user?: any) {
    const bukti = await this.prisma.buktiFisik.findUnique({
      where: { id: buktiFisikId },
      include: { realisasi: { include: { paket: true } } },
    });
    if (!bukti) throw new NotFoundException('Bukti fisik tidak ditemukan.');

    // Cek akses OPD & SubUnit
    this.checkOpdAccess(
      user,
      bukti.realisasi.paket.opdId,
      bukti.realisasi.paket.subUnitId,
    );

    // Hapus file dari disk
    if (existsSync(bukti.pathFile)) {
      await unlink(bukti.pathFile).catch(() =>
        this.logger.warn(`File tidak ditemukan di disk: ${bukti.pathFile}`),
      );
    }

    await this.prisma.buktiFisik.delete({ where: { id: buktiFisikId } });
    return { message: 'Bukti fisik berhasil dihapus.' };
  }

  /**
   * Antrian verifikasi MONEV — daftar realisasi yang sudah diajukan PPK
   */
  async getAntrianVerifikasi(query: QueryRealisasiDto, user?: any) {
    const { tahunAnggaran = new Date().getFullYear(), opdId } = query;
    const activeTahun = Number(tahunAnggaran);

    const whereScope = this.buildScopeFilter(user);
    const filterWhere: Prisma.PaketPembangunanWhereInput = {
      tahunAnggaran: activeTahun,
      ...whereScope,
      ...(opdId && opdId !== 'ALL' && Object.keys(whereScope).length === 0
        ? { opdId }
        : {}),
    };

    const antrian = await this.prisma.realisasiBulanan.findMany({
      where: {
        statusVerifikasi: StatusVerifikasi.DIAJUKAN,
        paket: filterWhere,
      },
      orderBy: { diajukanAt: 'asc' },
      include: {
        paket: true,
        inputBy: {
          select: { id: true, namaLengkap: true, nip: true, jabatan: true },
        },
        buktiFisik: {
          select: {
            id: true,
            namaFile: true,
            mimeType: true,
            deskripsi: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      tahunAnggaran: activeTahun,
      total: antrian.length,
      items: antrian.map((r) => ({
        realisasiId: r.id,
        paketId: r.paketId,
        namaPaket: r.paket.namaPaket,
        opd: this.egovService.getOpdById(r.paket.opdId),
        subUnit: this.egovService.getSubUnitById(r.paket.subUnitId),
        bulan: r.bulan,
        realisasiFisik: Number(r.realisasiFisik),
        realisasiKeuangan: Number(r.realisasiKeuangan),
        catatanOperator: r.catatanOperator,
        inputBy: r.inputBy,
        diajukanAt: r.diajukanAt,
        jumlahBukti: r.buktiFisik.length,
        buktiFisik: r.buktiFisik,
      })),
    };
  }
}
