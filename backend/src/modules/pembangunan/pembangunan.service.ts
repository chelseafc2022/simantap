import { UpdatePencairanDto } from './dto/update-pencairan.dto';
import { CreatePencairanDto } from './dto/create-pencairan.dto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusVerifikasi, type PencairanKeuangan } from '@prisma/client';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { RoleEnum } from '../../common/enums/role.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { EgovService, isExcludedOpd } from '../../core/egov/egov.service';
import { CreatePaketDto } from './dto/create-paket.dto';
import { QueryPaketDto } from './dto/query-paket.dto';
import { QueryRealisasiDto } from './dto/query-realisasi.dto';
import { SetTargetsDto } from './dto/set-targets.dto';
import { UpdatePaketDto } from './dto/update-paket.dto';
import {
  BulkUpsertRealisasiDto,
  UpsertRealisasiDto,
} from './dto/upsert-realisasi.dto';
import { UpsertRealisasiMingguanDto } from './dto/upsert-realisasi-mingguan.dto';

@Injectable()
export class PembangunanService {
  private readonly logger = new Logger(PembangunanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly egovService: EgovService,
  ) {}

  private validateMonitoring(
    pola: string,
    dto: {
      targetMingguan?: unknown[];
      targetBulanan?: { targetFisik: number }[];
    },
    kontrak: number,
    penyedia?: string | null,
  ) {
    if (pola === 'KEUANGAN') {
      if (
        dto.targetMingguan?.length ||
        dto.targetBulanan?.some((t) => Number(t.targetFisik) > 0)
      ) {
        throw new BadRequestException(
          'Pola keuangan saja tidak menggunakan target fisik',
        );
      }
    } else if (
      dto.targetMingguan?.length &&
      (!(kontrak > 0) || !penyedia?.trim())
    ) {
      throw new BadRequestException(
        'Nilai kontrak dan penyedia wajib lengkap sebelum mengisi target mingguan',
      );
    }
  }

  private buildMonthlyTargetsFromWeekly(
    targets: Array<{ bulan: number; mingguKe: number; targetFisik: number }>,
  ) {
    const lastTargetByMonth = new Map<number, number>();
    for (const item of [...targets].sort(
      (a, b) => a.bulan - b.bulan || a.mingguKe - b.mingguKe,
    )) {
      lastTargetByMonth.set(item.bulan, Number(item.targetFisik) || 0);
    }

    let cumulative = 0;
    let hasStarted = false;
    return Array.from({ length: 12 }, (_, index) => {
      const bulan = index + 1;
      if (lastTargetByMonth.has(bulan)) {
        cumulative = lastTargetByMonth.get(bulan) || 0;
        hasStarted = true;
      }
      return {
        bulan,
        targetFisik: hasStarted ? cumulative : 0,
      };
    });
  }

  private validateWeeklyTargets(
    targets: Array<{
      bulan: number;
      mingguKe: number;
      tanggalMulai: string;
      tanggalSelesai: string;
      targetFisik: number;
    }>,
    contractStart?: string | Date | null,
    contractEnd?: string | Date | null,
  ) {
    if (targets.length === 0) return;
    if (!contractStart || !contractEnd) {
      throw new BadRequestException(
        'Tanggal mulai dan selesai kontrak wajib diisi sebelum menetapkan target mingguan',
      );
    }

    const start = new Date(contractStart);
    const end = new Date(contractEnd);
    let previousTarget = 0;
    const keys = new Set<string>();
    for (const item of [...targets].sort(
      (a, b) =>
        new Date(a.tanggalMulai).getTime() -
        new Date(b.tanggalMulai).getTime(),
    )) {
      const weekStart = new Date(item.tanggalMulai);
      const weekEnd = new Date(item.tanggalSelesai);
      const key = `${item.bulan}-${item.mingguKe}`;
      if (keys.has(key)) {
        throw new BadRequestException(
          `Target ${key} tercatat lebih dari satu kali`,
        );
      }
      keys.add(key);
      if (weekEnd < weekStart || weekStart < start || weekEnd > end) {
        throw new BadRequestException(
          `Rentang target Bulan ${item.bulan} Minggu ${item.mingguKe} berada di luar masa kontrak`,
        );
      }
      if (Number(item.targetFisik) < previousTarget) {
        throw new BadRequestException(
          'Target fisik kumulatif mingguan tidak boleh turun dari minggu sebelumnya',
        );
      }
      previousTarget = Number(item.targetFisik);
    }
  }

  private async syncMonthlyRealisasiFromWeekly(
    tx: Prisma.TransactionClient,
    paketId: string,
    bulan: number,
    inputById?: string,
  ) {
    const weeklyRows = await tx.realisasiMingguan.findMany({
      where: { paketId, bulan },
      orderBy: { mingguKe: 'asc' },
    });
    const latest = weeklyRows.at(-1);
    if (!latest) {
      await tx.realisasiBulanan.updateMany({
        where: { paketId, bulan },
        data: { realisasiFisik: 0, realisasiKeuangan: 0, catatanOperator: null, statusVerifikasi: StatusVerifikasi.TERCATAT },
      });
      return;
    }

    await tx.realisasiBulanan.upsert({
      where: { paketId_bulan: { paketId, bulan } },
      create: {
        paketId,
        bulan,
        realisasiFisik: Number(latest.realisasiFisik || 0),
        realisasiKeuangan: Number(latest.realisasiKeuangan || 0),
        catatanOperator: latest.catatanOperator,
        inputById: inputById || latest.inputById,
        statusVerifikasi: StatusVerifikasi.TERCATAT,
      },
      update: {
        statusVerifikasi: StatusVerifikasi.TERCATAT,
        realisasiFisik: Number(latest.realisasiFisik || 0),
        realisasiKeuangan: Number(latest.realisasiKeuangan || 0),
        catatanOperator: latest.catatanOperator,
        inputById: inputById || latest.inputById,
      },
    });
  }

