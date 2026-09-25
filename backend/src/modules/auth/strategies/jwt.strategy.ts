import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret', 'simantap-jwt-access-secret-super-secure-key-2026'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        nip: true,
        email: true,
        namaLengkap: true,
        role: true,
        roles: true,
        status: true,
        opdId: true,
        subUnitId: true,
      },
    });

    if (!user || user.status !== 'AKTIF') {
      throw new UnauthorizedException('Sesi tidak valid atau akun dinonaktifkan');
    }

    return {
      id: user.id,
      nip: user.nip,
      email: user.email,
      namaLengkap: user.namaLengkap,
      role: user.role as any,
      roles: (user.roles && user.roles.length > 0) ? (user.roles as any) : [user.role as any],
      opdId: user.opdId,
      subUnitId: user.subUnitId,
    };
  }
}
