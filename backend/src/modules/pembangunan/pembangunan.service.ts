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
import { CreatePaketDto } from './dto/create-paket.dto';
import { QueryPaketDto } from './dto/query-paket.dto';
import { SetTargetsDto } from './dto/set-targets.dto';
import { UpdatePaketDto } from './dto/update-paket.dto';

@Injectable()
export class PembangunanService {
  private readonly logger = new Logger(PembangunanService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    } else if (opdId) {
      andConditions.push({ opdId });
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
}