  /**
   * Helper pengecekan hak akses scope OPD & Sub Unit Kerja
   */
  private checkOpdAccess(user: any, opdId: string, subUnitId?: string | null) {
    if (!user) return;
    const userRoles = this.getUserRoles(user);
    const isSuperRole = userRoles.some((role) =>
      [
        RoleEnum.ADMINISTRATOR,
        RoleEnum.PIMPINAN_DAERAH,
        RoleEnum.MONEV,
      ].includes(role),
    );
    if (isSuperRole) return;

    const hasAccess = this.getAccessibleScopes(user).some(
      (scope) =>
        scope.opdId === opdId &&
        (!scope.subUnitId || scope.subUnitId === subUnitId),
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke data OPD atau Sub Unit Kerja ini',
      );
    }
  }

  private getUserRoles(user?: any): RoleEnum[] {
    return user?.roles && user.roles.length > 0
      ? user.roles
      : user?.role
        ? [user.role]
        : [];
  }

  private getAccessibleScopes(user?: any) {
    if (!user) return [];

    const userRoles = this.getUserRoles(user);
    const scopes: Array<{ opdId: string; subUnitId: string | null }> = [];

    if (user.opdId) {
      scopes.push({
        opdId: user.opdId,
        subUnitId: userRoles.includes(RoleEnum.KEPALA_OPD)
          ? null
          : user.subUnitId || null,
      });
    }

    for (const scope of user.accessScopes || []) {
      if (scope.opdId) {
        scopes.push({
          opdId: scope.opdId,
          subUnitId: scope.subUnitId || null,
        });
      }
    }

    return scopes;
  }

  /**
   * Helper untuk membentuk filter scope OPD / Sub Unit Kerja pada query database
   */
  private buildScopeFilter(user?: any): Prisma.PaketPembangunanWhereInput {
    const userRoles = this.getUserRoles(user);

    if (userRoles.length === 0) return {};

    const isSuperRole = userRoles.some((r) =>
      [
        RoleEnum.ADMINISTRATOR,
        RoleEnum.PIMPINAN_DAERAH,
        RoleEnum.MONEV,
      ].includes(r),
    );

    if (isSuperRole) return {};

    const scopes = this.getAccessibleScopes(user);
    if (scopes.length === 0) {
      return { opdId: 'UNASSIGNED_OPD' };
    }

    return {
      OR: scopes.map((scope) =>
        scope.subUnitId
          ? { opdId: scope.opdId, subUnitId: scope.subUnitId }
          : { opdId: scope.opdId },
      ),
    };
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
      polaMonitoring,
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
    if (Object.keys(scopeFilter).length > 0) {
      andConditions.push(scopeFilter);
    }
    if (opdId && opdId !== 'ALL' && opdId !== 'all') {
      andConditions.push({ opdId });
    }
    if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
      andConditions.push({ subUnitId });
    }

    if (polaMonitoring) {
      andConditions.push({ polaMonitoring });
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

    // Prioritas diterapkan sebelum pagination agar kegiatan berjalan/selesai
    // selalu mendahului paket yang belum berkontrak atau belum ada realisasi.
    const started: Prisma.PaketPembangunanWhereInput = {
      OR: [
        { nilaiKontrak: { gt: 0 } },
        { realisasiBulanan: { some: { OR: [
          { realisasiFisik: { gt: 0 } },
          { realisasiKeuangan: { gt: 0 } },
        ] } } },
      ],
    };
    const startedWhere = { AND: [where, started] };
    const pendingWhere = { AND: [where, { NOT: started }] };
    const [total, startedTotal] = await Promise.all([
      this.prisma.paketPembangunan.count({ where }),
      this.prisma.paketPembangunan.count({ where: startedWhere }),
    ]);
    const include = {
      targetBulanan: { orderBy: { bulan: 'asc' as const } },
      targetMingguan: { orderBy: [{ bulan: 'asc' as const }, { mingguKe: 'asc' as const }] },
      realisasiBulanan: { orderBy: { bulan: 'asc' as const } },
    };
    const stableOrder = [orderBy, { id: 'asc' as const }];
    const startedTake = Math.min(limit, Math.max(0, startedTotal - skip));
    const [startedData, pendingData] = await Promise.all([
      startedTake > 0
        ? this.prisma.paketPembangunan.findMany({
            where: startedWhere, skip, take: startedTake, orderBy: stableOrder, include,
          })
        : Promise.resolve([]),
      limit > startedTake
        ? this.prisma.paketPembangunan.findMany({
            where: pendingWhere, skip: Math.max(0, skip - startedTotal),
            take: limit - startedTake, orderBy: stableOrder, include,
          })
        : Promise.resolve([]),
    ]);
    const data = [...startedData, ...pendingData];

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
        targetMingguan: {
          orderBy: [{ bulan: 'asc' }, { mingguKe: 'asc' }],
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
    const userRoles = this.getUserRoles(user);
    const isSuperRole = userRoles.some((role) =>
      [
        RoleEnum.ADMINISTRATOR,
        RoleEnum.PIMPINAN_DAERAH,
        RoleEnum.MONEV,
      ].includes(role),
    );
    const isKepalaOpd = userRoles.includes(RoleEnum.KEPALA_OPD);
    const assignedOpdId = !isSuperRole && user?.opdId ? user.opdId : dto.opdId;
    const assignedSubUnitId =
      !isSuperRole && user?.subUnitId && !isKepalaOpd
        ? user.subUnitId
        : dto.subUnitId;

    if (!assignedOpdId) {
      throw new BadRequestException('OPD penanggung jawab paket wajib diisi');
    }

    this.validateMonitoring(
      dto.polaMonitoring || 'FISIK_KEUANGAN',
      dto,
      Number(dto.nilaiKontrak),
      dto.pemenangRekanan,
    );

    // Verifikasi keberadaan OPD di SIMPEG
    const opdExists = this.egovService.getOpdById(assignedOpdId);
    if (!opdExists) {
      throw new NotFoundException(
        `OPD dengan ID '${assignedOpdId}' tidak ditemukan di SIMPEG`,
      );
    }

    // Jika nilai kontrak diisi, data kontrak teknis wajib lengkap
    const nilaiKontrakNum = Number(dto.nilaiKontrak) || 0;
    if (nilaiKontrakNum > 0) {
      if (!dto.lokasiKegiatan?.trim()) {
        throw new BadRequestException(
          'Lokasi pengerjaan wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (!dto.nomorKontrak?.trim()) {
        throw new BadRequestException(
          'Nomor kontrak / SPK wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (!dto.pemenangRekanan?.trim()) {
        throw new BadRequestException(
          'Penyedia jasa / rekanan pemenang wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (!dto.tanggalMulai) {
        throw new BadRequestException(
          'Tanggal mulai pelaksanaan wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (!dto.tanggalSelesai) {
        throw new BadRequestException(
          'Tanggal selesai pelaksanaan wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (new Date(dto.tanggalSelesai) < new Date(dto.tanggalMulai)) {
        throw new BadRequestException(
          'Tanggal selesai pelaksanaan tidak boleh lebih awal dari tanggal mulai',
        );
      }
    }

    if (dto.targetMingguan?.length) {
      this.validateWeeklyTargets(
        dto.targetMingguan,
        dto.tanggalMulai,
        dto.tanggalSelesai,
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
          kelompokPaket: dto.kelompokPaket || 'PEMBANGUNAN_MODAL',
          polaMonitoring: dto.polaMonitoring || 'FISIK_KEUANGAN',
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
      // ADMINISTRATOR, ADMIN_PERENCANAAN, dan ADMIN_PPK berwenang menetapkan target kurva fisik.
      // Jika diinput murni oleh ADMIN_SIRUP tanpa role perencanaan/PPK, seluruh target bulanan diinisialisasi 0% menunggu input Admin Perencanaan / PPK.
      const canSetTargets =
        userRoles.length === 0 ||
        userRoles.some((role) =>
          [
            RoleEnum.ADMINISTRATOR,
            RoleEnum.ADMIN_PERENCANAAN,
            RoleEnum.ADMIN_PPK,
          ].includes(role),
        );

      const weeklyTargets = canSetTargets ? dto.targetMingguan || [] : [];
      const derivedMonthlyTargets =
        weeklyTargets.length > 0
          ? this.buildMonthlyTargetsFromWeekly(weeklyTargets)
          : null;
      const targetItems = [];
      for (let bulan = 1; bulan <= 12; bulan++) {
        const item = derivedMonthlyTargets
          ? derivedMonthlyTargets.find((t) => t.bulan === bulan)
          : canSetTargets
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

      if (weeklyTargets.length > 0) {
        await tx.targetMingguan.createMany({
          data: weeklyTargets.map((item) => ({
            paketId: paket.id,
            bulan: item.bulan,
            mingguKe: item.mingguKe,
            tanggalMulai: new Date(item.tanggalMulai),
            tanggalSelesai: new Date(item.tanggalSelesai),
            uraianKegiatan: item.uraianKegiatan?.trim() || null,
            targetFisik: Number(item.targetFisik),
          })),
        });
      }

      // 3. Catat audit trail
      if (user?.id) {
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'CREATE_PAKET_PEMBANGUNAN',
            resource: 'PAKET_PEMBANGUNAN',
            resourceId: paket.id,
            payload: {
              polaMonitoring: paket.polaMonitoring,
              kelompokPaket: paket.kelompokPaket,
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
          targetMingguan: {
            orderBy: [{ bulan: 'asc' }, { mingguKe: 'asc' }],
          },
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

    const userRoles = this.getUserRoles(user);
    const isSuperRole = userRoles.some((role) =>
      [
        RoleEnum.ADMINISTRATOR,
        RoleEnum.PIMPINAN_DAERAH,
        RoleEnum.MONEV,
      ].includes(role),
    );
    const assignedOpdId =
      !isSuperRole && user?.opdId ? user.opdId : dto.opdId || existing.opdId;

    const pola = dto.polaMonitoring || existing.polaMonitoring;
    this.validateMonitoring(
      pola,
      dto,
      Number(dto.nilaiKontrak ?? existing.nilaiKontrak),
      dto.pemenangRekanan ?? existing.pemenangRekanan,
    );
    if (pola !== existing.polaMonitoring && pola === 'KEUANGAN') {
      const [targets, physical] = await Promise.all([
        this.prisma.targetMingguan.count({ where: { paketId: id } }),
        this.prisma.realisasiBulanan.count({
          where: { paketId: id, realisasiFisik: { gt: 0 } },
        }),
      ]);
      if (targets || physical)
        throw new BadRequestException(
          'Paket sudah memiliki target/realisasi fisik. Tinjau data fisik sebelum mengganti pola monitoring.',
        );
    }
    // Jika nilai kontrak diisi, data kontrak teknis wajib lengkap
    const effectiveNilaiKontrak =
      dto.nilaiKontrak !== undefined
        ? Number(dto.nilaiKontrak)
        : Number(existing.nilaiKontrak);
    if (effectiveNilaiKontrak > 0) {
      const lokasi =
        dto.lokasiKegiatan !== undefined
          ? dto.lokasiKegiatan
          : existing.lokasiKegiatan;
      const noKontrak =
        dto.nomorKontrak !== undefined
          ? dto.nomorKontrak
          : existing.nomorKontrak;
      const rekanan =
        dto.pemenangRekanan !== undefined
          ? dto.pemenangRekanan
          : existing.pemenangRekanan;
      const tglMulai =
        dto.tanggalMulai !== undefined
          ? dto.tanggalMulai
          : existing.tanggalMulai;
      const tglSelesai =
        dto.tanggalSelesai !== undefined
          ? dto.tanggalSelesai
          : existing.tanggalSelesai;

      if (!lokasi?.trim()) {
        throw new BadRequestException(
          'Lokasi pengerjaan wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (!noKontrak?.trim()) {
        throw new BadRequestException(
          'Nomor kontrak / SPK wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (!rekanan?.trim()) {
        throw new BadRequestException(
          'Penyedia jasa / rekanan pemenang wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (!tglMulai) {
        throw new BadRequestException(
          'Tanggal mulai pelaksanaan wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (!tglSelesai) {
        throw new BadRequestException(
          'Tanggal selesai pelaksanaan wajib diisi jika nilai kontrak telah ditentukan',
        );
      }
      if (new Date(tglSelesai) < new Date(tglMulai)) {
        throw new BadRequestException(
          'Tanggal selesai pelaksanaan tidak boleh lebih awal dari tanggal mulai',
        );
      }
    }

    if (dto.targetMingguan !== undefined) {
      this.validateWeeklyTargets(
        dto.targetMingguan,
        dto.tanggalMulai ?? existing.tanggalMulai,
        dto.tanggalSelesai ?? existing.tanggalSelesai,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update data pokok paket
      const updatedPaket = await tx.paketPembangunan.update({
        where: { id },
        data: {
          kelompokPaket: dto.kelompokPaket,
          polaMonitoring: dto.polaMonitoring,
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

      // 2. Update target bulanan jika disertakan dan role berwenang (ADMINISTRATOR / ADMIN_PERENCANAAN / ADMIN_PPK)
      const canUpdateTargets =
        userRoles.length === 0 ||
        userRoles.some((role) =>
          [
            RoleEnum.ADMINISTRATOR,
            RoleEnum.ADMIN_PERENCANAAN,
            RoleEnum.ADMIN_PPK,
          ].includes(role),
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

      if (canUpdateTargets && dto.targetMingguan !== undefined) {
        await tx.targetMingguan.deleteMany({ where: { paketId: id } });
        if (dto.targetMingguan.length > 0) {
          await tx.targetMingguan.createMany({
            data: dto.targetMingguan.map((item) => ({
              paketId: id,
              bulan: item.bulan,
              mingguKe: item.mingguKe,
              tanggalMulai: new Date(item.tanggalMulai),
              tanggalSelesai: new Date(item.tanggalSelesai),
              uraianKegiatan: item.uraianKegiatan?.trim() || null,
              targetFisik: Number(item.targetFisik),
            })),
          });
        }

        const monthlyTargets = this.buildMonthlyTargetsFromWeekly(
          dto.targetMingguan,
        );
        for (const item of monthlyTargets) {
          await tx.targetBulanan.upsert({
            where: { paketId_bulan: { paketId: id, bulan: item.bulan } },
            create: { paketId: id, ...item },
            update: { targetFisik: item.targetFisik },
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
          targetMingguan: {
            orderBy: [{ bulan: 'asc' }, { mingguKe: 'asc' }],
          },
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
    if (existing.polaMonitoring === 'KEUANGAN')
      throw new BadRequestException(
        'Paket keuangan saja tidak menggunakan target fisik',
      );

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
  async getOpdOptions(user?: any) {
    const allOptions = await this.egovService.getOpdOptions();
    if (Object.keys(this.buildScopeFilter(user)).length === 0) {
      return allOptions;
    }

    const allowedIds = new Set(
      this.getAccessibleScopes(user).map((scope) => scope.opdId),
    );
    return allOptions.filter((option) => allowedIds.has(option.id));
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
        'APBD',
        'APBN',
        'BLUD',
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
      polaMonitoring,
    } = query;

    const activeBulan = bulan
      ? Math.min(12, Math.max(1, Number(bulan)))
      : new Date().getMonth() + 1;

    const andConditions: Prisma.PaketPembangunanWhereInput[] = [
      { tahunAnggaran: Number(tahunAnggaran) },
    ];

    if (
      polaMonitoring &&
      polaMonitoring !== 'ALL' &&
      polaMonitoring !== 'all'
    ) {
      andConditions.push({ polaMonitoring });
    }

    // Filter scope role (Administrator & MONEV can see all)
    const scopeFilter = this.buildScopeFilter(user);
    if (Object.keys(scopeFilter).length > 0) {
      andConditions.push(scopeFilter);
    }
    if (opdId && opdId !== 'ALL' && opdId !== 'all') {
      andConditions.push({ opdId });
    }
    if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
      andConditions.push({ subUnitId });
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
        targetMingguan: {
          select: { bulan: true },
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
      let realisasiFisik = realisasiItem
        ? Number(realisasiItem.realisasiFisik)
        : 0;
      let realisasiKeuangan = realisasiItem
        ? Number(realisasiItem.realisasiKeuangan)
        : 0;
      let catatanOperator = realisasiItem?.catatanOperator || null;
      let inputBy = realisasiItem?.inputBy || null;
      let updatedAt = realisasiItem?.updatedAt || null;

      // Otomatis Kumulatif: jika bulan aktif belum diisi (0), bawa nilai capaian terakhir dari bulan sebelumnya
      if (realisasiFisik === 0) {
        const pastFisik = paket.realisasiBulanan
          .filter((r) => r.bulan < activeBulan && Number(r.realisasiFisik) > 0)
          .sort((a, b) => b.bulan - a.bulan)[0];
        if (pastFisik) {
          realisasiFisik = Number(pastFisik.realisasiFisik) || 0;
          if (!catatanOperator) catatanOperator = pastFisik.catatanOperator || null;
          if (!inputBy) inputBy = pastFisik.inputBy || null;
          if (!updatedAt) updatedAt = pastFisik.updatedAt || null;
        }
      }

      if (realisasiKeuangan === 0) {
        const pastKeu = paket.realisasiBulanan
          .filter(
            (r) => r.bulan < activeBulan && Number(r.realisasiKeuangan) > 0,
          )
          .sort((a, b) => b.bulan - a.bulan)[0];
        if (pastKeu) {
          realisasiKeuangan = Number(pastKeu.realisasiKeuangan) || 0;
        }
      }

      const deviasiFisik = parseFloat(
        (realisasiFisik - targetFisik).toFixed(2),
      );
      const basisAnggaran = nilaiPagu > 0 ? nilaiPagu : nilaiKontrak;
      const persenKeuangan =
        basisAnggaran > 0
          ? parseFloat(((realisasiKeuangan / basisAnggaran) * 100).toFixed(2))
          : 0;

      // Status capaian berdasarkan standar deviasi fisik
      let status: 'KEUANGAN' | 'BELUM_MULAI' | 'AMAN' | 'PERHATIAN' | 'KRITIS' =
        'AMAN';
      if (paket.polaMonitoring === 'KEUANGAN') {
        status = 'KEUANGAN';
      } else if (targetFisik === 0 && realisasiFisik === 0) {
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
        polaMonitoring: paket.polaMonitoring,
        kelompokPaket: paket.kelompokPaket,
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
    // Logika Seragam: Jika belum semua paket berkontrak, gunakan totalPagu.
    // Jika SELURUH paket sudah berkontrak (nilaiKontrak > 0), baru gunakan totalKontrak.
    const isAllBerkontrak =
      filtered.length > 0 &&
      filtered.every((cur) => Number(cur.nilaiKontrak) > 0);
    const basisAnggaran =
      isAllBerkontrak && totalKontrak > 0
        ? totalKontrak
        : totalPagu > 0
        ? totalPagu
        : totalKontrak;
    const persenSerapanKeuangan =
      basisAnggaran > 0
        ? parseFloat(
            ((totalRealisasiKeuangan / basisAnggaran) * 100).toFixed(2),
          )
        : 0;

    const countStatus = {
      aman: filtered.filter((i) => i.status === 'AMAN').length,
      perhatian: filtered.filter((i) => i.status === 'PERHATIAN').length,
      kritis: filtered.filter((i) => i.status === 'KRITIS').length,
      belumMulai: filtered.filter((i) => i.status === 'BELUM_MULAI').length,
    };

    const physicalPackages = filtered.filter(
      (p) => p.polaMonitoring !== 'KEUANGAN',
    );
    const avgTargetFisik =
      physicalPackages.length > 0
        ? parseFloat(
            (
              physicalPackages.reduce((acc, cur) => acc + cur.targetFisik, 0) /
              physicalPackages.length
            ).toFixed(2),
          )
        : 0;
    const avgRealisasiFisik =
      physicalPackages.length > 0
        ? parseFloat(
            (
              physicalPackages.reduce(
                (acc, cur) => acc + cur.realisasiFisik,
                0,
              ) / physicalPackages.length
            ).toFixed(2),
          )
        : 0;
    const avgDeviasiFisik = parseFloat(
      (avgRealisasiFisik - avgTargetFisik).toFixed(2),
    );

    // Dahulukan paket yang sudah memiliki realisasi fisik atau keuangan sebelum paginasi.
    // Urutkan paket di dalam masing-masing kelompok:
    // 1. KRITIS (deviasi paling parah / paling minus di atas)
    // 2. PERHATIAN (waspada, deviasi -10% s.d. < 0%)
    // 3. AMAN (sedang berjalan, deviasi >= 0%, realisasi < 100%)
    // 4. SELESAI (realisasi fisik >= 100%)
    // 5. BELUM DIISI / BELUM MULAI (target 0 & fisik 0) di paling bawah
    const sorted = [...filtered].sort((a, b) => {
      const hasRealisasiA = a.realisasiFisik > 0 || a.realisasiKeuangan > 0;
      const hasRealisasiB = b.realisasiFisik > 0 || b.realisasiKeuangan > 0;
      if (hasRealisasiA !== hasRealisasiB) return hasRealisasiA ? -1 : 1;

      const getPriority = (item: typeof a) => {
        if (
          item.status === 'BELUM_MULAI' ||
          (item.targetFisik === 0 && item.realisasiFisik === 0)
        ) {
          return 5;
        }
        if (item.status === 'KRITIS') return 1;
        if (item.status === 'PERHATIAN') return 2;
        if (item.realisasiFisik >= 100) return 4;
        return 3; // AMAN (< 100%)
      };

      const pA = getPriority(a);
      const pB = getPriority(b);

      if (pA !== pB) return pA - pB;

      // Jika sama-sama KRITIS atau PERHATIAN: urutkan dari deviasi paling parah (paling negatif) ke atas
      if (pA === 1 || pA === 2) {
        return a.deviasiFisik - b.deviasiFisik;
      }

      // Jika sama-sama AMAN: urutkan dari realisasi fisik terendah ke tertinggi
      if (pA === 3) {
        return a.realisasiFisik - b.realisasiFisik;
      }

      // Jika sama-sama SELESAI (100%): urutkan berdasarkan nama paket
      if (pA === 4) {
        return a.namaPaket.localeCompare(b.namaPaket);
      }

      // Default / BELUM_MULAI
      return a.namaPaket.localeCompare(b.namaPaket);
    });

    // Paginasi array hasil
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedData = sorted.slice(skip, skip + Number(limit));
    const totalPages = Math.ceil(sorted.length / Number(limit)) || 1;

    const availableMonths = Array.from(
      new Set(
        pakets.flatMap((paket) => {
          if (paket.polaMonitoring === 'KEUANGAN') return Array.from({ length: 12 }, (_, i) => i + 1);
          if (paket.targetMingguan.length > 0) {
            return paket.targetMingguan.map((item) => item.bulan);
          }
          if (!paket.tanggalMulai || !paket.tanggalSelesai) return [];
          const start = new Date(paket.tanggalMulai);
          const end = new Date(paket.tanggalSelesai);
          const months: number[] = [];
          const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
          const last = new Date(end.getFullYear(), end.getMonth(), 1);
          while (cursor <= last) {
            months.push(cursor.getMonth() + 1);
            cursor.setMonth(cursor.getMonth() + 1);
          }
          return months;
        }),
      ),
    ).sort((a, b) => a - b);

    return {
      data: paginatedData,
      summary: {
        activeBulan,
        totalPaket: filtered.length,
        totalPagu,
        totalKontrak,
        isAllBerkontrak,
        totalRealisasiKeuangan,
        persenSerapanKeuangan,
        avgTargetFisik,
        avgRealisasiFisik,
        avgDeviasiFisik,
        countStatus,
        availableMonths,
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
        targetMingguan: {
          orderBy: [{ bulan: 'asc' }, { mingguKe: 'asc' }],
        },
        realisasiMingguan: {
          orderBy: [{ bulan: 'asc' }, { mingguKe: 'asc' }],
        },
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

    let pencairan: any[] = [];
    let pencairanTersedia = true;
    if (paket.polaMonitoring === 'KEUANGAN') {
      try {
        pencairan = await this.prisma.pencairanKeuangan.findMany({
          where: { paketId },
          include: {
            bukti: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: [{ bulan: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        });
      } catch (error) {
        // Keep historical reports readable while the additive migration is pending.
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2021'
        )
          throw error;
        pencairanTersedia = false;
      }
    }

    const nilaiKontrak = Number(paket.nilaiKontrak) || 0;
    const nilaiPagu = Number(paket.nilaiPagu) || 0;

    let cumulativeFisik = 0;
    let cumulativeKeuangan = 0;

    const timeline = Array.from({ length: 12 }, (_, idx) => {
      const bulan = idx + 1;
      const targetItem = paket.targetBulanan.find((t) => t.bulan === bulan);
      const realisasiItem = paket.realisasiBulanan.find(
        (r) => r.bulan === bulan,
      );

      const targetFisik = targetItem ? Number(targetItem.targetFisik) : 0;
      let realisasiFisik = realisasiItem
        ? Number(realisasiItem.realisasiFisik)
        : 0;
      let realisasiKeuangan = realisasiItem
        ? Number(realisasiItem.realisasiKeuangan)
        : 0;

      // Auto carry-forward untuk bulan berikutnya jika bulan sebelumnya sudah 100% atau lebih tinggi
      if (
        realisasiFisik === 0 &&
        cumulativeFisik === 100
      ) {
        realisasiFisik = cumulativeFisik;
        if (realisasiKeuangan === 0 && cumulativeKeuangan > 0) {
          realisasiKeuangan = cumulativeKeuangan;
        }
      } else {
        if (realisasiFisik > cumulativeFisik) cumulativeFisik = realisasiFisik;
        if (realisasiKeuangan > cumulativeKeuangan)
          cumulativeKeuangan = realisasiKeuangan;
      }

      if (paket.polaMonitoring === 'KEUANGAN' && !realisasiItem)
        realisasiKeuangan = cumulativeKeuangan;

      const deviasiFisik = parseFloat(
        (realisasiFisik - targetFisik).toFixed(2),
      );
      const basisAnggaran = nilaiPagu > 0 ? nilaiPagu : nilaiKontrak;
      const persenKeuangan =
        basisAnggaran > 0
          ? parseFloat(((realisasiKeuangan / basisAnggaran) * 100).toFixed(2))
          : 0;

      let status: 'KEUANGAN' | 'BELUM_MULAI' | 'AMAN' | 'PERHATIAN' | 'KRITIS' =
        'AMAN';
      if (paket.polaMonitoring === 'KEUANGAN') {
        status = 'KEUANGAN';
      } else if (targetFisik === 0 && realisasiFisik === 0) {
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
        pencairan: pencairan
          .filter((item) => item.bulan === bulan)
          .map((item) => ({
            id: item.id,
            nominal: Number(item.nominal),
            catatan: item.catatan,
            createdAt: item.createdAt,
            bukti: ((item as any).bukti || []).map((b: any) => ({
              id: b.id,
              namaFile: b.namaFile,
              pathFile: `/uploads/bukti-pencairan/${b.pathFile.split('/').pop()}`,
              mimeType: b.mimeType,
              ukuranBytes: b.ukuranBytes,
              deskripsi: b.deskripsi,
              createdAt: b.createdAt,
            })),
          })),
        targetFisik,
        realisasiFisik,
        deviasiFisik,
        realisasiKeuangan,
        persenKeuangan,
        catatanOperator: realisasiItem?.catatanOperator || '',
        inputBy: realisasiItem?.inputBy || null,
        updatedAt: realisasiItem?.updatedAt || null,
        // Verifikasi MONEV
        statusVerifikasi: realisasiItem ? StatusVerifikasi.TERCATAT : null,
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

    const weeklyTimeline = paket.targetMingguan.map((target) => {
      const realisasi = paket.realisasiMingguan.find(
        (item) =>
          item.bulan === target.bulan && item.mingguKe === target.mingguKe,
      );
      const monthlyStatus = paket.realisasiBulanan.find(
        (item) => item.bulan === target.bulan,
      );
      const buktiFisik =
        monthlyStatus?.buktiFisik
          ?.filter((item) => item.mingguKe === target.mingguKe)
          .map((item) => ({
            id: item.id,
            namaFile: item.namaFile,
            pathFile: `/uploads/bukti-fisik/${item.namaFile.split('/').pop()}`,
            mimeType: item.mimeType,
            ukuranBytes: item.ukuranBytes,
            deskripsi: item.deskripsi,
            uploadOleh: item.uploadOleh,
            createdAt: item.createdAt,
          })) || [];

      const realisasiFisik = Number(realisasi?.realisasiFisik || 0);
      const targetFisik = Number(target.targetFisik || 0);
      return {
        id: target.id,
        tersimpan: !!realisasi,
        bulan: target.bulan,
        mingguKe: target.mingguKe,
        tanggalMulai: target.tanggalMulai,
        tanggalSelesai: target.tanggalSelesai,
        uraianKegiatan: target.uraianKegiatan || '',
        targetFisik,
        realisasiFisik,
        realisasiKeuangan: Number(realisasi?.realisasiKeuangan || 0),
        catatanOperator: realisasi?.catatanOperator || '',
        inputById: realisasi?.inputById || null,
        updatedAt: realisasi?.updatedAt || null,
        deviasiFisik: parseFloat((realisasiFisik - targetFisik).toFixed(2)),
        statusVerifikasi: monthlyStatus ? StatusVerifikasi.TERCATAT : null,
        catatanVerifikasi: monthlyStatus?.catatanVerifikasi || null,
        buktiFisik,
      };
    });

    return {
      pencairanTersedia,
      paket: {
        id: paket.id,
        polaMonitoring: paket.polaMonitoring,
        kelompokPaket: paket.kelompokPaket,
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
      weeklyTimeline,
      availableMonths: Array.from(
        new Set(paket.targetMingguan.map((item) => item.bulan)),
      ),
    };
  }

  async upsertRealisasiMingguan(
    paketId: string,
    dto: UpsertRealisasiMingguanDto,
    user?: any,
  ) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket) {
      throw new NotFoundException(
        `Paket pembangunan '${paketId}' tidak ditemukan`,
      );
    }
    this.checkOpdAccess(user, paket.opdId, paket.subUnitId);
    if (paket.polaMonitoring === 'KEUANGAN')
      throw new BadRequestException(
        'Gunakan input keuangan bulanan untuk paket ini',
      );

    const bulan = Math.min(12, Math.max(1, Number(dto.bulan)));
    const mingguKe = Math.min(6, Math.max(1, Number(dto.mingguKe)));
    const target = await this.prisma.targetMingguan.findUnique({
      where: { paketId_bulan_mingguKe: { paketId, bulan, mingguKe } },
    });
    if (!target) {
      throw new BadRequestException(
        'Minggu yang dipilih tidak termasuk dalam target masa kontrak paket',
      );
    }

    const roles = this.getUserRoles(user);
    const isAdmin = roles.includes(RoleEnum.ADMINISTRATOR);
    const isPPK = roles.includes(RoleEnum.ADMIN_PPK);
    const isBendahara = roles.includes(RoleEnum.BENDAHARA);
    if (!isAdmin && !isPPK && !isBendahara) {
      throw new ForbiddenException(
        'Akun Anda tidak memiliki hak input realisasi paket',
      );
    }
    if (dto.uraianKegiatan !== undefined && !isAdmin && !isPPK) {
      throw new ForbiddenException(
        'Hanya Administrator atau PPK yang dapat mengubah uraian kegiatan mingguan',
      );
    }

    if (!isAdmin) {
      const lockPeriod = await this.prisma.lockingPeriod.findUnique({
        where: { tahun_bulan: { tahun: paket.tahunAnggaran, bulan } },
      });
      if (
        lockPeriod &&
        (lockPeriod.isLocked || new Date() > new Date(lockPeriod.batasInput))
      ) {
        throw new ForbiddenException(
          `Periode input Bulan ${bulan} sudah ditutup`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.uraianKegiatan !== undefined) {
        await tx.targetMingguan.update({
          where: { paketId_bulan_mingguKe: { paketId, bulan, mingguKe } },
          data: {
            uraianKegiatan: dto.uraianKegiatan.trim() || null,
          },
        });
      }

      const existing = await tx.realisasiMingguan.findUnique({
        where: { paketId_bulan_mingguKe: { paketId, bulan, mingguKe } },
      });
      const previous = await tx.realisasiMingguan.findFirst({
        where: {
          paketId,
          OR: [{ bulan: { lt: bulan } }, { bulan, mingguKe: { lt: mingguKe } }],
        },
        orderBy: [{ bulan: 'desc' }, { mingguKe: 'desc' }],
      });

      const canEditBoth = isAdmin || (isPPK && isBendahara);
      const realisasiFisik =
        canEditBoth || isPPK
          ? Math.min(100, Math.max(0, Number(dto.realisasiFisik) || 0))
          : Number(existing?.realisasiFisik ?? previous?.realisasiFisik ?? 0);
      const realisasiKeuangan =
        canEditBoth || isBendahara
          ? Math.max(0, Number(dto.realisasiKeuangan) || 0)
          : Number(
              existing?.realisasiKeuangan ?? previous?.realisasiKeuangan ?? 0,
            );

      const record = await tx.realisasiMingguan.upsert({
        where: { paketId_bulan_mingguKe: { paketId, bulan, mingguKe } },
        create: {
          paketId,
          bulan,
          mingguKe,
          realisasiFisik,
          realisasiKeuangan,
          catatanOperator: dto.catatanOperator?.trim() || null,
          inputById: user?.id || null,
        },
        update: {
          realisasiFisik,
          realisasiKeuangan,
          catatanOperator:
            dto.catatanOperator !== undefined
              ? dto.catatanOperator.trim() || null
              : undefined,
          inputById: user?.id || null,
        },
      });

      await this.syncMonthlyRealisasiFromWeekly(tx, paketId, bulan, user?.id);
      return record;
    });
  }

  /**
   * Menyimpan / memperbarui realisasi 1 bulan (dengan field-level protection)
   * - ADMIN_PPK: hanya boleh mengisi realisasiFisik
   * - BENDAHARA : hanya boleh mengisi realisasiKeuangan
   * - ADMINISTRATOR: boleh mengisi keduanya
   */
  async tambahPencairan(paketId: string, dto: CreatePencairanDto, user?: any) {
    const roles = this.getUserRoles(user);
    const isAdmin = roles.includes(RoleEnum.ADMINISTRATOR);
    if (!isAdmin && !roles.includes(RoleEnum.BENDAHARA))
      throw new ForbiddenException('Realisasi keuangan diisi oleh Bendahara');
    if (
      !dto.catatan.trim() ||
      !Number.isFinite(dto.nominal) ||
      dto.nominal <= 0
    )
      throw new BadRequestException(
        'Nominal harus lebih dari nol dan catatan wajib diisi',
      );

    return this.prisma.$transaction(
      async (tx) => {
        // Serialize additions for the same package, including retries from multiple clients.
        await tx.$queryRaw`SELECT id FROM paket_pembangunan WHERE id = ${paketId} FOR UPDATE`;
        const paket = await tx.paketPembangunan.findUnique({
          where: { id: paketId },
        });
        if (!paket) throw new NotFoundException('Paket tidak ditemukan');
        this.checkOpdAccess(user, paket.opdId, paket.subUnitId);
        if (paket.polaMonitoring !== 'KEUANGAN')
          throw new BadRequestException(
            'Pencairan bulanan digunakan untuk pola Keuangan',
          );
        const duplicate = await tx.pencairanKeuangan.findUnique({
          where: { id: dto.id },
        });
        if (duplicate) {
          if (
            duplicate.paketId !== paketId ||
            duplicate.bulan !== dto.bulan ||
            Number(duplicate.nominal) !== dto.nominal ||
            duplicate.catatan !== dto.catatan.trim()
          )
            throw new BadRequestException(
              'ID pencairan sudah digunakan. Muat ulang formulir.',
            );
          return duplicate;
        }
        const rows = await tx.realisasiBulanan.findMany({
          where: { paketId },
          orderBy: { bulan: 'asc' },
        });
        if (!isAdmin) {
          const periods = await tx.lockingPeriod.findMany({
            where: { tahun: paket.tahunAnggaran, bulan: { gte: dto.bulan } },
          });
          if (
            periods.some(
              (period) =>
                (period.bulan === dto.bulan ||
                  rows.some((row) => row.bulan === period.bulan)) &&
                (period.isLocked || new Date() > new Date(period.batasInput)),
            )
          )
            throw new ForbiddenException(
              'Periode input atau laporan kumulatif yang terdampak telah ditutup',
            );
        }
        const amount = new Prisma.Decimal(dto.nominal);
        const current = rows.find((row) => row.bulan === dto.bulan);
        const previous = rows.filter((row) => row.bulan < dto.bulan).at(-1);
        const cumulative = new Prisma.Decimal(
          current?.realisasiKeuangan ?? previous?.realisasiKeuangan ?? 0,
        ).plus(amount);
        if (
          cumulative.gt(paket.nilaiPagu) ||
          rows.some(
            (row) =>
              row.bulan > dto.bulan &&
              new Prisma.Decimal(row.realisasiKeuangan)
                .plus(amount)
                .gt(paket.nilaiPagu),
          )
        )
          throw new BadRequestException('Realisasi melebihi pagu anggaran');
        const record = await tx.pencairanKeuangan.create({
          data: {
            id: dto.id,
            paketId,
            bulan: dto.bulan,
            nominal: amount,
            catatan: dto.catatan.trim(),
            inputById: user?.id || null,
          },
        });
        await tx.realisasiBulanan.upsert({
          where: { paketId_bulan: { paketId, bulan: dto.bulan } },
          create: {
            paketId,
            bulan: dto.bulan,
            realisasiKeuangan: cumulative,
            statusVerifikasi: StatusVerifikasi.TERCATAT,
            inputById: user?.id || null,
          },
          update: {
            realisasiKeuangan: cumulative,
            inputById: user?.id || null,
            statusVerifikasi: StatusVerifikasi.TERCATAT,
            catatanVerifikasi: null,
            verifikasiOlehId: null,
            verifikasiAt: null,
            diajukanAt: null,
          },
        });
        await tx.realisasiBulanan.updateMany({
          where: { paketId, bulan: { gt: dto.bulan } },
          data: {
            realisasiKeuangan: { increment: amount },
            statusVerifikasi: StatusVerifikasi.TERCATAT,
            catatanVerifikasi: null,
            verifikasiOlehId: null,
            verifikasiAt: null,
            diajukanAt: null,
          },
        });
        if (user?.id)
          await tx.auditLog.create({
            data: {
              userId: user.id,
              action: 'TAMBAH_PENCAIRAN',
              resource: 'PENCAIRAN_KEUANGAN',
              resourceId: record.id,
              payload: {
                paketId,
                bulan: dto.bulan,
                nominal: dto.nominal,
                catatan: dto.catatan.trim(),
              },
            },
          });
        return record;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async ubahPencairan(
    paketId: string, pencairanId: string | null, dto: UpdatePencairanDto | null,
    user?: any, saldoBulan?: number,
  ) {
    const roles = this.getUserRoles(user);
    const isAdmin = roles.includes(RoleEnum.ADMINISTRATOR);
    if (!isAdmin && !roles.includes(RoleEnum.BENDAHARA))
      throw new ForbiddenException('Realisasi keuangan dikelola oleh Bendahara');
    if (dto && (!Number.isFinite(dto.nominal) || dto.nominal < 0 || !dto.catatan.trim()))
      throw new BadRequestException('Nominal tidak valid atau catatan kosong');
    if (pencairanId && dto && dto.nominal <= 0)
      throw new BadRequestException('Nominal pencairan harus lebih dari nol; gunakan Hapus untuk menghapus record');
    if (!pencairanId && (!Number.isInteger(saldoBulan) || saldoBulan! < 1 || saldoBulan! > 12 || !dto))
      throw new BadRequestException('Bulan saldo tidak valid');

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM paket_pembangunan WHERE id = ${paketId} FOR UPDATE`;
      const paket = await tx.paketPembangunan.findUnique({ where: { id: paketId } });
      if (!paket) throw new NotFoundException('Paket tidak ditemukan');
      this.checkOpdAccess(user, paket.opdId, paket.subUnitId);
      if (paket.polaMonitoring !== 'KEUANGAN') throw new BadRequestException('Gunakan realisasi mingguan untuk paket fisik');
      const record = pencairanId ? await tx.pencairanKeuangan.findUnique({ where: { id: pencairanId } }) : null;
      if (pencairanId && (!record || record.paketId !== paketId)) throw new NotFoundException('Pencairan tidak ditemukan');
      const bulan = record?.bulan ?? saldoBulan!;
      const rows = await tx.realisasiBulanan.findMany({ where: { paketId }, orderBy: { bulan: 'asc' } });
      const current = rows.find((row) => row.bulan === bulan);
      if (!current) throw new NotFoundException('Realisasi bulan ini tidak ditemukan');
      if (!isAdmin) {
        const periods = await tx.lockingPeriod.findMany({ where: { tahun: paket.tahunAnggaran, bulan: { gte: bulan } } });
        if (periods.some((period) => (period.bulan === bulan || rows.some((row) => row.bulan === period.bulan)) &&
          (period.isLocked || new Date() > new Date(period.batasInput))))
          throw new ForbiddenException('Periode input atau laporan kumulatif yang terdampak telah ditutup');
      }
      const previous = rows.filter((row) => row.bulan < bulan).at(-1);
      const ledger = record ? null : await tx.pencairanKeuangan.aggregate({ where: { paketId, bulan }, _sum: { nominal: true } });
      const oldAmount = record ? new Prisma.Decimal(record.nominal) : new Prisma.Decimal(current.realisasiKeuangan)
        .minus(previous?.realisasiKeuangan ?? 0).minus(ledger?._sum.nominal ?? 0);
      const newAmount = new Prisma.Decimal(dto?.nominal ?? 0);
      const delta = newAmount.minus(oldAmount);
      if (rows.some((row) => row.bulan >= bulan &&
        (new Prisma.Decimal(row.realisasiKeuangan).plus(delta).lt(0) || new Prisma.Decimal(row.realisasiKeuangan).plus(delta).gt(paket.nilaiPagu))))
        throw new BadRequestException('Perubahan membuat realisasi kumulatif negatif atau melebihi pagu');
      if (record) {
        if (dto) await tx.pencairanKeuangan.update({ where: { id: record.id }, data: { nominal: newAmount, catatan: dto.catatan.trim() } });
        else await tx.pencairanKeuangan.delete({ where: { id: record.id } });
      } else {
        await tx.realisasiBulanan.update({ where: { id: current.id }, data: { catatanOperator: dto!.nominal === 0 ? null : dto!.catatan.trim() } });
      }
      await tx.realisasiBulanan.updateMany({ where: { paketId, bulan: { gte: bulan } },
        data: { realisasiKeuangan: { increment: delta }, statusVerifikasi: StatusVerifikasi.TERCATAT } });
      if (user?.id) await tx.auditLog.create({ data: {
        userId: user.id, action: dto ? 'UBAH_PENCAIRAN' : 'HAPUS_PENCAIRAN', resource: 'PENCAIRAN_KEUANGAN',
        resourceId: record?.id ?? `${paketId}_B${bulan}_SALDO`,
        payload: { paketId, bulan, nominalSebelum: oldAmount.toString(), nominalSesudah: newAmount.toString(),
          catatanSebelum: record?.catatan ?? current.catatanOperator, catatanSesudah: dto?.catatan.trim() ?? null },
      } });
      return { message: dto ? 'Realisasi diperbarui' : 'Pencairan dihapus' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async hapusRealisasiMingguan(paketId: string, bulan: number, mingguKe: number, user?: any) {
    if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12 || !Number.isInteger(mingguKe) || mingguKe < 1 || mingguKe > 6)
      throw new BadRequestException('Periode minggu tidak valid');
    const roles = this.getUserRoles(user);
    const isAdmin = roles.includes(RoleEnum.ADMINISTRATOR);
    const canFisik = isAdmin || roles.includes(RoleEnum.ADMIN_PPK);
    const canKeuangan = isAdmin || roles.includes(RoleEnum.BENDAHARA);
    if (!canFisik && !canKeuangan) throw new ForbiddenException('Tidak memiliki hak menghapus realisasi');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM paket_pembangunan WHERE id = ${paketId} FOR UPDATE`;
      const paket = await tx.paketPembangunan.findUnique({ where: { id: paketId } });
      if (!paket) throw new NotFoundException('Paket tidak ditemukan');
      this.checkOpdAccess(user, paket.opdId, paket.subUnitId);
      if (paket.polaMonitoring === 'KEUANGAN') throw new BadRequestException('Gunakan riwayat pencairan untuk paket Keuangan');
      if (!isAdmin) {
        const period = await tx.lockingPeriod.findUnique({ where: { tahun_bulan: { tahun: paket.tahunAnggaran, bulan } } });
        if (period && (period.isLocked || new Date() > new Date(period.batasInput))) throw new ForbiddenException('Periode input sudah ditutup');
      }
      const where = { paketId_bulan_mingguKe: { paketId, bulan, mingguKe } };
      const existing = await tx.realisasiMingguan.findUnique({ where });
      if (!existing) throw new NotFoundException('Realisasi minggu ini belum tersimpan');
      const fisik = canFisik ? 0 : existing.realisasiFisik;
      const keuangan = canKeuangan ? new Prisma.Decimal(0) : existing.realisasiKeuangan;
      if (Number(fisik) === 0 && Number(keuangan) === 0) await tx.realisasiMingguan.delete({ where });
      else await tx.realisasiMingguan.update({ where, data: { realisasiFisik: fisik, realisasiKeuangan: keuangan, inputById: user?.id || null } });
      await this.syncMonthlyRealisasiFromWeekly(tx, paketId, bulan, user?.id);
      if (user?.id) await tx.auditLog.create({ data: { userId: user.id, action: 'HAPUS_REALISASI_MINGGUAN',
        resource: 'REALISASI_MINGGUAN', resourceId: existing.id,
        payload: { paketId, bulan, mingguKe, sebelum: { realisasiFisik: existing.realisasiFisik, realisasiKeuangan: existing.realisasiKeuangan.toString(), catatan: existing.catatanOperator },
          sesudah: { realisasiFisik: fisik, realisasiKeuangan: keuangan.toString() } },
      } });
      return { message: 'Realisasi sesuai kewenangan Anda dihapus. Target dan bukti tetap tersimpan.' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

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

    // Pertahankan nilai field yang tidak boleh diedit oleh peran pengguna.
    const existing = await this.prisma.realisasiBulanan.findUnique({
      where: { paketId_bulan: { paketId, bulan } },
    });
    // Cek batasan waktu / LockingPeriod jika bukan Administrator
    if (!isAdmin) {
      const lockPeriod = await this.prisma.lockingPeriod.findUnique({
        where: { tahun_bulan: { tahun: paket.tahunAnggaran, bulan } },
      });
      if (
        lockPeriod &&
        (lockPeriod.isLocked || new Date() > new Date(lockPeriod.batasInput))
      ) {
        const dateStr = new Date(lockPeriod.batasInput).toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short',
          },
        );
        throw new ForbiddenException(
          `Periode input untuk Bulan ${bulan} telah ditutup (batas akhir: ${dateStr}). Hubungi Administrator untuk permohonan pembukaan kunci.`,
        );
      }
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

    if (paket.polaMonitoring === 'KEUANGAN') {
      if (!isAdmin && !isBendahara)
        throw new ForbiddenException('Realisasi keuangan diisi oleh Bendahara');
      if (Number(dto.realisasiFisik) > 0)
        throw new BadRequestException(
          'Paket ini tidak menggunakan realisasi fisik',
        );
      realisasiFisik = 0;
      if (Number(realisasiKeuangan) > Number(paket.nilaiPagu))
        throw new BadRequestException('Realisasi melebihi pagu anggaran');
      throw new BadRequestException(
        'Gunakan tambah pencairan untuk mencatat realisasi keuangan bertahap',
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
        statusVerifikasi: StatusVerifikasi.TERCATAT,
      },
      update: {
        realisasiFisik,
        realisasiKeuangan,
        catatanOperator:
          dto.catatanOperator !== undefined
            ? dto.catatanOperator.trim() || null
            : undefined,
        inputById: user?.id || null,
        statusVerifikasi: StatusVerifikasi.TERCATAT,
        diajukanAt: null,
        catatanVerifikasi: null,
        verifikasiOlehId: null,
        verifikasiAt: null,
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
    if (paket.polaMonitoring === 'KEUANGAN')
      throw new BadRequestException(
        'Gunakan input realisasi keuangan per bulan untuk paket ini',
      );

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

        // Ambil nilai yang sudah ada untuk perlindungan field per peran.
        const existing = await tx.realisasiBulanan.findUnique({
          where: { paketId_bulan: { paketId, bulan } },
        });
        // Cek batas waktu / LockingPeriod jika bukan Administrator
        if (!isAdmin) {
          const lp = await tx.lockingPeriod.findUnique({
            where: { tahun_bulan: { tahun: paket.tahunAnggaran, bulan } },
          });
          if (lp && (lp.isLocked || new Date() > new Date(lp.batasInput))) {
            continue; // Skip bulan yang sudah ditutup bagi non-admin
          }
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
            statusVerifikasi: StatusVerifikasi.TERCATAT,
          },
          update: {
            realisasiFisik,
            realisasiKeuangan,
            catatanOperator:
              item.catatanOperator !== undefined
                ? item.catatanOperator.trim() || null
                : undefined,
            inputById: user?.id || null,
            statusVerifikasi: StatusVerifikasi.TERCATAT,
            diajukanAt: null,
            catatanVerifikasi: null,
            verifikasiOlehId: null,
            verifikasiAt: null,
          },
        });
      }

      // Auto-propagate jika ada bulan yang mencapai realisasi fisik 100%
      const allRealisasi = await tx.realisasiBulanan.findMany({
        where: { paketId },
        orderBy: { bulan: 'asc' },
      });
      const first100 = allRealisasi.find(
        (r) => Number(r.realisasiFisik) === 100,
      );
      if (first100) {
        const startBulan = first100.bulan + 1;
        const refKeuangan = Number(first100.realisasiKeuangan) || 0;
        for (let b = startBulan; b <= 12; b++) {
          const targetNext = allRealisasi.find((r) => r.bulan === b);
          // Di Skenario A: Keuangan bulan berikutnya hanya sebesar dana yang riil sudah cair (refKeuangan)
          const nextKeuangan = refKeuangan;

          await tx.realisasiBulanan.upsert({
            where: { paketId_bulan: { paketId, bulan: b } },
            create: {
              paketId,
              bulan: b,
              realisasiFisik: 100,
              realisasiKeuangan: nextKeuangan,
              catatanOperator: targetNext?.catatanOperator || null,
              inputById: user?.id || null,
              statusVerifikasi: StatusVerifikasi.TERCATAT,
            },
            update: {
              statusVerifikasi: StatusVerifikasi.TERCATAT,
              realisasiFisik: 100,
              realisasiKeuangan: nextKeuangan,
              inputById: user?.id || null,
            },
          });
        }
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
    if (Object.keys(scopeFilter).length > 0) {
      andConditions.push(scopeFilter);
    }
    if (opdId && opdId !== 'ALL' && opdId !== 'all') {
      andConditions.push({ opdId });
    }
    if (subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all') {
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

      let cumulativeFisik = 0;
      let cumulativeKeuangan = 0;

      const timeline = Array.from({ length: 12 }, (_, idx) => {
        const b = idx + 1;
        const targetItem = paket.targetBulanan.find((t) => t.bulan === b);
        const realisasiItem = paket.realisasiBulanan.find((r) => r.bulan === b);

        const targetFisik = targetItem ? Number(targetItem.targetFisik) : 0;
        let realisasiFisik = realisasiItem
          ? Number(realisasiItem.realisasiFisik)
          : 0;
        let realisasiKeuangan = realisasiItem
          ? Number(realisasiItem.realisasiKeuangan)
          : 0;

        // Otomatis Kumulatif: jika bulan berikutnya belum diisi (0), teruskan nilai kumulatif terakhir
        if (realisasiFisik === 0 && cumulativeFisik > 0) {
          realisasiFisik = cumulativeFisik;
        } else if (realisasiFisik > 0) {
          cumulativeFisik = realisasiFisik;
        }

        if (realisasiKeuangan === 0 && cumulativeKeuangan > 0) {
          realisasiKeuangan = cumulativeKeuangan;
        } else if (realisasiKeuangan > 0) {
          cumulativeKeuangan = realisasiKeuangan;
        }

        const deviasiFisik = parseFloat(
          (realisasiFisik - targetFisik).toFixed(2),
        );
        const basisAnggaran = nilaiPagu > 0 ? nilaiPagu : nilaiKontrak;
        const persenKeuangan =
          basisAnggaran > 0
            ? parseFloat(((realisasiKeuangan / basisAnggaran) * 100).toFixed(2))
            : 0;

        let status:
          'KEUANGAN' | 'BELUM_MULAI' | 'AMAN' | 'PERHATIAN' | 'KRITIS' = 'AMAN';
        if (paket.polaMonitoring === 'KEUANGAN') {
          status = 'KEUANGAN';
        } else if (targetFisik === 0 && realisasiFisik === 0) {
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
        polaMonitoring: paket.polaMonitoring,
        kelompokPaket: paket.kelompokPaket,
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
      opdId,
      subUnitId,
    } = query;

    const activeTahun = Number(tahunAnggaran);
    const activeBulan = Math.min(12, Math.max(1, Number(bulan)));

    const whereConditions: Prisma.PaketPembangunanWhereInput = {
      tahunAnggaran: activeTahun,
      ...this.buildScopeFilter(user),
      ...(opdId && opdId !== 'ALL' && opdId !== 'all' ? { opdId } : {}),
      ...(subUnitId && subUnitId !== 'ALL' && subUnitId !== 'all'
        ? { subUnitId }
        : {}),
    };

    const pakets = await this.prisma.paketPembangunan.findMany({
      where: whereConditions,
      include: {
        targetBulanan: { where: { bulan: activeBulan } },
        realisasiBulanan: {
          where: { bulan: { lte: activeBulan } },
          orderBy: { bulan: 'desc' },
        },
      },
    });

    // Grouping berdasarkan opdId
    const opdGroups = new Map<string, typeof pakets>();
    for (const p of pakets) {
      if (isExcludedOpd(p.opdId)) continue;
      const list = opdGroups.get(p.opdId) || [];
      list.push(p);
      opdGroups.set(p.opdId, list);
    }

    const rekap = Array.from(opdGroups.entries())
      .filter(([opdId]) => !isExcludedOpd(opdId))
      .map(([opdId, groupPakets]) => {
        const opdInfo = this.egovService.getOpdById(opdId);
        if (isExcludedOpd(opdInfo?.namaOpd)) return null;
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

        const exactRealisasi = p.realisasiBulanan.find(
          (r) => r.bulan === activeBulan,
        );
        let realFisik = exactRealisasi
          ? Number(exactRealisasi.realisasiFisik)
          : 0;
        let realKeu = exactRealisasi
          ? Number(exactRealisasi.realisasiKeuangan)
          : 0;

        // Otomatis Kumulatif: jika bulan aktif belum diisi (0), bawa nilai capaian terakhir dari bulan sebelumnya
        if (realFisik === 0) {
          const pastFisik = p.realisasiBulanan.find(
            (r) => r.bulan < activeBulan && Number(r.realisasiFisik) > 0,
          );
          if (pastFisik) {
            realFisik = Number(pastFisik.realisasiFisik) || 0;
          }
        }

        if (realKeu === 0) {
          const pastKeu = p.realisasiBulanan.find(
            (r) => r.bulan < activeBulan && Number(r.realisasiKeuangan) > 0,
          );
          if (pastKeu) {
            realKeu = Number(pastKeu.realisasiKeuangan) || 0;
          }
        }

        const dev = parseFloat((realFisik - target).toFixed(2));

          sumRealisasiKeuangan += realKeu;
          if (p.polaMonitoring === 'KEUANGAN') continue;
        sumTarget += target;
        sumRealisasiFisik += realFisik;

        if (target === 0 && realFisik === 0) countBelumMulai++;
        else if (dev >= 0) countAman++;
        else if (dev >= -10) countPerhatian++;
        else countKritis++;
      }

        const physicalCount =
          groupPakets.filter((p) => p.polaMonitoring !== 'KEUANGAN').length ||
          1;
        const avgTargetFisik = parseFloat(
          (sumTarget / physicalCount).toFixed(2),
        );
      const avgRealisasiFisik = parseFloat(
          (sumRealisasiFisik / physicalCount).toFixed(2),
      );
      const avgDeviasiFisik = parseFloat(
        (avgRealisasiFisik - avgTargetFisik).toFixed(2),
      );
      // Jika belum semua paket berkontrak, gunakan totalPagu.
      // Jika SELURUH paket sudah berkontrak (nilaiKontrak > 0), baru gunakan totalKontrak.
      const isAllBerkontrak =
        totalPaket > 0 &&
        groupPakets.every((p) => (Number(p.nilaiKontrak) || 0) > 0);
      const basisAnggaran =
        isAllBerkontrak && totalKontrak > 0
          ? totalKontrak
          : totalPagu > 0
          ? totalPagu
          : totalKontrak;
      const persenSerapanKeuangan =
        basisAnggaran > 0
          ? parseFloat(
              ((sumRealisasiKeuangan / basisAnggaran) * 100).toFixed(2),
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
        isAllBerkontrak,
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
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      tahunAnggaran: activeTahun,
      bulanEvaluasi: activeBulan,
      rekap,
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
    mingguKe?: number,
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

    const userRoles: RoleEnum[] =
      user?.roles && user.roles.length > 0
        ? user.roles
        : user?.role
          ? [user.role]
          : [];
    const isAdmin = userRoles.includes(RoleEnum.ADMINISTRATOR);
    if (!isAdmin) {
      const lp = await this.prisma.lockingPeriod.findUnique({
        where: { tahun_bulan: { tahun: paket.tahunAnggaran, bulan } },
      });
      if (lp && (lp.isLocked || new Date() > new Date(lp.batasInput))) {
        throw new ForbiddenException(
          `Upload bukti fisik Bulan ${bulan} ditutup karena telah melewati batas waktu input. Hubungi Administrator.`,
        );
      }
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
      where: {
        realisasiId: realisasi.id,
        ...(mingguKe ? { mingguKe } : {}),
      },
    });
    if (existingCount + files.length > 5) {
      // Hapus file yang baru diupload karena melebihi batas
      for (const file of files) {
        if (existsSync(file.path)) await unlink(file.path).catch(() => {});
      }
      throw new BadRequestException(
        `Batas maksimal 5 foto ${mingguKe ? `pada Minggu ${mingguKe}` : 'per bulan'} sudah tercapai (saat ini: ${existingCount}).`,
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
            mingguKe: mingguKe || null,
            uploadOlehId: user?.id || null,
          },
        }),
      ),
    );

    return {
      message: `${files.length} file bukti fisik berhasil diupload untuk Bulan ${bulan}${mingguKe ? ` Minggu ${mingguKe}` : ''}.`,
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
   * Upload bukti/dokumen pendukung yang melekat pada record pencairan keuangan
   */
  async uploadBuktiPencairan(
    paketId: string,
    pencairanId: string,
    files: Express.Multer.File[],
    deskripsi?: string,
    user?: any,
  ) {
    const paket = await this.prisma.paketPembangunan.findUnique({
      where: { id: paketId },
    });
    if (!paket)
      throw new NotFoundException(`Paket '${paketId}' tidak ditemukan`);
    this.checkOpdAccess(user, paket.opdId, paket.subUnitId);

    const pencairan = await this.prisma.pencairanKeuangan.findUnique({
      where: { id: pencairanId },
    });
    if (!pencairan || pencairan.paketId !== paketId) {
      throw new NotFoundException(
        `Record pencairan '${pencairanId}' tidak ditemukan pada paket ini`,
      );
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Tidak ada file yang diupload.');
    }

    const roles = this.getUserRoles(user);
    const isAdmin = roles.includes(RoleEnum.ADMINISTRATOR);
    if (!isAdmin) {
      const lp = await this.prisma.lockingPeriod.findUnique({
        where: {
          tahun_bulan: {
            tahun: paket.tahunAnggaran,
            bulan: pencairan.bulan,
          },
        },
      });
      if (lp && (lp.isLocked || new Date() > new Date(lp.batasInput))) {
        throw new ForbiddenException(
          `Upload bukti pencairan Bulan ${pencairan.bulan} ditutup karena telah melewati batas waktu input.`,
        );
      }
    }

    const existingCount = await this.prisma.buktiPencairan.count({
      where: { pencairanId },
    });
    if (existingCount + files.length > 5) {
      for (const file of files) {
        if (existsSync(file.path)) await unlink(file.path).catch(() => {});
      }
      throw new BadRequestException(
        `Batas maksimal 5 bukti dokumen untuk pencairan ini sudah tercapai (saat ini: ${existingCount}).`,
      );
    }

    const created = await Promise.all(
      files.map((file) =>
        this.prisma.buktiPencairan.create({
          data: {
            pencairanId,
            namaFile: file.originalname,
            pathFile: `/uploads/bukti-pencairan/${file.filename}`,
            mimeType: file.mimetype,
            ukuranBytes: file.size,
            deskripsi: deskripsi?.trim() || null,
            uploadOlehId: user?.id || null,
          },
        }),
      ),
    );

    return {
      message: `${created.length} bukti dokumen pencairan berhasil diupload`,
      data: created,
    };
  }

  /**
   * Hapus file bukti/dokumen yang melekat pada record pencairan keuangan
   */
  async deleteBuktiPencairan(buktiId: string, user?: any) {
    const bukti = await this.prisma.buktiPencairan.findUnique({
      where: { id: buktiId },
      include: { pencairan: { include: { paket: true } } },
    });
    if (!bukti) throw new NotFoundException('Bukti pencairan tidak ditemukan');

    this.checkOpdAccess(
      user,
      bukti.pencairan.paket.opdId,
      bukti.pencairan.paket.subUnitId,
    );

    const roles = this.getUserRoles(user);
    const isAdmin = roles.includes(RoleEnum.ADMINISTRATOR);
    if (!isAdmin) {
      const lp = await this.prisma.lockingPeriod.findUnique({
        where: {
          tahun_bulan: {
            tahun: bukti.pencairan.paket.tahunAnggaran,
            bulan: bukti.pencairan.bulan,
          },
        },
      });
      if (lp && (lp.isLocked || new Date() > new Date(lp.batasInput))) {
        throw new ForbiddenException(
          `Hapus bukti pencairan Bulan ${bukti.pencairan.bulan} ditutup karena telah melewati batas waktu input.`,
        );
      }
    }

    const filename = bukti.pathFile.split('/').pop();
    if (filename) {
      const fullPath = join(
        process.cwd(),
        'uploads',
        'bukti-pencairan',
        filename,
      );
      if (existsSync(fullPath)) await unlink(fullPath).catch(() => {});
    }

    await this.prisma.buktiPencairan.delete({ where: { id: buktiId } });
    return { message: 'Bukti pencairan berhasil dihapus' };
  }

  // ─── PERIODE & BATAS WAKTU INPUT (CUT-OFF) ──────────────────────────────

  /**
   * Mengambil daftar batas waktu input 12 bulan (locking periods)
   */
  async getLockingPeriods(tahun?: number) {
    const targetTahun = tahun || 2026;
    let periods = await this.prisma.lockingPeriod.findMany({
      where: { tahun: targetTahun },
      orderBy: { bulan: 'asc' },
    });

    if (periods.length === 0) {
      await this.initDefaultLockingPeriods(targetTahun);
      periods = await this.prisma.lockingPeriod.findMany({
        where: { tahun: targetTahun },
        orderBy: { bulan: 'asc' },
      });
    }

    const now = new Date();
    return periods.map((p) => {
      const isExpired = now > new Date(p.batasInput);
      const isEffectiveLocked = p.isLocked || isExpired;
      return {
        ...p,
        isExpired,
        isEffectiveLocked,
      };
    });
  }

  /**
   * Inisialisasi default: batas input adalah tanggal 10 bulan berikutnya pukul 23:59:59
   */
  private async initDefaultLockingPeriods(
    tahun: number,
    tx: any = this.prisma,
  ) {
    for (let bulan = 1; bulan <= 12; bulan++) {
      const nextMonthYear = bulan === 12 ? tahun + 1 : tahun;
      const nextMonth = bulan === 12 ? 0 : bulan;
      const batasInput = new Date(nextMonthYear, nextMonth, 10, 23, 59, 59);

      await tx.lockingPeriod.upsert({
        where: { tahun_bulan: { tahun, bulan } },
        create: {
          tahun,
          bulan,
          isLocked: false,
          batasInput,
          updatedById: 'Sistem',
        },
        update: {},
      });
    }
  }

  /**
   * Reset batas waktu input seluruh bulan (1-12) ke tanggal 10 bulan berikutnya
   */
  async resetDefaultLockingPeriods(tahun?: number, user?: any) {
    const targetTahun = tahun || 2026;
    for (let bulan = 1; bulan <= 12; bulan++) {
      const nextMonthYear = bulan === 12 ? targetTahun + 1 : targetTahun;
      const nextMonth = bulan === 12 ? 0 : bulan;
      const batasInput = new Date(nextMonthYear, nextMonth, 10, 23, 59, 59);

      await this.prisma.lockingPeriod.upsert({
        where: { tahun_bulan: { tahun: targetTahun, bulan } },
        create: {
          tahun: targetTahun,
          bulan,
          isLocked: false,
          batasInput,
          updatedById: user?.namaLengkap || user?.nip || 'Administrator',
        },
        update: {
          isLocked: false,
          batasInput,
          updatedById: user?.namaLengkap || user?.nip || 'Administrator',
        },
      });
    }

    if (user?.id) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'RESET_DEFAULT_LOCKING_PERIODS',
          resource: 'LOCKING_PERIOD',
          resourceId: String(targetTahun),
          payload: { tahun: targetTahun },
        },
      });
    }

    return this.getLockingPeriods(targetTahun);
  }

  /**
   * Update batas waktu atau saklar isLocked per bulan (Khusus Administrator)
   */
  async updateLockingPeriod(
    bulan: number,
    dto: { batasInput?: string; isLocked?: boolean; tahun?: number },
    user?: any,
  ) {
    const targetTahun = dto.tahun || 2026;
    const updateData: any = {
      updatedById: user?.namaLengkap || user?.nip || 'Administrator',
    };

    if (dto.batasInput) {
      updateData.batasInput = new Date(dto.batasInput);
    }
    if (typeof dto.isLocked === 'boolean') {
      updateData.isLocked = dto.isLocked;
    }

    const nextMonthYear = bulan === 12 ? targetTahun + 1 : targetTahun;
    const nextMonth = bulan === 12 ? 0 : bulan;
    const defaultBatas = new Date(nextMonthYear, nextMonth, 10, 23, 59, 59);

    const updated = await this.prisma.lockingPeriod.upsert({
      where: { tahun_bulan: { tahun: targetTahun, bulan } },
      create: {
        tahun: targetTahun,
        bulan,
        isLocked: dto.isLocked ?? false,
        batasInput: dto.batasInput ? new Date(dto.batasInput) : defaultBatas,
        updatedById: user?.namaLengkap || user?.nip || 'Administrator',
      },
      update: updateData,
    });

    if (user?.id) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE_LOCKING_PERIOD',
          resource: 'LOCKING_PERIOD',
          resourceId: `${targetTahun}_B${bulan}`,
          payload: { tahun: targetTahun, bulan, ...dto },
        },
      });
    }

    const now = new Date();
    const isExpired = now > new Date(updated.batasInput);
    return {
      ...updated,
      isExpired,
      isEffectiveLocked: updated.isLocked || isExpired,
    };
  }

  /**
   * Operasi massal pada periode (kunci semua, buka kunci semua, atur cut-off massal dinamis)
   */
  async batchUpdateLockingPeriods(
    dto: {
      tahun?: number;
      action: 'LOCK_ALL' | 'UNLOCK_ALL' | 'SET_CUTOFF_DAY' | 'SET_CUSTOM_DATE';
      cutoffDay?: number;
      cutoffHour?: number;
      cutoffMinute?: number;
      customDate?: string;
    },
    user?: any,
  ) {
    const targetTahun = dto.tahun || 2026;
    const updater = user?.namaLengkap || user?.nip || 'Administrator';

    if (dto.action === 'LOCK_ALL') {
      await this.prisma.lockingPeriod.updateMany({
        where: { tahun: targetTahun },
        data: {
          isLocked: true,
          updatedById: updater,
        },
      });
    } else if (dto.action === 'UNLOCK_ALL') {
      // Buka kunci manual. Jika tanggal batas waktu sudah expired, perpanjang otomatis 7 hari dari sekarang
      const periods = await this.prisma.lockingPeriod.findMany({
        where: { tahun: targetTahun },
      });
      const now = new Date();
      for (const p of periods) {
        let newBatas = p.batasInput;
        if (new Date(p.batasInput) <= now) {
          const ext = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          ext.setHours(23, 59, 59, 999);
          newBatas = ext;
        }
        await this.prisma.lockingPeriod.update({
          where: { id: p.id },
          data: {
            isLocked: false,
            batasInput: newBatas,
            updatedById: updater,
          },
        });
      }
    } else if (dto.action === 'SET_CUTOFF_DAY') {
      const day = Math.min(31, Math.max(1, dto.cutoffDay || 10));
      const hour = dto.cutoffHour !== undefined ? dto.cutoffHour : 23;
      const minute = dto.cutoffMinute !== undefined ? dto.cutoffMinute : 59;

      for (let bulan = 1; bulan <= 12; bulan++) {
        const nextMonthYear = bulan === 12 ? targetTahun + 1 : targetTahun;
        const nextMonth = bulan === 12 ? 0 : bulan;
        const daysInNextMonth = new Date(
          nextMonthYear,
          nextMonth + 1,
          0,
        ).getDate();
        const effectiveDay = Math.min(day, daysInNextMonth);
        const batasInput = new Date(
          nextMonthYear,
          nextMonth,
          effectiveDay,
          hour,
          minute,
          59,
        );

        await this.prisma.lockingPeriod.upsert({
          where: { tahun_bulan: { tahun: targetTahun, bulan } },
          create: {
            tahun: targetTahun,
            bulan,
            isLocked: false,
            batasInput,
            updatedById: updater,
          },
          update: {
            isLocked: false,
            batasInput,
            updatedById: updater,
          },
        });
      }
    } else if (dto.action === 'SET_CUSTOM_DATE' && dto.customDate) {
      const targetDate = new Date(dto.customDate);
      await this.prisma.lockingPeriod.updateMany({
        where: { tahun: targetTahun },
        data: {
          batasInput: targetDate,
          updatedById: updater,
        },
      });
    }

    if (user?.id) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: `BATCH_UPDATE_LOCKING_PERIODS_${dto.action}`,
          resource: 'LOCKING_PERIOD',
          resourceId: String(targetTahun),
          payload: { tahun: targetTahun, ...dto },
        },
      });
    }

    return this.getLockingPeriods(targetTahun);
  }
}
