import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/app.constants';
import { RoleEnum } from '../enums/role.enum';

export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);
