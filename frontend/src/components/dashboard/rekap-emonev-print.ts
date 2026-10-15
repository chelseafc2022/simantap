import { buildOriginalRekapReportHtml } from "./rekap-emonev-original-print"

export type RekapScope = "semua" | "opd" | "kecamatan"
export type RekapTemplate = "full" | "simple" | "awal"

interface RekapRow {
  namaOpd: string
  totalPagu: number
  realisasiKeuangan: number
  persenKeuangan: number
  persenFisik: number
  kombinasi: number
  totalPaket: number
}

interface RekapTotal {
  pagu: number
  keu: number
  persenKeuangan: number
  persenFisik: number
  kombinasi: number
}

export interface RekapReport {
  tahun: number
  namaBulanAktif: string
  opdPenyedia: RekapRow[]
  opdNonPenyedia: RekapRow[]
  kecamatanPenyedia: RekapRow[]
  kecamatanNonPenyedia: RekapRow[]
  totalOpd: RekapTotal
  totalKecamatan: RekapTotal
  grandTotal: RekapTotal
  logoUrl: string
  printedAt?: Date
  scope?: RekapScope
}

const scopeLabel = (scope?: RekapScope) => scope === "opd" ? "OPD" : scope === "kecamatan" ? "Kecamatan" : "OPD & kecamatan"
const totalLabel = (scope?: RekapScope) => scope === "opd" ? "Total OPD" : scope === "kecamatan" ? "Total kecamatan" : "Total daerah"

const escapeHtml = (value: string | number) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!))
const number = (value: number) => Number.isFinite(value) ? value : 0
const rupiah = (value: number) => number(value).toLocaleString("id-ID")
const percent = (value: number) => number(value).toLocaleString("id-ID", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}) + "%"

// Allow extra room for long institution names instead of shrinking the type.
function paginate(rows: RekapRow[]) {
  const pages: { row: RekapRow; index: number }[][] = []
  let page: { row: RekapRow; index: number }[] = []
  let used = 0
  rows.forEach((row, index) => {
    const cost = Math.ceil(row.namaOpd.length / 42) + 0.9
    if (page.length && used + cost > 24) {
      pages.push(page)
      page = []
      used = 0
    }
    page.push({ row, index })
    used += cost
  })
  if (page.length) pages.push(page)
  return pages
}

