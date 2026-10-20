import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { EgovService } from '../../core/egov/egov.service';
import { RedisService } from '../../core/redis/redis.service';
import {
  RupSourcePaketRow,
  RupSourceService,
} from './rup-source.service';

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

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly egovService: EgovService,
    private readonly rupSource: RupSourceService,
  ) {}

  /**
   * Cari kode rekening satker SiRUP berdasarkan nama OPD/Satker
   */
  private normalizeUnitName(value?: string): string {
    return (value || '')
      .toUpperCase()
      .replace(/\bPROTOKOLER\b/g, 'PROTOKOL')
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async resolveSatkerCode(namaOpdOrSatker?: string): Promise<string | null> {
    if (!namaOpdOrSatker) return null;
    const raw = namaOpdOrSatker.trim();
    const clean = this.normalizeUnitName(raw);

    const sourceSatkers = await this.rupSource.getSatkerOptions();
    const sourceMatch = sourceSatkers.find((satker) => {
      if (satker.kode === raw) return true;
      const sourceName = this.normalizeUnitName(satker.nama);
      return (
        sourceName === clean ||
        sourceName.includes(clean) ||
        clean.includes(sourceName)
      );
    });
    if (sourceMatch) return sourceMatch.kode;

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

  private mapSourcePaket(item: RupSourcePaketRow): SirupPaketItem {
    const classificationInput = {
      nama_paket: item.namaPaket,
      jenis_pengadaan: item.jenisPengadaan || '',
      total_nilai: Number(item.pagu || 0),
    };

    return {
      kodeRup: String(item.kodeRup || ''),
      namaPaket: item.namaPaket || '',
      satker: item.namaSatker || '',
      metode: this.normalizeMetode(item.metode || item.caraPengadaan || ''),
      pagu: Number(item.pagu || 0),
      sumberDana: this.normalizeSumberDana(
        item.sumberDana || '',
        item.namaPaket,
      ),
      tahun: String(item.tahun || ''),
      jenisPengadaan: this.normalizeJenis(item.jenisPengadaan || ''),
      caraPengadaan: item.caraPengadaan || '',
      pdn: item.pdn || 'Ya',
      isPembangunan: this.isPaketPembangunan(classificationInput),
    };
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
    const normalizedRaw = this.normalizeUnitName(raw);

    const opdOptions = await this.egovService.getOpdOptions();
    const subUnitOptions = await this.egovService.getSubUnitOptions('ALL');

    // 1. Cek kecocokan langsung ke instansi
    let matchedOpd = opdOptions.find(
      (o) => this.normalizeUnitName(o.namaOpd) === normalizedRaw,
    );

    let matchedSubUnit: any = null;
    if (!matchedOpd) {
      // 2. Cek apakah satker adalah sub-unit (seperti PUSKESMAS atau BAGIAN)
      matchedSubUnit = subUnitOptions.find((u) => {
        const normalizedUnit = this.normalizeUnitName(u.namaSubUnit);
        return (
          normalizedUnit === normalizedRaw ||
          normalizedUnit.includes(normalizedRaw) ||
          normalizedRaw.includes(normalizedUnit)
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
          this.normalizeUnitName(u.namaSubUnit) ===
            this.normalizeUnitName(matchedOpd!.namaOpd),
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
    const cacheKey = `sirup:summary:konsel-setara:${targetTahun}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return { source: 'cache', ...cached };
    }

    try {
      const summary = await this.rupSource.getSummary(targetTahun);
      const payload = {
        tahun: targetTahun,
        ...summary,
      };
      await this.redisService.set(cacheKey, payload, 1800);
      return { source: 'konsel-setara-rup', ...payload };
    } catch (err: any) {
      this.logger.warn(`Gagal membaca ringkasan tabel RUP: ${err.message}`);
      return {
        source: 'error',
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

    const cacheKey = `sirup:search:konsel-setara:v1:${tahun}:${page}:${limit}:${query}:${satker}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return { source: 'cache', ...cached };
    }

    try {
      const resolvedSatker =
        satker && satker !== 'ALL' && satker !== 'Semua OPD'
          ? (await this.resolveSatkerCode(satker)) || satker
          : undefined;
      const result = await this.rupSource.searchPaket({
        tahun,
        page,
        limit,
        query,
        satker: resolvedSatker,
      });
      const responsePayload = {
        tahun,
        page,
        limit,
        total: result.total,
        data: result.rows.map((item) => this.mapSourcePaket(item)),
      };

      await this.redisService.set(cacheKey, responsePayload, 900);
      return { source: 'konsel-setara-rup', ...responsePayload };
    } catch (err: any) {
      this.logger.warn(`Gagal mencari paket di tabel RUP: ${err.message}`);
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
  async fetchAllPaketFromSource(params: {
    tahun: string;
    satkerCode?: string;
    maxPages?: number;
  }): Promise<SirupPaketItem[]> {
    const allItems: SirupPaketItem[] = [];
    const maxPages = params.maxPages || 500;

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
    const cacheKey = `sirup:paket:konsel-setara:v1:${cleanKode}:${tahunTarget}`;

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
        const row = await this.rupSource.getPaketByKodeRup(cleanKode, yr);
        if (row) {
          const match = this.mapSourcePaket(row);
          await this.redisService.set(cacheKey, match, 3600);
          return { source: 'konsel-setara-rup', data: match };
        }
      } catch (err: any) {
        this.logger.warn(
          `Gagal mencari kode RUP ${cleanKode} pada tabel RUP tahun ${yr}: ${err.message}`,
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

    // 2. Cek apakah ini kode satker dari konsel_setara.rup_satker.
    const sourceSatkers = await this.rupSource.getSatkerOptions();
    const sourceSatker = sourceSatkers.find((satker) => satker.kode === clean);
    if (sourceSatker) {
      const matched = await this.matchSatkerToSimpeg(sourceSatker.nama);
      const parentOpd = matched.opdId
        ? this.egovService.getOpdById(matched.opdId)
        : null;
      return {
        isAll: false,
        opdId: matched.opdId || '',
        subUnitId: matched.subUnitId,
        nama: sourceSatker.nama,
        parentOpdNama: parentOpd?.namaOpd,
      };
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
   * Daftar satker dari konsel_setara.rup_satker.
   */
  async getSatkerOptions() {
    const sourceSatkers = await this.rupSource.getSatkerOptions();
    const opdOptions = await this.egovService.getOpdOptions();
    const subUnits = await this.egovService.getSubUnitOptions('ALL');
    const result: Array<{
      id: string; // kode satker sumber; selalu unik untuk kebutuhan dropdown
      subUnitId: string | null;
      nama: string;
      satkerCode: string;
      opdId: string;
      parentOpdNama?: string;
    }> = [];

    for (const sourceSatker of sourceSatkers) {
      const satkerName = sourceSatker.nama;
      const satkerCode = sourceSatker.kode;
      const normalizedSatker = this.normalizeUnitName(satkerName);
      const matched = subUnits.find(
        (su) =>
          this.normalizeUnitName(su.namaSubUnit) === normalizedSatker ||
          this.normalizeUnitName(su.namaSubUnit).includes(normalizedSatker) ||
          normalizedSatker.includes(this.normalizeUnitName(su.namaSubUnit)),
      );

      const matchedOpd = opdOptions.find(
        (opd) => this.normalizeUnitName(opd.namaOpd) === normalizedSatker,
      );

      const opdId = matched?.opdId || matchedOpd?.id || '';
      const parentOpd = opdId ? this.egovService.getOpdById(opdId) : null;

      result.push({
        id: satkerCode,
        subUnitId: matched?.id || null,
        nama: satkerName,
        satkerCode,
        opdId,
        parentOpdNama: parentOpd?.namaOpd,
      });
    }

    return result.sort((a, b) => a.nama.localeCompare(b.nama));
  }

  /**
   * Ambil pratinjau daftar paket sumber RUP untuk OPD atau seluruh kabupaten.
   */
  async getPreviewPaketOpd(params: { tahun: number; opdId: string }) {
    const tahunStr = String(params.tahun);

    // KASUS 1: Seluruh OPD se-Kabupaten Konawe Selatan (Pengecualian Administrator)
    if (params.opdId === 'ALL') {
      const packages = await this.fetchAllPaketFromSource({
        tahun: tahunStr,
      });

      return {
        tahun: params.tahun,
        opdId: 'ALL',
        namaOpd: 'SEMUA OPD SE-KABUPATEN KONAWE SELATAN',
        satkerCode: 'ALL',
        total: packages.length,
        pembangunanCount: packages.filter((paket) => paket.isPembangunan)
          .length,
        packages: packages.slice(0, 100),
      };
    }

    // KASUS 2: Sub Unit / OPD Spesifik
    const target = await this.resolveTargetUnit(params.opdId);
    const satkerCode = await this.resolveSatkerCode(target.nama);
    let packages: SirupPaketItem[] = [];

    if (satkerCode) {
      packages = await this.fetchAllPaketFromSource({
        tahun: tahunStr,
        satkerCode,
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

  /** Sinkronisasi massal sumber RUP read-only ke PostgreSQL MONALISA. */
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
      satkerCode = await this.resolveSatkerCode(target.nama);
      resolvedOpdId = target.opdId;
      resolvedSubUnitId = target.subUnitId;
    }

    // 1. Ambil paket hanya dengan SELECT dari konsel_setara.rup_paket.
    let allRawPackages: SirupPaketItem[] = [];

    if (options.kodeRupList && options.kodeRupList.length > 0) {
      for (const kode of options.kodeRupList) {
        const item = await this.getPaketByKodeRup(kode, tahunStr);
        if (item?.data) {
          allRawPackages.push(item.data);
        }
      }
    } else if (isAll) {
      allRawPackages = await this.fetchAllPaketFromSource({ tahun: tahunStr });
    } else {
      if (satkerCode) {
        allRawPackages = await this.fetchAllPaketFromSource({
          tahun: tahunStr,
          satkerCode,
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

    const satkerNames = [
      ...new Set(candidatePackages.map((item) => item.satker)),
    ];
    const satkerMappings = new Map<
      string,
      { opdId: string | null; subUnitId: string | null }
    >();
    for (const satkerName of satkerNames) {
      satkerMappings.set(
        satkerName,
        await this.matchSatkerToSimpeg(satkerName),
      );
    }

    const skippedSatkers = new Set<string>();
    const preparedPackages = candidatePackages.flatMap((item) => {
      const match = satkerMappings.get(item.satker) || {
        opdId: null,
        subUnitId: null,
      };
      const targetOpdId =
        match.opdId || resolvedOpdId || (isAll ? null : options.opdId);
      const targetSubUnitId = match.subUnitId || resolvedSubUnitId || null;

      if (!targetOpdId) {
        skippedSatkers.add(item.satker);
        return [];
      }

      return [{ item, targetOpdId, targetSubUnitId }];
    });

    const existingPakets = await this.prisma.paketPembangunan.findMany({
      where: {
        tahunAnggaran: options.tahun,
        kodeRupKontrak: {
          in: preparedPackages.map(({ item }) => item.kodeRup),
        },
      },
      select: {
        id: true,
        kodeRupKontrak: true,
        subUnitId: true,
      },
    });
    const existingByKode = new Map(
      existingPakets.map((paket) => [paket.kodeRupKontrak, paket]),
    );

    const toCreate: Array<{
      id: string;
      tahunAnggaran: number;
      opdId: string;
      subUnitId: string | null;
      kodeRupKontrak: string;
      namaPaket: string;
      nilaiPagu: number;
      nilaiKontrak: number;
      metodePemilihan: string;
      jenisPengadaan: string;
      sumberDana: string;
      createdById: string | null;
    }> = [];
    const toUpdate: Array<{
      id: string;
      data: {
        namaPaket: string;
        nilaiPagu: number;
        metodePemilihan: string;
        jenisPengadaan: string;
        sumberDana: string;
        opdId: string;
        subUnitId: string | null;
      };
    }> = [];

    for (const { item, targetOpdId, targetSubUnitId } of preparedPackages) {
      const existing = existingByKode.get(item.kodeRup);
      const commonData = {
        namaPaket: item.namaPaket,
        nilaiPagu: item.pagu || 0,
        metodePemilihan: this.normalizeMetode(item.metode),
        jenisPengadaan: this.normalizeJenis(item.jenisPengadaan),
        sumberDana: this.normalizeSumberDana(
          item.sumberDana,
          item.namaPaket,
        ),
        opdId: targetOpdId,
        subUnitId: targetSubUnitId || existing?.subUnitId || null,
      };

      if (existing) {
        toUpdate.push({ id: existing.id, data: commonData });
      } else {
        toCreate.push({
          id: randomUUID(),
          tahunAnggaran: options.tahun,
          kodeRupKontrak: item.kodeRup,
          nilaiKontrak: 0,
          createdById: options.userId || null,
          ...commonData,
        });
      }
    }

    for (let index = 0; index < toCreate.length; index += 500) {
      await this.prisma.paketPembangunan.createMany({
        data: toCreate.slice(index, index + 500),
      });
    }

    const targetsData = toCreate.flatMap((paket) =>
      Array.from({ length: 12 }, (_, index) => ({
        paketId: paket.id,
        bulan: index + 1,
        targetFisik: 0,
      })),
    );
    for (let index = 0; index < targetsData.length; index += 2000) {
      await this.prisma.targetBulanan.createMany({
        data: targetsData.slice(index, index + 2000),
        skipDuplicates: true,
      });
    }

    for (let index = 0; index < toUpdate.length; index += 50) {
      const batch = toUpdate.slice(index, index + 50);
      await this.prisma.$transaction(
        batch.map((paket) =>
          this.prisma.paketPembangunan.update({
            where: { id: paket.id },
            data: paket.data,
          }),
        ),
      );
    }

    const createdCount = toCreate.length;
    const updatedCount = toUpdate.length;
    const skippedCount = candidatePackages.length - preparedPackages.length;

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
      skippedCount,
      unmatchedSatkers: [...skippedSatkers].sort(),
      totalSynced: createdCount + updatedCount,
      message: isAll
        ? `Berhasil menyinkronkan ${createdCount + updatedCount} paket dari tabel RUP Konsel Setara untuk seluruh OPD se-Kabupaten Konawe Selatan.${skippedCount ? ` ${skippedCount} paket dilewati karena satker belum terpetakan.` : ''}`
        : `Berhasil menyinkronkan ${createdCount + updatedCount} paket dari tabel RUP Konsel Setara untuk ${targetNamaOpd}.`,
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

    // Seluruh target/realisasi bulanan dan mingguan terhapus lewat FK CASCADE.
    const deleted = await this.prisma.paketPembangunan.deleteMany({
      where: whereClause,
    });

    // Bersihkan seluruh cache redis
    await this.redisService.delByPattern('*paket*');
    await this.redisService.delByPattern('*dashboard*');
    await this.redisService.delByPattern('*summary*');

    return {
      success: true,
      tahun: options.tahun,
      opdId: options.opdId || 'ALL',
      namaOpd: targetNamaOpd,
      deletedCount: deleted.count,
      message: isAll
        ? `Berhasil mereset seluruh data paket tahun ${options.tahun}. Database MONALISA kini kembali bersih menjadi 0 paket.`
        : `Berhasil mereset ${deleted.count} paket milik ${targetNamaOpd} pada tahun ${options.tahun} kembali menjadi 0.`,
    };
  }
}
