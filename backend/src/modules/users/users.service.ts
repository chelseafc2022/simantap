import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
   */
  async getMasterRoles() {
    return this.prisma.role.findMany({
      orderBy: { urutan: 'asc' },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });
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
