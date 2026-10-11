import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { PrismaService } from '../../core/database/prisma.service';
import { EgovService } from '../../core/egov/egov.service';
import { RedisService } from '../../core/redis/redis.service';

export interface SirupPaketItem {
  kodeRup: string;
  namaPaket: string;
  satker: string;
  metode: string;
  pagu: number;
  sumberDana: string;
  tahun: string;
  jenisPengadaan: string;
  caraPengadaan: string;
  pdn: string;
  lokasi?: string;
  isPembangunan?: boolean;
}

export const SIRUP_SATKER_MAP: Record<string, string> = {
  'BAGIAN PENGADAAN BARANG DAN JASA': '4.01.0.00.0.00.01.0005',
  'BADAN PENDAPATAN DAERAH': '5.02.0.00.0.00.02.0000',
  'DINAS PEMADAM KEBAKARAN DAN PENYELAMATAN': '1.05.0.00.0.00.02.0000',
  'BAGIAN UMUM': '4.01.0.00.0.00.01.0010',
  'DINAS KETAHANAN PANGAN': '2.09.0.00.0.00.01.0000',
  'DINAS TANAMAN PANGAN, HORTIKULTURA DAN PERKEBUNAN': '3.27.0.00.0.00.01.0000',
  'DINAS PARIWISATA': '3.26.0.00.0.00.01.0000',
  'DINAS KOMUNIKASI, INFORMATIKA DAN PERSANDIAN': '2.16.2.21.2.20.01.0000',
  'KECAMATAN KONDA': '7.01.0.00.0.00.06.0000',
  'BAGIAN KESEJAHTERAAN RAKYAT': '4.01.0.00.0.00.01.0002',
  'DINAS PENDIDIKAN DAN KEBUDAYAAN': '1.01.2.22.0.00.01.0000',
  'DINAS PERINDUSTRIAN DAN PERDAGANGAN': '3.31.3.30.0.00.01.0000',
  'KECAMATAN TINANGGEA': '7.01.0.00.0.00.04.0000',
  'KECAMATAN RANOMEETO': '7.01.0.00.0.00.05.0000',
  'BADAN PENANGGULANGAN BENCANA DAERAH': '1.06.1.05.0.00.02.0000',
  'KELURAHAN TINANGGEA': '7.01.0.00.0.00.04.0002',
  'BADAN RISET DAN INOVASI DAERAH': '5.05.0.00.0.00.01.0000',
  'DINAS PERIKANAN': '3.25.0.00.0.00.01.0000',
  'DINAS PETERNAKAN DAN KESEHATAN HEWAN': '3.27.0.00.0.00.02.0000',
  'DINAS PENANAMAN MODAL DAN PELAYANAN TERPADU SATU PINTU': '2.18.0.00.0.00.01.0000',
  'KECAMATAN ANDOOLO BARAT': '7.01.0.00.0.00.23.0000',
  'DINAS PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK': '2.08.0.00.0.00.01.0000',
  'DINAS PENGENDALIAN PENDUDUK DAN KELUARGA BERENCANA': '2.14.0.00.0.00.01.0000',
  'PUSKESMAS BAITO': '1.02.0.00.0.00.01.0026',
  'KELURAHAN PUNGGALUKU': '7.01.0.00.0.00.20.0002',
  'PUSKESMAS WOLASI': '1.02.0.00.0.00.01.0008',
  'INSPEKTORAT DAERAH': '6.01.0.00.0.00.01.0000',
  'PUSKESMAS KOLONO': '1.02.0.00.0.00.01.0015',
  'KECAMATAN MOWILA': '7.01.0.00.0.00.13.0000',
  'BAGIAN ORGANISASI': '4.01.0.00.0.00.01.0006',
  'PUSKESMAS TINANGGEA': '1.02.0.00.0.00.01.0010',
  'KECAMATAN BENUA': '7.01.0.00.0.00.15.0000',
  'PUSKESMAS BENUA': '1.02.0.00.0.00.01.0022',
  'KECAMATAN KOLONO TIMUR': '7.01.0.00.0.00.24.0000',
  'KECAMATAN BASALA': '7.01.0.00.0.00.17.0000',
  'DINAS PEKERJAAN UMUM DAN TATA RUANG': '1.03.0.00.0.00.01.0000',
  'DINAS SOSIAL': '1.06.0.00.0.00.01.0000',
  'DINAS KESEHATAN': '1.02.0.00.0.00.01.0000',
  'BADAN KESATUAN BANGSA DAN POLITIK': '8.01.0.00.0.00.01.0000',
  'DINAS PEMBERDAYAAN MASYARAKAT DAN DESA': '2.13.0.00.0.00.01.0000',
  'BADAN PERENCANAAN PEMBANGUNAN DAERAH': '5.01.0.00.0.00.01.0000',
  'KECAMATAN BUKE': '7.01.0.00.0.00.14.0000',
  'PUSKESMAS ANDOOLO UTAMA': '1.02.0.00.0.00.01.0012',
  'KECAMATAN PALANGGA': '7.01.0.00.0.00.01.0000',
  'PUSKESMAS SABULAKOA': '1.02.0.00.0.00.01.0005',
  'KECAMATAN LAINEA': '7.01.0.00.0.00.03.0000',
  'BADAN KEPEGAWAIAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA': '5.03.5.04.0.00.01.0000',
  'PUSKESMAS ATARI JAYA': '1.02.0.00.0.00.01.0011',
  'PUSKESMAS ANDOOLO': '1.02.0.00.0.00.01.0017',
  'KECAMATAN WOLASI': '7.01.0.00.0.00.22.0000',
  'KELURAHAN AMBALODANGGE': '7.01.0.00.0.00.20.0001',
};

