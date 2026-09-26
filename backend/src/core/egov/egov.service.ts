import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as mysql from 'mysql2/promise';

export interface EgovPegawaiProfile {
  egovId: string;
  username: string;
  nip: string;
  nama: string;
  gelarDepan?: string;
  gelarBelakang?: string;
  namaLengkap: string;
  jabatan: string;
  opd: string;
  unitKerja: string;
  instansiId?: string | number;
  unitKerjaId?: string | number;
}

export interface SimpegOpdInfo {
  id: string;
  kodeOpd: string;
  namaOpd: string;
  singkatan?: string;
}

export interface SimpegSubUnitInfo {
  id: string;
  kodeSubUnit: string;
  namaSubUnit: string;
  opdId: string;
}

@Injectable()
export class EgovService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EgovService.name);
  private pool: mysql.Pool | null = null;
  private isConnected = false;

  private instansiCache: Map<string, SimpegOpdInfo> = new Map();
  private unitKerjaCache: Map<string, SimpegSubUnitInfo> = new Map();
  private lastCacheTime = 0;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>(
      'egov.host',
      'mysql.konaweselatankab.go.id',
    );
    const user = this.configService.get<string>('egov.user', 'diskominfosandi');
    const password = this.configService.get<string>(
      'egov.password',
      'NewKominfo2018',
    );
    const port = this.configService.get<number>('egov.port', 3306);
    const connectionLimit = this.configService.get<number>(
      'egov.connectionLimit',
      20,
    );

    try {
      this.pool = mysql.createPool({
        host,
        user,
        password,
        port,
        connectionLimit,
        waitForConnections: true,
        queueLimit: 0,
        connectTimeout: 7000,
      });

      // Test connection
      const conn = await this.pool.getConnection();
      conn.release();
      this.isConnected = true;
      this.logger.log(
        `Berhasil terhubung ke Server Database E-Gov & SIMPEG Konsel (${host})`,
      );
      // Muat cache referensi SIMPEG instansi & unit_kerja
      await this.loadCache();
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(
        `Koneksi ke server database E-Gov & SIMPEG tidak dapat dibangun (${error.message}).`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Koneksi pool E-Gov & SIMPEG ditutup');
    }
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  formatNamaLengkap(r: {
    nama?: string;
    username?: string;
    gelar_depan?: string;
    gelar_belakang?: string;
  }): string {
    const gDepan =
      r.gelar_depan &&
      r.gelar_depan.trim() !== '' &&
      r.gelar_depan.trim() !== '-'
        ? `${r.gelar_depan.trim()} `
        : '';

    const gBelakang =
      r.gelar_belakang &&
      r.gelar_belakang.trim() !== '' &&
      r.gelar_belakang.trim() !== '-'
        ? `, ${r.gelar_belakang.trim()}`
        : '';

    const rawNama = (r.nama || r.username || '').replace(
      /^[-,\s]+|[-,\s]+$/g,
      '',
    );
    return `${gDepan}${rawNama}${gBelakang}`.trim();
  }

  /**
   * Autentikasi langsung terhadap database egov.users dan simpeg.biodata
   * Mengadopsi pola dari konsel-setara/backend/auth/index.js
   */
  async authenticate(
    usernameOrNip: string,
    passwordPlain: string,
  ): Promise<EgovPegawaiProfile | null> {
    if (!this.pool || !this.isConnected) {
      return null;
    }

    try {
      const cleanInput = usernameOrNip.trim();
      const sqlEgov = `
        SELECT 
          egov.users.id AS egov_id,
          egov.users.username AS egov_username,
          egov.users.password AS egov_password,
          simpeg.biodata.nip AS bio_nip,
          simpeg.biodata.nama AS bio_nama,
          simpeg.biodata.gelar_depan AS bio_gelar_depan,
          simpeg.biodata.gelar_belakang AS bio_gelar_belakang,
          COALESCE(simpeg.jabatan.jabatan, simpeg.biodata.jenis_jabatan, 'Pegawai') AS bio_jabatan,
          simpeg.unit_kerja.id AS unit_kerja_id,
          simpeg.unit_kerja.unit_kerja AS unit_kerja_nama,
          simpeg.instansi.id AS instansi_id,
          simpeg.instansi.instansi AS instansi_nama
        FROM egov.users
        LEFT JOIN simpeg.biodata ON egov.users.nama_nip = simpeg.biodata.nip
        LEFT JOIN simpeg.jabatan ON simpeg.biodata.jabatan = simpeg.jabatan._id
        LEFT JOIN simpeg.unit_kerja ON COALESCE(NULLIF(simpeg.biodata.unit_kerja, ''), egov.users.unit_kerja) = simpeg.unit_kerja.id
        LEFT JOIN simpeg.instansi ON simpeg.instansi.id = simpeg.unit_kerja.instansi
        WHERE egov.users.username = ? OR simpeg.biodata.nip = ?
        LIMIT 1;
      `;

      const [rows] = await this.pool.query<any[]>(sqlEgov, [
        cleanInput,
        cleanInput,
      ]);
      if (!rows || rows.length === 0) {
        return null;
      }

      const egovUser = rows[0];
      const isMatch = await bcrypt.compare(
        passwordPlain,
        egovUser.egov_password,
      );
      if (!isMatch) {
        return null;
      }

      const namaLengkap = this.formatNamaLengkap({
        nama: egovUser.bio_nama,
        username: egovUser.egov_username,
        gelar_depan: egovUser.bio_gelar_depan,
        gelar_belakang: egovUser.bio_gelar_belakang,
      });

      return {
        egovId: String(egovUser.egov_id),
        username: egovUser.egov_username,
        nip: egovUser.bio_nip || egovUser.egov_username,
        nama: egovUser.bio_nama || egovUser.egov_username,
        gelarDepan: egovUser.bio_gelar_depan,
        gelarBelakang: egovUser.bio_gelar_belakang,
        namaLengkap,
        jabatan: egovUser.bio_jabatan || 'Pegawai ASN',
        opd:
          egovUser.instansi_nama ||
          egovUser.unit_kerja_nama ||
          'Pemerintah Kabupaten Konawe Selatan',
        unitKerja: egovUser.unit_kerja_nama || '-',
        instansiId: egovUser.instansi_id,
        unitKerjaId: egovUser.unit_kerja_id,
      };
    } catch (error) {
      this.logger.error('Error saat autentikasi E-Gov:', error.message);
      return null;
    }
  }

  /**
   * Lookup Pegawai di E-Gov & SIMPEG untuk Autocomplete / Pencarian
   * Mengadopsi pola dari konsel-setara/backend/apiMysql/pegawai.js (lookup)
   */
  async lookupPegawai(cari: string, limit = 20): Promise<EgovPegawaiProfile[]> {
    if (!this.pool || !this.isConnected || !cari || cari.trim().length < 3) {
      return [];
    }

    try {
      const q = `%${cari.trim()}%`;
      const sql = `
        SELECT 
          egov.users.id AS egov_id,
          egov.users.username AS egov_username,
          simpeg.biodata.nip AS nip,
          simpeg.biodata.nama AS nama,
          simpeg.biodata.gelar_depan AS gelar_depan,
          simpeg.biodata.gelar_belakang AS gelar_belakang,
          COALESCE(simpeg.jabatan.jabatan, simpeg.biodata.jenis_jabatan, 'Pegawai') AS jabatan_nama,
          simpeg.unit_kerja.id AS unit_kerja_id,
          simpeg.unit_kerja.unit_kerja AS unit_kerja,
          simpeg.instansi.id AS instansi_id,
          simpeg.instansi.instansi AS opd
        FROM egov.users
        INNER JOIN simpeg.biodata ON egov.users.nama_nip = simpeg.biodata.nip
        LEFT JOIN simpeg.jabatan ON simpeg.biodata.jabatan = simpeg.jabatan._id
        LEFT JOIN simpeg.unit_kerja ON COALESCE(NULLIF(simpeg.biodata.unit_kerja, ''), egov.users.unit_kerja) = simpeg.unit_kerja.id
        LEFT JOIN simpeg.instansi ON simpeg.instansi.id = simpeg.unit_kerja.instansi
        WHERE 
          simpeg.biodata.nama IS NOT NULL 
          AND (
            simpeg.biodata.nip LIKE ? 
            OR simpeg.biodata.nama LIKE ? 
            OR simpeg.instansi.instansi LIKE ?
          )
        ORDER BY 
          CASE 
            WHEN simpeg.jabatan.jabatan LIKE "%BUPATI%" THEN 0
            WHEN simpeg.jabatan.jabatan LIKE "%SEKRETARIS DAERAH%" THEN 1
            WHEN simpeg.jabatan.esselon IS NULL OR simpeg.jabatan.esselon = "" OR simpeg.jabatan.esselon = "-" THEN 99
            ELSE CAST(simpeg.jabatan.esselon AS UNSIGNED)
          END ASC,
          CASE
            WHEN simpeg.jabatan.level IS NULL OR simpeg.jabatan.level = "" OR simpeg.jabatan.level = "null" THEN 99
            ELSE CAST(simpeg.jabatan.level AS UNSIGNED)
          END ASC,
          simpeg.biodata.nama ASC
        LIMIT ?;
      `;

      const [rows] = await this.pool.query<any[]>(sql, [q, q, q, limit]);

      return (rows || []).map((r) => ({
        egovId: String(r.egov_id),
        username: r.egov_username,
        nip: r.nip,
        nama: r.nama,
        gelarDepan: r.gelar_depan,
        gelarBelakang: r.gelar_belakang,
        namaLengkap: this.formatNamaLengkap(r),
        jabatan: r.jabatan_nama || 'Pegawai',
        opd: r.opd || r.unit_kerja || 'Pemerintah Kabupaten Konawe Selatan',
        unitKerja: r.unit_kerja || '-',
        instansiId: r.instansi_id,
        unitKerjaId: r.unit_kerja_id,
      }));
    } catch (error) {
      this.logger.error('Error saat lookup pegawai E-Gov:', error.message);
      return [];
    }
  }

  /**
   * Mengambil detail lengkap 1 pegawai berdasarkan NIP
   */
  async getPegawaiByNip(nip: string): Promise<EgovPegawaiProfile | null> {
    if (!this.pool || !this.isConnected) {
      return null;
    }

    try {
      const sql = `
        SELECT 
          egov.users.id AS egov_id,
          egov.users.username AS egov_username,
          simpeg.biodata.nip AS nip,
          simpeg.biodata.nama AS nama,
          simpeg.biodata.gelar_depan AS gelar_depan,
          simpeg.biodata.gelar_belakang AS gelar_belakang,
          COALESCE(simpeg.jabatan.jabatan, simpeg.biodata.jenis_jabatan, 'Pegawai') AS jabatan_nama,
          simpeg.unit_kerja.id AS unit_kerja_id,
          simpeg.unit_kerja.unit_kerja AS unit_kerja,
          simpeg.instansi.id AS instansi_id,
          simpeg.instansi.instansi AS opd
        FROM egov.users
        INNER JOIN simpeg.biodata ON egov.users.nama_nip = simpeg.biodata.nip
        LEFT JOIN simpeg.jabatan ON simpeg.biodata.jabatan = simpeg.jabatan._id
        LEFT JOIN simpeg.unit_kerja ON COALESCE(NULLIF(simpeg.biodata.unit_kerja, ''), egov.users.unit_kerja) = simpeg.unit_kerja.id
        LEFT JOIN simpeg.instansi ON simpeg.instansi.id = simpeg.unit_kerja.instansi
        WHERE simpeg.biodata.nip = ? OR egov.users.username = ?
        LIMIT 1;
      `;

      const [rows] = await this.pool.query<any[]>(sql, [nip, nip]);
      if (!rows || rows.length === 0) return null;

      const r = rows[0];
      return {
        egovId: String(r.egov_id),
        username: r.egov_username,
        nip: r.nip,
        nama: r.nama,
        gelarDepan: r.gelar_depan,
        gelarBelakang: r.gelar_belakang,
        namaLengkap: this.formatNamaLengkap(r),
        jabatan: r.jabatan_nama || 'Pegawai',
        opd: r.opd || r.unit_kerja || 'Pemerintah Kabupaten Konawe Selatan',
        unitKerja: r.unit_kerja || '-',
        instansiId: r.instansi_id,
        unitKerjaId: r.unit_kerja_id,
      };
    } catch (error) {
      this.logger.error(`Error getPegawaiByNip (${nip}):`, error.message);
      return null;
    }
  }

  /**
   * Direktori Pegawai E-Gov & SIMPEG terpaginasi
   * Mengadopsi pola dari konsel-setara/backend/apiMysql/pegawai.js (directory)
   */
  async getDirectory(params: {
    page: number;
    limit: number;
    search?: string;
    opdName?: string;
    instansiId?: string;
    unitKerjaId?: string;
  }) {
    if (!this.pool || !this.isConnected) {
      return { data: [], total: 0, totalPages: 0 };
    }

    try {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(100, Math.max(1, params.limit || 10));
      const offset = (page - 1) * limit;

      const whereClauses: string[] = ['simpeg.biodata.nama IS NOT NULL'];
      const queryParams: any[] = [];

      if (params.search && params.search.trim() !== '') {
        const s = `%${params.search.trim()}%`;
        whereClauses.push(
          '(simpeg.biodata.nip LIKE ? OR simpeg.biodata.nama LIKE ?)',
        );
        queryParams.push(s, s);
      }

      if (params.opdName && params.opdName.trim() !== '') {
        const o = `%${params.opdName.trim()}%`;
        whereClauses.push('simpeg.instansi.instansi LIKE ?');
        queryParams.push(o);
      }

      if (params.instansiId && params.instansiId !== 'all') {
        whereClauses.push('simpeg.instansi.id = ?');
        queryParams.push(params.instansiId);
      }

      if (params.unitKerjaId && params.unitKerjaId !== 'all') {
        whereClauses.push('simpeg.unit_kerja.id = ?');
        queryParams.push(params.unitKerjaId);
      }

      const whereStr = whereClauses.join(' AND ');

      const countSql = `
        SELECT COUNT(DISTINCT egov.users.id) AS total
        FROM egov.users
        INNER JOIN simpeg.biodata ON egov.users.nama_nip = simpeg.biodata.nip
        LEFT JOIN simpeg.unit_kerja ON COALESCE(NULLIF(simpeg.biodata.unit_kerja, ''), egov.users.unit_kerja) = simpeg.unit_kerja.id
        LEFT JOIN simpeg.instansi ON simpeg.instansi.id = simpeg.unit_kerja.instansi
        WHERE ${whereStr};
      `;

      const [countRows] = await this.pool.query<any[]>(countSql, queryParams);
      const total = countRows[0]?.total || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      const dataSql = `
        SELECT 
          egov.users.id AS egov_id,
          egov.users.username AS egov_username,
          simpeg.biodata.nip AS nip,
          simpeg.biodata.nama AS nama,
          simpeg.biodata.gelar_depan AS gelar_depan,
          simpeg.biodata.gelar_belakang AS gelar_belakang,
          COALESCE(simpeg.jabatan.jabatan, simpeg.biodata.jenis_jabatan, 'Pegawai') AS jabatan_nama,
          simpeg.unit_kerja.id AS unit_kerja_id,
          simpeg.unit_kerja.unit_kerja AS unit_kerja,
          simpeg.instansi.id AS instansi_id,
          simpeg.instansi.instansi AS opd
        FROM egov.users
        INNER JOIN simpeg.biodata ON egov.users.nama_nip = simpeg.biodata.nip
        LEFT JOIN simpeg.jabatan ON simpeg.biodata.jabatan = simpeg.jabatan._id
        LEFT JOIN simpeg.unit_kerja ON COALESCE(NULLIF(simpeg.biodata.unit_kerja, ''), egov.users.unit_kerja) = simpeg.unit_kerja.id
        LEFT JOIN simpeg.instansi ON simpeg.instansi.id = simpeg.unit_kerja.instansi
        WHERE ${whereStr}
        GROUP BY egov.users.id
        ORDER BY 
          CASE 
            WHEN simpeg.jabatan.jabatan LIKE "%BUPATI%" THEN 0
            WHEN simpeg.jabatan.jabatan LIKE "%SEKRETARIS DAERAH%" THEN 1
            WHEN simpeg.jabatan.esselon IS NULL OR simpeg.jabatan.esselon = "" OR simpeg.jabatan.esselon = "-" THEN 99
            ELSE CAST(simpeg.jabatan.esselon AS UNSIGNED)
          END ASC,
          CASE
            WHEN simpeg.jabatan.level IS NULL OR simpeg.jabatan.level = "" OR simpeg.jabatan.level = "null" THEN 99
            ELSE CAST(simpeg.jabatan.level AS UNSIGNED)
          END ASC,
          simpeg.instansi.instansi ASC,
          CASE 
            WHEN simpeg.biodata.gol IS NOT NULL AND simpeg.biodata.gol != "" THEN CAST(simpeg.biodata.gol AS UNSIGNED)
            ELSE 0
          END DESC,
          simpeg.biodata.nama ASC,
          egov.users.username ASC
        LIMIT ?, ?;
      `;

      const [dataRows] = await this.pool.query<any[]>(dataSql, [
        ...queryParams,
        offset,
        limit,
      ]);

      const data: EgovPegawaiProfile[] = (dataRows || []).map((r) => ({
        egovId: String(r.egov_id),
        username: r.egov_username,
        nip: r.nip,
        nama: r.nama,
        gelarDepan: r.gelar_depan,
        gelarBelakang: r.gelar_belakang,
        namaLengkap: this.formatNamaLengkap(r),
        jabatan: r.jabatan_nama || 'Pegawai',
        opd: r.opd || r.unit_kerja || 'Pemerintah Kabupaten Konawe Selatan',
        unitKerja: r.unit_kerja || '-',
        instansiId: r.instansi_id,
        unitKerjaId: r.unit_kerja_id,
      }));

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Error saat getDirectory E-Gov:', error.message);
      return { data: [], total: 0, totalPages: 0 };
    }
  }

  /**
   * Mengambil daftar Instansi / Unit Kerja dari SIMPEG (READ-ONLY)
   */
  async getInstansiList(): Promise<{ id: string; instansi: string }[]> {
    if (!this.pool || !this.isConnected) {
      return [];
    }
    try {
      const sql =
        'SELECT id, instansi FROM simpeg.instansi ORDER BY instansi ASC;';
      const [rows] = await this.pool.query<any[]>(sql);
      return (rows || []).map((r) => ({
        id: String(r.id),
        instansi: r.instansi,
      }));
    } catch (error) {
      this.logger.error('Error saat getInstansiList:', error.message);
      return [];
    }
  }

  /**
   * Mengambil daftar Sub Unit Kerja dari SIMPEG berdasarkan Instansi (READ-ONLY)
   */
  /**
   * Mengambil daftar NIP dari SIMPEG berdasarkan Instansi dan/atau Sub Unit Kerja (READ-ONLY)
   */
  async getNipsByInstansi(
    instansiId?: string,
    unitKerjaId?: string,
  ): Promise<string[]> {
    if (!this.pool || !this.isConnected) {
      return [];
    }
    try {
      const whereClauses: string[] = ['simpeg.biodata.nip IS NOT NULL'];
      const params: any[] = [];

      if (instansiId && instansiId !== 'all') {
        whereClauses.push('simpeg.instansi.id = ?');
        params.push(instansiId);
      }

      if (unitKerjaId && unitKerjaId !== 'all') {
        whereClauses.push('simpeg.unit_kerja.id = ?');
        params.push(unitKerjaId);
      }

      const sql = `
        SELECT DISTINCT simpeg.biodata.nip
        FROM simpeg.biodata
        LEFT JOIN simpeg.unit_kerja ON simpeg.biodata.unit_kerja = simpeg.unit_kerja.id
        LEFT JOIN simpeg.instansi ON simpeg.instansi.id = simpeg.unit_kerja.instansi
        WHERE ${whereClauses.join(' AND ')};
      `;

      const [rows] = await this.pool.query<any[]>(sql, params);
      return (rows || []).map((r) => String(r.nip));
    } catch (error) {
      this.logger.error('Error saat getNipsByInstansi:', error.message);
      return [];
    }
  }

  async getUnitKerjaList(
    instansiId?: string,
    namaInstansi?: string,
  ): Promise<{ id: string; unitKerja: string; instansiId: string }[]> {
    if (!this.pool || !this.isConnected) {
      return [];
    }
    try {
      let resolvedInstansiId = instansiId;

      if (instansiId && instansiId !== 'all') {
        // Cek apakah ada unit_kerja yang langsung cocok dengan ID ini
        const [direct] = await this.pool.query<any[]>(
          'SELECT id FROM simpeg.unit_kerja WHERE instansi = ? LIMIT 1',
          [instansiId],
        );

        if (!direct || direct.length === 0) {
          // Cari instansi di simpeg.instansi jika kode berupa alias (misal OPD-SETDA) atau namaInstansi
          const terms = [
            namaInstansi,
            instansiId.replace(/^OPD-/, ''),
            instansiId,
          ].filter(Boolean) as string[];

          for (const term of terms) {
            const [matched] = await this.pool.query<any[]>(
              'SELECT id, instansi FROM simpeg.instansi WHERE id = ? OR instansi LIKE ? LIMIT 1',
              [term, `%${term}%`],
            );
            if (matched && matched.length > 0) {
              resolvedInstansiId = String(matched[0].id);
              break;
            }
          }
        }
      }

      let sql = 'SELECT id, unit_kerja, instansi FROM simpeg.unit_kerja';
      const params: any[] = [];

      if (resolvedInstansiId && resolvedInstansiId !== 'all') {
        sql += ' WHERE instansi = ?';
        params.push(resolvedInstansiId);
      }
      sql += ' ORDER BY unit_kerja ASC;';

      const [rows] = await this.pool.query<any[]>(sql, params);
      return (rows || []).map((r) => ({
        id: String(r.id),
        unitKerja: r.unit_kerja,
        instansiId: String(r.instansi),
      }));
    } catch (error) {
      this.logger.error('Error saat getUnitKerjaList:', error.message);
      return [];
    }
  }

  /**
   * Muat dan perbarui Cache Instansi & Unit Kerja dari database SIMPEG
   */
  async loadCache(force = false) {
    if (!this.pool || !this.isConnected) return;
    const now = Date.now();
    if (
      !force &&
      this.instansiCache.size > 0 &&
      now - this.lastCacheTime < 30 * 60 * 1000
    ) {
      return;
    }

    try {
      // 1. Ambil seluruh Instansi (OPD) dari SIMPEG
      const [instansiRows] = await this.pool.query<any[]>(
        'SELECT id, instansi FROM simpeg.instansi ORDER BY instansi ASC;',
      );
      this.instansiCache.clear();
      for (const r of instansiRows || []) {
        const id = String(r.id);
        const namaOpd = (r.instansi || '').trim();
        this.instansiCache.set(id, {
          id,
          kodeOpd: id,
          namaOpd,
          singkatan: this.generateSingkatan(namaOpd),
        });
      }

      // 2. Ambil seluruh Unit Kerja (Sub Unit) dari SIMPEG
      const [unitKerjaRows] = await this.pool.query<any[]>(
        'SELECT id, unit_kerja, instansi FROM simpeg.unit_kerja ORDER BY unit_kerja ASC;',
      );
      this.unitKerjaCache.clear();
      for (const r of unitKerjaRows || []) {
        const id = String(r.id);
        const namaSubUnit = (r.unit_kerja || '').trim();
        const opdId = String(r.instansi || '').trim();
        this.unitKerjaCache.set(id, {
          id,
          kodeSubUnit: id,
          namaSubUnit,
          opdId,
        });
      }

      this.lastCacheTime = now;
      this.logger.log(
        `Cache SIMPEG berhasil dimuat: ${this.instansiCache.size} Instansi (OPD), ${this.unitKerjaCache.size} Unit Kerja (Sub Unit)`,
      );
    } catch (err: any) {
      this.logger.error(`Gagal memuat cache SIMPEG: ${err.message}`);
    }
  }

  private generateSingkatan(nama: string): string {
    if (!nama) return '';
    const upper = nama.toUpperCase();
    if (upper.includes('SEKRETARIAT DAERAH')) return 'SETDA';
    if (upper.includes('SEKRETARIAT DPRD')) return 'SETWAN';
    if (upper.includes('INSPEKTORAT')) return 'ITDA';
    if (upper.includes('BADAN PENGELOLAAN KEUANGAN') || upper.includes('BADAN KEUANGAN'))
      return 'BKAD';
    if (upper.includes('PERENCANAAN PEMBANGUNAN')) return 'BAPPEDA';
    if (upper.includes('PENDIDIKAN')) return 'DIKBUD';
    if (upper.includes('KESEHATAN')) return 'DINKES';
    if (upper.includes('PEKERJAAN UMUM')) return 'DPUPR';
    if (upper.includes('KOMUNIKASI')) return 'DISKOMINFO';
    if (upper.includes('PERHUBUNGAN')) return 'DISHUB';
    if (upper.includes('SOSIAL')) return 'DINSOS';
    if (upper.includes('PARIWISATA')) return 'DISPAR';
    if (upper.includes('LINGKUNGAN HIDUP')) return 'DLH';
    if (upper.includes('KEPENDUDUKAN')) return 'DUKCAPIL';
    return '';
  }

  getOpdById(id?: string | null): SimpegOpdInfo | null {
    if (!id) return null;
    const cleanId = String(id).trim();
    const found = this.instansiCache.get(cleanId);
    if (found) return found;
    for (const opd of this.instansiCache.values()) {
      if (
        opd.namaOpd.toLowerCase() === cleanId.toLowerCase() ||
        opd.kodeOpd === cleanId
      ) {
        return opd;
      }
    }
    return {
      id: cleanId,
      kodeOpd: cleanId,
      namaOpd: cleanId,
    };
  }

  getSubUnitById(id?: string | null): SimpegSubUnitInfo | null {
    if (!id) return null;
    const cleanId = String(id).trim();
    const found = this.unitKerjaCache.get(cleanId);
    if (found) return found;
    for (const su of this.unitKerjaCache.values()) {
      if (
        su.namaSubUnit.toLowerCase() === cleanId.toLowerCase() ||
        su.kodeSubUnit === cleanId
      ) {
        return su;
      }
    }
    return {
      id: cleanId,
      kodeSubUnit: cleanId,
      namaSubUnit: cleanId,
      opdId: '',
    };
  }

  async getOpdOptions(): Promise<SimpegOpdInfo[]> {
    await this.loadCache();
    return Array.from(this.instansiCache.values()).sort((a, b) =>
      a.namaOpd.localeCompare(b.namaOpd),
    );
  }

  async getSubUnitOptions(opdId?: string): Promise<SimpegSubUnitInfo[]> {
    await this.loadCache();
    const all = Array.from(this.unitKerjaCache.values());
    if (!opdId || opdId === 'ALL' || opdId === 'all') {
      return all.sort((a, b) => a.namaSubUnit.localeCompare(b.namaSubUnit));
    }
    const cleanOpdId = String(opdId).trim();
    return all
      .filter((su) => su.opdId === cleanOpdId)
      .sort((a, b) => a.namaSubUnit.localeCompare(b.namaSubUnit));
  }
}
