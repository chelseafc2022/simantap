import * as XLSX from 'xlsx';

interface RfkItem {
  namaPaket: string;
  metodePemilihan?: string | null;
  sumberDana?: string | null;
  nomorKontrak?: string | null;
  tanggalMulai?: string | null;
  tanggalSelesai?: string | null;
  nilaiPagu?: number;
  nilaiKontrak?: number;
  realisasiFisik?: number;
  realisasiKeuangan?: number;
  persenKeuangan?: number;
  targetFisik?: number;
  deviasiFisik?: number;
  status?: string;
  catatanOperator?: string | null;
  pemenangRekanan?: string | null;
  opd?: { namaOpd?: string; singkatan?: string | null } | null;
  subUnit?: { namaSubUnit?: string } | null;
}

interface RfkSummary {
  totalPagu?: number;
  totalKontrak?: number;
  totalRealisasiKeuangan?: number;
  persenSerapanKeuangan?: number;
  avgTargetFisik?: number;
  avgRealisasiFisik?: number;
  avgDeviasiFisik?: number;
  countStatus?: { aman?: number; perhatian?: number; kritis?: number };
}

interface RekapOpdItem {
  kodeOpd?: string;
  namaOpd: string;
  totalPaket: number;
  totalPagu: number;
  totalKontrak: number;
  totalRealisasiKeuangan: number;
  persenSerapanKeuangan?: number;
  avgTargetFisik?: number;
  avgRealisasiFisik?: number;
  avgDeviasiFisik?: number;
  countAman: number;
  countPerhatian: number;
  countKritis: number;
}

interface ExportExcelParams {
  tahunAnggaran: number;
  bulan: number;
  namaBulan: string;
  items: RfkItem[];
  summary: RfkSummary;
  rekapOpd?: RekapOpdItem[];
}

