"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Printer, Search, Building2, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { isExcludedOpd } from "@/lib/utils"
import { printRekapReport, type RekapScope, type RekapTemplate } from "./rekap-emonev-print"

interface RekapEmonevTableProps {
  opdMasterList: any[]
  rekapList: any[]
  tahun: number
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
  namaBulanAktif,
}: RekapEmonevTableProps) {
  const [search, setSearch] = useState("")
  const [printScope, setPrintScope] = useState<RekapScope>("semua")
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
      const totalKontrak = Number(match?.totalKontrak ?? 0)
      const isAllBerkontrak = Boolean(match?.isAllBerkontrak)
      const realisasiKeuangan = Number(match?.totalRealisasiKeuangan ?? opd.total_realisasi_keuangan ?? 0)

      // Selaras dengan Backend: jika belum semua paket berkontrak, basis totalPagu. Jika sudah semua berkontrak, basis totalKontrak.
      const basisAnggaran = isAllBerkontrak && totalKontrak > 0 ? totalKontrak : (totalPagu > 0 ? totalPagu : totalKontrak)
      const persenKeuangan = basisAnggaran > 0
        ? Number(((realisasiKeuangan / basisAnggaran) * 100).toFixed(2))
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

  // Pisahkan OPD dan Kecamatan
  const opdAll = useMemo(() => {
    return mergedList.filter((d) => !d.isKecamatan)
  }, [mergedList])

  const kecamatanAll = useMemo(() => {
    return mergedList.filter((d) => d.isKecamatan)
  }, [mergedList])

  // OPD Penyedia (sudah input minimal 1 paket) vs OPD Non Penyedia (belum input paket)
  const opdPenyedia = useMemo(() => {
    return opdAll.filter((d) => d.totalPaket > 0).sort(sortByPerformanceDesc)
  }, [opdAll])

  const opdNonPenyedia = useMemo(() => {
    return opdAll.filter((d) => d.totalPaket === 0).sort((a, b) => a.namaOpd.localeCompare(b.namaOpd))
  }, [opdAll])

  // Kecamatan Penyedia vs Non Penyedia
  const kecamatanPenyedia = useMemo(() => {
    return kecamatanAll.filter((d) => d.totalPaket > 0).sort(sortByPerformanceDesc)
  }, [kecamatanAll])

  const kecamatanNonPenyedia = useMemo(() => {
    return kecamatanAll.filter((d) => d.totalPaket === 0).sort((a, b) => a.namaOpd.localeCompare(b.namaOpd))
  }, [kecamatanAll])

  // Hitung Subtotal OPD (Hanya OPD Penyedia yang memiliki paket pembangunan)
  const totalOpd = useMemo(() => {
    let pagu = 0
    let keu = 0
    let sumFisik = 0
    opdPenyedia.forEach((d) => {
      pagu += d.totalPagu
      keu += d.realisasiKeuangan
      sumFisik += d.persenFisik
    })
    const persenKeuangan = pagu > 0 ? Number(((keu / pagu) * 100).toFixed(2)) : 0
    const persenFisik = opdPenyedia.length > 0 ? Number((sumFisik / opdPenyedia.length).toFixed(2)) : 0
    const kombinasi = Number(((persenKeuangan + persenFisik) / 2).toFixed(2))
    return { pagu, keu, persenKeuangan, persenFisik, kombinasi }
  }, [opdPenyedia])

  // Hitung Subtotal Kecamatan (Hanya Kecamatan Penyedia)
  const totalKecamatan = useMemo(() => {
    let pagu = 0
    let keu = 0
    let sumFisik = 0
    kecamatanPenyedia.forEach((d) => {
      pagu += d.totalPagu
      keu += d.realisasiKeuangan
      sumFisik += d.persenFisik
    })
    const persenKeuangan = pagu > 0 ? Number(((keu / pagu) * 100).toFixed(2)) : 0
    const persenFisik = kecamatanPenyedia.length > 0 ? Number((sumFisik / kecamatanPenyedia.length).toFixed(2)) : 0
    const kombinasi = Number(((persenKeuangan + persenFisik) / 2).toFixed(2))
    return { pagu, keu, persenKeuangan, persenFisik, kombinasi }
  }, [kecamatanPenyedia])

  // Grand Total Daerah (Hanya mengakumulasikan OPD & Kecamatan Penyedia)
  const grandTotal = useMemo(() => {
    const pagu = totalOpd.pagu + totalKecamatan.pagu
    const keu = totalOpd.keu + totalKecamatan.keu
    const totalCount = opdPenyedia.length + kecamatanPenyedia.length
    const persenKeuangan = pagu > 0 ? Number(((keu / pagu) * 100).toFixed(2)) : 0
    const persenFisik =
      totalCount > 0
        ? Number(
            (
              (totalOpd.persenFisik * opdPenyedia.length +
                totalKecamatan.persenFisik * kecamatanPenyedia.length) /
              totalCount
            ).toFixed(2)
          )
        : 0
    const kombinasi = Number(((persenKeuangan + persenFisik) / 2).toFixed(2))
    return { pagu, keu, persenKeuangan, persenFisik, kombinasi }
  }, [totalOpd, totalKecamatan, opdPenyedia.length, kecamatanPenyedia.length])

  // Filter Search
  const filterList = (list: any[]) => {
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (d) => d.namaOpd.toLowerCase().includes(q) || d.singkatan.toLowerCase().includes(q)
    )
  }

  const filteredOpdPenyedia = useMemo(() => filterList(opdPenyedia), [opdPenyedia, search])
  const filteredOpdNonPenyedia = useMemo(() => filterList(opdNonPenyedia), [opdNonPenyedia, search])
  const filteredKecamatanPenyedia = useMemo(() => filterList(kecamatanPenyedia), [kecamatanPenyedia, search])
  const filteredKecamatanNonPenyedia = useMemo(() => filterList(kecamatanNonPenyedia), [kecamatanNonPenyedia, search])

  const handleCetakPDF = (template: RekapTemplate) => {
    void printRekapReport({
      tahun,
      namaBulanAktif,
      opdPenyedia,
      opdNonPenyedia,
      kecamatanPenyedia,
      kecamatanNonPenyedia,
      totalOpd,
      totalKecamatan,
      grandTotal,
      logoUrl: new URL("/logo_konsel.webp", window.location.origin).href,
    }, { template, scope: printScope })
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Rekap Kinerja OPD & Kecamatan
            </CardTitle>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5 shadow-sm font-semibold">
                  <Printer className="h-3.5 w-3.5" />
                  Cetak Laporan
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>1. Pilih cakupan data</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={printScope} onValueChange={(value) => setPrintScope(value as RekapScope)}>
                  <DropdownMenuRadioItem value="opd" onSelect={(event) => event.preventDefault()}>OPD</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="kecamatan" onSelect={(event) => event.preventDefault()}>Kecamatan</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="semua" onSelect={(event) => event.preventDefault()}>Semuanya</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>2. Pilih laporan untuk dicetak</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => handleCetakPDF("full")}>
                  Laporan Full
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleCetakPDF("simple")}>
                  Laporan Simple
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleCetakPDF("awal")}>
                  Laporan Awal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              OPD ({opdPenyedia.length} Aktif / {opdAll.length})
            </Button>
            <Button
              variant={filterKategori === "kecamatan" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterKategori("kecamatan")}
              className="h-7 text-xs px-2.5"
            >
              Kecamatan ({kecamatanPenyedia.length} Aktif / {kecamatanAll.length})
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
                  {/* 1.A. OPD PENYEDIA (SUDAH INPUT MINIMAL 1 PAKET) */}
                  {filteredOpdPenyedia.map((item, idx) => {
                    const isZero = item.persenKeuangan === 0 || item.persenFisik === 0
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors border-b border-gray-200 dark:border-neutral-700">
                        <td className="py-2 px-3 text-center border-r border-gray-200 dark:border-neutral-700 text-muted-foreground font-mono">{idx + 1}</td>
                        <td className={`py-2 px-3 border-r border-gray-200 dark:border-neutral-700 font-medium ${isZero ? "text-rose-600 dark:text-rose-400 font-bold" : ""}`}>
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
                    )
                  })}

                  {/* SUB TOTAL OPD (JUMLAH) */}
                  <tr className="bg-amber-400/25 font-bold border-t-2 border-b border-amber-500/40 text-amber-950 dark:text-amber-200">
                    <td colSpan={2} className="py-2.5 px-4 text-right border-r border-amber-500/40 font-bold italic">
                      JUMLAH
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-amber-500/40 font-mono">{formatRupiah(totalOpd.pagu)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-amber-500/40 font-mono">{formatRupiah(totalOpd.keu)}</td>
                    <td className="py-2.5 px-2 text-center border-r border-amber-500/40 font-mono">{totalOpd.persenKeuangan}%</td>
                    <td className="py-2.5 px-2 text-center border-r border-amber-500/40 font-mono">{totalOpd.persenFisik}%</td>
                    <td className="py-2.5 px-2 text-center font-mono">{totalOpd.kombinasi}%</td>
                  </tr>

                  {/* 1.B. OPD NON PENYEDIA (BELUM INPUT PAKET PEMBANGUNAN) */}
                  {filteredOpdNonPenyedia.length > 0 && (
                    <>
                      <tr className="bg-blue-100 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/50">
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td className="py-2 px-3 text-left font-bold text-blue-950 dark:text-blue-200 border-r border-gray-200 dark:border-neutral-700 uppercase tracking-wider">
                          OPD NON PENYEDIA
                        </td>
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td></td>
                      </tr>

                      {filteredOpdNonPenyedia.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors border-b border-gray-200 dark:border-neutral-700">
                          <td className="py-2 px-3 text-center border-r border-gray-200 dark:border-neutral-700 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-700 font-medium uppercase text-muted-foreground">
                            {item.namaOpd}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-700"></td>
                          <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-700"></td>
                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-700"></td>
                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-700"></td>
                          <td className="py-2 px-2"></td>
                        </tr>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* 2. BAGIAN KECAMATAN */}
              {filterKategori !== "opd" && (
                <>
                  {/* 2.A. KECAMATAN PENYEDIA (JIKA ADA) */}
                  {filteredKecamatanPenyedia.length > 0 && (
                    <>
                      <tr className="bg-blue-500/15 border-y-2 border-blue-500/30 text-blue-950 dark:text-blue-200 font-bold">
                        <td colSpan={7} className="py-2 px-4 uppercase tracking-wider text-xs">
                          Kecamatan Penyedia Pembangunan ({filteredKecamatanPenyedia.length} Kecamatan)
                        </td>
                      </tr>

                      {filteredKecamatanPenyedia.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors border-b border-gray-200 dark:border-neutral-700">
                          <td className="py-2 px-3 text-center border-r border-gray-200 dark:border-neutral-700 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-700 font-medium uppercase">{item.namaOpd}</td>
                          <td className="py-2 px-3 text-right border-r border-gray-200 dark:border-neutral-700 font-mono">{formatRupiah(item.totalPagu)}</td>
                          <td className="py-2 px-3 text-right border-r border-gray-200 dark:border-neutral-700 font-mono">{formatRupiah(item.realisasiKeuangan)}</td>
                          <td className="py-2 px-2 text-center border-r border-gray-200 dark:border-neutral-700 font-mono font-bold">
                            {item.persenKeuangan}%
                          </td>
                          <td className="py-2 px-2 text-center border-r border-gray-200 dark:border-neutral-700 font-mono font-bold">
                            {item.persenFisik}%
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold">
                            {item.kombinasi}%
                          </td>
                        </tr>
                      ))}

                      {/* SUB TOTAL KECAMATAN */}
                      <tr className="bg-amber-400/25 font-bold border-t-2 border-b border-amber-500/40 text-amber-950 dark:text-amber-200">
                        <td colSpan={2} className="py-2.5 px-4 text-right border-r border-amber-500/40 font-bold italic">
                          JUMLAH KECAMATAN
                        </td>
                        <td className="py-2.5 px-3 text-right border-r border-amber-500/40 font-mono">{formatRupiah(totalKecamatan.pagu)}</td>
                        <td className="py-2.5 px-3 text-right border-r border-amber-500/40 font-mono">{formatRupiah(totalKecamatan.keu)}</td>
                        <td className="py-2.5 px-2 text-center border-r border-amber-500/40 font-mono">{totalKecamatan.persenKeuangan}%</td>
                        <td className="py-2.5 px-2 text-center border-r border-amber-500/40 font-mono">{totalKecamatan.persenFisik}%</td>
                        <td className="py-2.5 px-2 text-center font-mono">{totalKecamatan.kombinasi}%</td>
                      </tr>
                    </>
                  )}

                  {/* 2.B. KECAMATAN NON PENYEDIA */}
                  {filteredKecamatanNonPenyedia.length > 0 && (
                    <>
                      <tr className="bg-blue-100 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/50">
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td className="py-2 px-3 text-left font-bold text-blue-950 dark:text-blue-200 border-r border-gray-200 dark:border-neutral-700 uppercase tracking-wider">
                          KECAMATAN NON PENYEDIA
                        </td>
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td className="border-r border-gray-200 dark:border-neutral-700"></td>
                        <td></td>
                      </tr>

                      {filteredKecamatanNonPenyedia.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors border-b border-gray-200 dark:border-neutral-700">
                          <td className="py-2 px-3 text-center border-r border-gray-200 dark:border-neutral-700 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-700 font-medium uppercase text-muted-foreground">
                            {item.namaOpd}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-700"></td>
                          <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-700"></td>
                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-700"></td>
                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-700"></td>
                          <td className="py-2 px-2"></td>
                        </tr>
                      ))}
                    </>
                  )}
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
