import {
  BadRequestException,
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
        status: true,
        opdId: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ nip: dto.nipOrEmail }, { email: dto.nipOrEmail }],
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

    if (!user) {
      throw new UnauthorizedException('Kredensial tidak valid (NIP/Email salah)');
    }

    if (user.status !== 'AKTIF') {
      throw new UnauthorizedException('Akun berstatus non-aktif atau terkunci');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Kredensial tidak valid (Kata sandi salah)');
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

    // Optional audit log
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
    opdId?: string | null;
    namaLengkap: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      nip: user.nip,
      email: user.email,
      role: user.role as RoleEnum,
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