export function exportLaporanToExcel({
  tahunAnggaran,
  bulan,
  namaBulan,
  items,
  summary,
  rekapOpd = [],
}: ExportExcelParams) {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: REKAPITULASI LAPORAN RFK
  // ==========================================
  const rfkRows: (string | number | Date)[][] = [];

  rfkRows.push(['LAPORAN REALISASI FISIK DAN KEUANGAN']);
  rfkRows.push([`KABUPATEN KONAWE SELATAN T.A. ${tahunAnggaran}`]);
  rfkRows.push([`PERIODE ${namaBulan.toUpperCase()} ${tahunAnggaran}`]);
  rfkRows.push([]);

  rfkRows.push([
    'NO',
    'JENIS KEGIATAN',
    'ANGGARAN (Rp)',
    'NILAI KONTRAK',
    'NOMOR KONTRAK',
    'TANGGAL KONTRAK',
    '',
    'REALISASI',
    '',
    '',
    'SUMBER DANA',
    'KETERANGAN',
  ]);
  rfkRows.push([
    '', '', '', '', '',
    'MULAI',
    'BERAKHIR',
    'FISIK (%)',
    'KEUANGAN (Rp)',
    '%',
    '', '',
  ]);

  items.forEach((item, index) => {
    const unit = item.subUnit?.namaSubUnit || item.opd?.namaOpd || '-';
    const metode = item.metodePemilihan || '-';
    const status = item.status === 'AMAN'
      ? 'Aman'
      : item.status === 'PERHATIAN'
      ? 'Waspada'
      : item.status === 'KRITIS'
      ? 'Kritis'
      : 'Belum Mulai';
    const detail = [
      status,
      `Target ${(item.targetFisik || 0).toFixed(1)}%`,
      `Deviasi ${(item.deviasiFisik || 0) >= 0 ? '+' : ''}${(item.deviasiFisik || 0).toFixed(1)}%`,
      item.catatanOperator,
    ].filter(Boolean).join(' - ');

    rfkRows.push([
      index + 1,
      `${item.namaPaket}\n${unit} | ${metode}`,
      item.nilaiPagu || 0,
      item.nilaiKontrak || 0,
      item.nomorKontrak || '-',
      item.tanggalMulai ? new Date(item.tanggalMulai) : '',
      item.tanggalSelesai ? new Date(item.tanggalSelesai) : '',
      (item.realisasiFisik || 0) / 100,
      item.realisasiKeuangan || 0,
      (item.persenKeuangan || 0) / 100,
      item.sumberDana || '-',
      detail,
    ]);
  });

  rfkRows.push([
    'JUMLAH',
    `${items.length} paket`,
    summary?.totalPagu || 0,
    summary?.totalKontrak || 0,
    '', '', '',
    (summary?.avgRealisasiFisik || 0) / 100,
    summary?.totalRealisasiKeuangan || 0,
    (summary?.persenSerapanKeuangan || 0) / 100,
    '',
    `Aman ${summary?.countStatus?.aman || 0} | Waspada ${summary?.countStatus?.perhatian || 0} | Kritis ${summary?.countStatus?.kritis || 0}`,
  ]);

  const wsRfk = XLSX.utils.aoa_to_sheet(rfkRows);
  wsRfk['!merges'] = [
    XLSX.utils.decode_range('A1:L1'),
    XLSX.utils.decode_range('A2:L2'),
    XLSX.utils.decode_range('A3:L3'),
    XLSX.utils.decode_range('A5:A6'),
    XLSX.utils.decode_range('B5:B6'),
    XLSX.utils.decode_range('C5:C6'),
    XLSX.utils.decode_range('D5:D6'),
    XLSX.utils.decode_range('E5:E6'),
    XLSX.utils.decode_range('F5:G5'),
    XLSX.utils.decode_range('H5:J5'),
    XLSX.utils.decode_range('K5:K6'),
    XLSX.utils.decode_range('L5:L6'),
  ];

  wsRfk['!cols'] = [
    { wch: 5 },
    { wch: 48 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 13 },
    { wch: 13 },
    { wch: 12 },
    { wch: 20 },
    { wch: 10 },
    { wch: 16 },
    { wch: 38 },
  ];
  wsRfk['!rows'] = [{ hpt: 22 }, { hpt: 20 }, { hpt: 18 }, { hpt: 8 }, { hpt: 24 }, { hpt: 22 }];

  for (let row = 6; row < rfkRows.length; row += 1) {
    ['C', 'D', 'I'].forEach((col) => {
      const cell = wsRfk[`${col}${row + 1}`];
      if (cell) cell.z = '#,##0';
    });
    ['H', 'J'].forEach((col) => {
      const cell = wsRfk[`${col}${row + 1}`];
      if (cell) cell.z = '0.0%';
    });
    ['F', 'G'].forEach((col) => {
      const cell = wsRfk[`${col}${row + 1}`];
      if (cell && cell.v) cell.z = 'dd-mmm-yyyy';
    });
  }

  XLSX.utils.book_append_sheet(wb, wsRfk, 'Laporan RFK');

  // ==========================================
  // SHEET 2: REKAPITULASI KINERJA PER OPD
  // ==========================================
  if (rekapOpd && rekapOpd.length > 0) {
    const opdRows: (string | number)[][] = [];
    opdRows.push(['REKAPITULASI KINERJA RFK PER ORGANISASI PERANGKAT DAERAH (OPD)']);
    opdRows.push([`KABUPATEN KONAWE SELATAN - TAHUN ANGGARAN ${tahunAnggaran} (BULAN ${namaBulan.toUpperCase()})`]);
    opdRows.push([]);

    opdRows.push([
      'NO',
      'KODE OPD',
      'NAMA OPD / SKPD',
      'TOTAL PAKET',
      'TOTAL PAGU (Rp)',
      'TOTAL KONTRAK (Rp)',
      'REALISASI KEUANGAN (Rp)',
      '% SERAPAN KEUANGAN',
      'RATA-RATA TARGET FISIK (%)',
      'RATA-RATA REALISASI FISIK (%)',
      'RATA-RATA DEVIASI (%)',
      'PAKET AMAN',
      'PAKET PERHATIAN',
      'PAKET KRITIS',
    ]);

    rekapOpd.forEach((opd, idx) => {
      opdRows.push([
        idx + 1,
        opd.kodeOpd || '-',
        opd.namaOpd,
        opd.totalPaket,
        opd.totalPagu,
        opd.totalKontrak,
        opd.totalRealisasiKeuangan,
        `${(opd.persenSerapanKeuangan || 0).toFixed(2)}%`,
        `${(opd.avgTargetFisik || 0).toFixed(2)}%`,
        `${(opd.avgRealisasiFisik || 0).toFixed(2)}%`,
        `${(opd.avgDeviasiFisik || 0) >= 0 ? '+' : ''}${(opd.avgDeviasiFisik || 0).toFixed(2)}%`,
        opd.countAman,
        opd.countPerhatian,
        opd.countKritis,
      ]);
    });

    const wsOpd = XLSX.utils.aoa_to_sheet(opdRows);
    wsOpd['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 40 },
      { wch: 12 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 20 },
      { wch: 24 },
      { wch: 26 },
      { wch: 22 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOpd, 'Kinerja Per OPD');
  }

  // ==========================================
  // SHEET 3: DAFTAR KONTRAK KRITIS (SHOW CAUSE)
  // ==========================================
  const kritisItems = items.filter((i) => i.status === 'KRITIS');
  if (kritisItems.length > 0) {
    const kritisRows: (string | number)[][] = [];
    kritisRows.push(['DAFTAR PENGAWASAN KONTRAK KRITIS (DEVIASI FISIK < -10%)']);
    kritisRows.push(['PERLU PERINGATAN / SHOW CAUSE MEETING (SCM) - KABUPATEN KONAWE SELATAN']);
    kritisRows.push([]);

    kritisRows.push([
      'NO',
      'OPD PENANGGUNG JAWAB',
      'NAMA PAKET PEKERJAAN',
      'NOMOR KONTRAK',
      'PENYEDIA JASA',
      'NILAI KONTRAK (Rp)',
      'TARGET FISIK (%)',
      'REALISASI FISIK (%)',
      'DEVIASI FISIK (%)',
      'CATATAN PERMASALAHAN / REKOMENDASI',
    ]);

    kritisItems.forEach((item, idx) => {
      kritisRows.push([
        idx + 1,
        item.opd?.namaOpd || '-',
        item.namaPaket,
        item.nomorKontrak || '-',
        item.pemenangRekanan || '-',
        item.nilaiKontrak || 0,
        `${(item.targetFisik || 0).toFixed(2)}%`,
        `${(item.realisasiFisik || 0).toFixed(2)}%`,
        `${(item.deviasiFisik || 0).toFixed(2)}%`,
        item.catatanOperator || 'Segera laksanakan SCM Tahap I dan percepatan jadwal kerja lapangan',
      ]);
    });

    const wsKritis = XLSX.utils.aoa_to_sheet(kritisRows);
    wsKritis['!cols'] = [
      { wch: 5 },
      { wch: 32 },
      { wch: 45 },
      { wch: 24 },
      { wch: 28 },
      { wch: 22 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, wsKritis, 'Kontrak Kritis (SCM)');
  }

  // Generate & Download File
  const filename = `LAPORAN_RFK_KONSEL_${tahunAnggaran}_BULAN_${String(bulan).padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
