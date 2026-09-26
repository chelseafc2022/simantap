"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { SearchableCombobox } from "@/components/searchable-combobox"
import { LaporanStatCards } from "./components/laporan-stat-cards"
import { KontrakKritisAlert } from "./components/kontrak-kritis-alert"
import { exportLaporanToExcel } from "./lib/export-excel"
import { cetakLaporanPdf } from "./lib/cetak-laporan-pdf"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Calendar,
  Building2,
  Layers,
  ChevronLeft,
  ChevronRight,
  FilterX,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Flame,
  LayoutGrid,
} from "lucide-react"

export const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

export default function LaporanDanEvaluasiPage() {
  const { user } = useAuth()
  const isSuperRole = !user?.role || ["ADMINISTRATOR", "PIMPINAN_DAERAH"].includes(user.role)
  const userOpdId = user?.opd?.id
  const userOpdNama = user?.opd?.namaOpd || user?.opd?.singkatan

  const currentMonthNo = new Date().getMonth() + 1

  // Filter States
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 400)
  const [selectedOpd, setSelectedOpd] = useState<string>("ALL")
  const [selectedSubUnit, setSelectedSubUnit] = useState<string>("ALL")
  const [tahun, setTahun] = useState<number>(new Date().getFullYear())
  const [bulan, setBulan] = useState<number>(currentMonthNo)
  const [statusDeviasi, setStatusDeviasi] = useState<string>("ALL")
  const [page, setPage] = useState<number>(1)
  const [limit] = useState<number>(15)
  const [activeTab, setActiveTab] = useState<string>("evaluasi")

  // Bind OPD otomatis untuk non-super role
  useEffect(() => {
    if (!isSuperRole && userOpdId) {
      setSelectedOpd(userOpdId)
    }
  }, [isSuperRole, userOpdId])

  // Reset Sub Unit jika OPD berubah
  const handleOpdChange = (val: string) => {
    setSelectedOpd(val === "all" ? "ALL" : val)
    setSelectedSubUnit("ALL")
    setPage(1)
  }

  // 1. Fetch Daftar OPD Referensi
  const { data: rawOpds = [], isLoading: isLoadingOpd } = useQuery({
    queryKey: ["pembangunan-opd-options"],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/opd-options")
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    staleTime: 5 * 60 * 1000,
  })

  // Format OPD untuk SearchableCombobox ({ id, label })
  const opdComboboxItems = useMemo(() => {
    return rawOpds.map((o: any) => ({
      id: o.id,
      label: o.singkatan ? `${o.singkatan} - ${o.namaOpd}` : o.namaOpd,
    }))
  }, [rawOpds])

  // 2. Fetch Sub Unit berdasarkan OPD
  const { data: rawSubUnits = [], isLoading: isLoadingSubUnits } = useQuery({
    queryKey: ["pembangunan-sub-units", selectedOpd],
    queryFn: async () => {
      if (selectedOpd === "ALL" || selectedOpd === "all") return []
      const res = await apiClient.get(`/pembangunan/sub-units?opdId=${selectedOpd}`)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    enabled: selectedOpd !== "ALL" && selectedOpd !== "all",
    staleTime: 5 * 60 * 1000,
  })

  // Format Sub Unit untuk SearchableCombobox
  const subUnitComboboxItems = useMemo(() => {
    return rawSubUnits.map((s: any) => ({
      id: s.id,
      label: s.namaSubUnit,
    }))
  }, [rawSubUnits])

  // 3. Fetch Rekapitulasi Data RFK untuk Tab 1 (Daftar Evaluasi RFK)
  const {
    data: rfkData,
    isLoading: isLoadingRfk,
    isFetching: isFetchingRfk,
    refetch: refetchRfk,
  } = useQuery({
    queryKey: [
      "laporan-rfk",
      tahun,
      bulan,
      selectedOpd,
      selectedSubUnit,
      statusDeviasi,
      debouncedSearch,
      page,
      limit,
    ],
    queryFn: async () => {
      const params: any = {
        tahunAnggaran: tahun,
        bulan,
        page,
        limit,
      }

      if (!isSuperRole && userOpdId) {
        params.opdId = userOpdId
      } else if (selectedOpd !== "ALL" && selectedOpd !== "all") {
        params.opdId = selectedOpd
      }

      if (selectedSubUnit !== "ALL" && selectedSubUnit !== "all") {
        params.subUnitId = selectedSubUnit
      }

      if (statusDeviasi !== "ALL") {
        params.statusDeviasi = statusDeviasi
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim()
      }

      const res = await apiClient.get("/pembangunan/realisasi", { params })
      return res.data?.data || null
    },
  })

  // 4. Fetch Matriks 12 Bulan untuk Tab 2 (Matriks Horizontal)
  const {
    data: matriksData,
    isLoading: isLoadingMatriks,
    refetch: refetchMatriks,
  } = useQuery({
    queryKey: [
      "laporan-matriks-12",
      tahun,
      bulan,
      selectedOpd,
      selectedSubUnit,
      statusDeviasi,
      debouncedSearch,
    ],
    queryFn: async () => {
      const params: any = {
        tahunAnggaran: tahun,
        bulan,
      }

      if (!isSuperRole && userOpdId) {
        params.opdId = userOpdId
      } else if (selectedOpd !== "ALL" && selectedOpd !== "all") {
        params.opdId = selectedOpd
      }

      if (selectedSubUnit !== "ALL" && selectedSubUnit !== "all") {
        params.subUnitId = selectedSubUnit
      }

      if (statusDeviasi !== "ALL") {
        params.statusDeviasi = statusDeviasi
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim()
      }

      const res = await apiClient.get("/pembangunan/laporan/matriks", { params })
      return res.data?.data || null
    },
    enabled: activeTab === "matriks12",
  })

  // 5. Fetch Rekapitulasi per OPD untuk Tab 3 (Ringkasan Pimpinan)
  const {
    data: rekapOpdData,
    isLoading: isLoadingRekapOpd,
    refetch: refetchRekapOpd,
  } = useQuery({
    queryKey: ["laporan-rekap-opd", tahun, bulan],
    queryFn: async () => {
      const params = {
        tahunAnggaran: tahun,
        bulan,
      }
      const res = await apiClient.get("/pembangunan/laporan/rekap-opd", { params })
      return res.data?.data || null
    },
    enabled: activeTab === "rekapOpd",
  })

  // Ambil list items & summary
  const items = useMemo(() => rfkData?.data || [], [rfkData])
  const summary = useMemo(
    () =>
      rfkData?.summary || {
        totalPaket: 0,
        totalPagu: 0,
        totalKontrak: 0,
        totalRealisasiKeuangan: 0,
        persenSerapanKeuangan: 0,
        avgTargetFisik: 0,
        avgRealisasiFisik: 0,
        avgDeviasiFisik: 0,
        countStatus: { aman: 0, perhatian: 0, kritis: 0, belumMulai: 0 },
      },
    [rfkData]
  )

  const meta = useMemo(
    () => rfkData?.meta || { total: 0, totalPages: 1, page: 1, limit: 15 },
    [rfkData]
  )

  // Filter paket yang berkategori KRITIS (Deviasi < -10%)
  const kritisItems = useMemo(() => {
    return items.filter((item: any) => item.status === "KRITIS")
  }, [items])

  // Formatter Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  // Nama OPD yang difilter untuk judul laporan
  const filterOpdNama = useMemo(() => {
    if (selectedOpd === "ALL" || selectedOpd === "all") return undefined
    const found = rawOpds.find((o: any) => o.id === selectedOpd)
    return found?.namaOpd || found?.singkatan
  }, [selectedOpd, rawOpds])

  // Handler Export Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      const params: any = {
        tahunAnggaran: tahun,
        bulan,
        page: 1,
        limit: 1000,
      }

      if (!isSuperRole && userOpdId) {
        params.opdId = userOpdId
      } else if (selectedOpd !== "ALL" && selectedOpd !== "all") {
        params.opdId = selectedOpd
      }

      if (selectedSubUnit !== "ALL" && selectedSubUnit !== "all") {
        params.subUnitId = selectedSubUnit
      }

      if (statusDeviasi !== "ALL") {
        params.statusDeviasi = statusDeviasi
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim()
      }

      const res = await apiClient.get("/pembangunan/realisasi", { params })
      const allItems = res.data?.data?.data || items
      const allSummary = res.data?.data?.summary || summary

      let opdList: any[] = []
      try {
        const opdRes = await apiClient.get(
          `/pembangunan/laporan/rekap-opd?tahunAnggaran=${tahun}&bulan=${bulan}`
        )
        opdList = opdRes.data?.data?.rekap || []
      } catch (err) {
        console.error("Gagal mengambil data rekap OPD untuk excel:", err)
      }

      exportLaporanToExcel({
        tahunAnggaran: tahun,
        bulan,
        namaBulan: BULAN_NAMES[bulan - 1],
        items: allItems,
        summary: allSummary,
        rekapOpd: opdList,
      })
    } catch (error) {
      console.error("Gagal export excel:", error)
      alert("Terjadi kesalahan saat mengekspor file Excel.")
    }
  }

  // Handler Cetak PDF Landscape Resmi
  const handleCetakPdf = () => {
    cetakLaporanPdf({
      tahunAnggaran: tahun,
      bulan,
      namaBulan: BULAN_NAMES[bulan - 1],
      items,
      summary,
      filterOpdNama,
    })
  }

  // Reset Filter
  const handleResetFilter = () => {
    setSearch("")
    if (isSuperRole) {
      setSelectedOpd("ALL")
    }
    setSelectedSubUnit("ALL")
    setTahun(new Date().getFullYear())
    setBulan(currentMonthNo)
    setStatusDeviasi("ALL")
    setPage(1)
  }

  const isFilterActive =
    search !== "" ||
    (isSuperRole && selectedOpd !== "ALL" && selectedOpd !== "all") ||
    (selectedSubUnit !== "ALL" && selectedSubUnit !== "all") ||
    statusDeviasi !== "ALL" ||
    tahun !== new Date().getFullYear() ||
    bulan !== currentMonthNo

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Laporan & Evaluasi RFK
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              Menu 3
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Matriks evaluasi realisasi fisik dan keuangan, pengawasan deviasi kontrak, serta rekapitulasi kinerja OPD Kabupaten Konawe Selatan.
          </p>
        </div>

        {/* Action Buttons: Export & Cetak */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchRfk()
              if (activeTab === "matriks12") refetchMatriks()
              if (activeTab === "rekapOpd") refetchRekapOpd()
            }}
            disabled={isLoadingRfk}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRfk ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-9 gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel (.xlsx)</span>
          </Button>

          <Button
            size="sm"
            onClick={handleCetakPdf}
            className="h-9 gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Resmi</span>
          </Button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <LaporanStatCards summary={summary} />

      {/* 3. KONTRAK KRITIS ALERT (SHOW CAUSE WARNING) */}
      <KontrakKritisAlert kritisItems={kritisItems} />

      {/* 4. FILTER CARD */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari paket, nomor kontrak, rekanan..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* OPD Filter (SearchableCombobox) */}
            <div>
              {isSuperRole ? (
                <SearchableCombobox
                  value={selectedOpd === "ALL" ? "all" : selectedOpd}
                  onValueChange={handleOpdChange}
                  items={opdComboboxItems}
                  placeholder="Ketik / Pilih Unit Kerja (OPD)..."
                  searchPlaceholder="Ketik nama OPD..."
                  emptyText="OPD tidak ditemukan."
                  allLabel="-- Semua Unit Kerja (OPD) --"
                  icon={<Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  disabled={isLoadingOpd}
                />
              ) : (
                <div className="h-9 px-3 flex items-center bg-muted/50 rounded-md border border-input text-xs font-medium text-foreground truncate">
                  <Building2 className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
                  <span className="truncate">{userOpdNama || "OPD Anda"}</span>
                </div>
              )}
            </div>

            {/* Sub Unit Filter */}
            <div>
              <SearchableCombobox
                value={selectedSubUnit === "ALL" ? "all" : selectedSubUnit}
                onValueChange={(val) => {
                  setSelectedSubUnit(val === "all" ? "ALL" : val)
                  setPage(1)
                }}
                items={subUnitComboboxItems}
                placeholder={selectedOpd === "ALL" || selectedOpd === "all" ? "Pilih OPD Dahulu" : "Semua Sub Unit Kerja"}
                searchPlaceholder="Ketik nama Sub Unit Kerja..."
                emptyText="Sub Unit Kerja tidak ditemukan."
                allLabel="-- Semua Sub Unit Kerja --"
                icon={<Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                disabled={selectedOpd === "ALL" || selectedOpd === "all" || isLoadingSubUnits}
              />
            </div>

            {/* Bulan Evaluasi */}
            <div>
              <Select
                value={String(bulan)}
                onValueChange={(val) => {
                  setBulan(Number(val))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Bulan Evaluasi" />
                </SelectTrigger>
                <SelectContent>
                  {BULAN_NAMES.map((nama, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)} className="text-xs">
                      Bulan {String(idx + 1).padStart(2, "0")} - {nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Deviasi Filter */}
            <div>
              <Select
                value={statusDeviasi}
                onValueChange={(val) => {
                  setStatusDeviasi(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status Deviasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">Semua Status Deviasi</SelectItem>
                  <SelectItem value="AMAN" className="text-xs text-emerald-600 font-medium">
                    🟢 Aman (Deviasi &ge; 0%)
                  </SelectItem>
                  <SelectItem value="PERHATIAN" className="text-xs text-amber-600 font-medium">
                    🟡 Perhatian (-10% s/d 0%)
                  </SelectItem>
                  <SelectItem value="KRITIS" className="text-xs text-rose-600 font-medium">
                    🔴 Kontrak Kritis (&lt; -10%)
                  </SelectItem>
                  <SelectItem value="BELUM_MULAI" className="text-xs text-muted-foreground">
                    ⚪ Belum Mulai (Target 0%)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Bar & Reset */}
          {isFilterActive && (
            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
              <span>Filter aktif diterapkan pada laporan evaluasi</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilter}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 px-2"
              >
                <FilterX className="w-3 h-3" />
                Reset Semua Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. TABS INTERFACE (EVALUASI RFK | MATRIKS 12 BULAN | REKAP OPD) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-muted/80 p-1 border border-border/50">
            <TabsTrigger value="evaluasi" className="text-xs gap-1.5 px-3">
              <FileText className="w-3.5 h-3.5" />
              <span>Matriks Evaluasi RFK</span>
            </TabsTrigger>
            <TabsTrigger value="matriks12" className="text-xs gap-1.5 px-3">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Matriks 12 Bulan (B01 - B12)</span>
            </TabsTrigger>
            <TabsTrigger value="rekapOpd" className="text-xs gap-1.5 px-3">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Rekapitulasi Kinerja OPD</span>
            </TabsTrigger>
          </TabsList>

          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Periode:</span>
            <Badge variant="secondary" className="font-semibold text-xs">
              {BULAN_NAMES[bulan - 1]} {tahun}
            </Badge>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: MATRIKS EVALUASI RFK                              */}
        {/* ======================================================== */}
        <TabsContent value="evaluasi" className="space-y-4">
          <Card className="border border-border/60 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold">Perangkat Daerah & Sub Unit</TableHead>
                    <TableHead className="min-w-[260px] text-xs font-semibold">Nama Paket Pekerjaan</TableHead>
                    <TableHead className="min-w-[140px] text-xs font-semibold">Metode / Sumber Dana</TableHead>
                    <TableHead className="min-w-[150px] text-right text-xs font-semibold">Pagu / Nilai Kontrak</TableHead>
                    <TableHead className="min-w-[140px] text-right text-xs font-semibold">Realisasi Keu (Rp)</TableHead>
                    <TableHead className="w-20 text-center text-xs font-semibold">% Keu</TableHead>
                    <TableHead className="w-20 text-center text-xs font-semibold">Target</TableHead>
                    <TableHead className="w-20 text-center text-xs font-semibold">Fisik</TableHead>
                    <TableHead className="w-24 text-center text-xs font-semibold">Deviasi</TableHead>
                    <TableHead className="min-w-[120px] text-center text-xs font-semibold">Status Capaian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRfk ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-40 text-center text-muted-foreground text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                          <span>Memuat laporan evaluasi realisasi pembangunan...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-40 text-center text-muted-foreground text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-6 h-6 text-muted-foreground/60" />
                          <span>Tidak ada data paket pembangunan yang sesuai dengan kriteria filter.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item: any, idx: number) => {
                      const rowNo = (page - 1) * limit + idx + 1
                      const isDeviasiPositif = item.deviasiFisik >= 0
                      const isKritis = item.status === "KRITIS"

                      return (
                        <TableRow
                          key={item.id}
                          className={`hover:bg-muted/40 transition-colors text-xs ${
                            isKritis ? "bg-rose-50/40 dark:bg-rose-950/20" : ""
                          }`}
                        >
                          <TableCell className="text-center font-medium text-muted-foreground">
                            {rowNo}
                          </TableCell>

                          <TableCell>
                            <div className="font-semibold text-foreground">
                              {item.opd?.singkatan || item.opd?.namaOpd || "-"}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {item.subUnit?.namaSubUnit || "-"}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-semibold text-foreground hover:text-primary transition-colors">
                              {item.namaPaket}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                              {item.nomorKontrak && <span>No: {item.nomorKontrak}</span>}
                              {item.pemenangRekanan && <span>• Rekanan: {item.pemenangRekanan}</span>}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-medium text-foreground">
                              {item.metodePemilihan || "-"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Dana: {item.sumberDana || "-"}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="font-semibold text-foreground">
                              {formatRupiah(item.nilaiKontrak)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Pagu: {formatRupiah(item.nilaiPagu)}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="font-semibold text-foreground">
                              {formatRupiah(item.realisasiKeuangan)}
                            </div>
                          </TableCell>

                          <TableCell className="text-center font-bold">
                            <span className={item.persenKeuangan > 0 ? "text-foreground" : "text-muted-foreground"}>
                              {item.persenKeuangan.toFixed(1)}%
                            </span>
                          </TableCell>

                          <TableCell className="text-center text-muted-foreground font-mono">
                            {item.targetFisik.toFixed(1)}%
                          </TableCell>

                          <TableCell className="text-center font-bold font-mono">
                            {item.realisasiFisik.toFixed(1)}%
                          </TableCell>

                          <TableCell className="text-center font-mono font-bold">
                            <span
                              className={
                                isDeviasiPositif
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : item.deviasiFisik >= -10
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-rose-600 dark:text-rose-400 font-extrabold"
                              }
                            >
                              {isDeviasiPositif ? `+${item.deviasiFisik.toFixed(1)}` : item.deviasiFisik.toFixed(1)}%
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            {item.status === "AMAN" && (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-[10px]">
                                Aman
                              </Badge>
                            )}
                            {item.status === "PERHATIAN" && (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 text-[10px]">
                                Perhatian
                              </Badge>
                            )}
                            {item.status === "KRITIS" && (
                              <Badge variant="destructive" className="text-[10px] animate-pulse">
                                Kritis (SCM)
                              </Badge>
                            )}
                            {item.status === "BELUM_MULAI" && (
                              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                Belum Mulai
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div className="p-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <div>
                  Menampilkan halaman <span className="font-semibold text-foreground">{page}</span> dari{" "}
                  <span className="font-semibold text-foreground">{meta.totalPages}</span> ({meta.total} paket)
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page >= meta.totalPages}
                    className="h-8 gap-1 text-xs"
                  >
                    Berikutnya
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: MATRIKS PERKEMBANGAN 12 BULAN (B01 - B12)         */}
        {/* ======================================================== */}
        <TabsContent value="matriks12" className="space-y-4">
          <Card className="border border-border/60 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-primary" />
                Matriks Capaian Fisik Paket Pembangunan 12 Bulan (B01 s/d B12)
              </CardTitle>
              <CardDescription className="text-xs">
                Perbandingan Realisasi vs Target Fisik per bulan secara horizontal sepanjang Tahun Anggaran {tahun}.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-10 text-center text-xs">No</TableHead>
                    <TableHead className="min-w-[200px] text-xs">Nama Paket & OPD</TableHead>
                    <TableHead className="min-w-[120px] text-right text-xs">Nilai Kontrak</TableHead>
                    {BULAN_NAMES.map((bName, idx) => (
                      <TableHead
                        key={idx}
                        className={`w-20 text-center text-[11px] font-semibold ${
                          idx + 1 === bulan ? "bg-primary/10 text-primary border-x border-primary/20" : ""
                        }`}
                      >
                        {bName.substring(0, 3)}
                        {idx + 1 === bulan && " 🎯"}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMatriks ? (
                    <TableRow>
                      <TableCell colSpan={15} className="h-40 text-center text-muted-foreground text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                          <span>Menyusun matriks perkembangan 12 bulan...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !matriksData?.items || matriksData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="h-40 text-center text-muted-foreground text-xs">
                        Tidak ada data paket pembangunan untuk matriks 12 bulan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    matriksData.items.map((paket: any, pIdx: number) => (
                      <TableRow key={paket.id} className="hover:bg-muted/30 text-xs">
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {pIdx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground truncate max-w-[240px]">
                            {paket.namaPaket}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {paket.opd?.singkatan || paket.opd?.namaOpd}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatRupiah(paket.nilaiKontrak)}
                        </TableCell>
                        {paket.timeline.map((m: any, mIdx: number) => {
                          const isActive = m.bulan === bulan
                          const deviasi = m.deviasiFisik
                          const isPositif = deviasi >= 0

                          return (
                            <TableCell
                              key={mIdx}
                              className={`text-center p-1.5 ${
                                isActive ? "bg-primary/5 font-semibold border-x border-primary/20" : ""
                              }`}
                            >
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-mono text-[11px] text-foreground font-bold">
                                  {m.realisasiFisik}%
                                </span>
                                <span className="text-[9px] text-muted-foreground font-mono">
                                  T: {m.targetFisik}%
                                </span>
                                {m.targetFisik > 0 && (
                                  <span
                                    className={`text-[9px] font-mono ${
                                      isPositif
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : deviasi >= -10
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-rose-600 dark:text-rose-400 font-bold"
                                    }`}
                                  >
                                    {isPositif ? `+${deviasi}` : deviasi}%
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: REKAPITULASI KINERJA PER OPD (EXECUTIVE SUMMARY)   */}
        {/* ======================================================== */}
        <TabsContent value="rekapOpd" className="space-y-4">
          <Card className="border border-border/60 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Rekapitulasi Kinerja dan Peringkat Serapan Perangkat Daerah
              </CardTitle>
              <CardDescription className="text-xs">
                Perbandingan kinerja pengadaan, serapan anggaran, dan rata-rata realisasi fisik antar OPD Kabupaten Konawe Selatan.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">Peringkat</TableHead>
                    <TableHead className="min-w-[240px] text-xs">Perangkat Daerah (OPD)</TableHead>
                    <TableHead className="w-20 text-center text-xs">Total Paket</TableHead>
                    <TableHead className="min-w-[140px] text-right text-xs">Total Kontrak (Rp)</TableHead>
                    <TableHead className="min-w-[140px] text-right text-xs">Realisasi Keu (Rp)</TableHead>
                    <TableHead className="min-w-[140px] text-xs">% Serapan Keuangan</TableHead>
                    <TableHead className="w-24 text-center text-xs">Rata-rata Fisik</TableHead>
                    <TableHead className="w-24 text-center text-xs">Deviasi Fisik</TableHead>
                    <TableHead className="w-24 text-center text-xs">Paket Kritis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRekapOpd ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-40 text-center text-muted-foreground text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                          <span>Menghitung rekapitulasi kinerja OPD...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !rekapOpdData?.rekap || rekapOpdData.rekap.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-40 text-center text-muted-foreground text-xs">
                        Tidak ada data OPD yang memiliki paket pembangunan pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rekapOpdData.rekap
                      .sort((a: any, b: any) => b.persenSerapanKeuangan - a.persenSerapanKeuangan)
                      .map((opd: any, idx: number) => {
                        const isKritisExist = opd.countKritis > 0
                        const isDeviasiPositif = opd.avgDeviasiFisik >= 0

                        return (
                          <TableRow key={opd.opdId} className="hover:bg-muted/30 text-xs">
                            <TableCell className="text-center font-bold">
                              {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : idx + 1}
                            </TableCell>

                            <TableCell>
                              <div className="font-semibold text-foreground">
                                {opd.namaOpd}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Kode: {opd.kodeOpd || "-"}
                              </div>
                            </TableCell>

                            <TableCell className="text-center font-semibold text-foreground">
                              {opd.totalPaket}
                            </TableCell>

                            <TableCell className="text-right font-medium">
                              {formatRupiah(opd.totalKontrak)}
                            </TableCell>

                            <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(opd.totalRealisasiKeuangan)}
                            </TableCell>

                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-semibold">
                                  <span>{opd.persenSerapanKeuangan.toFixed(1)}%</span>
                                </div>
                                <Progress value={Math.min(100, opd.persenSerapanKeuangan)} className="h-1.5" />
                              </div>
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold">
                              {opd.avgRealisasiFisik.toFixed(1)}%
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold">
                              <span
                                className={
                                  isDeviasiPositif
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : opd.avgDeviasiFisik >= -10
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }
                              >
                                {isDeviasiPositif ? `+${opd.avgDeviasiFisik.toFixed(1)}` : opd.avgDeviasiFisik.toFixed(1)}%
                              </span>
                            </TableCell>

                            <TableCell className="text-center">
                              {isKritisExist ? (
                                <Badge variant="destructive" className="text-[10px] gap-1 font-mono">
                                  <Flame className="w-3 h-3" />
                                  {opd.countKritis} Paket
                                </Badge>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                  0 (Nihil)
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
