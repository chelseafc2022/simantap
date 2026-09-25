import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RoleEnum } from '../../common/enums/role.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { EgovService } from '../../core/egov/egov.service';
import { QueryPegawaiDirectoryDto } from './dto/query-pegawai.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { SetRoleDto } from './dto/set-role.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly egovService: EgovService,
  ) {}

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
        OR: [
          { role: role },
          { roles: { has: role } },
        ],
      });
    }

    if (opdId) {
      andConditions.push({ opdId });
    }

    if ((instansiId && instansiId !== 'all') || (unitKerjaId && unitKerjaId !== 'all')) {
      const nips = await this.egovService.getNipsByInstansi(instansiId, unitKerjaId);
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
          status: true,
          lastLoginAt: true,
          createdAt: true,
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
   * Mengambil detail 1 user SIMANTAP
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        opd: true,
        subUnit: true,
        auditLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Pengguna dengan ID '${id}' tidak ditemukan`);
    }

    const { password, ...safeUser } = user;
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

      // Cari atau buat OPD jika belum ada
      let assignedOpdId = dto.opdId;
      if (!assignedOpdId && egovProfile.opd) {
        const existingOpd = await this.prisma.opd.findFirst({
          where: {
            OR: [
              { namaOpd: { contains: egovProfile.opd, mode: 'insensitive' } },
              { singkatan: { contains: egovProfile.opd, mode: 'insensitive' } },
            ],
          },
        });
        if (existingOpd) {
          assignedOpdId = existingOpd.id;
        }
      }

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
          subUnitId: dto.subUnitId,
          status: 'AKTIF',
        },
      });

      action = 'ASSIGN_NEW_ROLE_FROM_EGOV';
    } else {
      // 3. Jika sudah ada di lokal, perbarui role & status
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: primaryRole,
          roles: assignedRoles,
          opdId: dto.opdId || user.opdId,
          subUnitId: dto.subUnitId || user.subUnitId,
          status: 'AKTIF',
        },
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
      throw new NotFoundException(`Pengguna dengan NIP '${cleanNip}' tidak ditemukan`);
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
      throw new NotFoundException(`Pengguna dengan NIP '${cleanNip}' tidak terdaftar di SIMANTAP`);
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
    const { page = 1, limit = 10, search, opdName, instansiId, unitKerjaId } = query;

    const result = await this.egovService.getDirectory({
      page,
      limit,
      search,
      opdName,
      instansiId,
      unitKerjaId,
    });

    if (!result.data || result.data.length === 0) {
      return result;
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
        simantapRoles: local?.roles && local.roles.length > 0 ? local.roles : (local?.role ? [local.role] : []),
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
