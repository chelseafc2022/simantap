import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../constants/app.constants';
import { RoleEnum } from '../enums/role.enum';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();

    if (!user) {
      throw new ForbiddenException('Akses ditolak: Pengguna tidak terautentikasi');
    }

    // Administrator always has access
    if (user.role === RoleEnum.ADMINISTRATOR) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Akses ditolak: Peran '${user.role}' tidak memiliki izin untuk tindakan ini`,
      );
    }

    return true;
  }
}
