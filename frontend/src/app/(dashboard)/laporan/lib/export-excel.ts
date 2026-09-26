import * as XLSX from 'xlsx';

interface ExportExcelParams {
  tahunAnggaran: number;
  bulan: number;
  namaBulan: string;
  items: any[];
  summary: any;
  rekapOpd?: any[];
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
  const rfkRows: any[] = [];

  // Judul & Header Dokumen
  rfkRows.push(['PEMERINTAH KABUPATEN KONAWE SELATAN']);
  rfkRows.push(['BAGIAN ADMINISTRASI PEMBANGUNAN SETDA KABUPATEN KONAWE SELATAN']);
  rfkRows.push([`LAPORAN REALISASI FISIK DAN KEUANGAN (RFK) PAKET PEMBANGUNAN`]);
  rfkRows.push([`PERIODE: BULAN ${namaBulan.toUpperCase()} TAHUN ANGGARAN ${tahunAnggaran}`]);
  rfkRows.push([]); // blank line

  // Header Tabel
  rfkRows.push([
    'NO',
    'OPD / SKPD',
    'SUB UNIT / BIDANG',
    'NAMA PAKET PEKERJAAN',
    'METODE PEMILIHAN',
    'JENIS PENGADAAN',
    'SUMBER DANA',
    'NOMOR KONTRAK',
    'PENYEDIA / REKANAN',
    'PAGU ANGGARAN (Rp)',
    'NILAI KONTRAK (Rp)',
    'REALISASI KEUANGAN (Rp)',
    '% KEUANGAN',
    'TARGET FISIK (%)',
    'REALISASI FISIK (%)',
    'DEVIASI FISIK (%)',
    'STATUS CAPAIAN',
    'CATATAN OPERATOR',
  ]);

  // Data Baris
  items.forEach((item, index) => {
    rfkRows.push([
      index + 1,
      item.opd?.namaOpd || '-',
      item.subUnit?.namaSubUnit || '-',
      item.namaPaket,
      item.metodePemilihan || '-',
      item.jenisPengadaan || '-',
      item.sumberDana || '-',
      item.nomorKontrak || '-',
      item.pemenangRekanan || '-',
      item.nilaiPagu || 0,
      item.nilaiKontrak || 0,
      item.realisasiKeuangan || 0,
      `${(item.persenKeuangan || 0).toFixed(2)}%`,
      `${(item.targetFisik || 0).toFixed(2)}%`,
      `${(item.realisasiFisik || 0).toFixed(2)}%`,
      `${item.deviasiFisik >= 0 ? '+' : ''}${(item.deviasiFisik || 0).toFixed(2)}%`,
      item.status === 'AMAN'
        ? 'AMAN (Sesuai Target)'
        : item.status === 'PERHATIAN'
        ? 'PERHATIAN (Deviasi Ringan)'
        : item.status === 'KRITIS'
        ? 'KONTRAK KRITIS (Deviasi > 10%)'
        : 'BELUM MULAI',
      item.catatanOperator || '',
    ]);
  });

  // Baris Total Aggregat di Bawah
  rfkRows.push([]);
  rfkRows.push([
    'TOTAL / RATA-RATA',
    '',
    '',
    `${items.length} Paket`,
    '',
    '',
    '',
    '',
    '',
    summary?.totalPagu || 0,
    summary?.totalKontrak || 0,
    summary?.totalRealisasiKeuangan || 0,
    `${(summary?.persenSerapanKeuangan || 0).toFixed(2)}%`,
    `${(summary?.avgTargetFisik || 0).toFixed(2)}%`,
    `${(summary?.avgRealisasiFisik || 0).toFixed(2)}%`,
    `${(summary?.avgDeviasiFisik || 0) >= 0 ? '+' : ''}${(summary?.avgDeviasiFisik || 0).toFixed(2)}%`,
    `Aman: ${summary?.countStatus?.aman || 0} | Perhatian: ${summary?.countStatus?.perhatian || 0} | Kritis: ${summary?.countStatus?.kritis || 0}`,
    '',
  ]);

  const wsRfk = XLSX.utils.aoa_to_sheet(rfkRows);

  // Atur lebar kolom
  wsRfk['!cols'] = [
    { wch: 5 },  // No
    { wch: 30 }, // OPD
    { wch: 25 }, // Sub Unit
    { wch: 45 }, // Nama Paket
    { wch: 20 }, // Metode
    { wch: 18 }, // Jenis
    { wch: 14 }, // Sumber Dana
    { wch: 22 }, // No Kontrak
    { wch: 25 }, // Rekanan
    { wch: 20 }, // Pagu
    { wch: 20 }, // Kontrak
    { wch: 22 }, // Realisasi Keu
    { wch: 14 }, // % Keu
    { wch: 16 }, // Target Fisik
    { wch: 18 }, // Realisasi Fisik
    { wch: 18 }, // Deviasi
    { wch: 25 }, // Status
    { wch: 30 }, // Catatan
  ];

  XLSX.utils.book_append_sheet(wb, wsRfk, 'Rekapitulasi RFK');

  // ==========================================
  // SHEET 2: REKAPITULASI KINERJA PER OPD
  // ==========================================
  if (rekapOpd && rekapOpd.length > 0) {
    const opdRows: any[] = [];
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
        `${opd.avgDeviasiFisik >= 0 ? '+' : ''}${(opd.avgDeviasiFisik || 0).toFixed(2)}%`,
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
    const kritisRows: any[] = [];
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