export function buildRekapReportHtml(report: RekapReport) {
  const { tahun, namaBulanAktif, opdPenyedia, opdNonPenyedia, kecamatanPenyedia,
    kecamatanNonPenyedia, totalOpd, totalKecamatan, grandTotal, logoUrl } = report
  const period = `${escapeHtml(namaBulanAktif)} ${escapeHtml(tahun)}`
  const printedAt = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(report.printedAt ?? new Date()) + " WITA"
  const activeRows = [...opdPenyedia, ...kecamatanPenyedia]
  const inactiveCount = opdNonPenyedia.length + kecamatanNonPenyedia.length
  const totalCount = activeRows.length + inactiveCount
  const zeroKeu = activeRows.filter((row) => row.persenKeuangan === 0).length
  const zeroFisik = activeRows.filter((row) => row.persenFisik === 0).length
  const totalPaket = activeRows.reduce((sum, row) => sum + number(row.totalPaket), 0)
  const bar = (value: number) => `<span class="bar"><i style="width:${Math.min(100, Math.max(0, number(value)))}%"></i></span>`
  const metric = (label: string, value: string, note: string, progress?: number) => `
    <div class="metric"><div class="eyebrow">${label}</div><strong>${value}</strong>
    ${progress === undefined ? '<div class="metric-rule"></div>' : bar(progress)}<small>${note}</small></div>`
  const summaryRow = (label: string, count: number, total: RekapTotal, overall = false) => `
    <tr class="${overall ? "total" : ""}"><th scope="row">${label}</th><td class="center">${count}</td>
    <td class="num">${rupiah(total.pagu)}</td><td class="num">${rupiah(total.keu)}</td>
    <td class="num">${percent(total.persenKeuangan)}</td><td class="num">${percent(total.persenFisik)}</td>
    <td class="num combined">${percent(total.kombinasi)}</td></tr>`

  const pages: { title: string; subtitle: string; content: string; summary?: boolean }[] = [{
    title: "Realisasi Fisik & Keuangan",
    subtitle: `Ringkasan eksekutif · ${scopeLabel(report.scope)}`,
    summary: true,
    content: `
      <div class="metrics">
        ${metric("Total pagu pembangunan", `<span class="currency">Rp</span> ${rupiah(grandTotal.pagu)}`, "Akumulasi unit dengan paket tercatat")}
        ${metric("Realisasi keuangan", `<span class="currency">Rp</span> ${rupiah(grandTotal.keu)}`, `${percent(grandTotal.persenKeuangan)} dari total pagu`, grandTotal.persenKeuangan)}
        ${metric("Rata-rata realisasi fisik", percent(grandTotal.persenFisik), "Rata-rata OPD Penyedia yang dipilih", grandTotal.persenFisik)}
        ${metric("Capaian gabungan", percent(grandTotal.kombinasi), "Rata-rata persentase keuangan dan fisik", grandTotal.kombinasi)}
      </div>
      <div class="section-heading"><h2>01 <span>Ikhtisar capaian ${scopeLabel(report.scope)}</span></h2><span>Nilai keuangan dalam rupiah</span></div>
      <table class="summary-table"><colgroup><col style="width:23%"><col style="width:7%"><col style="width:18%"><col style="width:18%"><col style="width:12%"><col style="width:11%"><col style="width:11%"></colgroup>
        <thead><tr><th scope="col">Kelompok unit</th><th scope="col">Unit¹</th><th scope="col">Pagu (Rp)</th><th scope="col">Realisasi (Rp)</th><th scope="col">Keuangan</th><th scope="col">Fisik</th><th scope="col">Gabungan</th></tr></thead>
        <tbody>${report.scope !== "kecamatan" ? summaryRow("Organisasi perangkat daerah", opdPenyedia.length, totalOpd) : ""}
        ${report.scope !== "opd" ? summaryRow("Kecamatan", kecamatanPenyedia.length, totalKecamatan) : ""}
        ${summaryRow(totalLabel(report.scope), activeRows.length, grandTotal, true)}</tbody>
      </table>
      <div class="summary-bottom">
        <section class="coverage"><div class="eyebrow">Cakupan pelaporan</div>
          <div class="coverage-numbers"><div><b>${totalCount}</b><span>unit terdaftar</span></div><div><b>${activeRows.length}</b><span>OPD Penyedia</span></div><div><b>${rupiah(totalPaket)}</b><span>paket tercatat</span></div></div>
          <p>${inactiveCount > 0 ? `${inactiveCount} unit belum memiliki paket tercatat pada data periode ini. Daftarnya disajikan terpisah dalam lampiran.` : totalCount > 0 ? "Seluruh unit pada data periode ini memiliki paket tercatat." : "Belum ada data unit pada rekapitulasi periode ini."}</p>
        </section>
        <section class="attention"><div class="eyebrow">Catatan untuk tindak lanjut</div>
          <p>${activeRows.length ? `<strong>${zeroKeu} unit</strong> dengan realisasi keuangan 0% dan <strong>${zeroFisik} unit</strong> dengan realisasi fisik 0%.` : "Belum ada unit dengan paket tercatat pada data periode ini."}</p>
          <p>Konfirmasikan kelengkapan input dan progres pelaksanaan kepada unit terkait. Nilai 0% tidak serta-merta menunjukkan keterlambatan terhadap target.</p>
        </section>
      </div>
      <section class="method"><h3>Dasar pembacaan laporan</h3>
        <p>¹ OPD Penyedia adalah OPD/kecamatan dengan minimal satu paket tercatat. Ringkasan dan subtotal hanya mencakup unit tersebut. Cakupan laporan: ${scopeLabel(report.scope)}. Data dan total mengikuti cakupan cetak, tanpa mengikuti pencarian tabel.</p>
        <p>Keuangan per unit mengikuti basis pada dashboard: nilai kontrak jika seluruh paket telah berkontrak dan nilainya tersedia; selain itu pagu (atau kontrak jika pagu tidak tersedia). Keuangan agregat = total realisasi ÷ total pagu. Fisik agregat = rata-rata persentase fisik OPD Penyedia. Gabungan = (keuangan + fisik) ÷ 2. Pembulatan mengikuti dashboard.</p>
      </section>`,
  }]

  const addDetail = (title: string, rows: RekapRow[], total?: RekapTotal) => {
    const chunks = paginate(rows)
    chunks.forEach((chunk, pageIndex) => {
      const last = pageIndex === chunks.length - 1
      const inactive = !total
      pages.push({
        title,
        subtitle: `${inactive ? "OPD Non Penyedia" : "Diurutkan berdasarkan capaian gabungan tertinggi"} · ${rows.length} unit · Bagian ${pageIndex + 1}/${chunks.length}`,
        content: `<div class="section-heading"><h2>${inactive ? "Lampiran" : "Rincian capaian"}</h2><span>${inactive ? "Status berdasarkan data yang tersedia" : "Nilai keuangan dalam rupiah · Persentase dua desimal"}</span></div>
          <table class="detail-table">${inactive ? '<colgroup><col style="width:4%"><col style="width:50%"><col style="width:46%"></colgroup><thead><tr><th scope="col">No.</th><th scope="col">Organisasi / unit kerja</th><th scope="col" style="text-align:left">Keterangan</th></tr></thead>' : `<colgroup><col style="width:4%"><col style="width:30%"><col style="width:18%"><col style="width:18%"><col style="width:10%"><col style="width:10%"><col style="width:10%"></colgroup>
          <thead><tr><th scope="col">No.</th><th scope="col">Organisasi / unit kerja</th><th scope="col">Pagu (Rp)</th><th scope="col">Realisasi (Rp)</th><th scope="col">Keuangan<br>(%)</th><th scope="col">Fisik<br>(%)</th><th scope="col">Gabungan<br>(%)</th></tr></thead>`}
          <tbody>${chunk.map(({ row, index }) => `<tr><td class="center rank">${index + 1}</td><th scope="row" class="unit">${escapeHtml(row.namaOpd)}</th>
            ${inactive ? '<td class="no-package">Belum ada paket tercatat pada periode ini</td>' : `
            <td class="num">${rupiah(row.totalPagu)}</td><td class="num">${rupiah(row.realisasiKeuangan)}</td>
            <td class="num ${row.persenKeuangan === 0 ? "zero" : ""}">${percent(row.persenKeuangan)}</td>
            <td class="num ${row.persenFisik === 0 ? "zero" : ""}">${percent(row.persenFisik)}</td>
            <td class="num combined">${percent(row.kombinasi)}</td>`}</tr>`).join("")}
            ${last && total ? `<tr class="total"><th colspan="2" scope="row">Subtotal ${title}</th><td class="num">${rupiah(total.pagu)}</td><td class="num">${rupiah(total.keu)}</td><td class="num">${percent(total.persenKeuangan)}</td><td class="num">${percent(total.persenFisik)}</td><td class="num">${percent(total.kombinasi)}</td></tr>` : ""}
          </tbody></table>
          <div class="table-note">${inactive ? "Unit pada lampiran ini tidak dimasukkan dalam perhitungan rata-rata capaian. Status ini menunjukkan ketersediaan data paket, bukan penetapan status penyedia secara administratif." : "Gabungan = rata-rata persentase keuangan dan fisik. Nilai 0,00% menunjukkan belum ada realisasi tercatat pada indikator tersebut. Dasar perhitungan tersedia pada halaman ringkasan."}</div>
          ${!last ? '<p class="continued">Rincian dilanjutkan pada halaman berikutnya →</p>' : ""}`,
      })
    })
  }
  addDetail("Organisasi perangkat daerah", opdPenyedia, totalOpd)
  addDetail("Kecamatan", kecamatanPenyedia, totalKecamatan)
  addDetail("OPD Non Penyedia", opdNonPenyedia)
  addDetail("Kecamatan Non Penyedia", kecamatanNonPenyedia)

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Laporan RFK - ${period} - ${scopeLabel(report.scope)} - MONALISA KONSEL</title><style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin:0; background:#e8edf0; color:#172e3c; font-family:Arial,Helvetica,sans-serif; font-size:9pt; line-height:1.45; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .toolbar { position:sticky; top:0; z-index:1; display:flex; justify-content:space-between; align-items:center; gap:20px; padding:14px 28px; background:#153747; color:#fff; font-size:13px; }
    .toolbar small { display:block; color:#d4e2e7; margin-top:3px; }
    button { border:0; border-radius:6px; background:#fff; color:#153747; padding:11px 20px; font-weight:700; cursor:pointer; white-space:nowrap; }
    button:focus-visible { outline:3px solid #d6ad58; outline-offset:3px; }
    .sheet { width:273mm; min-height:185mm; margin:20px auto; padding:0; background:white; display:flex; flex-direction:column; }
    @media screen { .sheet { width:297mm; min-height:210mm; padding:12mm; box-shadow:0 4px 22px #15374718; } }
    .masthead { display:flex; align-items:center; gap:12px; padding-bottom:10px; border-bottom:2px solid #153747; }
    .crest { width:37px; height:46px; object-fit:contain; }
    .identity { flex:1; } .eyebrow { font-size:8pt; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
    .identity strong { display:block; font-size:12pt; letter-spacing:.3px; }
    .identity small { color:#536874; font-size:8pt; }
    .edition { text-align:right; font-size:8pt; color:#536874; } .edition strong { display:block; font-size:11pt; color:#153747; }
    .title-block { display:flex; justify-content:space-between; align-items:center; gap:20px; margin:14px 0 12px; }
    h1 { font-size:23pt; line-height:1.15; letter-spacing:-.7px; margin:0 0 6px; font-weight:700; }
    .detail h1 { font-size:20pt; }
    .subtitle { margin:0; font-size:9pt; color:#536874; }
    .report-tag { flex-shrink:0; padding:7px 12px; border:1px solid #b8cbd1; border-left:3px solid #b89042; color:#33515c; font-size:8pt; font-weight:700; }
    .metrics { display:grid; grid-template-columns:1.3fr 1.3fr 1fr 1fr; gap:12px; margin-bottom:14px; }
    .metric { border:1px solid #d7e2e5; border-top:3px solid #197365; padding:10px; border-radius:3px; background:#f6f9f9; }
    .metric .eyebrow { font-size:7.5pt; letter-spacing:.5px; color:#4e6570; }
    .metric strong { display:block; font-size:17pt; margin:6px 0; white-space:nowrap; letter-spacing:-.5px; }
    .metric:nth-child(-n+2) strong { font-size:14pt; } .currency { font-size:9pt; font-weight:400; }
    .metric small { display:block; color:#526773; font-size:7.5pt; margin-top:7px; }
    .bar { display:block; height:4px; background:#dce7e7; overflow:hidden; border-radius:2px; } .bar i { display:block; height:100%; background:#197365; }
    .metric-rule { height:4px; border-top:1px solid #d7e2e5; }
    .section-heading { display:flex; justify-content:space-between; align-items:center; margin:0 0 9px; }
    h2 { margin:0; font-size:10pt; color:#197365; } h2 span { margin-left:8px; color:#172e3c; }
    .section-heading>span { font-size:7.5pt; color:#536874; }
    table { width:100%; border-collapse:collapse; table-layout:fixed; font-variant-numeric:tabular-nums; }
    thead { display:table-header-group; }
    thead th { background:#153747; color:#fff; font-weight:600; font-size:8pt; padding:8px 8px; text-align:right; border:1px solid #153747; }
    thead th:first-child, thead th:nth-child(2) { text-align:left; }
    td, tbody th { padding:7px 8px; border-bottom:1px solid #dce5e8; font-size:9pt; }
    tbody th { text-align:left; font-weight:500; overflow-wrap:anywhere; }
    tbody tr:nth-child(even) { background:#f4f7f8; }
    .num { text-align:right; white-space:nowrap; } .center { text-align:center; } .rank { color:#647984; }
    .combined { color:#146658; font-weight:700; background:#e9f3ef; }
    .total th, .total td { background:#e0ede9; color:#153f38; border-top:2px solid #508a7e; font-weight:700; }
    .summary-bottom { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:12px; }
    .coverage, .attention { padding:10px 12px; border:1px solid #d7e2e5; border-radius:3px; }
    .attention { border-left:3px solid #b89042; background:#fcfaf5; }
    .coverage-numbers { display:flex; gap:35px; margin-top:8px; } .coverage-numbers b { font-size:17pt; display:block; line-height:1.2; }
    .coverage-numbers span { color:#536874; font-size:8pt; }
    p { margin:7px 0 0; } .coverage p, .attention p { font-size:8.5pt; color:#415965; }
    .summary .title-block { margin:11px 0 10px; }
    .summary h1 { font-size:21pt; }
    .summary .metrics { margin-bottom:10px; }
    .summary .metric strong { margin:4px 0; }
    .summary .coverage p, .summary .attention p { font-size:8pt; line-height:1.35; }
    .summary .method { line-height:1.35; }
    .method { margin:10px 0 7px; color:#526773; font-size:7.5pt; line-height:1.5; }
    h3 { margin:0; font-size:8pt; color:#304d5a; } .method p { margin-top:4px; }
    .detail-table td, .detail-table tbody th { padding:5px 8px; font-size:9pt; line-height:1.35; }
    .unit { text-transform:uppercase; } .zero { font-weight:700; color:#91521b; }
    .no-package { color:#627681; font-size:8.5pt; font-style:italic; }
    .table-note { margin-top:12px; font-size:8pt; color:#536874; padding:10px 12px; background:#f4f7f8; border-left:2px solid #a4bac3; }
    .continued { text-align:right; font-size:8pt; color:#536874; }
    footer { margin-top:auto; padding-top:11px; display:flex; justify-content:space-between; gap:12px; font-size:7pt; color:#536874; border-top:1px solid #bdcdd3; }
    .page-content { padding-bottom:10px; } footer strong { color:#153747; }
    tr, .metrics, .summary-bottom, .method { break-inside:avoid; }
    @media print { body { background:#fff; } .toolbar { display:none; } .sheet { margin:0; break-after:page; } .sheet:last-child { break-after:auto; } }
    </style></head><body>
    <nav class="toolbar" aria-label="Aksi laporan"><div><strong>Pratinjau laporan RFK · ${period}</strong><small>A4 lanskap · Pilih Simpan sebagai PDF untuk dibagikan. Nonaktifkan header/footer bawaan browser.</small></div><button id="print-report" type="button">Cetak / Simpan PDF</button></nav>
    ${pages.map((page, index) => `<article class="sheet ${page.summary ? "summary" : "detail"}">
      <header class="masthead"><img class="crest" src="${escapeHtml(logoUrl)}" alt="Lambang Kabupaten Konawe Selatan">
      <div class="identity"><div class="eyebrow">Pemerintah Kabupaten</div><strong>KONAWE SELATAN</strong><small>MONALISA KONSEL · Monitoring dan evaluasi pembangunan</small></div>
      <div class="edition">PERIODE PELAPORAN<strong>${period}</strong>Tahun anggaran ${escapeHtml(tahun)}</div></header>
      <main class="page-content"><div class="title-block"><div><h1>${page.title}</h1><p class="subtitle">${page.subtitle}</p></div><span class="report-tag">${page.summary ? "RINGKASAN EKSEKUTIF" : "LAPORAN RFK"}</span></div>${page.content}</main>
      <footer><span><strong>MONALISA KONSEL</strong> · Sumber: data rekapitulasi dashboard</span><span>Dicetak ${escapeHtml(printedAt)}</span><span>Halaman <strong>${index + 1}</strong> / ${pages.length}</span></footer>
    </article>`).join("")}</body></html>`
}

export function buildSimpleRekapReportHtml(report: RekapReport) {
  const { tahun, namaBulanAktif, opdPenyedia, opdNonPenyedia, kecamatanPenyedia,
    kecamatanNonPenyedia, totalOpd, totalKecamatan, grandTotal, logoUrl } = report
  const period = `${escapeHtml(namaBulanAktif)} ${escapeHtml(tahun)}`
  const width = 210
  const printedAt = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(report.printedAt ?? new Date()) + " WITA"
  const totalRow = (label: string, total: RekapTotal, grand = false) => `
    <tr class="${grand ? "grand-total" : "subtotal"}"><th colspan="2" scope="row">${label}</th>
    <td class="num">${rupiah(total.pagu)}</td><td class="num">${rupiah(total.keu)}</td>
    <td class="num">${percent(total.persenKeuangan)}</td><td class="num">${percent(total.persenFisik)}</td><td class="num">${percent(total.kombinasi)}</td></tr>`
  const group = (label: string, rows: RekapRow[], total?: RekapTotal) => {
    if (!rows.length) return ""
    const heading = `<tr class="group"><th colspan="7" scope="rowgroup">${label} <span>(${rows.length} unit)</span></th></tr>`
    const body = rows.map((row, index) => `<tr class="data-row">
      <td class="center">${index + 1}</td><th scope="row" class="unit">${escapeHtml(row.namaOpd)}</th>
      ${total ? `<td class="num">${rupiah(row.totalPagu)}</td><td class="num">${rupiah(row.realisasiKeuangan)}</td>
      <td class="num">${percent(row.persenKeuangan)}</td><td class="num">${percent(row.persenFisik)}</td><td class="num combined">${percent(row.kombinasi)}</td>`
      : '<td colspan="5" class="no-package">Belum ada paket tercatat</td>'}</tr>`)
    // Keep each group heading with its first row, and its subtotal with the last.
    if (body.length === 1) return `<tbody class="keep">${heading}${body[0]}${total ? totalRow(`Subtotal ${label}`, total) : ""}</tbody>`
    return `<tbody class="keep">${heading}${body[0]}</tbody><tbody>${body.slice(1, -1).join("")}</tbody>
      <tbody class="keep">${body[body.length - 1]}${total ? totalRow(`Subtotal ${label}`, total) : ""}</tbody>`
  }
  const hasRows = opdPenyedia.length + kecamatanPenyedia.length + opdNonPenyedia.length + kecamatanNonPenyedia.length > 0
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Persentase Laporan Realisasi Fisik dan Keuangan - ${period} - ${scopeLabel(report.scope)}</title><style>
      @page {
        size: A4 portrait;
        margin: 8mm 8mm 12mm;
        @bottom-left { content:"MONALISA KONSEL · Sumber: rekapitulasi dashboard"; font:7pt Arial; color:#52636b; }
        @bottom-right { content:"Halaman " counter(page) " / " counter(pages); font:7pt Arial; color:#52636b; }
      }
      * { box-sizing:border-box; }
      body { margin:0; background:#e8edef; font:8.5pt/1.3 Arial,Helvetica,sans-serif; color:#1f333d; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .toolbar { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:13px 24px; background:#183d48; color:white; font-size:13px; }
      .toolbar small { display:block; margin-top:3px; color:#dfebef; }
      button { padding:10px 16px; border:0; border-radius:5px; background:white; color:#183d48; font-weight:bold; cursor:pointer; white-space:nowrap; }
      button:focus-visible { outline:3px solid #d3ad66; outline-offset:3px; }
      .paper { width:${width}mm; margin:20px auto; padding:8mm; background:white; }
      table { width:100%; table-layout:fixed; border-collapse:collapse; font-variant-numeric:tabular-nums; }
      thead { display:table-header-group; }
      .masthead { padding:0 0 8px; border:0; background:white; text-align:left; }
      .heading { display:flex; align-items:center; gap:8px; border-bottom:2px solid #244f59; padding-bottom:6px; }
      .heading img { width:26px; height:33px; object-fit:contain; }
      .heading div { flex:1; }
      h1 { font-size:9.5pt; line-height:1.2; margin:0 0 2px; font-weight:700; color:#1f333d; }
      .subheading { font-size:6.8pt; font-weight:700; color:#244f59; letter-spacing:.2px; margin-bottom:2px; }
      .government { font-size:7.8pt; letter-spacing:.5px; font-weight:700; color:#1f333d; }
      .period { text-align:right; font-size:7.5pt; font-weight:400; white-space:nowrap; } .period strong { display:block; font-size:9.5pt; }
      .meta { display:flex; justify-content:space-between; gap:10px; font-size:7pt; color:#52636b; font-weight:400; margin-top:5px; }
      th, td { padding:4px 5px; border:1px solid #cbd5d9; font-size:8pt; }
      .columns th { background:#edf3f4; font-size:7.5pt; text-align:center; padding:5px 4px; color:#1f333d; }
      tbody th { text-align:left; font-weight:400; }
      .unit { overflow-wrap:anywhere; } .num { text-align:right; white-space:nowrap; }
      .center { text-align:center; color:#53656d; }
      .group th { background:#e3eeeb; font-weight:700; padding:4px 6px; font-size:8pt; }
      .group span { font-weight:400; font-size:7.5pt; }
      .combined { font-weight:700; } .no-package { color:#64747b; font-size:7.5pt; }
      .subtotal th, .subtotal td { background:#f1f5f5; font-weight:700; }
      .grand-total th, .grand-total td { border-top:2px solid #244f59; background:#e3eeeb; font-weight:700; }
      .empty { padding:20px; text-align:center; color:#52636b; }
      .notes { font-size:7pt; color:#52636b; margin-top:8px; line-height:1.45; }
      tr, .keep, .notes { break-inside:avoid; }
      @media print { body { background:white; } .toolbar { display:none; } .paper { width:auto; margin:0; padding:0; } }
    </style></head><body>
    <nav class="toolbar" aria-label="Aksi laporan"><div><strong>Laporan Simple · ${period} · ${scopeLabel(report.scope)}</strong><small>Ukuran A4 Portrait. Simpan sebagai PDF atau cetak. Nonaktifkan header/footer bawaan browser.</small></div><button id="print-report" type="button">Cetak / Simpan PDF</button></nav>
    <main class="paper"><table aria-label="Daftar progres bulanan OPD dan kecamatan">
      <colgroup><col style="width:4%"><col style="width:34%"><col style="width:18%"><col style="width:18%"><col style="width:8%"><col style="width:8%"><col style="width:10%"></colgroup>
      <thead><tr><th class="masthead" colspan="7">
        <div class="heading">
          <img src="${escapeHtml(logoUrl)}" alt="Lambang Kabupaten Konawe Selatan">
          <div>
            <h1>PERSENTASE LAPORAN REALISASI FISIK DAN KEUANGAN</h1>
            <div class="subheading">JENIS PENGADAAN : KONSTRUKSI, KONSULTANSI, BARANG DAN JASA LAINNYA</div>
            <div class="government">KABUPATEN KONAWE SELATAN</div>
          </div>
          <span class="period">Periode pelaporan<strong>${period}</strong></span>
        </div>
        <div class="meta"><span>Cakupan: ${scopeLabel(report.scope)} · OPD Penyedia diurutkan menurut capaian gabungan</span><span>Dicetak ${escapeHtml(printedAt)}</span></div>
      </th></tr><tr class="columns"><th scope="col">No.</th><th scope="col">OPD / Kecamatan</th><th scope="col">Pagu (Rp)</th><th scope="col">Realisasi (Rp)</th><th scope="col">Keuangan<br>(%)</th><th scope="col">Fisik<br>(%)</th><th scope="col">Gabungan<br>(%)</th></tr></thead>
      ${group("Organisasi perangkat daerah", opdPenyedia, totalOpd)}
      ${group("Kecamatan", kecamatanPenyedia, totalKecamatan)}
      ${hasRows ? `<tbody class="keep">${totalRow(`${totalLabel(report.scope)} (OPD Penyedia)`, grandTotal, true)}</tbody>` : '<tbody><tr><td colspan="7" class="empty">Belum ada data rekapitulasi untuk periode ini.</td></tr></tbody>'}
      ${group("OPD Non Penyedia", opdNonPenyedia)}
      ${group("Kecamatan Non Penyedia", kecamatanNonPenyedia)}
    </table>
    <p class="notes">Gabungan = (keuangan + fisik) ÷ 2. Keuangan per unit mengikuti basis pagu/kontrak pada dashboard; keuangan agregat = total realisasi ÷ total pagu. Fisik agregat = rata-rata unit OPD Penyedia.<br>
      Nilai 0% berarti belum ada realisasi tercatat. Unit Non Penyedia tidak masuk rata-rata. Data dan total mengikuti cakupan cetak (${scopeLabel(report.scope)}), tanpa mengikuti pencarian tabel.</p>
    </main></body></html>`
}

interface RekapPrintOptions {
  template: RekapTemplate
  scope: RekapScope
}

export function buildPrintableRekapReport(report: RekapReport, options: RekapPrintOptions) {
  const { scope, template } = options
  const zero: RekapTotal = { pagu: 0, keu: 0, persenKeuangan: 0, persenFisik: 0, kombinasi: 0 }
  const selected: RekapReport = {
    ...report,
    scope,
    opdPenyedia: scope === "kecamatan" ? [] : report.opdPenyedia,
    opdNonPenyedia: scope === "kecamatan" ? [] : report.opdNonPenyedia,
    kecamatanPenyedia: scope === "opd" ? [] : report.kecamatanPenyedia,
    kecamatanNonPenyedia: scope === "opd" ? [] : report.kecamatanNonPenyedia,
    totalOpd: scope === "kecamatan" ? zero : report.totalOpd,
    totalKecamatan: scope === "opd" ? zero : report.totalKecamatan,
    grandTotal: scope === "opd" ? report.totalOpd : scope === "kecamatan" ? report.totalKecamatan : report.grandTotal,
  }
  if (template === "awal") return buildOriginalRekapReportHtml(selected)
  if (template === "simple") return buildSimpleRekapReportHtml(selected)
  return buildRekapReportHtml(selected)
}

export async function printRekapReport(report: RekapReport, options: RekapPrintOptions) {
  const printWindow = window.open("", "_blank", "width=1200,height=850")
  if (!printWindow) {
    alert("Pop-up browser diblokir. Izinkan pop-up untuk membuka laporan.")
    return
  }
  printWindow.document.write(buildPrintableRekapReport(report, options))
  printWindow.document.close()
  const print = () => {
    if (!printWindow.closed) {
      printWindow.focus()
      printWindow.print()
    }
  }
  printWindow.document.getElementById("print-report")?.addEventListener("click", print)
  // Wait for the local crest and fonts; a missing image must not block printing.
  await Promise.all([
    printWindow.document.fonts.ready,
    ...Array.from(printWindow.document.images).map((img) => img.decode().catch(() => {
      img.style.visibility = "hidden"
    })),
  ])
  if (!printWindow.closed) printWindow.requestAnimationFrame(() => printWindow.requestAnimationFrame(print))
}
