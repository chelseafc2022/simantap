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

    const userRoles: RoleEnum[] =
      user.roles && user.roles.length > 0
        ? user.roles
        : user.role
        ? [user.role]
        : [];

    // Administrator always has full access
    if (userRoles.includes(RoleEnum.ADMINISTRATOR)) {
      return true;
    }

    const hasRole = requiredRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      throw new ForbiddenException(
        `Akses ditolak: Peran '${userRoles.join(', ')}' tidak memiliki izin untuk tindakan ini`,
      );
    }

    return true;
  }
}
