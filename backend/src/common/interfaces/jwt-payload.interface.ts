import { RoleEnum } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  nip: string;
  email: string;
  role?: RoleEnum | null;
  roles?: RoleEnum[];
  opdId?: string | null;
  subUnitId?: string | null;
  namaLengkap: string;
}

export interface AuthenticatedUser {
  id: string;
  nip: string;
  email: string;
  namaLengkap: string;
  role?: RoleEnum | null;
  roles?: RoleEnum[];
  opdId?: string | null;
  subUnitId?: string | null;
}
