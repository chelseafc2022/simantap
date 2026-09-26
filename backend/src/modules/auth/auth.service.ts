import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RoleEnum } from '../../common/enums/role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../core/database/prisma.service';
import { EgovService } from '../../core/egov/egov.service';
import { RedisService } from '../../core/redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterUserDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly egovService: EgovService,
  ) {}

  async register(dto: RegisterUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ nip: dto.nip }, { email: dto.email }],
      },
    });

    if (existing) {
      throw new BadRequestException('NIP atau Email sudah terdaftar dalam sistem');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        nip: dto.nip,
        namaLengkap: dto.namaLengkap,
        jabatan: dto.jabatan,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        opdId: dto.opdId,
        subUnitId: dto.subUnitId,
      },
      select: {
        id: true,
        nip: true,
        namaLengkap: true,
        jabatan: true,
        email: true,
        role: true,
        roles: true,
        status: true,
        opdId: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Login terpadu: Mendukung akun lokal SIMANTAP dan SSO E-Gov / SIMPEG Konsel
   * Mengadopsi alur multi-database konsel-setara
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const rawInput = dto.nipOrEmail || dto.identifier || "";
    const cleanInput = rawInput.trim();

    // 1. Coba Autentikasi ke Database Lokal SIMANTAP
    let targetNip = cleanInput;
    if (!/^\d+$/.test(cleanInput) && !cleanInput.includes('@')) {
      try {
        const egovInfo = await this.egovService.getPegawaiByNip(cleanInput);
        if (egovInfo?.nip) {
          targetNip = egovInfo.nip;
        }
      } catch (err) {
        this.logger.warn(`Lookup E-Gov username ${cleanInput} gagal: ${err.message}`);
      }
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { nip: cleanInput },
          { nip: targetNip },
          { email: cleanInput },
        ],
      },
      include: {
        opd: {
          select: {
            id: true,
            kodeOpd: true,
            namaOpd: true,
            singkatan: true,
          },
        },
      },
    });

    let isAuthenticated = false;

    if (user) {
      const isMatch = await bcrypt.compare(dto.password, user.password);
      if (isMatch) {
        isAuthenticated = true;
      }
    }

    // 2. Jika tidak cocok di lokal, coba autentikasi ke Server Database E-Gov & SIMPEG
    if (!isAuthenticated) {
      const egovProfile = await this.egovService.authenticate(
        cleanInput,
        dto.password,
      );

      if (!egovProfile) {
        throw new UnauthorizedException(
          'Kredensial tidak valid: NIP/Username atau Kata Sandi salah',
        );
      }

      // Cari user berdasarkan NIP hasil dari E-Gov
      if (!user) {
        user = await this.prisma.user.findFirst({
          where: { nip: egovProfile.nip },
          include: {
            opd: {
              select: {
                id: true,
                kodeOpd: true,
                namaOpd: true,
                singkatan: true,
              },
            },
          },
        });
      }

      if (!user) {
        // Akun E-Gov valid, tetapi belum diberikan hak akses role di SIMANTAP oleh Administrator
        throw new ForbiddenException(
          `Akun E-Gov/SIMPEG atas nama '${egovProfile.namaLengkap}' valid, namun belum diberikan hak akses role pada sistem SIMANTAP. Silakan hubungi Administrator.`,
        );
      }

      // Update data nama & jabatan pegawai dari SIMPEG jika ada pembaruan
      // Dan sinkronkan OPD jika user belum terhubung ke OPD
      let updatedOpdId = user.opdId;
      if (!updatedOpdId && (egovProfile.instansiId || egovProfile.opd)) {
        const matchedOpd = await this.prisma.opd.findFirst({
          where: {
            OR: [
              ...(egovProfile.instansiId ? [{ kodeOpd: String(egovProfile.instansiId) }] : []),
              { namaOpd: { equals: egovProfile.opd, mode: 'insensitive' } },
              { namaOpd: { contains: egovProfile.opd, mode: 'insensitive' } },
            ],
          },
        });
        if (matchedOpd) {
          updatedOpdId = matchedOpd.id;
        }
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          namaLengkap: egovProfile.namaLengkap,
          jabatan: egovProfile.jabatan || user.jabatan,
          opdId: updatedOpdId,
        },
        include: {
          opd: {
            select: {
              id: true,
              kodeOpd: true,
              namaOpd: true,
              singkatan: true,
            },
          },
        },
      });

      isAuthenticated = true;
    }

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }

    if (user.status !== 'AKTIF') {
      throw new UnauthorizedException('Akun berstatus non-aktif atau terkunci');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Save refresh token
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    const refreshExpiresDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiresDays);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AUTH_LOGIN',
        resource: 'AUTH',
        resourceId: user.id,
        ipAddress,
        userAgent,
        payload: { nip: user.nip, role: user.role },
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.configService.get<string>('jwt.expiresIn', '15m'),
      user: {
        id: user.id,
        nip: user.nip,
        namaLengkap: user.namaLengkap,
        jabatan: user.jabatan,
        email: user.email,
        role: user.role,
        roles: (user.roles && user.roles.length > 0) ? user.roles : [user.role],
        opd: user.opd,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const refreshSecret = this.configService.get<string>(
        'jwt.refreshSecret',
        'simantap-jwt-refresh-secret-super-secure-key-2026',
      );
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          opd: {
            select: { id: true, kodeOpd: true, namaOpd: true, singkatan: true },
          },
        },
      });

      if (!user || user.status !== 'AKTIF') {
        throw new UnauthorizedException('Pengguna tidak valid');
      }

      // Check active refresh tokens in DB
      const storedTokens = await this.prisma.refreshToken.findMany({
        where: {
          userId: user.id,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
      });

      let validTokenRecord = null;
      for (const t of storedTokens) {
        const isMatch = await bcrypt.compare(dto.refreshToken, t.tokenHash);
        if (isMatch) {
          validTokenRecord = t;
          break;
        }
      }

      if (!validTokenRecord) {
        throw new UnauthorizedException('Refresh token tidak valid atau telah ditarik');
      }

      // Revoke old token (token rotation)
      await this.prisma.refreshToken.update({
        where: { id: validTokenRecord.id },
        data: { isRevoked: true },
      });

      // Generate new tokens
      const newTokens = await this.generateTokens(user);

      // Save new refresh token
      const newTokenHash = await bcrypt.hash(newTokens.refreshToken, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt,
        },
      });

      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: this.configService.get<string>('jwt.expiresIn', '15m'),
        user: {
          id: user.id,
          nip: user.nip,
          namaLengkap: user.namaLengkap,
          jabatan: user.jabatan,
          email: user.email,
          role: user.role,
          roles: (user.roles && user.roles.length > 0) ? user.roles : [user.role],
          opd: user.opd,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token kedaluwarsa atau tidak valid');
    }
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { message: 'Berhasil keluar dari sistem' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nip: true,
        namaLengkap: true,
        jabatan: true,
        email: true,
        role: true,
        roles: true,
        status: true,
        opd: true,
        subUnit: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }

    return user;
  }

  private async generateTokens(user: {
    id: string;
    nip: string;
    email: string;
    role: any;
    roles?: any;
    opdId?: string | null;
    namaLengkap: string;
  }) {
    const userRoles = (user.roles && user.roles.length > 0) ? user.roles : (user.role ? [user.role] : []);
    const payload: JwtPayload = {
      sub: user.id,
      nip: user.nip,
      email: user.email,
      role: (user.role as RoleEnum) || (userRoles[0] as RoleEnum) || null,
      roles: userRoles as RoleEnum[],
      opdId: user.opdId,
      namaLengkap: user.namaLengkap,
    };

    const accessSecret = this.configService.get<string>(
      'jwt.secret',
      'simantap-jwt-access-secret-super-secure-key-2026',
    );
    const accessExpires = this.configService.get<string>('jwt.expiresIn', '15m');

    const refreshSecret = this.configService.get<string>(
      'jwt.refreshSecret',
      'simantap-jwt-refresh-secret-super-secure-key-2026',
    );
    const refreshExpires = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpires as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpires as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
