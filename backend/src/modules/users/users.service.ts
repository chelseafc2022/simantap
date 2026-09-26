import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RoleEnum } from '../../common/enums/role.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { EgovService } from '../../core/egov/egov.service';
import { QueryPegawaiDirectoryDto } from './dto/query-pegawai.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { SetRoleDto } from './dto/set-role.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private roleMatrixOverrides = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly egovService: EgovService,
  ) {}

  async onModuleInit() {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: { action: 'UPDATE_ROLE_MATRIX' },
        orderBy: { createdAt: 'asc' },
      });
      for (const log of logs) {
        const payload = log.payload as any;
        if (payload?.kode) {
          this.roleMatrixOverrides.set(payload.kode, payload);
        }
      }
      if (logs.length > 0) {
        this.logger.log(`Memulihkan ${this.roleMatrixOverrides.size} konfigurasi matriks peran dari basis data lokal.`);
      }
    } catch (err: any) {
      this.logger.warn(`Gagal memuat override matriks peran: ${err?.message}`);
    }
  }

  /**
   * Menampilkan daftar pengguna SIMANTAP terpaginasi
   */
  async findAll(query: QueryUserDto) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      opdId,
      instansiId,
      unitKerjaId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { nip: { contains: search, mode: 'insensitive' } },
          { namaLengkap: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { jabatan: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (role) {
      andConditions.push({
        OR: [{ role: role }, { roles: { has: role } }],
      });
    }

    if (opdId) {
      andConditions.push({ opdId });
    }

    if (
      (instansiId && instansiId !== 'all') ||
      (unitKerjaId && unitKerjaId !== 'all')
    ) {
      const nips = await this.egovService.getNipsByInstansi(
        instansiId,
        unitKerjaId,
      );
      andConditions.push({ nip: { in: nips } });
    }

    if (status && status !== 'ALL') {
      andConditions.push({ status });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          nip: true,
          namaLengkap: true,
          jabatan: true,
          email: true,
          role: true,
          roles: true,
          userRoles: {
            include: { role: true },
            orderBy: { role: { urutan: 'asc' } },
          },
          status: true,
          opdId: true,
          subUnitId: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const enrichedData = data.map((u) => ({
      ...u,
      opd: this.egovService.getOpdById(u.opdId),
      subUnit: this.egovService.getSubUnitById(u.subUnitId),
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
   * Mengambil master list role resmi dari database
   * Diperkaya dengan cakupan akses unit, matriks hak akses menu (seperti SIDAPEM),
   * dan daftar akun pengguna terdaftar
   */
  async getMasterRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { urutan: 'asc' },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    // Ambil seluruh user untuk asosiasi anggota kelompok
    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        nip: true,
        namaLengkap: true,
        jabatan: true,
        role: true,
        roles: true,
        status: true,
        opdId: true,
      },
    });

    // Definisi template hak akses menu SIMANTAP (Format terinspirasi dari SIDAPEM)
    const getRolePermissions = (kode: string | RoleEnum) => {
      switch (kode) {
        case RoleEnum.ADMINISTRATOR:
          return {
            aksesUnit: 3,
            aksesUnitLabel: 'Semua Unit Kerja (Kabupaten)',
            catatanKewenangan:
              'Akses penuh konfigurasi sistem, manajemen akun pengguna, serta monitoring dan supervisi seluruh OPD.',
            menus: [
              {
                id: 'm1',
                urutan: '1',
                title: 'Dashboard (Ringkasan Eksekutif)',
                route: '/dashboard',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Monitoring statistik dan grafik eksekutif Pemda',
              },
              {
                id: 'm2',
                urutan: '2',
                title: 'Paket Pembangunan',
                route: '/pembangunan',
                readx: 1,
                addx: 1,
                updatex: 1,
                deletex: 1,
                keterangan: 'Kelola data paket, integrasi SiRUP, pagu, dan target',
                subItem: [
                  {
                    id: 'm2_1',
                    urutan: '2.1',
                    title: 'Sinkronisasi SiRUP / RUP',
                    route: '/pembangunan/sirup',
                    readx: 1,
                    addx: 1,
                    updatex: 1,
                    deletex: 1,
                  },
                  {
                    id: 'm2_2',
                    urutan: '2.2',
                    title: 'Target Fisik Bulanan (Kurva-S)',
                    route: '/pembangunan/target',
                    readx: 1,
                    addx: 1,
                    updatex: 1,
                    deletex: 1,
                  },
                ],
              },
              {
                id: 'm3',
                urutan: '3',
                title: 'Realisasi Bulanan (RFK)',
                route: '/realisasi',
                readx: 1,
                addx: 1,
                updatex: 1,
                deletex: 1,
                keterangan: 'Akses penuh verifikasi, input fisik, dan SP2D keuangan',
                subItem: [
                  {
                    id: 'm3_1',
                    urutan: '3.1',
                    title: 'Realisasi Fisik & Bukti Lapangan',
                    route: '/realisasi/fisik',
                    readx: 1,
                    addx: 1,
                    updatex: 1,
                    deletex: 1,
                  },
                  {
                    id: 'm3_2',
                    urutan: '3.2',
                    title: 'Realisasi Keuangan & SP2D',
                    route: '/realisasi/keuangan',
                    readx: 1,
                    addx: 1,
                    updatex: 1,
                    deletex: 1,
                  },
                  {
                    id: 'm3_3',
                    urutan: '3.3',
                    title: 'Verifikasi & Approval Monev',
                    route: '/realisasi/verifikasi',
                    readx: 1,
                    addx: 1,
                    updatex: 1,
                    deletex: 1,
                  },
                ],
              },
              {
                id: 'm4',
                urutan: '4',
                title: 'Laporan & Evaluasi RFK',
                route: '/laporan',
                readx: 1,
                addx: 1,
                updatex: 1,
                deletex: 1,
                keterangan: 'Generate berita acara, deviasi, dan rekapitulasi',
              },
              {
                id: 'm5',
                urutan: '5',
                title: 'Manajemen Pengguna',
                route: '/users',
                readx: 1,
                addx: 1,
                updatex: 1,
                deletex: 1,
                keterangan: 'Kelola akun pengguna dan integrasi SIMPEG',
              },
              {
                id: 'm6',
                urutan: '6',
                title: 'Kelompok Pengguna & Hak Akses',
                route: '/roles',
                readx: 1,
                addx: 1,
                updatex: 1,
                deletex: 0,
                keterangan: 'Lihat dan kelola matriks izin kelompok pengguna',
              },
            ],
          };

        case RoleEnum.ADMIN_SIRUP:
          return {
            aksesUnit: 2,
            aksesUnitLabel: '1 Unit Kerja (OPD)',
            catatanKewenangan:
              'Bertanggung jawab menginput dan memutakhirkan data paket pembangunan awal berbasis SiRUP LKPP.',
            menus: [
              {
                id: 'm1',
                urutan: '1',
                title: 'Dashboard (Ringkasan Eksekutif)',
                route: '/dashboard',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Lihat ringkasan progres OPD sendiri',
              },
              {
                id: 'm2',
                urutan: '2',
                title: 'Paket Pembangunan',
                route: '/pembangunan',
                readx: 1,
                addx: 1,
                updatex: 1,
                deletex: 0,
                keterangan: 'Input paket baru, nomor RUP, pagu, dan rekanan',
                subItem: [
                  {
                    id: 'm2_1',
                    urutan: '2.1',
                    title: 'Sinkronisasi SiRUP / RUP',
                    route: '/pembangunan/sirup',
                    readx: 1,
                    addx: 1,
                    updatex: 1,
                    deletex: 0,
                  },
                  {
                    id: 'm2_2',
                    urutan: '2.2',
                    title: 'Target Fisik Bulanan (Kurva-S)',
                    route: '/pembangunan/target',
                    readx: 1,
                    addx: 0,
                    updatex: 0,
                    deletex: 0,
                  },
                ],
              },
              {
                id: 'm3',
                urutan: '3',
                title: 'Realisasi Bulanan (RFK)',
                route: '/realisasi',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Hanya melihat progres realisasi',
              },
              {
                id: 'm4',
                urutan: '4',
                title: 'Laporan & Evaluasi RFK',
                route: '/laporan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat laporan hasil evaluasi',
              },
              {
                id: 'm5',
                urutan: '5',
                title: 'Manajemen Pengguna',
                route: '/users',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
              {
                id: 'm6',
                urutan: '6',
                title: 'Kelompok Pengguna & Hak Akses',
                route: '/roles',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
            ],
          };

        case RoleEnum.ADMIN_PERENCANAAN:
          return {
            aksesUnit: 2,
            aksesUnitLabel: '1 Unit Kerja (OPD)',
            catatanKewenangan:
              'Menyusun target rencana fisik bulanan (Kurva-S) B01-B12 untuk seluruh paket di lingkup OPD-nya.',
            menus: [
              {
                id: 'm1',
                urutan: '1',
                title: 'Dashboard (Ringkasan Eksekutif)',
                route: '/dashboard',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Lihat ringkasan progres OPD sendiri',
              },
              {
                id: 'm2',
                urutan: '2',
                title: 'Paket Pembangunan',
                route: '/pembangunan',
                readx: 1,
                addx: 0,
                updatex: 1,
                deletex: 0,
                keterangan: 'Input & edit target persentase fisik Kurva-S B01-B12',
                subItem: [
                  {
                    id: 'm2_1',
                    urutan: '2.1',
                    title: 'Sinkronisasi SiRUP / RUP',
                    route: '/pembangunan/sirup',
                    readx: 1,
                    addx: 0,
                    updatex: 0,
                    deletex: 0,
                  },
                  {
                    id: 'm2_2',
                    urutan: '2.2',
                    title: 'Target Fisik Bulanan (Kurva-S)',
                    route: '/pembangunan/target',
                    readx: 1,
                    addx: 0,
                    updatex: 1,
                    deletex: 0,
                  },
                ],
              },
              {
                id: 'm3',
                urutan: '3',
                title: 'Realisasi Bulanan (RFK)',
                route: '/realisasi',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Hanya melihat progres realisasi',
              },
              {
                id: 'm4',
                urutan: '4',
                title: 'Laporan & Evaluasi RFK',
                route: '/laporan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat laporan hasil evaluasi',
              },
              {
                id: 'm5',
                urutan: '5',
                title: 'Manajemen Pengguna',
                route: '/users',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
              {
                id: 'm6',
                urutan: '6',
                title: 'Kelompok Pengguna & Hak Akses',
                route: '/roles',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
            ],
          };

        case RoleEnum.ADMIN_PPK:
          return {
            aksesUnit: 1,
            aksesUnitLabel: '1 Sub Unit / Paket Kerja',
            catatanKewenangan:
              'Input realisasi fisik kumulatif bulanan (%), kendala pelaksanaan, dan unggah bukti fisik dokumentasi lapangan.',
            menus: [
              {
                id: 'm1',
                urutan: '1',
                title: 'Dashboard (Ringkasan Eksekutif)',
                route: '/dashboard',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Lihat ringkasan progres paket binaan',
              },
              {
                id: 'm2',
                urutan: '2',
                title: 'Paket Pembangunan',
                route: '/pembangunan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat detail pagu dan kontrak paketnya',
              },
              {
                id: 'm3',
                urutan: '3',
                title: 'Realisasi Bulanan (RFK)',
                route: '/realisasi',
                readx: 1,
                addx: 1,
                updatex: 1,
                deletex: 0,
                keterangan: 'Input capaian fisik %, catatan kendala, dan upload foto/video',
                subItem: [
                  {
                    id: 'm3_1',
                    urutan: '3.1',
                    title: 'Realisasi Fisik & Bukti Lapangan',
                    route: '/realisasi/fisik',
                    readx: 1,
                    addx: 1,
                    updatex: 1,
                    deletex: 0,
                  },
                  {
                    id: 'm3_2',
                    urutan: '3.2',
                    title: 'Realisasi Keuangan & SP2D',
                    route: '/realisasi/keuangan',
                    readx: 1,
                    addx: 0,
                    updatex: 0,
                    deletex: 0,
                  },
                ],
              },
              {
                id: 'm4',
                urutan: '4',
                title: 'Laporan & Evaluasi RFK',
                route: '/laporan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat deviasi paket binaan',
              },
              {
                id: 'm5',
                urutan: '5',
                title: 'Manajemen Pengguna',
                route: '/users',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
              {
                id: 'm6',
                urutan: '6',
                title: 'Kelompok Pengguna & Hak Akses',
                route: '/roles',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
            ],
          };

        case RoleEnum.BENDAHARA:
          return {
            aksesUnit: 2,
            aksesUnitLabel: '1 Unit Kerja (OPD)',
            catatanKewenangan:
              'Input realisasi keuangan kumulatif berbasis pencairan SP2D / BPKAD per paket pembangunan di OPD-nya.',
            menus: [
              {
                id: 'm1',
                urutan: '1',
                title: 'Dashboard (Ringkasan Eksekutif)',
                route: '/dashboard',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat serapan anggaran OPD',
              },
              {
                id: 'm2',
                urutan: '2',
                title: 'Paket Pembangunan',
                route: '/pembangunan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat daftar pagu paket',
              },
              {
                id: 'm3',
                urutan: '3',
                title: 'Realisasi Bulanan (RFK)',
                route: '/realisasi',
                readx: 1,
                addx: 1,
                updatex: 1,
                deletex: 0,
                keterangan: 'Input SP2D, nomor SP2D, dan nominal realisasi kas bulanan',
                subItem: [
                  {
                    id: 'm3_1',
                    urutan: '3.1',
                    title: 'Realisasi Fisik & Bukti Lapangan',
                    route: '/realisasi/fisik',
                    readx: 1,
                    addx: 0,
                    updatex: 0,
                    deletex: 0,
                  },
                  {
                    id: 'm3_2',
                    urutan: '3.2',
                    title: 'Realisasi Keuangan & SP2D',
                    route: '/realisasi/keuangan',
                    readx: 1,
                    addx: 1,
                    updatex: 1,
                    deletex: 0,
                  },
                ],
              },
              {
                id: 'm4',
                urutan: '4',
                title: 'Laporan & Evaluasi RFK',
                route: '/laporan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat laporan serapan anggaran',
              },
              {
                id: 'm5',
                urutan: '5',
                title: 'Manajemen Pengguna',
                route: '/users',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
              {
                id: 'm6',
                urutan: '6',
                title: 'Kelompok Pengguna & Hak Akses',
                route: '/roles',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
            ],
          };

        case RoleEnum.KEPALA_OPD:
          return {
            aksesUnit: 2,
            aksesUnitLabel: '1 Unit Kerja (OPD)',
            catatanKewenangan:
              'Monitoring, supervisi, dan pertanggungjawaban progres fisik & keuangan seluruh paket di OPD-nya.',
            menus: [
              {
                id: 'm1',
                urutan: '1',
                title: 'Dashboard (Ringkasan Eksekutif)',
                route: '/dashboard',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Executive view capaian pembangunan OPD',
              },
              {
                id: 'm2',
                urutan: '2',
                title: 'Paket Pembangunan',
                route: '/pembangunan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Supervisi paket kegiatan OPD',
              },
              {
                id: 'm3',
                urutan: '3',
                title: 'Realisasi Bulanan (RFK)',
                route: '/realisasi',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Pantau input fisik PPK dan SP2D Bendahara',
              },
              {
                id: 'm4',
                urutan: '4',
                title: 'Laporan & Evaluasi RFK',
                route: '/laporan',
                readx: 1,
                addx: 0,
                updatex: 1,
                deletex: 0,
                keterangan: 'Verifikasi & persetujuan laporan internal OPD',
              },
              {
                id: 'm5',
                urutan: '5',
                title: 'Manajemen Pengguna',
                route: '/users',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
              {
                id: 'm6',
                urutan: '6',
                title: 'Kelompok Pengguna & Hak Akses',
                route: '/roles',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
            ],
          };

        case RoleEnum.PIMPINAN_DAERAH:
          return {
            aksesUnit: 3,
            aksesUnitLabel: 'Semua Unit Kerja (Kabupaten)',
            catatanKewenangan:
              'Akses pimpinan tertinggi daerah (Bupati / Sekda) untuk memantau performa serapan & fisik seluruh OPD.',
            menus: [
              {
                id: 'm1',
                urutan: '1',
                title: 'Dashboard (Ringkasan Eksekutif)',
                route: '/dashboard',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Executive Summary makro seluruh OPD se-Konawe Selatan',
              },
              {
                id: 'm2',
                urutan: '2',
                title: 'Paket Pembangunan',
                route: '/pembangunan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat seluruh paket pembangunan daerah',
              },
              {
                id: 'm3',
                urutan: '3',
                title: 'Realisasi Bulanan (RFK)',
                route: '/realisasi',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat capaian realisasi seluruh OPD',
              },
              {
                id: 'm4',
                urutan: '4',
                title: 'Laporan & Evaluasi RFK',
                route: '/laporan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Rekapitulasi RFK resmi seluruh Kabupaten Konawe Selatan',
              },
              {
                id: 'm5',
                urutan: '5',
                title: 'Manajemen Pengguna',
                route: '/users',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
              {
                id: 'm6',
                urutan: '6',
                title: 'Kelompok Pengguna & Hak Akses',
                route: '/roles',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
            ],
          };

        case RoleEnum.MONEV:
          return {
            aksesUnit: 3,
            aksesUnitLabel: 'Semua Unit Kerja (Kabupaten)',
            catatanKewenangan:
              'Melakukan verifikasi, validasi, approval/penolakan data pengajuan realisasi, dan analisis deviasi proyek.',
            menus: [
              {
                id: 'm1',
                urutan: '1',
                title: 'Dashboard (Ringkasan Eksekutif)',
                route: '/dashboard',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Analisis deviasi paket dan deteksi paket kritis/terlambat',
              },
              {
                id: 'm2',
                urutan: '2',
                title: 'Paket Pembangunan',
                route: '/pembangunan',
                readx: 1,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Melihat seluruh paket pembangunan',
              },
              {
                id: 'm3',
                urutan: '3',
                title: 'Realisasi Bulanan (RFK)',
                route: '/realisasi',
                readx: 1,
                addx: 0,
                updatex: 1,
                deletex: 0,
                keterangan: 'Verifikasi, approve, atau tolak (dengan catatan) pengajuan PPK',
                subItem: [
                  {
                    id: 'm3_1',
                    urutan: '3.1',
                    title: 'Realisasi Fisik & Bukti Lapangan',
                    route: '/realisasi/fisik',
                    readx: 1,
                    addx: 0,
                    updatex: 1,
                    deletex: 0,
                  },
                  {
                    id: 'm3_2',
                    urutan: '3.2',
                    title: 'Realisasi Keuangan & SP2D',
                    route: '/realisasi/keuangan',
                    readx: 1,
                    addx: 0,
                    updatex: 1,
                    deletex: 0,
                  },
                  {
                    id: 'm3_3',
                    urutan: '3.3',
                    title: 'Verifikasi & Approval Monev',
                    route: '/realisasi/verifikasi',
                    readx: 1,
                    addx: 1,
                    updatex: 1,
                    deletex: 0,
                  },
                ],
              },
              {
                id: 'm4',
                urutan: '4',
                title: 'Laporan & Evaluasi RFK',
                route: '/laporan',
                readx: 1,
                addx: 1,
                updatex: 1,
                deletex: 0,
                keterangan: 'Menyusun analisis deviasi dan Berita Acara Rekapitulasi',
              },
              {
                id: 'm5',
                urutan: '5',
                title: 'Manajemen Pengguna',
                route: '/users',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
              {
                id: 'm6',
                urutan: '6',
                title: 'Kelompok Pengguna & Hak Akses',
                route: '/roles',
                readx: 0,
                addx: 0,
                updatex: 0,
                deletex: 0,
                keterangan: 'Tidak memiliki akses',
              },
            ],
          };

        default:
          return {
            aksesUnit: 1,
            aksesUnitLabel: '1 Sub Unit Kerja',
            catatanKewenangan: 'Akses terbatas untuk membaca data publik pembangunan.',
            menus: [],
          };
      }
    };

    return roles.map((role) => {
      const override = this.roleMatrixOverrides.get(role.kode);
      const perms = override || getRolePermissions(role.kode);
      const assignedUsers = allUsers.filter(
        (u) =>
          u.role === role.kode ||
          (u.roles && u.roles.includes(role.kode)),
      );

      const aksesUnit = override?.aksesUnit ?? perms.aksesUnit;
      const aksesUnitLabel =
        aksesUnit === 3
          ? 'Semua Unit Kerja (Kabupaten)'
          : aksesUnit === 2
          ? '1 Unit Kerja (OPD)'
          : '1 Sub Unit / Paket Kerja';

      return {
        ...role,
        aksesUnit,
        aksesUnitLabel,
        catatanKewenangan: override?.catatanKewenangan || perms.catatanKewenangan,
        menus: override?.menus || perms.menus,
        totalUsers: assignedUsers.length,
        users: assignedUsers.map((u) => ({
          id: u.id,
          nip: u.nip,
          namaLengkap: u.namaLengkap,
          jabatan: u.jabatan,
          status: u.status,
          opdId: u.opdId,
        })),
      };
    });
  }

  /**
   * Memperbarui matriks hak akses dan cakupan unit peran oleh Administrator
   */
  async updateRoleMatrix(
    id: string,
    body: { aksesUnit: number; menus: any[]; catatanKewenangan?: string },
    adminUserId?: string,
  ) {
    const role = await this.prisma.role.findFirst({
      where: { OR: [{ id }, { kode: id as any }] },
    });

    if (!role) {
      throw new NotFoundException(`Peran dengan ID atau kode '${id}' tidak ditemukan`);
    }

    const payload = {
      kode: role.kode,
      nama: role.nama,
      aksesUnit: Number(body.aksesUnit) || 1,
      menus: body.menus || [],
      catatanKewenangan: body.catatanKewenangan || role.deskripsi,
    };

    // Simpan ke in-memory override
    this.roleMatrixOverrides.set(role.kode, payload);

    // Catat ke PostgreSQL AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_ROLE_MATRIX',
        resource: 'ROLE',
        resourceId: role.id,
        payload,
      },
    });

    this.logger.log(`Matriks peran '${role.nama}' (${role.kode}) berhasil diperbarui oleh Administrator.`);

    return {
      message: `Matriks hak akses peran '${role.nama}' berhasil disimpan.`,
      role: {
        ...role,
        ...payload,
      },
    };
  }

  /**
   * Mengambil detail 1 user SIMANTAP
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: { role: true },
          orderBy: { role: { urutan: 'asc' } },
        },
        auditLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Pengguna dengan ID '${id}' tidak ditemukan`);
    }

    const safeUser = {
      ...user,
      opd: this.egovService.getOpdById(user.opdId),
      subUnit: this.egovService.getSubUnitById(user.subUnitId),
    };
    delete (safeUser as any).password;
    return safeUser;
  }

  /**
   * Menetapkan / Mengubah Hak Akses Role Pegawai (Mengadopsi pola konsel-setara)
   * Jika pegawai belum terdaftar di SIMANTAP, otomatis menarik data dari E-Gov & SIMPEG
   */
  async setRole(dto: SetRoleDto, adminId?: string) {
    const cleanNip = dto.nip.trim();

    let assignedRoles: RoleEnum[] = [];
    if (dto.roles && dto.roles.length > 0) {
      assignedRoles = Array.from(new Set(dto.roles));
    } else if (dto.role) {
      assignedRoles = [dto.role];
    } else {
      assignedRoles = [RoleEnum.ADMIN_PPK];
    }
    const primaryRole = assignedRoles[0];

    // 1. Cek apakah user sudah terdaftar di SIMANTAP
    let user = await this.prisma.user.findUnique({
      where: { nip: cleanNip },
    });

    let action = 'UPDATE_ROLE';

    if (!user) {
      // 2. Jika belum ada di lokal, tarik profil dari Server E-Gov & SIMPEG
      const egovProfile = await this.egovService.getPegawaiByNip(cleanNip);

      if (!egovProfile) {
        throw new NotFoundException(
          `Data pegawai dengan NIP '${cleanNip}' tidak ditemukan pada database E-Gov maupun SIMPEG Konawe Selatan.`,
        );
      }

      // Tetapkan OPD & Sub Unit dari SIMPEG jika belum ditentukan
      const assignedOpdId =
        dto.opdId ||
        (egovProfile.instansiId ? String(egovProfile.instansiId) : null);
      const assignedSubUnitId =
        dto.subUnitId ||
        (egovProfile.unitKerjaId ? String(egovProfile.unitKerjaId) : null);

      const defaultPassword = await bcrypt.hash('Password123!', 10);
      const email = `${cleanNip}@konaweselatankab.go.id`;

      user = await this.prisma.user.create({
        data: {
          nip: cleanNip,
          namaLengkap: egovProfile.namaLengkap,
          jabatan: egovProfile.jabatan,
          email,
          password: defaultPassword,
          role: primaryRole,
          roles: assignedRoles,
          opdId: assignedOpdId,
          subUnitId: assignedSubUnitId,
          status: 'AKTIF',
        },
      });

      action = 'ASSIGN_NEW_ROLE_FROM_EGOV';
    } else {
      // 3. Jika sudah ada di lokal, perbarui role & status
      let finalOpdId = dto.opdId || user.opdId;
      let finalSubUnitId = dto.subUnitId || user.subUnitId;

      if (!finalOpdId || !finalSubUnitId) {
        const egovProfile = await this.egovService.getPegawaiByNip(cleanNip);
        if (egovProfile) {
          if (!finalOpdId && egovProfile.instansiId) {
            finalOpdId = String(egovProfile.instansiId);
          }
          if (!finalSubUnitId && egovProfile.unitKerjaId) {
            finalSubUnitId = String(egovProfile.unitKerjaId);
          }
        }
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: primaryRole,
          roles: assignedRoles,
          opdId: finalOpdId,
          subUnitId: finalSubUnitId,
          status: 'AKTIF',
        },
      });
    }

    // 4. Sinkronisasi tabel relasi master user_roles
    const masterRoles = await this.prisma.role.findMany({
      where: { kode: { in: assignedRoles } },
    });

    await this.prisma.userRole.deleteMany({
      where: { userId: user.id },
    });

    if (masterRoles.length > 0) {
      await this.prisma.userRole.createMany({
        data: masterRoles.map((mr) => ({
          userId: user.id,
          roleId: mr.id,
        })),
      });
    }

    // Catat Audit Trail
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action,
        resource: 'USER_ROLE',
        resourceId: user.id,
        payload: {
          targetNip: cleanNip,
          assignedRoles,
          primaryRole,
          opdId: dto.opdId,
        },
      },
    });

    return {
      message: `Hak akses role (${assignedRoles.join(', ')}) berhasil diberikan kepada ${user.namaLengkap}`,
      user: {
        id: user.id,
        nip: user.nip,
        namaLengkap: user.namaLengkap,
        jabatan: user.jabatan,
        role: user.role,
        roles: user.roles,
        userRoles: masterRoles.map((mr) => ({ role: mr })),
        status: user.status,
      },
    };
  }

  /**
   * Mencabut hak akses role pegawai di SIMANTAP
   */
  async revokeRole(nip: string, adminId?: string) {
    const cleanNip = nip.trim();

    const user = await this.prisma.user.findUnique({
      where: { nip: cleanNip },
    });

    if (!user) {
      throw new NotFoundException(
        `Pengguna dengan NIP '${cleanNip}' tidak ditemukan`,
      );
    }

    // Ubah status menjadi NON_AKTIF tanpa menghapus/mengubah role
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'NON_AKTIF',
      },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'REVOKE_USER_ACCESS',
        resource: 'USER_ROLE',
        resourceId: user.id,
        payload: { targetNip: cleanNip, role: user.role, roles: user.roles },
      },
    });

    return {
      message: `Hak akses sistem SIMANTAP untuk '${user.namaLengkap}' berhasil dicabut (Status: Non-Aktif). Peran tetap tersimpan.`,
    };
  }

  /**
   * Mengembalikan peran ke default (Belum Diberi Akses)
   * Menghapus record pengguna dari database lokal SIMANTAP sehingga datanya kembali bersih dan kembali ke Direktori ASN
   */
  async resetToDefault(nip: string, adminId?: string) {
    const cleanNip = nip.trim();

    const user = await this.prisma.user.findUnique({
      where: { nip: cleanNip },
    });

    if (!user) {
      throw new NotFoundException(
        `Pengguna dengan NIP '${cleanNip}' tidak terdaftar di SIMANTAP`,
      );
    }

    // Invalidate dan hapus semua refresh token
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    // Catat log audit sebelum akun dihapus
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'RESET_USER_TO_DEFAULT',
        resource: 'USER_ROLE',
        resourceId: user.id,
        payload: {
          targetNip: cleanNip,
          namaLengkap: user.namaLengkap,
          previousRole: user.role,
          previousRoles: user.roles,
        },
      },
    });

    // Hapus akun dari SIMANTAP lokal agar datanya kembali bersih
    await this.prisma.user.delete({
      where: { id: user.id },
    });

    return {
      message: `Peran akun '${user.namaLengkap}' telah dikembalikan ke default (Belum Diberi Akses) dan dikembalikan ke Direktori ASN.`,
    };
  }

  /**
   * Autocomplete / Lookup Pegawai langsung dari SIMPEG & E-Gov
   */
  async lookupPegawai(cari: string) {
    return this.egovService.lookupPegawai(cari);
  }

  /**
   * Direktori Pegawai E-Gov & SIMPEG terpaginasi
   * Diperkaya dengan informasi status hak akses aktif di SIMANTAP
   */
  async getPegawaiDirectory(query: QueryPegawaiDirectoryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      opdName,
      instansiId,
      unitKerjaId,
    } = query;

    const result = await this.egovService.getDirectory({
      page,
      limit,
      search,
      opdName,
      instansiId,
      unitKerjaId,
    });

    if (!result.data || result.data.length === 0) {
      return {
        data: [],
        meta: {
          page: result.page || page,
          limit: result.limit || limit,
          total: result.total || 0,
          totalPages: result.totalPages || 0,
        },
      };
    }

    // Ambil semua NIP dari halaman ini
    const nips = result.data.map((p) => p.nip);

    // Cek user yang sudah terdaftar di SIMANTAP
    const localUsers = await this.prisma.user.findMany({
      where: { nip: { in: nips } },
      select: {
        id: true,
        nip: true,
        role: true,
        roles: true,
        status: true,
      },
    });

    const userMap = new Map(localUsers.map((u) => [u.nip, u]));

    // Gabungkan status akses
    const enrichedData = result.data.map((p) => {
      const local = userMap.get(p.nip);
      return {
        ...p,
        hasSimantapAccess: !!local && local.status === 'AKTIF',
        simantapRole: local?.role || null,
        simantapRoles:
          local?.roles && local.roles.length > 0
            ? local.roles
            : local?.role
              ? [local.role]
              : [],
        simantapStatus: local ? local.status : 'BELUM_DIBERI_AKSES',
        simantapUserId: local?.id || null,
      };
    });

    return {
      data: enrichedData,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Mengambil daftar Instansi / Unit Kerja dari SIMPEG (READ-ONLY)
   */
  async getInstansiList() {
    return this.egovService.getInstansiList();
  }

  /**
   * Mengambil daftar Sub Unit Kerja dari SIMPEG berdasarkan Instansi (READ-ONLY)
   */
  async getUnitKerjaList(instansiId?: string) {
    return this.egovService.getUnitKerjaList(instansiId);
  }
}
