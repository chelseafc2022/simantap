"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Printer, Search, FileDown, Building2, MapPin, CheckCircle2, AlertCircle } from "lucide-react"
import { isExcludedOpd } from "@/lib/utils"

interface RekapEmonevTableProps {
  opdMasterList: any[]
  rekapList: any[]
  tahun: number
  bulan: number
  namaBulanAktif: string
}

function formatRupiah(val: number) {
  if (!val || isNaN(val)) return "0"
  return Number(val).toLocaleString("id-ID")
}

export function RekapEmonevTable({
  opdMasterList,
  rekapList,
  tahun,
  bulan,
  namaBulanAktif,
}: RekapEmonevTableProps) {
  const [search, setSearch] = useState("")
  const [filterKategori, setFilterKategori] = useState<"semua" | "opd" | "kecamatan">("semua")

  // Gabungkan 65 Master OPD (40 OPD + 25 Kecamatan) dengan data rekap aktual
  const mergedList = useMemo(() => {
    // Buat map dari data rekap aktual berdasarkan opdId / kodeOpd / nama
    const rekapMap = new Map<string, any>()
    for (const r of rekapList) {
      if (r.opdId) rekapMap.set(String(r.opdId).toLowerCase().trim(), r)
      if (r.kodeOpd) rekapMap.set(String(r.kodeOpd).toLowerCase().trim(), r)
      if (r.namaOpd) rekapMap.set(String(r.namaOpd).toLowerCase().trim(), r)
    }

    // Jika master list tersedia, petakan semua master OPD
    const baseList = opdMasterList.length > 0 ? opdMasterList : rekapList

    return baseList.map((opd: any) => {
      const idKey = String(opd.id || opd.opdId || "").toLowerCase().trim()
      const nameKey = String(opd.namaOpd || opd.nama_instansi || "").toLowerCase().trim()
      const match = rekapMap.get(idKey) || rekapMap.get(nameKey)

      const namaOpd = opd.namaOpd || opd.nama_instansi || match?.namaOpd || "-"
      const isKecamatan = namaOpd.toUpperCase().includes("KECAMATAN")

      const totalPagu = Number(match?.totalPagu ?? match?.totalKontrak ?? opd.total_pagu ?? 0)
      const realisasiKeuangan = Number(match?.totalRealisasiKeuangan ?? opd.total_realisasi_keuangan ?? 0)
      const persenKeuangan = totalPagu > 0
        ? Number(((realisasiKeuangan / totalPagu) * 100).toFixed(2))
        : Number(match?.persenSerapanKeuangan ?? opd.realisasi_keuangan_persen ?? 0)
      const persenFisik = Number((match?.avgRealisasiFisik ?? opd.realisasi_fisik_persen ?? 0).toFixed(2))
      const kombinasi = Number(((persenKeuangan + persenFisik) / 2).toFixed(2))

      return {
        id: opd.id || opd.opdId || idKey,
        namaOpd,
        singkatan: opd.singkatan || match?.singkatan || "",
        isKecamatan,
        totalPagu,
        realisasiKeuangan,
        persenKeuangan,
        persenFisik,
        kombinasi,
        totalPaket: Number(match?.totalPaket ?? 0),
      }
    }).filter((item) => !isExcludedOpd(item.id) && !isExcludedOpd(item.namaOpd))
  }, [opdMasterList, rekapList])

  // Helper urutan kinerja terbaik (paling atas) ke bawah
  const sortByPerformanceDesc = (a: any, b: any) => {
    if (b.kombinasi !== a.kombinasi) {
      return b.kombinasi - a.kombinasi
    }
    if (b.persenFisik !== a.persenFisik) {
      return b.persenFisik - a.persenFisik
    }
    if (b.persenKeuangan !== a.persenKeuangan) {
      return b.persenKeuangan - a.persenKeuangan
    }
    if (b.totalPagu !== a.totalPagu) {
      return b.totalPagu - a.totalPagu
    }
    return a.namaOpd.localeCompare(b.namaOpd)
  }

  // Pisahkan OPD dan Kecamatan dengan urutan kinerja terbaik di atas
  const opdList = useMemo(() => {
    return mergedList.filter((d) => !d.isKecamatan).sort(sortByPerformanceDesc)
  }, [mergedList])

  const kecamatanList = useMemo(() => {
    return mergedList.filter((d) => d.isKecamatan).sort(sortByPerformanceDesc)
  }, [mergedList])

  // Hitung Subtotal OPD
  const totalOpd = useMemo(() => {
    let pagu = 0
    let keu = 0
    let sumFisik = 0
    opdList.forEach((d) => {
      pagu += d.totalPagu
      keu += d.realisasiKeuangan
      sumFisik += d.persenFisik
    })
    const persenKeuangan = pagu > 0 ? Number(((keu / pagu) * 100).toFixed(2)) : 0
    const persenFisik = opdList.length > 0 ? Number((sumFisik / opdList.length).toFixed(2)) : 0
    const kombinasi = Number(((persenKeuangan + persenFisik) / 2).toFixed(2))
    return { pagu, keu, persenKeuangan, persenFisik, kombinasi }
  }, [opdList])

  // Hitung Subtotal Kecamatan
  const totalKecamatan = useMemo(() => {
    let pagu = 0
    let keu = 0
    let sumFisik = 0
    kecamatanList.forEach((d) => {
      pagu += d.totalPagu
      keu += d.realisasiKeuangan
      sumFisik += d.persenFisik
    })
    const persenKeuangan = pagu > 0 ? Number(((keu / pagu) * 100).toFixed(2)) : 0
    const persenFisik = kecamatanList.length > 0 ? Number((sumFisik / kecamatanList.length).toFixed(2)) : 0
    const kombinasi = Number(((persenKeuangan + persenFisik) / 2).toFixed(2))
    return { pagu, keu, persenKeuangan, persenFisik, kombinasi }
  }, [kecamatanList])

  // Grand Total Daerah
  const grandTotal = useMemo(() => {
    const pagu = totalOpd.pagu + totalKecamatan.pagu
    const keu = totalOpd.keu + totalKecamatan.keu
    const totalCount = opdList.length + kecamatanList.length
    const persenKeuangan = pagu > 0 ? Number(((keu / pagu) * 100).toFixed(2)) : 0
    const persenFisik =
      totalCount > 0
        ? Number(
            (
              (totalOpd.persenFisik * opdList.length +
                totalKecamatan.persenFisik * kecamatanList.length) /
              totalCount
            ).toFixed(2)
          )
        : 0
    const kombinasi = Number(((persenKeuangan + persenFisik) / 2).toFixed(2))
    return { pagu, keu, persenKeuangan, persenFisik, kombinasi }
  }, [totalOpd, totalKecamatan, opdList.length, kecamatanList.length])

  // Filter Search
  const filteredOpd = useMemo(() => {
    if (!search.trim()) return opdList
    const q = search.toLowerCase()
    return opdList.filter(
      (d) => d.namaOpd.toLowerCase().includes(q) || d.singkatan.toLowerCase().includes(q)
    )
  }, [opdList, search])

  const filteredKecamatan = useMemo(() => {
    if (!search.trim()) return kecamatanList
    const q = search.toLowerCase()
    return kecamatanList.filter((d) => d.namaOpd.toLowerCase().includes(q))
  }, [kecamatanList, search])

  // Fungsi Cetak Laporan PDF Resmi (Mengadopsi format E-MONEV Kabupaten Konawe Selatan)
  const handleCetakPDF = () => {
    const d = new Date()
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ]
    const tanggalCetak = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
    let jam = d.getHours() < 10 ? `0${d.getHours()}` : d.getHours()
    let menit = d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes()
    const waktuCetak = `${jam}.${menit}`

    // Baris tabel OPD
    let rowsHtml = ""
    opdList.forEach((data, i) => {
      const styleKeu = data.persenKeuangan < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
      const styleFisik = data.persenFisik < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
      const styleKomb = data.kombinasi < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
      rowsHtml += `<tr>
        <td style="text-align:center;border:1px solid #000;padding:4px;">${i + 1}</td>
        <td style="border:1px solid #000;padding:4px;text-transform:uppercase;">${data.namaOpd}</td>
        <td style="text-align:right;border:1px solid #000;padding:4px;">${formatRupiah(data.totalPagu)}</td>
        <td style="text-align:right;border:1px solid #000;padding:4px;">${formatRupiah(data.realisasiKeuangan)}</td>
        <td style="text-align:center;border:1px solid #000;padding:4px;${styleKeu}">${data.persenKeuangan}%</td>
        <td style="text-align:center;border:1px solid #000;padding:4px;${styleFisik}">${data.persenFisik}%</td>
        <td style="text-align:center;border:1px solid #000;padding:4px;${styleKomb}">${data.kombinasi}%</td>
      </tr>`
    })

    // Subtotal OPD
    rowsHtml += `<tr style="background-color:#ffc000;font-weight:bold;font-style:italic;">
      <td colspan="2" style="text-align:right;border:1px solid #000;padding:5px 15px;">JUMLAH PERANGKAT DAERAH (OPD)</td>
      <td style="text-align:right;border:1px solid #000;padding:5px;">${formatRupiah(totalOpd.pagu)}</td>
      <td style="text-align:right;border:1px solid #000;padding:5px;">${formatRupiah(totalOpd.keu)}</td>
      <td style="text-align:center;border:1px solid #000;padding:5px;">${totalOpd.persenKeuangan}%</td>
      <td style="text-align:center;border:1px solid #000;padding:5px;">${totalOpd.persenFisik}%</td>
      <td style="text-align:center;border:1px solid #000;padding:5px;">${totalOpd.kombinasi}%</td>
    </tr>`

    // Pembatas & Baris Kecamatan
    if (kecamatanList.length > 0) {
      rowsHtml += `<tr style="background-color:#b8cce4;">
        <td colspan="7" style="font-weight:bold;border:1px solid #000;padding:6px 10px;text-align:left;">KECAMATAN SE-KABUPATEN KONAWE SELATAN</td>
      </tr>`

      kecamatanList.forEach((data, i) => {
        const styleKeu = data.persenKeuangan < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
        const styleFisik = data.persenFisik < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
        const styleKomb = data.kombinasi < 100 ? "color:#c00000" : "color:#2e7d32;font-weight:bold"
        rowsHtml += `<tr>
          <td style="text-align:center;border:1px solid #000;padding:4px;">${i + 1}</td>
          <td style="border:1px solid #000;padding:4px;text-transform:uppercase;">${data.namaOpd}</td>
          <td style="text-align:right;border:1px solid #000;padding:4px;">${formatRupiah(data.totalPagu)}</td>
          <td style="text-align:right;border:1px solid #000;padding:4px;">${formatRupiah(data.realisasiKeuangan)}</td>
          <td style="text-align:center;border:1px solid #000;padding:4px;${styleKeu}">${data.persenKeuangan}%</td>
          <td style="text-align:center;border:1px solid #000;padding:4px;${styleFisik}">${data.persenFisik}%</td>
          <td style="text-align:center;border:1px solid #000;padding:4px;${styleKomb}">${data.kombinasi}%</td>
        </tr>`
      })

      // Subtotal Kecamatan
      rowsHtml += `<tr style="background-color:#ffc000;font-weight:bold;font-style:italic;">
        <td colspan="2" style="text-align:right;border:1px solid #000;padding:5px 15px;">JUMLAH KECAMATAN</td>
        <td style="text-align:right;border:1px solid #000;padding:5px;">${formatRupiah(totalKecamatan.pagu)}</td>
        <td style="text-align:right;border:1px solid #000;padding:5px;">${formatRupiah(totalKecamatan.keu)}</td>
        <td style="text-align:center;border:1px solid #000;padding:5px;">${totalKecamatan.persenKeuangan}%</td>
        <td style="text-align:center;border:1px solid #000;padding:5px;">${totalKecamatan.persenFisik}%</td>
        <td style="text-align:center;border:1px solid #000;padding:5px;">${totalKecamatan.kombinasi}%</td>
      </tr>`
    }

    // Grand Total Keseluruhan
    rowsHtml += `<tr style="background-color:#92d050;font-weight:bold;font-size:10pt;">
      <td colspan="2" style="text-align:right;border:1px solid #000;padding:7px 15px;">TOTAL KESELURUHAN KABUPATEN</td>
      <td style="text-align:right;border:1px solid #000;padding:7px;">${formatRupiah(grandTotal.pagu)}</td>
      <td style="text-align:right;border:1px solid #000;padding:7px;">${formatRupiah(grandTotal.keu)}</td>
      <td style="text-align:center;border:1px solid #000;padding:7px;">${grandTotal.persenKeuangan}%</td>
      <td style="text-align:center;border:1px solid #000;padding:7px;">${grandTotal.persenFisik}%</td>
      <td style="text-align:center;border:1px solid #000;padding:7px;">${grandTotal.kombinasi}%</td>
    </tr>`

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Laporan Realisasi Fisik dan Keuangan TA ${tahun} - ${namaBulanAktif}</title>
        <style>
          @page { size: landscape; margin: 8mm 10mm; }
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
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        </style>
      </head>
      <body>
        <div class="header-box">
          <h2>PERSENTASE LAPORAN REALISASI FISIK DAN KEUANGAN (RFK)</h2>
          <h3>PEMERINTAH KABUPATEN KONAWE SELATAN</h3>
          <h3>TAHUN ANGGARAN ${tahun} (PERIODE EVALUASI: ${namaBulanAktif.toUpperCase()})</h3>
          <div class="badge-tanggal">Dicetak pada: Tanggal ${tanggalCetak}, Pukul ${waktuCetak} WITA melalui SI-MANTAP</div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" width="3%">NO</th>
              <th rowspan="2" width="28%">ORGANISASI PERANGKAT DAERAH (OPD)</th>
              <th rowspan="2" width="13%">ANGGARAN / PAGU (RP)</th>
              <th colspan="2" class="bg-real">REALISASI KEUANGAN</th>
              <th rowspan="2" width="9%" class="bg-real">REALISASI FISIK (%)</th>
              <th rowspan="2" width="13%" class="bg-komb">KOMBINASI KEUANGAN & FISIK (%)</th>
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

    const printWindow = window.open("", "_blank", "width=1200,height=800")
    if (!printWindow) {
      alert("Popup blocker terdeteksi. Silakan izinkan popup untuk mencetak laporan.")
      return
    }
    printWindow.document.write(printHtml)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 450)
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Rekapitulasi Kinerja Seluruh OPD & Kecamatan
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Daftar komprehensif {opdList.length} Organisasi Perangkat Daerah dan {kecamatanList.length} Kecamatan se-Kabupaten Konawe Selatan (TA {tahun} · {namaBulanAktif})
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleCetakPDF}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5 shadow-sm font-semibold"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak Laporan / PDF
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari OPD atau Kecamatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/30"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant={filterKategori === "semua" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterKategori("semua")}
              className="h-7 text-xs px-2.5"
            >
              Semua ({mergedList.length})
            </Button>
            <Button
              variant={filterKategori === "opd" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterKategori("opd")}
              className="h-7 text-xs px-2.5"
            >
              OPD ({opdList.length})
            </Button>
            <Button
              variant={filterKategori === "kecamatan" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterKategori("kecamatan")}
              className="h-7 text-xs px-2.5"
            >
              Kecamatan ({kecamatanList.length})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-gray-200 dark:border-neutral-700">
            <thead>
              <tr className="bg-gray-50/90 dark:bg-neutral-800/80 text-foreground border-b border-gray-200 dark:border-neutral-700 font-semibold">
                <th className="py-2.5 px-3 text-center border-r border-b border-gray-200 dark:border-neutral-700 w-12" rowSpan={2}>No</th>
                <th className="py-2.5 px-3 text-left border-r border-b border-gray-200 dark:border-neutral-700 min-w-[240px]" rowSpan={2}>
                  Organisasi Perangkat Daerah (OPD)
                </th>
                <th className="py-2.5 px-3 text-right border-r border-b border-gray-200 dark:border-neutral-700 w-36" rowSpan={2}>
                  Anggaran / Pagu (Rp)
                </th>
                <th className="py-1.5 px-3 text-center border-b border-r border-gray-200 dark:border-neutral-700 bg-amber-500/10" colSpan={2}>
                  Realisasi Keuangan
                </th>
                <th className="py-2.5 px-3 text-center border-r border-b border-gray-200 dark:border-neutral-700 w-24 bg-amber-500/10" rowSpan={2}>
                  Fisik (%)
                </th>
                <th className="py-2.5 px-3 text-center border-b border-gray-200 dark:border-neutral-700 w-28 bg-orange-500/10" rowSpan={2}>
                  Kombinasi (%)
                </th>
              </tr>
              <tr className="bg-gray-50/90 dark:bg-neutral-800/80 text-foreground border-b border-gray-200 dark:border-neutral-700 font-semibold">
                <th className="py-1.5 px-2 text-right border-r border-b border-gray-200 dark:border-neutral-700 w-32 bg-amber-500/10">Keuangan (Rp)</th>
                <th className="py-1.5 px-2 text-center border-r border-b border-gray-200 dark:border-neutral-700 w-20 bg-amber-500/10">%</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
              {/* 1. BAGIAN OPD */}
              {filterKategori !== "kecamatan" && (
                <>
                  {filteredOpd.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors border-b border-gray-200 dark:border-neutral-700">
                      <td className="py-2 px-3 text-center border-r border-gray-200 dark:border-neutral-700 text-muted-foreground font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase">{item.namaOpd}</span>
                          {item.totalPaket > 0 && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                              {item.totalPaket} Pkt
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right border-r border-gray-200 dark:border-neutral-700 font-mono">
                        {formatRupiah(item.totalPagu)}
                      </td>
                      <td className="py-2 px-3 text-right border-r border-gray-200 dark:border-neutral-700 font-mono">
                        {formatRupiah(item.realisasiKeuangan)}
                      </td>
                      <td className={`py-2 px-2 text-center border-r border-gray-200 dark:border-neutral-700 font-mono font-bold ${
                        item.persenKeuangan >= 75 ? "text-emerald-600 dark:text-emerald-400" : item.persenKeuangan > 0 ? "text-amber-600" : "text-rose-500"
                      }`}>
                        {item.persenKeuangan}%
                      </td>
                      <td className={`py-2 px-2 text-center border-r border-gray-200 dark:border-neutral-700 font-mono font-bold ${
                        item.persenFisik >= 75 ? "text-emerald-600 dark:text-emerald-400" : item.persenFisik > 0 ? "text-amber-600" : "text-rose-500"
                      }`}>
                        {item.persenFisik}%
                      </td>
                      <td className={`py-2 px-2 text-center font-mono font-bold ${
                        item.kombinasi >= 75 ? "text-emerald-600 dark:text-emerald-400" : item.kombinasi > 0 ? "text-amber-600" : "text-rose-500"
                      }`}>
                        {item.kombinasi}%
                      </td>
                    </tr>
                  ))}

                  {/* SUB TOTAL OPD */}
                  <tr className="bg-amber-400/20 font-bold border-t-2 border-b border-amber-500/30 text-amber-950 dark:text-amber-200">
                    <td colSpan={2} className="py-2.5 px-4 text-right border-r border-amber-500/30 font-semibold italic">
                      JUMLAH PERANGKAT DAERAH (OPD)
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-amber-500/30 font-mono">{formatRupiah(totalOpd.pagu)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-amber-500/30 font-mono">{formatRupiah(totalOpd.keu)}</td>
                    <td className="py-2.5 px-2 text-center border-r border-amber-500/30 font-mono">{totalOpd.persenKeuangan}%</td>
                    <td className="py-2.5 px-2 text-center border-r border-amber-500/30 font-mono">{totalOpd.persenFisik}%</td>
                    <td className="py-2.5 px-2 text-center font-mono">{totalOpd.kombinasi}%</td>
                  </tr>
                </>
              )}

              {/* 2. BAGIAN KECAMATAN */}
              {filterKategori !== "opd" && (
                <>
                  <tr className="bg-blue-500/15 border-y-2 border-blue-500/30 text-blue-950 dark:text-blue-200 font-bold">
                    <td colSpan={7} className="py-2 px-4 uppercase tracking-wider text-xs">
                      Kecamatan se-Kabupaten Konawe Selatan (25 Kecamatan)
                    </td>
                  </tr>

                  {filteredKecamatan.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors border-b border-gray-200 dark:border-neutral-700">
                      <td className="py-2 px-3 text-center border-r border-gray-200 dark:border-neutral-700 text-muted-foreground font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-700 font-medium uppercase">{item.namaOpd}</td>
                      <td className="py-2 px-3 text-right border-r border-gray-200 dark:border-neutral-700 font-mono">{formatRupiah(item.totalPagu)}</td>
                      <td className="py-2 px-3 text-right border-r border-gray-200 dark:border-neutral-700 font-mono">{formatRupiah(item.realisasiKeuangan)}</td>
                      <td className="py-2 px-2 text-center border-r border-gray-200 dark:border-neutral-700 font-mono font-bold text-muted-foreground">
                        {item.persenKeuangan}%
                      </td>
                      <td className="py-2 px-2 text-center border-r border-gray-200 dark:border-neutral-700 font-mono font-bold text-muted-foreground">
                        {item.persenFisik}%
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-muted-foreground">
                        {item.kombinasi}%
                      </td>
                    </tr>
                  ))}

                  {/* SUB TOTAL KECAMATAN */}
                  <tr className="bg-amber-400/20 font-bold border-t-2 border-b border-amber-500/30 text-amber-950 dark:text-amber-200">
                    <td colSpan={2} className="py-2.5 px-4 text-right border-r border-amber-500/30 font-semibold italic">
                      JUMLAH KECAMATAN
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-amber-500/30 font-mono">{formatRupiah(totalKecamatan.pagu)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-amber-500/30 font-mono">{formatRupiah(totalKecamatan.keu)}</td>
                    <td className="py-2.5 px-2 text-center border-r border-amber-500/30 font-mono">{totalKecamatan.persenKeuangan}%</td>
                    <td className="py-2.5 px-2 text-center border-r border-amber-500/30 font-mono">{totalKecamatan.persenFisik}%</td>
                    <td className="py-2.5 px-2 text-center font-mono">{totalKecamatan.kombinasi}%</td>
                  </tr>
                </>
              )}

              {/* 3. TOTAL KESELURUHAN DAERAH */}
              <tr className="bg-emerald-500/20 font-bold border-t-2 border-emerald-600/40 text-emerald-950 dark:text-emerald-100 text-[13px]">
                <td colSpan={2} className="py-3 px-4 text-right border-r border-emerald-600/40 font-bold uppercase tracking-wider">
                  TOTAL KESELURUHAN KABUPATEN
                </td>
                <td className="py-3 px-3 text-right border-r border-emerald-600/40 font-mono">{formatRupiah(grandTotal.pagu)}</td>
                <td className="py-3 px-3 text-right border-r border-emerald-600/40 font-mono">{formatRupiah(grandTotal.keu)}</td>
                <td className="py-3 px-2 text-center border-r border-emerald-600/40 font-mono">{grandTotal.persenKeuangan}%</td>
                <td className="py-3 px-2 text-center border-r border-emerald-600/40 font-mono">{grandTotal.persenFisik}%</td>
                <td className="py-3 px-2 text-center font-mono">{grandTotal.kombinasi}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
