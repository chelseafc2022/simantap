import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

export interface RupSourcePaketRow {
  kodeRup: string;
  namaPaket: string;
  kodeSatker: string | null;
  namaSatker: string;
  metode: string | null;
  caraPengadaan: string | null;
  jenisPengadaan: string | null;
  pagu: string | number | null;
  sumberDana: string | null;
  tahun: string;
  pdn: string | null;
  status: string | null;
}

export interface RupSourceSatkerRow {
  kode: string;
  nama: string;
}

@Injectable()
export class RupSourceService implements OnModuleDestroy {
  private readonly logger = new Logger(RupSourceService.name);
  private pool: mysql.Pool | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  private get databaseName(): string {
    const database =
      this.configService.get<string>('KONSEL_SETARA_MYSQL_DATABASE') ||
      'konsel_setara';

    if (!/^[a-zA-Z0-9_]+$/.test(database)) {
      throw new Error('Nama database sumber RUP tidak valid');
    }

    return database;
  }

  private getPool(): mysql.Pool {
    if (this.pool) return this.pool;

    const host =
      this.configService.get<string>('KONSEL_SETARA_MYSQL_HOST') ||
      this.configService.get<string>('egov.host');
    const user =
      this.configService.get<string>('KONSEL_SETARA_MYSQL_USER') ||
      this.configService.get<string>('egov.user');
    const password =
      this.configService.get<string>('KONSEL_SETARA_MYSQL_PASSWORD') ||
      this.configService.get<string>('egov.password');
    const port =
      this.configService.get<number>('KONSEL_SETARA_MYSQL_PORT') ||
      this.configService.get<number>('egov.port', 3306);

    if (!host || !user || !password) {
      throw new Error(
        'Kredensial read-only database Konsel Setara belum dikonfigurasi',
      );
    }

    this.pool = mysql.createPool({
      host,
      user,
      password,
      port,
      database: this.databaseName,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    return this.pool;
  }

  /**
   * Semua pembacaan sumber RUP dijalankan di dalam transaksi READ ONLY.
   * Pemeriksaan SQL ini menjadi pagar tambahan agar service tidak dapat dipakai
   * untuk mengubah database eksternal Konsel Setara.
   */
  private async select<T extends mysql.RowDataPacket[]>(
    sql: string,
    params: Array<string | number> = [],
  ): Promise<T> {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (!/^SELECT\b/i.test(normalized) || /;\s*\S/.test(normalized)) {
      throw new Error('RupSourceService hanya mengizinkan perintah SELECT');
    }

    const connection = await this.getPool().getConnection();
    try {
      await connection.query('SET TRANSACTION READ ONLY');
      await connection.beginTransaction();
      const [rows] = await connection.execute<T>(sql, params);
      await connection.commit();
      return rows;
    } catch (error: any) {
      try {
        await connection.rollback();
      } catch {}
      this.logger.warn(`Pembacaan sumber RUP gagal: ${error.message}`);
      throw error;
    } finally {
      connection.release();
    }
  }

  private paketSelect(): string {
    const database = this.databaseName;
    return `
      SELECT
        p.kode_rup AS kodeRup,
        p.nama_paket AS namaPaket,
        p.kode_satker AS kodeSatker,
        s.nama AS namaSatker,
        p.metode AS metode,
        p.cara_pengadaan AS caraPengadaan,
        p.jenis AS jenisPengadaan,
        p.pagu AS pagu,
        p.sumber_dana AS sumberDana,
        p.tahun AS tahun,
        p.pdn AS pdn,
        p.status AS status
      FROM \`${database}\`.rup_paket p
      INNER JOIN \`${database}\`.rup_satker s ON s.kode = p.kode_satker
    `;
  }

  async getSummary(tahun: string) {
    const database = this.databaseName;
    const rows = await this.select<
      Array<
        mysql.RowDataPacket & {
          totalRup: number;
          totalPagu: string | number | null;
        }
      >
    >(
      `SELECT COUNT(*) AS totalRup, COALESCE(SUM(pagu), 0) AS totalPagu
       FROM \`${database}\`.rup_paket
       WHERE tahun = ? AND status = 'Aktif'`,
      [tahun],
    );

    return {
      totalRup: Number(rows[0]?.totalRup || 0),
      totalPagu: Number(rows[0]?.totalPagu || 0),
    };
  }

  async searchPaket(params: {
    tahun: string;
    query?: string;
    satker?: string;
    page: number;
    limit: number;
  }) {
    const where = ["p.tahun = ?", "p.status = 'Aktif'"];
    const values: Array<string | number> = [params.tahun];
    const query = (params.query || '').trim();
    const satker = (params.satker || '').trim();

    if (query) {
      if (/^\d+$/.test(query)) {
        where.push('(p.kode_rup = ? OR p.nama_paket LIKE ?)');
        values.push(query, `%${query}%`);
      } else {
        where.push('(p.nama_paket LIKE ? OR p.kode_rup LIKE ?)');
        values.push(`%${query}%`, `%${query}%`);
      }
    }

    if (satker && satker !== 'ALL' && satker !== 'Semua OPD') {
      where.push('(p.kode_satker = ? OR s.nama = ?)');
      values.push(satker, satker);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const database = this.databaseName;
    const countRows = await this.select<
      Array<mysql.RowDataPacket & { total: number }>
    >(
      `SELECT COUNT(*) AS total
       FROM \`${database}\`.rup_paket p
       INNER JOIN \`${database}\`.rup_satker s ON s.kode = p.kode_satker
       ${whereSql}`,
      values,
    );

    const offset = (params.page - 1) * params.limit;
    const rows = await this.select<
      Array<mysql.RowDataPacket & RupSourcePaketRow>
    >(
      `${this.paketSelect()}
       ${whereSql}
       ORDER BY p.kode_rup ASC
       LIMIT ? OFFSET ?`,
      [...values, params.limit, offset],
    );

    return {
      total: Number(countRows[0]?.total || 0),
      rows,
    };
  }

  async getPaketByKodeRup(kodeRup: string, tahun?: string) {
    const where = ['p.kode_rup = ?', "p.status = 'Aktif'"];
    const values: Array<string | number> = [kodeRup];
    if (tahun) {
      where.push('p.tahun = ?');
      values.push(tahun);
    }

    const rows = await this.select<
      Array<mysql.RowDataPacket & RupSourcePaketRow>
    >(
      `${this.paketSelect()}
       WHERE ${where.join(' AND ')}
       LIMIT 1`,
      values,
    );

    return rows[0] || null;
  }

  async getSatkerOptions(): Promise<RupSourceSatkerRow[]> {
    const database = this.databaseName;
    const rows = await this.select<
      Array<mysql.RowDataPacket & RupSourceSatkerRow>
    >(
      `SELECT kode, nama
       FROM \`${database}\`.rup_satker
       ORDER BY nama ASC, kode ASC`,
    );
    return rows;
  }
}
