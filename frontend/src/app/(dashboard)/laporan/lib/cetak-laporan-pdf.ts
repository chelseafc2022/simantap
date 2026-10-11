interface CetakRfkItem {
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
  opd?: { namaOpd?: string } | null;
  subUnit?: { namaSubUnit?: string } | null;
}

interface CetakRfkSummary {
  totalPagu?: number;
  totalKontrak?: number;
  totalRealisasiKeuangan?: number;
  persenSerapanKeuangan?: number;
  avgRealisasiFisik?: number;
}

interface CetakLaporanParams {
  tahunAnggaran: number;
  bulan: number;
  namaBulan: string;
  items: CetakRfkItem[];
  summary: CetakRfkSummary;
  filterOpdNama?: string;
  printWindow?: Window;
}

export function cetakLaporanPdf({
  tahunAnggaran,
  bulan,
  namaBulan,
  items,
  summary,
  filterOpdNama,
  printWindow: providedWindow,
}: CetakLaporanParams) {
  const printWindow = providedWindow || window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up browser diblokir. Izinkan pop-up untuk mencetak laporan.');
    return;
  }

  const escapeHtml = (value: unknown) =>
    String(value ?? '-')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatTanggal = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const statusLabel = (status?: string) => {
    if (status === 'AMAN') return 'Aman';
    if (status === 'PERHATIAN') return 'Waspada';
    if (status === 'KRITIS') return 'Kritis';
    return 'Belum Mulai';
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const rows = items.map((item, index) => {
    const unit = item.subUnit?.namaSubUnit || item.opd?.namaOpd || '-';
    const deviasi = `${(item.deviasiFisik || 0) >= 0 ? '+' : ''}${(item.deviasiFisik || 0).toFixed(1)}%`;
    const keterangan = [
      statusLabel(item.status),
      `Target ${(item.targetFisik || 0).toFixed(1)}%`,
      `Deviasi ${deviasi}`,
      item.catatanOperator,
    ].filter(Boolean).join(' - ');

    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="wrap"><strong>${escapeHtml(item.namaPaket)}</strong><small>${escapeHtml(unit)} | ${escapeHtml(item.metodePemilihan || '-')}</small></td>
        <td class="money">${escapeHtml(formatRupiah(item.nilaiPagu || 0))}</td>
        <td class="money">${escapeHtml(formatRupiah(item.nilaiKontrak || 0))}</td>
        <td class="wrap">${escapeHtml(item.nomorKontrak || '-')}</td>
        <td class="center">${escapeHtml(formatTanggal(item.tanggalMulai))}</td>
        <td class="center">${escapeHtml(formatTanggal(item.tanggalSelesai))}</td>
        <td class="center bold">${(item.realisasiFisik || 0).toFixed(1)}%</td>
        <td class="money">${escapeHtml(formatRupiah(item.realisasiKeuangan || 0))}</td>
        <td class="center bold">${(item.persenKeuangan || 0).toFixed(1)}%</td>
        <td class="center wrap">${escapeHtml(item.sumberDana || '-')}</td>
        <td class="wrap">${escapeHtml(keterangan)}</td>
      </tr>`;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan RFK ${escapeHtml(namaBulan)} ${tahunAnggaran}</title>
        <style>
          @page { size: A4 landscape; margin: 9mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111; font-family: Arial, sans-serif; font-size: 7pt; }
          h1, h2, p { margin: 0; }
          .header { text-align: center; margin-bottom: 7px; }
          .header h1 { font-size: 12pt; }
          .header h2 { margin-top: 2px; font-size: 9pt; }
          .period { margin-top: 4px; font-size: 8pt; font-weight: bold; }
          .meta { display: flex; justify-content: space-between; gap: 10px; margin: 6px 0; }
          .summary { display: flex; gap: 14px; padding: 5px 7px; margin-bottom: 7px; border: 1px solid #aaa; background: #f6f6f6; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          th, td { border: 1px solid #555; padding: 3px; vertical-align: middle; }
          th { background: #e9eef3; text-align: center; font-size: 6.5pt; }
          td { line-height: 1.25; }
          small { display: block; margin-top: 2px; color: #555; font-size: 6pt; }
          .center { text-align: center; }
          .money { text-align: right; white-space: nowrap; }
          .bold { font-weight: bold; }
          .wrap { overflow-wrap: anywhere; }
          .total td { background: #e9eef3; font-weight: bold; }
          .signatures { display: flex; justify-content: space-between; margin-top: 18px; page-break-inside: avoid; }
          .signature { width: 34%; text-align: center; }
          .space { height: 42px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LAPORAN REALISASI FISIK DAN KEUANGAN</h1>
          <h2>KABUPATEN KONAWE SELATAN T.A. ${tahunAnggaran}</h2>
          <p class="period">${escapeHtml(namaBulan.toUpperCase())} ${tahunAnggaran}</p>
        </div>
        <div class="meta">
          <span><strong>OPD:</strong> ${escapeHtml(filterOpdNama || 'Semua OPD')}</span>
          <span><strong>Bulan:</strong> B${String(bulan).padStart(2, '0')}</span>
        </div>
        <div class="summary">
          <span><strong>Paket:</strong> ${items.length}</span>
          <span><strong>Pagu:</strong> ${escapeHtml(formatRupiah(summary?.totalPagu || 0))}</span>
          <span><strong>Kontrak:</strong> ${escapeHtml(formatRupiah(summary?.totalKontrak || 0))}</span>
          <span><strong>Realisasi:</strong> ${escapeHtml(formatRupiah(summary?.totalRealisasiKeuangan || 0))} (${(summary?.persenSerapanKeuangan || 0).toFixed(1)}%)</span>
        </div>
        <table>
          <colgroup>
            <col style="width:3%"><col style="width:20%"><col style="width:9%"><col style="width:9%">
            <col style="width:11%"><col style="width:7%"><col style="width:7%"><col style="width:5%">
            <col style="width:9%"><col style="width:4%"><col style="width:7%"><col style="width:9%">
          </colgroup>
          <thead>
            <tr>
              <th rowspan="2">No</th><th rowspan="2">Jenis Kegiatan</th><th rowspan="2">Anggaran (Rp)</th>
              <th rowspan="2">Nilai Kontrak</th><th rowspan="2">Nomor Kontrak</th>
              <th colspan="2">Tanggal Kontrak</th><th colspan="3">Realisasi</th>
              <th rowspan="2">Sumber Dana</th><th rowspan="2">Keterangan</th>
            </tr>
            <tr><th>Mulai</th><th>Berakhir</th><th>Fisik (%)</th><th>Keuangan (Rp)</th><th>%</th></tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total">
              <td colspan="2" class="center">JUMLAH</td>
              <td class="money">${escapeHtml(formatRupiah(summary?.totalPagu || 0))}</td>
              <td class="money">${escapeHtml(formatRupiah(summary?.totalKontrak || 0))}</td>
              <td colspan="3"></td>
              <td class="center">${(summary?.avgRealisasiFisik || 0).toFixed(1)}%</td>
              <td class="money">${escapeHtml(formatRupiah(summary?.totalRealisasiKeuangan || 0))}</td>
              <td class="center">${(summary?.persenSerapanKeuangan || 0).toFixed(1)}%</td>
              <td></td><td></td>
            </tr>
          </tbody>
        </table>
        <div class="signatures">
          <div class="signature">Mengetahui,<br><strong>Pengguna Anggaran / PPK</strong><div class="space"></div><strong>( ................................ )</strong></div>
          <div class="signature">Andoolo, ${escapeHtml(currentDate)}<br><strong>Tim Evaluasi RFK</strong><div class="space"></div><strong>( ................................ )</strong></div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