@Injectable()
export class SirupService {
  private readonly logger = new Logger(SirupService.name);
  private readonly inaprocHost = 'data.inaproc.id';
  private readonly instansiKonsel: string;
  private readonly jenisKlpd: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly egovService: EgovService,
  ) {
    this.instansiKonsel =
      this.configService.get<string>('INAPROC_INSTANSI') || 'D438';
    this.jenisKlpd =
      this.configService.get<string>('INAPROC_JENIS_KLPD') || '4';
  }

  /**
   * Request data langsung ke internal API Next.js data.inaproc.id
   */
  private fetchInaproc(endpoint: string, queryParams: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const now = Date.now().toString();
      const secret = Buffer.from(now.split('').reverse().join('')).toString('base64');
      const qs = new URLSearchParams(queryParams).toString();

      const options: https.RequestOptions = {
        hostname: this.inaprocHost,
        path: `/dashboard-api/rup/${endpoint}?${qs}`,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'x-request-time': now,
          'x-secret': secret,
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://data.inaproc.id/rup',
        },
        timeout: 12000,
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch (err: any) {
            resolve({
              status: res.statusCode,
              error: err.message,
              raw: body.substring(0, 200),
            });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Koneksi timeout ke server data.inaproc.id'));
      });
      req.end();
    });
  }

  /**
   * Cari kode rekening satker SiRUP berdasarkan nama OPD/Satker
   */
  resolveSatkerCode(namaOpdOrSatker?: string): string | null {
    if (!namaOpdOrSatker) return null;
    const clean = namaOpdOrSatker.trim().toUpperCase();

    // 1. Cek kecocokan langsung
    if (SIRUP_SATKER_MAP[clean]) {
      return SIRUP_SATKER_MAP[clean];
    }

    // 2. Fuzzy substring match
    for (const [key, code] of Object.entries(SIRUP_SATKER_MAP)) {
      if (clean.includes(key) || key.includes(clean)) {
        return code;
      }
    }

    // 3. Keyword matching (misal KOMUNIKASI, PARIWISATA, KESEHATAN, dll)
    const keywords = clean.split(/\s+/).filter((w) => w.length > 4);
    for (const kw of keywords) {
      for (const [key, code] of Object.entries(SIRUP_SATKER_MAP)) {
        if (key.includes(kw)) {
          return code;
        }
      }
    }

    return null;
  }

  /**
   * Klasifikasi apakah paket termasuk paket pembangunan / monev
   */
  private isPaketPembangunan(item: {
    nama_paket?: string;
    jenis_pengadaan?: string;
    total_nilai?: number;
  }): boolean {
    const jenis = (item.jenis_pengadaan || '').toLowerCase();
    const nama = (item.nama_paket || '').toLowerCase();

    // 1. Pekerjaan Konstruksi dan Jasa Konsultansi (Desain/Pengawasan) selalu masuk
    if (jenis.includes('konstruksi') || jenis.includes('konsultansi')) {
      return true;
    }

    // 2. Daftar kata kunci operasional rutin yang diabaikan untuk barang
    const kataKunciOperasional = [
      'kertas',
      'cover',
      'tagihan listrik',
      'rekening listrik',
      'tagihan air',
      'makanan dan minuman',
      'konsumsi rapat',
      'surat menyurat',
      'bahan bakar',
      'pelumas',
      'atk',
      'spanduk',
      'baliho',
      'bahan cetak',
      'logistik kantor',
      'alat listrik',
      'dpa-skpd',
      'rka-skpd',
    ];

    if (kataKunciOperasional.some((k) => nama.includes(k))) {
      return false;
    }

    // 3. Belanja Barang modal/strategis (Peralatan, Perlengkapan, Obat, Mesin, Mebel, dll)
    if (jenis.includes('barang')) {
      const kataKunciModal = [
        'peralatan',
        'perlengkapan',
        'obat',
        'bmhp',
        'mebel',
        'kendaraan',
        'komputer',
        'mesin',
        'alat kesehatan',
      ];
      if (kataKunciModal.some((k) => nama.includes(k))) {
        return true;
      }
      // Jika pagu di atas 20 juta dan bukan operasional rutin
      if ((item.total_nilai || 0) >= 20000000) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalisasi metode pengadaan ke enum MONALISA
   */
  private normalizeMetode(metodeRaw?: string): string {
    const m = (metodeRaw || '').toLowerCase();
    if (m.includes('tender cepat')) return 'Tender Cepat';
    if (m.includes('tender')) return 'Tender';
    if (m.includes('seleksi')) return 'Seleksi';
    if (m.includes('purchasing')) return 'E-Purchasing';
    if (m.includes('langsung') && !m.includes('penunjukan'))
      return 'Pengadaan Langsung';
    if (m.includes('penunjukan')) return 'Penunjukan Langsung';
    if (m.includes('swakelola')) return 'Swakelola Tipe I';
    return 'Pengadaan Langsung';
  }

  /**
   * Normalisasi jenis pengadaan ke enum MONALISA
   */
  private normalizeJenis(jenisRaw?: string): string {
    const j = (jenisRaw || '').toLowerCase();
    if (j.includes('konstruksi')) return 'Pekerjaan Konstruksi';
    if (j.includes('konsultansi')) return 'Jasa Konsultansi';
    if (j.includes('barang')) return 'Pengadaan Barang';
    if (j.includes('lainnya')) return 'Jasa Lainnya';
    return 'Pekerjaan Konstruksi';
  }

  /**
   * SiRUP mengirim sumber dana induk (mis. APBD), sedangkan rincian dana
   * sering hanya ditulis pada nama paket (DAK Non Fisik, DAK Fisik, DAU, dll).
   */
  private normalizeSumberDana(
    sumberDanaRaw?: string,
    namaPaket?: string,
  ): string {
    const nama = (namaPaket || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    if (/\bdak\s+non\s*fisik\b/.test(nama)) return 'DAK Non Fisik';
    if (/\bdak\s+fisik\b/.test(nama)) return 'DAK Fisik';
    if (/\bdau\b/.test(nama)) return 'DAU (Dana Alokasi Umum)';
    if (/\bdbh\b/.test(nama)) return 'DBH (Dana Bagi Hasil)';
    if (/\bblud\b/.test(nama)) return 'BLUD';
    if (/\bpad\b/.test(nama)) return 'PAD (Pendapatan Asli Daerah)';

    const sumberDana = (sumberDanaRaw || '').trim();
    return sumberDana || 'APBD';
  }

  /**
   * Cocokkan teks Satker SiRUP ke instansi & unit_kerja SIMPEG
   */
  private async matchSatkerToSimpeg(satkerStr: string) {
    const raw = (satkerStr || '').split(' - ')[0].trim();
    const rawLower = raw.toLowerCase();

    const opdOptions = await this.egovService.getOpdOptions();
    const subUnitOptions = await this.egovService.getSubUnitOptions('ALL');

    // 1. Cek kecocokan langsung ke instansi
    let matchedOpd = opdOptions.find(
      (o) => o.namaOpd.toLowerCase() === rawLower,
    );

    let matchedSubUnit: any = null;
    if (!matchedOpd) {
      // 2. Cek apakah satker adalah sub-unit (seperti PUSKESMAS atau BAGIAN)
      matchedSubUnit = subUnitOptions.find((u) => {
        const uLower = u.namaSubUnit.toLowerCase();
        return (
          uLower === rawLower ||
          uLower.includes(rawLower) ||
          rawLower.includes(uLower)
        );
      });
      if (matchedSubUnit && matchedSubUnit.opdId) {
        matchedOpd = opdOptions.find((o) => o.id === matchedSubUnit.opdId);
      }
    } else {
      // Cari sub unit yang sesuai dengan nama instansi (unit induk)
      matchedSubUnit = subUnitOptions.find(
        (u) =>
          u.opdId === matchedOpd!.id &&
          u.namaSubUnit.toLowerCase() === matchedOpd!.namaOpd.toLowerCase(),
      );
    }

    return {
      opdId: matchedOpd ? matchedOpd.id : null,
      subUnitId: matchedSubUnit ? matchedSubUnit.id : null,
    };
  }

  /**
   * Ambil ringkasan total pagu & paket RUP Konawe Selatan
   */
  async getSummary(tahun?: string) {
    const targetTahun = tahun || new Date().getFullYear().toString();
    const cacheKey = `sirup:summary:${targetTahun}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return { source: 'cache', ...cached };
    }

    try {
      const result = await this.fetchInaproc('summary', {
        tahun: targetTahun,
        jenis_klpd: this.jenisKlpd,
        instansi: this.instansiKonsel,
      });

      if (result.status === 200 && result.data?.summary) {
        const payload = {
          tahun: targetTahun,
          totalRup: result.data.summary.jumlah_rup || 0,
          totalPagu: result.data.summary.total_pagu || 0,
        };
        await this.redisService.set(cacheKey, payload, 1800);
        return { source: 'inaproc-live', ...payload };
      }

      return {
        tahun: targetTahun,
        totalRup: 0,
        totalPagu: 0,
        error: 'Gagal mengambil ringkasan dari LKPP',
      };
    } catch (err: any) {
      this.logger.warn(`Gagal getSummary SiRUP: ${err.message}`);
      return {
        tahun: targetTahun,
        totalRup: 0,
        totalPagu: 0,
        error: err.message,
      };
    }
  }

  /**
   * Pencarian paket RUP
   */
  async searchPaket(params: {
    q?: string;
    tahun?: string;
    satker?: string;
    page?: number;
    limit?: number;
  }) {
    const tahun = params.tahun || new Date().getFullYear().toString();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const query = (params.q || '').trim();
    const satker = (params.satker || '').trim();

    const cacheKey = `sirup:search:v3:${tahun}:${page}:${limit}:${query}:${satker}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return { source: 'cache', ...cached };
    }

    const queryParams: Record<string, string> = {
      tahun,
      jenis_klpd: this.jenisKlpd,
      instansi: this.instansiKonsel,
      page: String(page),
      limit: String(limit),
    };

    const isNumeric = /^\d+$/.test(query);
    if (query) {
      if (isNumeric) {
        queryParams.search_rup = query;
      } else {
        queryParams.search_paket = query;
      }
    }

    if (satker && satker !== 'Semua OPD' && satker !== 'ALL') {
      const resolvedCode = this.resolveSatkerCode(satker);
      queryParams.satker = resolvedCode || satker;
    }

    try {
      let result = await this.fetchInaproc('table', queryParams);

      if (
        isNumeric &&
        query &&
        (!result.data?.tableRows || result.data.tableRows.length === 0)
      ) {
        const fallbackParams = { ...queryParams };
        delete fallbackParams.search_rup;
        fallbackParams.search_paket = query;
        try {
          const fallback = await this.fetchInaproc('table', fallbackParams);
          if (fallback.status === 200 && fallback.data?.tableRows?.length > 0) {
            result = fallback;
          }
        } catch {
          // ignore
        }
      }

      if (
        result.status === 200 &&
        result.data &&
        Array.isArray(result.data.tableRows)
      ) {
        const rows = result.data.tableRows;
        const total = result.data.tableTotalRows || rows.length;

        const data: SirupPaketItem[] = rows.map((item: any) => ({
          kodeRup: String(item.kode_rup || ''),
          namaPaket: item.nama_paket || '',
          satker: item.nama_satker || item.nama_instansi || '',
          metode: this.normalizeMetode(
            item.metode_pengadaan || item.cara_pengadaan_label,
          ),
          pagu: parseFloat(item.total_nilai || 0),
          sumberDana: this.normalizeSumberDana(
            item.sumber_dana,
            item.nama_paket,
          ),
          tahun: String(item.tahun_anggaran || tahun),
          jenisPengadaan: this.normalizeJenis(item.jenis_pengadaan),
          caraPengadaan: item.cara_pengadaan || '',
          pdn: item.produk_dalam_negeri || 'Ya',
          lokasi: item.lokasi || '',
          isPembangunan: this.isPaketPembangunan(item),
        }));

        const responsePayload = {
          tahun,
          page,
          limit,
          total,
          data,
        };

        await this.redisService.set(cacheKey, responsePayload, 900);
        return { source: 'inaproc-live', ...responsePayload };
      }

      return {
        source: 'inaproc-live',
        tahun,
        page,
        limit,
        total: 0,
        data: [],
      };
    } catch (err: any) {
      this.logger.warn(`Gagal searchPaket SiRUP: ${err.message}`);
      return {
        source: 'error',
        tahun,
        page,
        limit,
        total: 0,
        data: [],
        error: err.message,
      };
    }
  }

  /**
   * Mengambil semua paket (dengan paginasi otomatis) untuk satker tertentu atau seluruh kabupaten
   */
  async fetchAllPaketFromInaproc(params: {
    tahun: string;
    satkerCode?: string;
    maxPages?: number;
  }): Promise<SirupPaketItem[]> {
    const allItems: SirupPaketItem[] = [];
    const maxPages = params.maxPages || 35; // cukup untuk 3.500 baris

    for (let page = 1; page <= maxPages; page++) {
      const searchRes = await this.searchPaket({
        tahun: params.tahun,
        satker: params.satkerCode,
        page,
        limit: 100,
      });

      const rows = searchRes.data || [];
      if (rows.length === 0) break;

      allItems.push(...rows);

      if (rows.length < 100 || allItems.length >= searchRes.total) {
        break;
      }
    }

    return allItems;
  }

  /**
   * Mengambil 1 paket spesifik berdasarkan kode RUP
   */
  async getPaketByKodeRup(kodeRup: string, tahun?: string) {
    const cleanKode = kodeRup.trim();
    if (!cleanKode) return null;

    const currentYear = new Date().getFullYear();
    const tahunTarget = tahun || String(currentYear);
    const cacheKey = `sirup:paket:v3:${cleanKode}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return { source: 'cache', data: cached };
    }

    const yearsToTry = [tahunTarget];
    if (parseInt(tahunTarget, 10) === currentYear) {
      yearsToTry.push(String(currentYear - 1));
    }

    for (const yr of yearsToTry) {
      try {
        const searchResult = await this.searchPaket({
          q: cleanKode,
          tahun: yr,
          limit: 10,
        });

        if (searchResult.data && searchResult.data.length > 0) {
          const match =
            searchResult.data.find(
              (p: SirupPaketItem) => p.kodeRup === cleanKode,
            ) || searchResult.data[0];

          if (match) {
            await this.redisService.set(cacheKey, match, 3600);
            return { source: 'inaproc-live', data: match };
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Gagal mencari kode RUP ${cleanKode} di tahun ${yr}: ${err.message}`,
        );
      }
    }

    return { source: 'not-found', data: null };
  }

  /**
   * Menentukan OPD & Sub Unit berdasarkan input ID (bisa subUnitId, opdId, atau satkerCode)
   */
  async resolveTargetUnit(idOrCode?: string | null) {
    if (!idOrCode || idOrCode === 'ALL') {
      return {
        isAll: true,
        opdId: 'ALL',
        subUnitId: null,
        nama: 'SEMUA OPD SE-KABUPATEN KONAWE SELATAN',
        parentOpdNama: undefined as string | undefined,
      };
    }

    const clean = String(idOrCode).trim();

    // 1. Cek apakah ini Sub Unit SIMPEG (simpeg.unit_kerja)
    const subUnit = this.egovService.getSubUnitById(clean);
    if (subUnit && subUnit.opdId) {
      const parentOpd = this.egovService.getOpdById(subUnit.opdId);
      return {
        isAll: false,
        opdId: subUnit.opdId,
        subUnitId: subUnit.id,
        nama: subUnit.namaSubUnit,
        parentOpdNama: parentOpd?.namaOpd,
      };
    }

    // 2. Cek apakah ini kode satker SiRUP (misal 4.01.0.00.0.00.01.0005)
    for (const [namaSatker, code] of Object.entries(SIRUP_SATKER_MAP)) {
      if (code === clean) {
        const subUnits = await this.egovService.getSubUnitOptions('ALL');
        const matchedSu = subUnits.find(
          (s) =>
            s.namaSubUnit.toUpperCase() === namaSatker.toUpperCase() ||
            s.namaSubUnit.toUpperCase().includes(namaSatker.toUpperCase()),
        );
        const parentOpd = matchedSu?.opdId
          ? this.egovService.getOpdById(matchedSu.opdId)
          : null;
        return {
          isAll: false,
          opdId: matchedSu?.opdId || '',
          subUnitId: matchedSu?.id || null,
          nama: namaSatker,
          parentOpdNama: parentOpd?.namaOpd,
        };
      }
    }

    // 3. Cek apakah ini OPD SIMPEG (simpeg.instansi)
    const opd = this.egovService.getOpdById(clean);
    if (opd) {
      return {
        isAll: false,
        opdId: opd.id,
        subUnitId: null,
        nama: opd.namaOpd,
        parentOpdNama: undefined,
      };
    }

    return {
      isAll: false,
      opdId: clean,
      subUnitId: null,
      nama: clean,
      parentOpdNama: undefined,
    };
  }

  /**
   * Daftar Sub Unit / Satker SiRUP Konawe Selatan (51 Satker resmi)
   */
  async getSatkerOptions() {
    const subUnits = await this.egovService.getSubUnitOptions('ALL');
    const result: Array<{
      id: string; // subUnitId SIMPEG jika cocok, atau satkerCode
      subUnitId: string | null;
      nama: string;
      satkerCode: string;
      opdId: string;
      parentOpdNama?: string;
    }> = [];

    for (const [satkerName, satkerCode] of Object.entries(SIRUP_SATKER_MAP)) {
      const matched = subUnits.find(
        (su) =>
          su.namaSubUnit.toUpperCase() === satkerName.toUpperCase() ||
          su.namaSubUnit.toUpperCase().includes(satkerName.toUpperCase()) ||
          satkerName.toUpperCase().includes(su.namaSubUnit.toUpperCase()),
      );

      const parentOpd = matched?.opdId
        ? this.egovService.getOpdById(matched.opdId)
        : null;

      result.push({
        id: matched ? matched.id : satkerCode,
        subUnitId: matched?.id || null,
        nama: satkerName,
        satkerCode,
        opdId: matched?.opdId || '',
        parentOpdNama: parentOpd?.namaOpd,
      });
    }

    return result.sort((a, b) => a.nama.localeCompare(b.nama));
  }

  /**
   * Ambil pratinjau daftar paket SiRUP untuk OPD tertentu atau SELURUH KABUPATEN
   */
  async getPreviewPaketOpd(params: { tahun: number; opdId: string }) {
    const tahunStr = String(params.tahun);

    // KASUS 1: Seluruh OPD se-Kabupaten Konawe Selatan (Pengecualian Administrator)
    if (params.opdId === 'ALL') {
      const summary = await this.getSummary(tahunStr);
      const sample = await this.searchPaket({
        tahun: tahunStr,
        page: 1,
        limit: 100,
      });

      const totalPaket = summary.totalRup || sample.total || 0;
      const sampleRows = sample.data || [];
      const samplePembangunan = sampleRows.filter(
        (p: SirupPaketItem) => p.isPembangunan,
      ).length;
      const pembangunanRatio =
        sampleRows.length > 0 ? samplePembangunan / sampleRows.length : 0.45;
      const estimatedPembangunan = Math.round(
        totalPaket * (pembangunanRatio > 0 ? pembangunanRatio : 0.45),
      );

      return {
        tahun: params.tahun,
        opdId: 'ALL',
        namaOpd: 'SEMUA OPD SE-KABUPATEN KONAWE SELATAN',
        satkerCode: 'ALL',
        total: totalPaket,
        pembangunanCount: estimatedPembangunan,
        packages: sampleRows,
      };
    }

    // KASUS 2: Sub Unit / OPD Spesifik
    const target = await this.resolveTargetUnit(params.opdId);
    const satkerCode = this.resolveSatkerCode(target.nama);
    let packages: SirupPaketItem[] = [];

    if (satkerCode) {
      packages = await this.fetchAllPaketFromInaproc({
        tahun: tahunStr,
        satkerCode,
        maxPages: 5,
      });
    } else {
      const searchRes = await this.searchPaket({
        tahun: tahunStr,
        satker: target.nama,
        page: 1,
        limit: 100,
      });
      packages = searchRes.data || [];
    }

    return {
      tahun: params.tahun,
      opdId: target.opdId,
      subUnitId: target.subUnitId,
      namaOpd: target.nama,
      parentOpdNama: target.parentOpdNama,
      satkerCode: satkerCode || '-',
      total: packages.length,
      pembangunanCount: packages.filter(
        (p: SirupPaketItem) => p.isPembangunan,
      ).length,
      packages,
    };
  }

  /**
   * SINKRONISASI MASAL (Bulk Upsert) Paket SiRUP ke Database MONALISA
   */
  async syncPaketByOpd(options: {
    tahun: number;
    opdId: string;
    userId?: string;
    onlyPembangunan?: boolean;
    kodeRupList?: string[];
  }) {
    const tahunStr = String(options.tahun);
    const isAll = options.opdId === 'ALL';

    let targetNamaOpd = 'SEMUA OPD SE-KABUPATEN KONAWE SELATAN';
    let satkerCode: string | null = null;
    let resolvedOpdId: string | null = null;
    let resolvedSubUnitId: string | null = null;

    if (!isAll) {
      const target = await this.resolveTargetUnit(options.opdId);
      targetNamaOpd = target.nama;
      satkerCode = this.resolveSatkerCode(target.nama);
      resolvedOpdId = target.opdId;
      resolvedSubUnitId = target.subUnitId;
    }

    // 1. Ambil seluruh paket dari SiRUP
    let allRawPackages: SirupPaketItem[] = [];

    if (options.kodeRupList && options.kodeRupList.length > 0) {
      for (const kode of options.kodeRupList) {
        const item = await this.getPaketByKodeRup(kode, tahunStr);
        if (item?.data) {
          allRawPackages.push(item.data);
        }
      }
    } else if (isAll) {
      // Administrator: Tarik seluruh paket se-kabupaten (loop paginasi hingga selesai)
      allRawPackages = await this.fetchAllPaketFromInaproc({
        tahun: tahunStr,
        maxPages: 35,
      });
    } else {
      if (satkerCode) {
        allRawPackages = await this.fetchAllPaketFromInaproc({
          tahun: tahunStr,
          satkerCode,
          maxPages: 5,
        });
      } else {
        const searchRes = await this.searchPaket({
          tahun: tahunStr,
          satker: targetNamaOpd,
          page: 1,
          limit: 100,
        });
        allRawPackages = searchRes.data || [];
      }
    }

    // 2. Filter hanya paket yang relevan jika onlyPembangunan aktif
    const candidatePackages =
      options.onlyPembangunan !== false
        ? allRawPackages.filter((p) => p.isPembangunan !== false)
        : allRawPackages;

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of candidatePackages) {
      const match = await this.matchSatkerToSimpeg(item.satker);
      const targetOpdId =
        match.opdId || resolvedOpdId || (isAll ? null : options.opdId);
      const targetSubUnitId = match.subUnitId || resolvedSubUnitId || null;

      if (!targetOpdId) {
        // Jika mode ALL dan satker tidak terpetakan ke instansi SIMPEG apapun, lewati
        continue;
      }

      const normalizedMetode = this.normalizeMetode(item.metode);
      const normalizedJenis = this.normalizeJenis(item.jenisPengadaan);
      const paguDecimal = item.pagu || 0;

      // Cek apakah paket sudah ada di PostgreSQL
      const existing = await this.prisma.paketPembangunan.findFirst({
        where: {
          tahunAnggaran: options.tahun,
          kodeRupKontrak: item.kodeRup,
        },
      });

      if (existing) {
        // Update data jika sudah ada (pertahankan nomor kontrak & realisasi yang sudah diinput)
        await this.prisma.paketPembangunan.update({
          where: { id: existing.id },
          data: {
            namaPaket: item.namaPaket,
            nilaiPagu: paguDecimal,
            metodePemilihan: normalizedMetode,
            jenisPengadaan: normalizedJenis,
            sumberDana: this.normalizeSumberDana(item.sumberDana),
            opdId: targetOpdId,
            subUnitId: targetSubUnitId || existing.subUnitId,
          },
        });
        updatedCount++;
      } else {
        // Buat baru jika belum ada
        const newPaket = await this.prisma.paketPembangunan.create({
          data: {
            tahunAnggaran: options.tahun,
            opdId: targetOpdId,
            subUnitId: targetSubUnitId,
            kodeRupKontrak: item.kodeRup,
            namaPaket: item.namaPaket,
            nilaiPagu: paguDecimal,
            nilaiKontrak: 0,
            metodePemilihan: normalizedMetode,
            jenisPengadaan: normalizedJenis,
            sumberDana: this.normalizeSumberDana(item.sumberDana),
            createdById: options.userId || null,
          },
        });

        // Inisialisasi 12 bulan target fisik default 0
        const targetsData = Array.from({ length: 12 }, (_, i) => ({
          paketId: newPaket.id,
          bulan: i + 1,
          targetFisik: 0,
        }));
        await this.prisma.targetBulanan.createMany({
          data: targetsData,
          skipDuplicates: true,
        });

        createdCount++;
      }
    }

    // Bersihkan cache Redis terkait paket agar query frontend langsung segar
    await this.redisService.delByPattern('*paket*');

    return {
      success: true,
      opdId: options.opdId,
      namaOpd: targetNamaOpd,
      tahun: options.tahun,
      totalCandidate: candidatePackages.length,
      createdCount,
      updatedCount,
      totalSynced: createdCount + updatedCount,
      message: isAll
        ? `Berhasil menyinkronkan ${createdCount + updatedCount} paket dari SiRUP LKPP untuk seluruh OPD se-Kabupaten Konawe Selatan.`
        : `Berhasil menyinkronkan ${createdCount + updatedCount} paket dari SiRUP LKPP untuk ${targetNamaOpd}.`,
    };
  }

  /**
   * Reset / Kosongkan Paket Pembangunan (Jadikan 0 Paket)
   * Khusus Administrator
   */
  async resetPaket(options: {
    tahun: number;
    opdId?: string;
    userId?: string;
  }) {
    const isAll = !options.opdId || options.opdId === 'ALL';
    const whereClause: any = {
      tahunAnggaran: options.tahun,
    };

    let targetNamaOpd = 'SEMUA OPD SE-KABUPATEN KONAWE SELATAN';

    if (!isAll) {
      whereClause.opdId = options.opdId;
      const opd = await this.egovService.getOpdById(options.opdId);
      if (opd) {
        targetNamaOpd = opd.namaOpd;
      }
    }

    // Ambil daftar paket yang akan direset
    const targetPakets = await this.prisma.paketPembangunan.findMany({
      where: whereClause,
      select: { id: true },
    });

    const paketIds = targetPakets.map((p) => p.id);

    if (paketIds.length > 0) {
      // Hapus target bulanan & realisasi bulanan terlebih dahulu
      await this.prisma.targetBulanan.deleteMany({
        where: { paketId: { in: paketIds } },
      });
      await this.prisma.realisasiBulanan.deleteMany({
        where: { paketId: { in: paketIds } },
      });
      // Hapus paket pembangunan
      await this.prisma.paketPembangunan.deleteMany({
        where: { id: { in: paketIds } },
      });
    }

    // Bersihkan seluruh cache redis
    await this.redisService.delByPattern('*paket*');
    await this.redisService.delByPattern('*dashboard*');
    await this.redisService.delByPattern('*summary*');

    return {
      success: true,
      tahun: options.tahun,
      opdId: options.opdId || 'ALL',
      namaOpd: targetNamaOpd,
      deletedCount: paketIds.length,
      message: isAll
        ? `Berhasil mereset seluruh data paket tahun ${options.tahun}. Database MONALISA kini kembali bersih menjadi 0 paket.`
        : `Berhasil mereset ${paketIds.length} paket milik ${targetNamaOpd} pada tahun ${options.tahun} kembali menjadi 0.`,
    };
  }
}
