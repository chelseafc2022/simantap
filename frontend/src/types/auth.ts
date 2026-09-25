export type RoleEnum =
  | 'ADMINISTRATOR'
  | 'ADMIN_SIRUP'
  | 'ADMIN_PERENCANAAN'
  | 'ADMIN_PPK'
  | 'BENDAHARA'
  | 'KEPALA_OPD'
  | 'PIMPINAN_DAERAH';

export interface UserProfile {
  id: string;
  nip: string;
  namaLengkap: string;
  jabatan: string;
  email: string;
  role: RoleEnum;
  status: 'AKTIF' | 'NON_AKTIF' | 'TERKUNCI';
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
