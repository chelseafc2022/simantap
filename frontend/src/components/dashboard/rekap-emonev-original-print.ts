import type { RekapReport } from "./rekap-emonev-print"

const escapeHtml = (value: string | number) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!))
const formatRupiah = (value: number) => (Number.isFinite(value) ? value : 0).toLocaleString("id-ID")

// Preserve the original E-MONEV template from the repository history.
export function buildOriginalRekapReportHtml(report: RekapReport) {
  const { tahun, namaBulanAktif, opdPenyedia, opdNonPenyedia, kecamatanPenyedia,
    kecamatanNonPenyedia, totalOpd, totalKecamatan, grandTotal } = report
  const d = report.printedAt ?? new Date()
  const tanggalCetak = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar", day: "numeric", month: "long", year: "numeric",
  }).format(d)
  const waktuCetak = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d)
  const scopeLabel = report.scope === "opd" ? "OPD" : report.scope === "kecamatan" ? "Kecamatan" : "OPD &amp; kecamatan"
  const totalLabel = report.scope === "opd" ? "TOTAL OPD" : report.scope === "kecamatan" ? "TOTAL KECAMATAN" : "TOTAL KESELURUHAN KABUPATEN"
  // 1. Baris tabel OPD Penyedia
  let rowsHtml = ""
  opdPenyedia.forEach((data, i) => {
    const isRed = data.persenKeuangan === 0 || data.persenFisik === 0
    const textColor = isRed ? "color:#c00000;font-weight:bold;" : ""
    const styleKeu = data.persenKeuangan < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
    const styleFisik = data.persenFisik < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
    const styleKomb = data.kombinasi < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
    rowsHtml += `<tr>
      <td style="text-align:center;border:1px solid #000;padding:4px;">${i + 1}</td>
      <td style="border:1px solid #000;padding:4px;text-transform:uppercase;${textColor}">${escapeHtml(data.namaOpd)}</td>
      <td style="text-align:right;border:1px solid #000;padding:4px;">${formatRupiah(data.totalPagu)}</td>
      <td style="text-align:right;border:1px solid #000;padding:4px;">${formatRupiah(data.realisasiKeuangan)}</td>
      <td style="text-align:center;border:1px solid #000;padding:4px;${styleKeu}">${data.persenKeuangan}%</td>
      <td style="text-align:center;border:1px solid #000;padding:4px;${styleFisik}">${data.persenFisik}%</td>
      <td style="text-align:center;border:1px solid #000;padding:4px;${styleKomb}">${data.kombinasi}%</td>
    </tr>`
  })

  if (report.scope !== "kecamatan") {
  // Subtotal OPD
  rowsHtml += `<tr style="background-color:#ffc000;font-weight:bold;font-style:italic;">
    <td colspan="2" style="text-align:right;border:1px solid #000;padding:5px 15px;">JUMLAH</td>
    <td style="text-align:right;border:1px solid #000;padding:5px;">${formatRupiah(totalOpd.pagu)}</td>
    <td style="text-align:right;border:1px solid #000;padding:5px;">${formatRupiah(totalOpd.keu)}</td>
    <td style="text-align:center;border:1px solid #000;padding:5px;">${totalOpd.persenKeuangan}%</td>
    <td style="text-align:center;border:1px solid #000;padding:5px;">${totalOpd.persenFisik}%</td>
    <td style="text-align:center;border:1px solid #000;padding:5px;">${totalOpd.kombinasi}%</td>
  </tr>`

  }

  // OPD NON PENYEDIA
  if (opdNonPenyedia.length > 0) {
    rowsHtml += `<tr style="background-color:#b8cce4;">
      <td style="border:1px solid #000;padding:4px;"></td>
      <td style="font-weight:bold;border:1px solid #000;padding:5px 6px;text-align:left;">OPD NON PENYEDIA</td>
      <td style="border:1px solid #000;"></td>
      <td style="border:1px solid #000;"></td>
      <td style="border:1px solid #000;"></td>
      <td style="border:1px solid #000;"></td>
      <td style="border:1px solid #000;"></td>
    </tr>`

    opdNonPenyedia.forEach((data, i) => {
      rowsHtml += `<tr>
        <td style="text-align:center;border:1px solid #000;padding:4px;">${i + 1}</td>
        <td style="border:1px solid #000;padding:4px;text-transform:uppercase;">${escapeHtml(data.namaOpd)}</td>
        <td style="border:1px solid #000;padding:4px;"></td>
        <td style="border:1px solid #000;padding:4px;"></td>
        <td style="border:1px solid #000;padding:4px;"></td>
        <td style="border:1px solid #000;padding:4px;"></td>
        <td style="border:1px solid #000;padding:4px;"></td>
      </tr>`
    })
  }

  // 2. Baris Kecamatan
  if (kecamatanPenyedia.length > 0 || kecamatanNonPenyedia.length > 0) {
    if (kecamatanPenyedia.length > 0) {
      rowsHtml += `<tr style="background-color:#b8cce4;">
        <td colspan="7" style="font-weight:bold;border:1px solid #000;padding:6px 10px;text-align:left;">KECAMATAN SE-KABUPATEN KONAWE SELATAN</td>
      </tr>`

      kecamatanPenyedia.forEach((data, i) => {
        const styleKeu = data.persenKeuangan < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
        const styleFisik = data.persenFisik < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
        const styleKomb = data.kombinasi < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
        rowsHtml += `<tr>
          <td style="text-align:center;border:1px solid #000;padding:4px;">${i + 1}</td>
          <td style="border:1px solid #000;padding:4px;text-transform:uppercase;">${escapeHtml(data.namaOpd)}</td>
          <td style="text-align:right;border:1px solid #000;padding:4px;">${formatRupiah(data.totalPagu)}</td>
          <td style="text-align:right;border:1px solid #000;padding:4px;">${formatRupiah(data.realisasiKeuangan)}</td>
          <td style="text-align:center;border:1px solid #000;padding:4px;${styleKeu}">${data.persenKeuangan}%</td>
          <td style="text-align:center;border:1px solid #000;padding:4px;${styleFisik}">${data.persenFisik}%</td>
          <td style="text-align:center;border:1px solid #000;padding:4px;${styleKomb}">${data.kombinasi}%</td>
        </tr>`
      })

      // Subtotal Kecamatan Penyedia
      rowsHtml += `<tr style="background-color:#ffc000;font-weight:bold;font-style:italic;">
        <td colspan="2" style="text-align:right;border:1px solid #000;padding:5px 15px;">JUMLAH KECAMATAN</td>
        <td style="text-align:right;border:1px solid #000;padding:5px;">${formatRupiah(totalKecamatan.pagu)}</td>
        <td style="text-align:right;border:1px solid #000;padding:5px;">${formatRupiah(totalKecamatan.keu)}</td>
        <td style="text-align:center;border:1px solid #000;padding:5px;">${totalKecamatan.persenKeuangan}%</td>
        <td style="text-align:center;border:1px solid #000;padding:5px;">${totalKecamatan.persenFisik}%</td>
        <td style="text-align:center;border:1px solid #000;padding:5px;">${totalKecamatan.kombinasi}%</td>
      </tr>`
    }

    // KECAMATAN NON PENYEDIA
    if (kecamatanNonPenyedia.length > 0) {
      rowsHtml += `<tr style="background-color:#b8cce4;">
        <td style="border:1px solid #000;padding:4px;"></td>
        <td style="font-weight:bold;border:1px solid #000;padding:5px 6px;text-align:left;">KECAMATAN NON PENYEDIA</td>
        <td style="border:1px solid #000;"></td>
        <td style="border:1px solid #000;"></td>
        <td style="border:1px solid #000;"></td>
        <td style="border:1px solid #000;"></td>
        <td style="border:1px solid #000;"></td>
      </tr>`

      kecamatanNonPenyedia.forEach((data, i) => {
        rowsHtml += `<tr>
          <td style="text-align:center;border:1px solid #000;padding:4px;">${i + 1}</td>
          <td style="border:1px solid #000;padding:4px;text-transform:uppercase;">${escapeHtml(data.namaOpd)}</td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
        </tr>`
      })
    }
  }

  // Grand Total Keseluruhan (Hanya dari yang aktif berpaket)
  rowsHtml += `<tr style="background-color:#92d050;font-weight:bold;font-size:10pt;">
    <td colspan="2" style="text-align:right;border:1px solid #000;padding:7px 15px;">${totalLabel}</td>
    <td style="text-align:right;border:1px solid #000;padding:7px;">${formatRupiah(grandTotal.pagu)}</td>
    <td style="text-align:right;border:1px solid #000;padding:7px;">${formatRupiah(grandTotal.keu)}</td>
    <td style="text-align:center;border:1px solid #000;padding:7px;">${grandTotal.persenKeuangan}%</td>
    <td style="text-align:center;border:1px solid #000;padding:7px;">${grandTotal.persenFisik}%</td>
    <td style="text-align:center;border:1px solid #000;padding:7px;">${grandTotal.kombinasi}%</td>
  </tr>`

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Realisasi Fisik dan Keuangan TA ${escapeHtml(tahun)} - ${escapeHtml(namaBulanAktif)}</title>
      <style>
        @page { size: A4 landscape; margin: 8mm 10mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #000; background: #fff; margin: 0; padding: 10px; }
        .header-box { text-align: center; margin-bottom: 8px; }
        .header-box h2 { margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase; }
        .header-box h3 { margin: 2px 0; font-size: 10pt; font-weight: bold; }
        .badge-tanggal { background-color: #ffeb3b; font-weight: bold; font-style: italic; display: inline-block; padding: 3px 8px; margin: 6px 0; font-size: 9pt; border: 1px solid #d4c200; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        th { border: 1px solid #000; padding: 5px 3px; text-align: center; background-color: #e2e8f0; font-weight: bold; font-size: 8pt; }
        th.bg-real { background-color: #fef3c7; }
        th.bg-komb { background-color: #ffedd5; }
        td { border: 1px solid #000; padding: 3.5px 5px; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        .print-actions { text-align: right; margin-bottom: 10px; }
        .print-actions button { padding: 8px 14px; cursor: pointer; }
        @media print { .print-actions { display: none; } }
      </style>
    </head>
    <body>
      <div class="print-actions"><button id="print-report" type="button">Cetak / Simpan PDF</button></div>
      <div class="header-box">
        <h2>PERSENTASE LAPORAN REALISASI FISIK DAN KEUANGAN (RFK)</h2>
        <h3>PEMERINTAH KABUPATEN KONAWE SELATAN</h3>
        <h3>TAHUN ANGGARAN ${escapeHtml(tahun)} (PERIODE EVALUASI: ${escapeHtml(namaBulanAktif.toUpperCase())})</h3>
        <div class="badge-tanggal">Dicetak pada: Tanggal ${tanggalCetak}, Pukul ${waktuCetak} WITA melalui MONALISA KONSEL</div>
      </div>

      <div style="font-size:8pt;margin:6px 0;">Cakupan: ${scopeLabel}</div>
      <table>
        <thead>
          <tr>
            <th rowspan="2" width="3%">NO</th>
            <th rowspan="2" width="28%">ORGANISASI PERANGKAT DAERAH (OPD)</th>
            <th rowspan="2" width="13%">ANGGARAN / PAGU (RP)</th>
            <th colspan="2" class="bg-real">REALISASI KEUANGAN</th>
            <th rowspan="2" width="9%" class="bg-real">REALISASI FISIK (%)</th>
            <th rowspan="2" width="13%" class="bg-komb">REALISASI KEUANGAN & FISIK (%)</th>
          </tr>
          <tr>
            <th width="14%" class="bg-real">KEUANGAN (RP)</th>
            <th width="8%" class="bg-real">KEUANGAN (%)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `

}
