import {
  MonevLapanganItem,
  MonevPaketInfo,
  monevFotoUrl,
} from "./monev-types"

const BULAN = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
]
const ROMAWI = ["I", "II", "III", "IV"]

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const multiline = (value?: string | null) => {
  const text = (value || "").trim()
  if (!text) return "-"
  return esc(text).replace(/\r?\n/g, "<br/>")
}

const tanggalIndo = (value?: string | null) => {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return "-"
  return `${String(d.getDate()).padStart(2, "0")} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

const rupiah = (value?: number | null) => {
  const n = Number(value) || 0
  if (n <= 0) return "-"
  return `Rp. ${new Intl.NumberFormat("id-ID").format(n)},-`
}

const formatProgres = (value?: number | null) => {
  const n = Number(value) || 0
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "")
  return `± ${text} %`
}

async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) return url
    const blob = await res.blob()
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result)
        } else {
          resolve(url)
        }
      }
      reader.onerror = () => resolve(url)
      reader.readAsDataURL(blob)
    })
  } catch {
    return url
  }
}

function renderLaporan(
  paket: MonevPaketInfo,
  monev: MonevLapanganItem,
  logoSrc: string,
  printedAt: string,
  pageIndex: number,
  totalPages: number,
) {
  const tgl = new Date(monev.tanggalMonev)
  const valid = !isNaN(tgl.getTime())
  const triwulan = valid ? ROMAWI[Math.floor(tgl.getMonth() / 3)] : "I"
  const tahun = valid ? tgl.getFullYear() : paket.tahunAnggaran
  const bulanLabel = valid ? BULAN[tgl.getMonth()] : "-"
  const tanggalMonevStr = valid ? tanggalIndo(monev.tanggalMonev) : "-"

  const skpd = (paket.opd?.namaOpd || "-").toUpperCase()
  const rows: Array<{ label: string; val: string; highlight?: "money" | "progress" }> = [
    { label: "SKPD / PERANGKAT DAERAH", val: skpd },
    { label: "NAMA PAKET KEGIATAN", val: (paket.namaPaket || "-").toUpperCase() },
    { label: "PENYEDIA / REKANAN", val: (paket.pemenangRekanan || "-").toUpperCase() },
    { label: "NOMOR KONTRAK", val: (paket.nomorKontrak || "-").toUpperCase() },
    { label: "TANGGAL MULAI KONTRAK", val: tanggalIndo(paket.tanggalMulai) },
    { label: "TANGGAL SELESAI KONTRAK", val: tanggalIndo(paket.tanggalSelesai) },
    { label: "NILAI KONTRAK", val: rupiah(paket.nilaiKontrak), highlight: "money" },
    { label: "KONSULTAN PENGAWAS", val: "-" },
    { label: "PENGAWAS LAPANGAN", val: "-" },
    { label: "LOKASI KEGIATAN", val: (paket.lokasiKegiatan || "-").toUpperCase() },
    { label: "PROGRES FISIK LAPANGAN", val: formatProgres(monev.progresFisik), highlight: "progress" },
  ]

  const infoHtml = rows
    .map(({ label, val, highlight }) => {
      let content = esc(val)
      if (highlight === "money") {
        content = `<span class="badge-money">${esc(val)}</span>`
      } else if (highlight === "progress") {
        content = `<span class="badge-progress">${esc(val)}</span>`
      }
      return `
        <tr>
          <td class="lbl">${esc(label)}</td>
          <td class="sep">:</td>
          <td class="val">${content}</td>
        </tr>`
    })
    .join("")

  const fotoHtml =
    monev.fotos && monev.fotos.length > 0
      ? `<div class="grid">${monev.fotos
          .map((f, idx) => {
            const src =
              f.pathFile.startsWith("data:") || f.pathFile.startsWith("http")
                ? f.pathFile
                : monevFotoUrl(f)
            return `
              <figure class="foto-card">
                <div class="foto-frame">
                  <img src="${esc(src)}" alt="Dokumentasi monitoring ${idx + 1}" />
                </div>
                <figcaption class="foto-caption">
                  <span>Foto Dokumentasi #${idx + 1}</span>
                  <span>${esc(bulanLabel)} ${esc(tahun)}</span>
                </figcaption>
              </figure>`
          })
          .join("")}</div>`
      : `<div class="no-foto">Tidak ada lampiran dokumentasi foto visual pada laporan ini</div>`

  const petugasNama = monev.createdBy?.namaLengkap || "Tim Monitoring dan Evaluasi (MONEV)"
  const petugasNip = monev.createdBy?.nip ? `NIP. ${monev.createdBy.nip}` : "Sekretariat Daerah Kab. Konawe Selatan"

  return `
  <article class="sheet">
    <!-- KOP SURAT RESMI PEMKAB KONAWE SELATAN -->
    <header class="kop-surat">
      <img class="kop-logo" src="${esc(logoSrc)}" alt="Lambang Kabupaten Konawe Selatan" />
      <div class="kop-teks">
        <div class="kop-pemkab">PEMERINTAH KABUPATEN KONAWE SELATAN</div>
        <div class="kop-sekda">SEKRETARIAT DAERAH</div>
        <div class="kop-alamat">Jalan Drs.H.Jacob Silondae No. 1, Kompleks Perkantoran Pemda,</div>
        <div class="kop-alamat">Kel. Potoro, Kec. Andoolo Kab. Konawe Selatan Provinsi Sulawesi Tenggara. www.konaweselatankab.go.id</div>
      </div>
    </header>

    <!-- JUDUL LAPORAN -->
    <div class="judul-banner">
      <div class="judul-utama">LAPORAN HASIL MONITORING PELAKSANAAN KEGIATAN APBD/DAK</div>
      <div class="judul-meta">
        <span class="meta-pill">PERIODE TRIWULAN ${esc(triwulan)}</span>
        <span class="meta-dot">•</span>
        <span class="meta-pill">TAHUN ANGGARAN ${esc(tahun)}</span>
        <span class="meta-dot">•</span>
        <span class="meta-date">Kunjungan: ${esc(tanggalMonevStr)}</span>
      </div>
    </div>

    <!-- TABEL IDENTITAS PAKET & KONTRAK -->
    <div class="section-box">
      <div class="section-header">
        <span class="section-num">01</span>
        <span class="section-title">DATA IDENTITAS PAKET &amp; KONTRAK KEGIATAN</span>
      </div>
      <table class="info-table">
        <tbody>
          ${infoHtml}
        </tbody>
      </table>
    </div>

    <!-- DOKUMENTASI VISUAL PELAKSANAAN MONITORING -->
    <div class="section-box">
      <div class="section-header">
        <span class="section-num">02</span>
        <span class="section-title">DOKUMENTASI PELAKSANAAN MONITORING</span>
        <span class="section-tag">BULAN: ${esc(bulanLabel)} ${esc(tahun)}</span>
      </div>
      ${fotoHtml}
    </div>

    <!-- HASIL EVALUASI LAPANGAN (KONDISI FISIK, PERMASALAHAN, SARAN) -->
    <div class="section-box">
      <div class="section-header">
        <span class="section-num">03</span>
        <span class="section-title">HASIL EVALUASI &amp; REKOMENDASI TIM MONEV</span>
      </div>

      <div class="eval-grid">
        <div class="eval-card eval-kondisi">
          <div class="eval-label">KONDISI FISIK KEGIATAN</div>
          <div class="eval-body">${multiline(monev.kondisiFisik)}</div>
        </div>

        <div class="eval-card eval-masalah">
          <div class="eval-label">PERMASALAHAN DI LAPANGAN</div>
          <div class="eval-body">${multiline(monev.permasalahan)}</div>
        </div>

        <div class="eval-card eval-saran">
          <div class="eval-label">SARAN &amp; TINDAK LANJUT</div>
          <div class="eval-body">${multiline(monev.saran)}</div>
        </div>
      </div>
    </div>

    <!-- CATATAN DOKUMEN ELEKTRONIK (RINGKAS & RAPI) -->
    <div class="doc-note">
      <strong>Catatan Dokumen:</strong> Laporan ini diterbitkan secara elektronik melalui sistem <em>MONALISA KONSEL</em> berdasarkan hasil monitoring dan evaluasi lapangan Tim MONEV Pemerintah Kabupaten Konawe Selatan.
    </div>

    <!-- TANDA TANGAN KABAG ADPEM (DI-HIDDEN SEMENTARA SESUAI INSTRUKSI) -->
    <!--
    <div class="ttd-row">
      <div class="ttd-box-right">
        <div>Andoolo, ${esc(tanggalMonevStr)}</div>
        <div class="ttd-jabatan">Kepala Bagian Administrasi Pembangunan<br/>Setda Kab. Konawe Selatan</div>
        <div class="ttd-space"></div>
        <div class="ttd-nama">( .................................................... )</div>
        <div class="ttd-nip">NIP. ....................................................</div>
      </div>
    </div>
    -->

    <!-- FOOTER HALAMAN -->
    <footer class="sheet-footer">
      <span><strong>MONALISA KONSEL</strong> · Bagian Administrasi Pembangunan Setda Kab. Konawe Selatan</span>
      <span>Dicetak: ${esc(printedAt)}</span>
      <span>Halaman <strong>${pageIndex + 1}</strong> dari ${totalPages}</span>
    </footer>
  </article>`
}

/**
 * Cetak laporan hasil monitoring lapangan (format F4 / Folio) lewat jendela print browser
 * dengan Kop Resmi Sekretariat Daerah Kab. Konawe Selatan.
 */
export async function cetakLaporanMonev(
  paket: MonevPaketInfo,
  laporan: MonevLapanganItem | MonevLapanganItem[],
) {
  const items = Array.isArray(laporan) ? laporan : [laporan]
  if (items.length === 0) return false

  const win = window.open("", "_blank", "width=1100,height=850")
  if (!win) {
    alert("Pop-up browser diblokir. Izinkan pop-up untuk mencetak laporan.")
    return false
  }

  // Konversi logo pemda & seluruh foto ke Base64 Data URL agar bebas kendala CORS di jendela print
  const logoOriginUrl = new URL("/logo_konsel.webp", window.location.origin).href
  const logoDataUrl = await toDataUrl(logoOriginUrl)

  const itemsProcessed: MonevLapanganItem[] = await Promise.all(
    items.map(async (item) => {
      const processedFotos = await Promise.all(
        (item.fotos || []).map(async (foto) => {
          const directUrl = monevFotoUrl(foto)
          const dataUrl = await toDataUrl(directUrl)
          return {
            ...foto,
            pathFile: dataUrl,
          }
        }),
      )
      return {
        ...item,
        fotos: processedFotos,
      }
    }),
  )

  const ordered = [...itemsProcessed].sort(
    (a, b) =>
      new Date(a.tanggalMonev).getTime() - new Date(b.tanggalMonev).getTime(),
  )

  const printedAt =
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Makassar",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()) + " WITA"

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Laporan Monev - ${esc(paket.namaPaket)}</title>
<style>
  @page {
    size: 215.9mm 330mm;
    margin: 8mm 12mm;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    background: #e8edf0;
    color: #172e3c;
    font-family: "Bookman Old Style", "Times New Roman", Georgia, serif;
    font-size: 9.5pt;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Toolbar Pratinjau di Layar */
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 10px 20px;
    background: #153747;
    color: #fff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  }
  .toolbar small {
    display: block;
    color: #d4e2e7;
    margin-top: 2px;
    font-size: 11px;
  }
  .toolbar button {
    border: 0;
    border-radius: 6px;
    background: #197365;
    color: #fff;
    padding: 9px 16px;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .toolbar button:hover {
    background: #145e52;
  }

  /* Lembar Kertas F4 (Pas 1 Halaman Tanpa Terpotong) */
  .sheet {
    width: 215.9mm;
    max-width: 100%;
    min-height: auto;
    margin: 12px auto;
    padding: 8mm 12mm;
    background: #ffffff;
    box-shadow: 0 4px 22px rgba(21, 55, 71, 0.12);
    display: flex;
    flex-direction: column;
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: always;
  }
  .sheet:last-of-type {
    page-break-after: auto;
  }

  /* Kop Surat Resmi Pemkab Konawe Selatan */
  .kop-surat {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 5px;
    border-bottom: 2.5px solid #000;
    position: relative;
    margin-bottom: 7px;
  }
  .kop-surat::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -4px;
    border-bottom: 1px solid #000;
  }
  .kop-logo {
    width: 54px;
    height: 64px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .kop-teks {
    flex: 1;
    text-align: center;
    color: #000;
    font-family: "Times New Roman", Georgia, serif;
    padding-right: 12px;
  }
  .kop-pemkab {
    font-size: 13pt;
    font-weight: 700;
    letter-spacing: 0.3px;
    line-height: 1.15;
  }
  .kop-sekda {
    font-size: 16pt;
    font-weight: 800;
    letter-spacing: 0.5px;
    line-height: 1.15;
    margin: 1px 0 2px;
  }
  .kop-alamat {
    font-size: 8.5pt;
    font-weight: 400;
    line-height: 1.2;
    color: #111;
  }

  /* Banner Judul Laporan */
  .judul-banner {
    text-align: center;
    margin: 4px 0 7px;
    padding: 5px 10px;
    background: #f4f7f8;
    border: 1px solid #d7e2e5;
    border-top: 2.5px solid #153747;
    border-radius: 4px;
  }
  .judul-utama {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    font-weight: 800;
    color: #153747;
    letter-spacing: 0.3px;
  }
  .judul-meta {
    margin-top: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
    font-weight: 700;
    color: #197365;
  }
  .meta-dot {
    color: #94a3b8;
  }
  .meta-date {
    color: #4e6570;
    font-weight: 600;
  }

  /* Section Box */
  .section-box {
    margin-bottom: 7px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #153747;
    color: #ffffff;
    padding: 3.5px 8px;
    border-radius: 3px 3px 0 0;
    font-family: Arial, Helvetica, sans-serif;
  }
  .section-num {
    background: #197365;
    color: #fff;
    font-size: 7pt;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 2px;
  }
  .section-title {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.3px;
    flex: 1;
  }
  .section-tag {
    font-size: 7pt;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.15);
    padding: 1px 6px;
    border-radius: 2px;
  }

  /* Tabel Identitas Paket */
  table.info-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #cbd5d9;
    border-top: 0;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
  }
  table.info-table tr:nth-child(even) {
    background: #f8fafb;
  }
  table.info-table td {
    padding: 2.5px 6px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
    line-height: 1.25;
  }
  table.info-table td.lbl {
    width: 170px;
    font-weight: 700;
    color: #334e5c;
    white-space: nowrap;
  }
  table.info-table td.sep {
    width: 10px;
    text-align: center;
    font-weight: 700;
    color: #64748b;
  }
  table.info-table td.val {
    color: #0f172a;
    font-weight: 600;
  }
  .badge-money {
    color: #0f5132;
    background: #d1e7dd;
    padding: 1px 6px;
    border-radius: 2px;
    font-weight: 800;
  }
  .badge-progress {
    color: #153747;
    background: #e0f2fe;
    border: 1px solid #7dd3fc;
    padding: 1px 7px;
    border-radius: 2px;
    font-weight: 800;
  }

  /* Grid Foto Dokumentasi */
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 6px;
    border: 1px solid #cbd5d9;
    border-top: 0;
    background: #fcfdfd;
  }
  .foto-card {
    margin: 0;
    border: 1px solid #cbd5d9;
    border-radius: 3px;
    background: #ffffff;
    padding: 4px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .foto-frame {
    width: 100%;
    height: 44mm;
    overflow: hidden;
    border-radius: 2px;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .foto-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .foto-caption {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 2px 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7pt;
    font-weight: 700;
    color: #475569;
  }
  .no-foto {
    padding: 10px;
    text-align: center;
    font-style: italic;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
    color: #64748b;
    border: 1px solid #cbd5d9;
    border-top: 0;
    background: #f8fafc;
  }

  /* 3 Kotak Evaluasi (Kondisi Fisik, Permasalahan, Saran) */
  .eval-grid {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 6px;
    border: 1px solid #cbd5d9;
    border-top: 0;
    background: #fff;
  }
  .eval-card {
    padding: 4.5px 8px;
    border: 1px solid #d7e2e5;
    border-radius: 3px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .eval-kondisi {
    border-left: 3.5px solid #197365;
    background: #f6f9f9;
  }
  .eval-masalah {
    border-left: 3.5px solid #b89042;
    background: #fcfaf5;
  }
  .eval-saran {
    border-left: 3.5px solid #153747;
    background: #f4f7f8;
  }
  .eval-label {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7.5pt;
    font-weight: 800;
    text-decoration: underline;
    color: #153747;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
  }
  .eval-body {
    font-family: "Bookman Old Style", Georgia, serif;
    font-size: 8.5pt;
    color: #111;
    line-height: 1.35;
    text-align: justify;
  }

  /* Catatan Dokumen Elektronik */
  .doc-note {
    margin-top: 4px;
    margin-bottom: 6px;
    padding: 4px 8px;
    background: #f8fafc;
    border: 1px dashed #cbd5d9;
    border-radius: 3px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7pt;
    color: #475569;
    line-height: 1.3;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .doc-note strong {
    color: #153747;
  }

  /* Baris Tanda Tangan (Hidden Sementara) */
  .ttd-row {
    display: none !important;
  }

  /* Footer Halaman */
  .sheet-footer {
    margin-top: auto;
    padding-top: 6px;
    border-top: 1px solid #cbd5d9;
    display: flex;
    justify-content: space-between;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7pt;
    color: #536874;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sheet-footer strong {
    color: #153747;
  }

  @media print {
    html, body {
      background: #ffffff;
      height: 100%;
    }
    .toolbar {
      display: none !important;
    }
    .sheet {
      width: 100%;
      min-height: 100%;
      margin: 0;
      padding: 0;
      box-shadow: none;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
    }
    .sheet:last-of-type {
      page-break-after: auto;
    }
    .ttd-row {
      display: none !important;
    }
  }
</style>
</head>
<body>
  <nav class="toolbar" aria-label="Aksi laporan">
    <div>
      <strong>Pratinjau Laporan Hasil Monitoring Lapangan (Tim MONEV)</strong>
      <small>Kertas F4 / Folio · Pilih "Simpan sebagai PDF" pada tujuan cetak. Aktifkan opsi Background Graphics bila diperlukan.</small>
    </div>
    <button id="btn-print" type="button">Cetak / Simpan PDF</button>
  </nav>
  ${ordered.map((m, idx) => renderLaporan(paket, m, logoDataUrl, printedAt, idx, ordered.length)).join("\n")}
  <script>
    (function () {
      var btn = document.getElementById("btn-print");
      if (btn) {
        btn.addEventListener("click", function () {
          window.focus();
          window.print();
        });
      }
      var imgs = Array.prototype.slice.call(document.images);
      var pending = imgs.filter(function (i) { return !i.complete; });
      function go() {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 300);
      }
      if (pending.length === 0) return go();
      var left = pending.length;
      pending.forEach(function (img) {
        var done = function () {
          left -= 1;
          if (left <= 0) go();
        };
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      });
    })();
  </script>
</body>
</html>`

  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}
