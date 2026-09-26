export interface CetakRealisasiItem {
  id: string
  namaPaket: string
  kodeRupKontrak?: string | null
  nomorKontrak?: string | null
  metodePemilihan?: string | null
  sumberDana?: string | null
  tanggalMulai?: string | null
  tanggalSelesai?: string | null
  pemenangRekanan?: string | null
  nilaiPagu: number
  nilaiKontrak: number
  targetFisik: number
  realisasiFisik: number
  deviasiFisik: number
  realisasiKeuangan: number
  persenKeuangan: number
  status: string
  opd?: {
    namaOpd: string
    singkatan?: string | null
  }
  subUnit?: {
    namaSubUnit: string
  } | null
}

export interface CetakParams {
  tahunAnggaran: number
  bulanNama: string
  bulanNo: number
  namaOpd: string
  items: CetakRealisasiItem[]
  summary: {
    totalPagu: number
    totalKontrak: number
    totalRealisasiKeuangan: number
    persenSerapanKeuangan: number
    avgTargetFisik: number
    avgRealisasiFisik: number
    avgDeviasiFisik: number
  }
}

export function cetakLaporanRealisasiPDF({
  tahunAnggaran,
  bulanNama,
  bulanNo,
  namaOpd,
  items,
  summary,
}: CetakParams) {
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  const formatTanggalIndo = (d: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
    }).format(d)
  }

  const today = new Date()
  const tanggalCetak = formatTanggalIndo(today)
  const waktuCetak = today.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

  // Build rows grouped by metodePemilihan
  let rowsHtml = ""
  let lastMetode: string | null = null
  let counter = 0

  items.forEach((item) => {
    const metode = item.metodePemilihan || "Lainnya"
    if (metode !== lastMetode) {
      lastMetode = metode
      rowsHtml += `
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td style="border: 1px solid #000; text-align: center; padding: 4px;">•</td>
          <td colspan="12" style="border: 1px solid #000; text-align: left; padding: 5px 8px; text-transform: uppercase; font-size: 8pt; color: #1e293b;">
            METODE PEMILIHAN: ${metode}
          </td>
        </tr>
      `
    }

    counter++
    const isDeviasiPositif = item.deviasiFisik >= 0
    const deviasiColor = isDeviasiPositif ? "#166534" : "#991b1b"
    const tglMulaiStr = item.tanggalMulai ? item.tanggalMulai.substring(0, 10) : "-"
    const tglSelesaiStr = item.tanggalSelesai ? item.tanggalSelesai.substring(0, 10) : "-"

    rowsHtml += `
      <tr>
        <td style="border: 1px solid #000; text-align: center; padding: 4px;">${counter}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: left;">
          <div style="font-weight: bold;">${item.namaPaket}</div>
          <div style="font-size: 7.5pt; color: #555;">${item.opd?.namaOpd || ""}${item.subUnit ? ` - ${item.subUnit.namaSubUnit}` : ""}</div>
        </td>
        <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace;">Rp ${formatRupiah(item.nilaiPagu)}</td>
        <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace; font-weight: bold;">Rp ${formatRupiah(item.nilaiKontrak)}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 4px; font-size: 7.5pt; font-family: monospace;">${item.nomorKontrak || "-"}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 4px; font-size: 7.5pt;">${tglMulaiStr}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 4px; font-size: 7.5pt;">${tglSelesaiStr}</td>
        <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace;">${item.targetFisik}%</td>
        <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace; font-weight: bold;">${item.realisasiFisik}%</td>
        <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace; font-weight: bold; color: ${deviasiColor};">
          ${item.deviasiFisik > 0 ? `+${item.deviasiFisik}` : item.deviasiFisik}%
        </td>
        <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace;">Rp ${formatRupiah(item.realisasiKeuangan)}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 4px; font-family: monospace;">${item.persenKeuangan}%</td>
        <td style="border: 1px solid #000; text-align: center; padding: 4px; font-size: 7.5pt;">${item.sumberDana || "-"}</td>
      </tr>
    `
  })

  // Summary Row
  rowsHtml += `
    <tr style="background-color: #e2e8f0; font-weight: bold;">
      <td colspan="2" style="border: 1px solid #000; text-align: center; padding: 6px;">JUMLAH TOTAL / RATA-RATA</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace;">Rp ${formatRupiah(summary.totalPagu)}</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace;">Rp ${formatRupiah(summary.totalKontrak)}</td>
      <td colspan="3" style="border: 1px solid #000; text-align: center;">-</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace;">${summary.avgTargetFisik}%</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace;">${summary.avgRealisasiFisik}%</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace; color: ${summary.avgDeviasiFisik >= 0 ? "#166534" : "#991b1b"};">
        ${summary.avgDeviasiFisik > 0 ? `+${summary.avgDeviasiFisik}` : summary.avgDeviasiFisik}%
      </td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-family: monospace;">Rp ${formatRupiah(summary.totalRealisasiKeuangan)}</td>
      <td style="border: 1px solid #000; text-align: center; padding: 4px; font-family: monospace;">${summary.persenSerapanKeuangan}%</td>
      <td style="border: 1px solid #000; text-align: center;">-</td>
    </tr>
  `

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan RFK - ${namaOpd} - Periode ${bulanNama} ${tahunAnggaran}</title>
      <style>
        @page {
          size: landscape;
          margin: 8mm 10mm 8mm 10mm;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 8pt;
          color: #000;
          margin: 0;
          padding: 0;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
        }
        .header h2 {
          font-size: 11pt;
          font-weight: bold;
          margin: 0 0 2px 0;
          text-transform: uppercase;
        }
        .header h3 {
          font-size: 9.5pt;
          font-weight: bold;
          margin: 0 0 2px 0;
          text-transform: uppercase;
        }
        .header p {
          font-size: 8pt;
          margin: 0;
          color: #333;
        }
        .meta-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #000;
          padding-bottom: 4px;
          margin-bottom: 8px;
          font-size: 8pt;
        }
        .meta-bar .opd {
          font-weight: bold;
          text-transform: uppercase;
        }
        .meta-bar .tanggal {
          font-style: italic;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        th {
          border: 1px solid #000;
          background-color: #cbd5e1;
          padding: 4px;
          text-align: center;
          font-size: 7.5pt;
          font-weight: bold;
        }
        td {
          font-size: 7.5pt;
        }
        .ttd-container {
          margin-top: 15px;
          width: 100%;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .ttd-box {
          width: 250px;
          text-align: center;
          font-size: 8pt;
        }
        .ttd-space {
          height: 55px;
        }
        .ttd-name {
          font-weight: bold;
          text-decoration: underline;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>PEMERINTAH KABUPATEN KONAWE SELATAN</h2>
        <h3>LAPORAN REALISASI FISIK DAN KEUANGAN (RFK) BULANAN</h3>
        <p>PERIODE: BULAN ${bulanNama.toUpperCase()} (B${String(bulanNo).padStart(2, "0")}) — TAHUN ANGGARAN ${tahunAnggaran}</p>
      </div>

      <div class="meta-bar">
        <div class="opd">UNIT KERJA: ${namaOpd.toUpperCase()}</div>
        <div class="tanggal">Dicetak pada: ${tanggalCetak}, Pukul ${waktuCetak} WITA (SIMANTAP)</div>
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width: 25px;">No</th>
            <th rowspan="2" style="width: 220px;">Jenis Kegiatan / Nama Paket Pekerjaan</th>
            <th rowspan="2" style="width: 95px;">Pagu Anggaran (Rp)</th>
            <th rowspan="2" style="width: 95px;">Nilai Kontrak (Rp)</th>
            <th rowspan="2" style="width: 85px;">Nomor Kontrak</th>
            <th colspan="2" style="width: 110px;">Pelaksanaan</th>
            <th colspan="3" style="width: 130px;">Capaian Fisik (%)</th>
            <th colspan="2" style="width: 120px;">Capaian Keuangan</th>
            <th rowspan="2" style="width: 65px;">Sumber Dana</th>
          </tr>
          <tr>
            <th style="width: 55px;">Mulai</th>
            <th style="width: 55px;">Selesai</th>
            <th style="width: 42px;">Target</th>
            <th style="width: 42px;">Realisasi</th>
            <th style="width: 46px;">Deviasi</th>
            <th style="width: 85px;">Realisasi (Rp)</th>
            <th style="width: 35px;">%</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="ttd-container">
        <div class="ttd-box">
          <div>Mengetahui,</div>
          <div style="font-weight: bold; margin-bottom: 2px;">Pengguna Anggaran / Kepala Perangkat Daerah</div>
          <div style="font-size: 7.5pt; color: #555;">${namaOpd}</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">( ........................................................... )</div>
          <div>NIP. ...................................................</div>
        </div>

        <div class="ttd-box">
          <div>Andoolo, ${tanggalCetak}</div>
          <div style="font-weight: bold; margin-bottom: 2px;">Pejabat Pembuat Komitmen (PPK) / Pengelola Kegiatan</div>
          <div style="font-size: 7.5pt; color: #555;">Kabupaten Konawe Selatan</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">( ........................................................... )</div>
          <div>NIP. ...................................................</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `

  const printWindow = window.open("", "_blank", "width=1200,height=800")
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
