export type RoleEnum =
  | 'ADMINISTRATOR'
  | 'ADMIN_SIRUP'
  | 'ADMIN_PERENCANAAN'
  | 'ADMIN_PPK'
  | 'BENDAHARA'
  | 'KEPALA_OPD'
  | 'PIMPINAN_DAERAH'
  | 'MONEV';

export interface MasterRole {
  id: string;
  kode: RoleEnum;
  nama: string;
  deskripsi?: string | null;
  urutan: number;
}

export interface UserRoleItem {
  id?: string;
  userId?: string;
  roleId?: string;
  role: MasterRole;
}

export interface UserProfile {
  id: string;
  nip: string;
  namaLengkap: string;
  jabatan: string;
  email: string;
  role: RoleEnum;
  roles?: RoleEnum[];
  userRoles?: UserRoleItem[];
  status: 'AKTIF' | 'NON_AKTIF' | 'TERKUNCI';
  opdId?: string | null;
  subUnitId?: string | null;
  accessScopes?: Array<{
    role: RoleEnum;
    opdId: string;
    subUnitId?: string | null;
  }>;
  accessibleOpds?: Array<{
    id: string;
    kodeOpd: string;
    namaOpd: string;
    singkatan?: string;
    isHome: boolean;
  }>;
  opd?: {
    id: string;
    kodeOpd: string;
    namaOpd: string;
    singkatan?: string;
  } | null;
  subUnit?: {
    id: string;
    kodeSubUnit: string;
    namaSubUnit: string;
  } | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: UserProfile;
}

export interface RefreshTokenResponseData {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: UserProfile;
}
