interface CetakLaporanParams {
  tahunAnggaran: number;
  bulan: number;
  namaBulan: string;
  items: any[];
  summary: any;
  filterOpdNama?: string;
}

export function cetakLaporanPdf({
  tahunAnggaran,
  bulan,
  namaBulan,
  items,
  summary,
  filterOpdNama,
}: CetakLaporanParams) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up browser diblokir. Harap izinkan pop-up untuk mencetak dokumen.');
    return;
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan RFK Kabupaten Konawe Selatan - Bulan ${namaBulan} ${tahunAnggaran}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 12mm 15mm 15mm 15mm;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 8.5pt;
          color: #000;
          background: #fff;
          margin: 0;
          padding: 0;
        }
        .header {
          text-align: center;
          border-bottom: 2px double #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .header h1 {
          font-size: 13pt;
          font-weight: bold;
          margin: 0 0 2px 0;
          text-transform: uppercase;
        }
        .header h2 {
          font-size: 11pt;
          font-weight: bold;
          margin: 0 0 2px 0;
          text-transform: uppercase;
        }
        .header h3 {
          font-size: 10pt;
          font-weight: normal;
          margin: 0 0 4px 0;
        }
        .header p {
          font-size: 8pt;
          font-style: italic;
          margin: 0;
        }
        .meta-table {
          width: 100%;
          margin-bottom: 10px;
          font-size: 8.5pt;
        }
        .meta-table td {
          padding: 2px 0;
        }
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
          font-size: 8pt;
        }
        table.data-table th, table.data-table td {
          border: 1px solid #333;
          padding: 4px 5px;
        }
        table.data-table th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          font-size: 7.5pt;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .bg-total {
          background-color: #f9f9f9;
          font-weight: bold;
        }
        .status-aman { color: #15803d; font-weight: bold; }
        .status-perhatian { color: #b45309; font-weight: bold; }
        .status-kritis { color: #b91c1c; font-weight: bold; }
        .status-belum { color: #475569; }

        .summary-box {
          border: 1px solid #ccc;
          padding: 8px 12px;
          margin-bottom: 15px;
          background-color: #fafafa;
          font-size: 8pt;
          display: flex;
          justify-content: space-between;
        }

        .signatures {
          margin-top: 25px;
          width: 100%;
          page-break-inside: avoid;
        }
        .signatures table {
          width: 100%;
          border: none;
        }
        .signatures td {
          border: none;
          text-align: center;
          vertical-align: top;
          font-size: 8.5pt;
          width: 33%;
        }
        .sign-space {
          height: 60px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PEMERINTAH KABUPATEN KONAWE SELATAN</h1>
        <h2>BAGIAN ADMINISTRASI PEMBANGUNAN SETDA</h2>
        <h3>LAPORAN EVALUASI REALISASI FISIK DAN KEUANGAN (RFK) PAKET PEMBANGUNAN</h3>
        <p>Alamat: Kompleks Perkantoran Pemerintah Daerah Kab. Konawe Selatan, Andoolo</p>
      </div>

      <table class="meta-table">
        <tr>
          <td width="15%"><strong>Tahun Anggaran</strong></td>
          <td width="35%">: ${tahunAnggaran}</td>
          <td width="15%"><strong>OPD Terpilih</strong></td>
          <td width="35%">: ${filterOpdNama || 'Semua Perangkat Daerah'}</td>
        </tr>
        <tr>
          <td><strong>Bulan Evaluasi</strong></td>
          <td>: ${namaBulan.toUpperCase()} (Bulan ${bulan})</td>
          <td><strong>Tanggal Cetak</strong></td>
          <td>: ${currentDate}</td>
        </tr>
      </table>

      <div class="summary-box">
        <div><strong>Total Paket:</strong> ${items.length} Paket</div>
        <div><strong>Total Pagu:</strong> ${formatRupiah(summary?.totalPagu || 0)}</div>
        <div><strong>Total Kontrak:</strong> ${formatRupiah(summary?.totalKontrak || 0)}</div>
        <div><strong>Realisasi Keu:</strong> ${formatRupiah(summary?.totalRealisasiKeuangan || 0)} (${(summary?.persenSerapanKeuangan || 0).toFixed(2)}%)</div>
        <div><strong>Rata Fisik:</strong> ${(summary?.avgRealisasiFisik || 0).toFixed(2)}% (Target: ${(summary?.avgTargetFisik || 0).toFixed(2)}%)</div>
        <div><strong>Rata Deviasi:</strong> ${(summary?.avgDeviasiFisik || 0) >= 0 ? '+' : ''}${(summary?.avgDeviasiFisik || 0).toFixed(2)}%</div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th width="3%">No</th>
            <th width="15%">OPD & Sub Unit</th>
            <th width="20%">Nama Paket Pembangunan</th>
            <th width="10%">Metode / Sumber Dana</th>
            <th width="12%">Pagu / Kontrak</th>
            <th width="11%">Realisasi Keu (Rp)</th>
            <th width="5%">% Keu</th>
            <th width="5%">Target</th>
            <th width="5%">Realisasi Fisik</th>
            <th width="5%">Deviasi</th>
            <th width="9%">Status Capaian</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td>
                <strong>${item.opd?.singkatan || item.opd?.namaOpd || '-'}</strong><br/>
                <span style="font-size: 7.5pt; color: #555;">${item.subUnit?.namaSubUnit || '-'}</span>
              </td>
              <td>
                <strong>${item.namaPaket}</strong><br/>
                <span style="font-size: 7pt; color: #666;">No Kontrak: ${item.nomorKontrak || '-'}</span><br/>
                <span style="font-size: 7pt; color: #666;">Rekanan: ${item.pemenangRekanan || '-'}</span>
              </td>
              <td>
                ${item.metodePemilihan || '-'}<br/>
                <span style="font-size: 7.5pt; color: #555;">Dana: ${item.sumberDana || '-'}</span>
              </td>
              <td class="text-right">
                <span style="color: #666;">Pagu: ${formatRupiah(item.nilaiPagu)}</span><br/>
                <strong>Kontrak: ${formatRupiah(item.nilaiKontrak)}</strong>
              </td>
              <td class="text-right">
                <strong>${formatRupiah(item.realisasiKeuangan)}</strong>
              </td>
              <td class="text-center font-bold">
                ${(item.persenKeuangan || 0).toFixed(1)}%
              </td>
              <td class="text-center">
                ${(item.targetFisik || 0).toFixed(1)}%
              </td>
              <td class="text-center font-bold">
                ${(item.realisasiFisik || 0).toFixed(1)}%
              </td>
              <td class="text-center font-bold ${
                item.deviasiFisik >= 0
                  ? 'status-aman'
                  : item.deviasiFisik >= -10
                  ? 'status-perhatian'
                  : 'status-kritis'
              }">
                ${item.deviasiFisik >= 0 ? '+' : ''}${(item.deviasiFisik || 0).toFixed(1)}%
              </td>
              <td class="text-center ${
                item.status === 'AMAN'
                  ? 'status-aman'
                  : item.status === 'PERHATIAN'
                  ? 'status-perhatian'
                  : item.status === 'KRITIS'
                  ? 'status-kritis'
                  : 'status-belum'
              }">
                ${
                  item.status === 'AMAN'
                    ? 'Aman'
                    : item.status === 'PERHATIAN'
                    ? 'Perhatian'
                    : item.status === 'KRITIS'
                    ? 'Kritis (SCM)'
                    : 'Belum Mulai'
                }
              </td>
            </tr>
          `
            )
            .join('')}
          <tr class="bg-total">
            <td colspan="4" class="text-center font-bold">TOTAL / RATA-RATA EVALUASI</td>
            <td class="text-right font-bold">${formatRupiah(summary?.totalKontrak || 0)}</td>
            <td class="text-right font-bold">${formatRupiah(summary?.totalRealisasiKeuangan || 0)}</td>
            <td class="text-center font-bold">${(summary?.persenSerapanKeuangan || 0).toFixed(1)}%</td>
            <td class="text-center font-bold">${(summary?.avgTargetFisik || 0).toFixed(1)}%</td>
            <td class="text-center font-bold">${(summary?.avgRealisasiFisik || 0).toFixed(1)}%</td>
            <td class="text-center font-bold">${(summary?.avgDeviasiFisik || 0) >= 0 ? '+' : ''}${(summary?.avgDeviasiFisik || 0).toFixed(1)}%</td>
            <td class="text-center font-bold">
              Kritis: ${summary?.countStatus?.kritis || 0}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="signatures">
        <table>
          <tr>
            <td>
              Mengetahui,<br/>
              <strong>Pengguna Anggaran / PPK</strong>
              <div class="sign-space"></div>
              <strong>( .................................................... )</strong><br/>
              NIP. .....................................................
            </td>
            <td></td>
            <td>
              Andoolo, ${currentDate}<br/>
              <strong>Tim Evaluasi & Pelaporan Pembangunan</strong>
              <div class="sign-space"></div>
              <strong>( .................................................... )</strong><br/>
              NIP. .....................................................
            </td>
          </tr>
        </table>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
