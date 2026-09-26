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
  Loader2,
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
      label: o.namaOpd + (o.singkatan ? ` (${o.singkatan})` : ""),
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
  const formatRupiah = (val: number | string | undefined | null) => {
    const num = typeof val === "string" ? parseFloat(val) : val || 0
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num)
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
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full max-w-[1600px] mx-auto">
      {/* 1. Page Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Laporan & Evaluasi RFK
            </h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold uppercase tracking-wider text-purple-600 border-purple-500/30 bg-purple-500/10"
            >
              Menu 3
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Konsolidasi kurva-S fisik dan serapan keuangan, identifikasi kontrak kritis, serta rekapitulasi kinerja OPD
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isLoadingRfk}
            className="gap-2 shadow-xs border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 text-emerald-600 dark:text-emerald-400"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel (.xlsx)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCetakPdf}
            disabled={isLoadingRfk || items.length === 0}
            className="gap-2 shadow-xs border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-700 text-orange-600 dark:text-orange-400"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Laporan RFK</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchRfk()
              if (activeTab === "matriks12") refetchMatriks()
              if (activeTab === "rekapOpd") refetchRekapOpd()
            }}
            disabled={isFetchingRfk}
            className="gap-2 shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isFetchingRfk ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </Button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <LaporanStatCards summary={summary} isLoading={isLoadingRfk} />

      {/* 3. KONTRAK KRITIS ALERT (SHOW CAUSE WARNING) */}
      <KontrakKritisAlert
        kritisItems={kritisItems}
        onFilterKritis={() => {
          setStatusDeviasi("KRITIS")
          setPage(1)
        }}
      />

      {/* 4. FILTER TOOLBAR - Mengadopsi Layout & Style Presisi /users & /realisasi */}
      <Card className="border-border/70 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5 space-y-3">
          {/* Baris 1: Pencarian Teks Full Width */}
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama paket, nomor SPK, kode RUP, atau rekanan..."
              className="pl-8 text-xs h-9 bg-background w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* Baris 2: Sejajar 5 Filter Terpadu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Filter Unit Kerja (OPD) - Searchable & Typeable */}
            <div className="w-full">
              {isSuperRole ? (
                <SearchableCombobox
                  value={selectedOpd === "ALL" ? "all" : selectedOpd}
                  onValueChange={handleOpdChange}
                  items={opdComboboxItems}
                  placeholder="Ketik / Pilih Unit Kerja (OPD)..."
                  searchPlaceholder="Ketik nama Unit Kerja / OPD..."
                  emptyText="Unit Kerja tidak ditemukan."
                  allLabel="-- Semua Unit Kerja (OPD) --"
                  icon={<Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  disabled={isLoadingOpd}
                />
              ) : (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/40 text-xs font-medium text-foreground truncate">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{userOpdNama || "OPD Anda"}</span>
                </div>
              )}
            </div>

            {/* Filter Sub Unit Kerja - Searchable & Typeable */}
            <div className="w-full">
              <SearchableCombobox
                value={selectedSubUnit === "ALL" ? "all" : selectedSubUnit}
                onValueChange={(val) => {
                  setSelectedSubUnit(val === "all" ? "ALL" : val)
                  setPage(1)
                }}
                items={subUnitComboboxItems}
                placeholder={
                  selectedOpd === "ALL" || selectedOpd === "all"
                    ? "Pilih OPD Dahulu"
                    : isLoadingSubUnits
                    ? "Memuat Sub Unit..."
                    : "Ketik / Pilih Sub Unit..."
                }
                searchPlaceholder="Ketik nama Sub Unit Kerja..."
                emptyText="Sub Unit Kerja tidak ditemukan."
                allLabel="-- Semua Sub Unit Kerja --"
                icon={<Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                disabled={selectedOpd === "ALL" || selectedOpd === "all" || isLoadingSubUnits}
              />
            </div>

            {/* Filter Tahun Anggaran */}
            <div className="w-full">
              <Select
                value={String(tahun)}
                onValueChange={(val) => {
                  setTahun(parseInt(val))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background w-full">
                  <SelectValue placeholder="Tahun Anggaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">Tahun Anggaran 2026</SelectItem>
                  <SelectItem value="2025">Tahun Anggaran 2025</SelectItem>
                  <SelectItem value="2024">Tahun Anggaran 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Bulan Pelaporan (B01-B12) */}
            <div className="w-full">
              <Select
                value={String(bulan)}
                onValueChange={(val) => {
                  setBulan(parseInt(val))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background w-full font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <SelectValue placeholder="Bulan Pelaporan" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {BULAN_NAMES.map((nama, idx) => {
                    const no = idx + 1
                    return (
                      <SelectItem key={no} value={String(no)} className="text-xs">
                        B{String(no).padStart(2, "0")} - {nama} {no === currentMonthNo ? "(Bulan Ini)" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Status Capaian Deviasi */}
            <div className="w-full">
              <Select
                value={statusDeviasi}
                onValueChange={(val) => {
                  setStatusDeviasi(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background w-full">
                  <SelectValue placeholder="Semua Status Capaian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status Capaian</SelectItem>
                  <SelectItem value="AMAN">🟢 Aman (Deviasi ≥ 0%)</SelectItem>
                  <SelectItem value="PERHATIAN">🟡 Waspada (-10% s.d 0%)</SelectItem>
                  <SelectItem value="KRITIS">🔴 Kritis (&lt; -10%)</SelectItem>
                  <SelectItem value="BELUM_MULAI">⚪ Belum Mulai (0%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Indicator & Reset */}
          {isFilterActive && (
            <div className="flex items-center justify-between pt-2.5 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Filter aktif periode:</span>
                <Badge variant="secondary" className="font-semibold text-foreground text-[11px] px-2 py-0">
                  {BULAN_NAMES[bulan - 1]} {tahun}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleResetFilter}
              >
                <FilterX className="h-3.5 w-3.5" />
                Reset Semua Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. TABS INTERFACE (EVALUASI RFK | MATRIKS 12 BULAN | REKAP OPD) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-muted/80 p-1 border border-border/70 rounded-lg">
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
            <span>Periode Evaluasi:</span>
            <Badge variant="secondary" className="font-semibold text-xs">
              {BULAN_NAMES[bulan - 1]} {tahun}
            </Badge>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: MATRIKS EVALUASI RFK                              */}
        {/* ======================================================== */}
        <TabsContent value="evaluasi" className="space-y-4 mt-0">
          <Card className="border-border/70 shadow-xs overflow-hidden bg-card/60 backdrop-blur-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border/80">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-semibold py-3.5">No</TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold py-3.5">OPD & Sub Unit Kerja</TableHead>
                    <TableHead className="min-w-[260px] text-xs font-semibold py-3.5">Nama Paket Pekerjaan</TableHead>
                    <TableHead className="min-w-[130px] text-xs font-semibold py-3.5">Metode / Sumber Dana</TableHead>
                    <TableHead className="min-w-[150px] text-right text-xs font-semibold py-3.5">Pagu & Kontrak</TableHead>
                    <TableHead className="min-w-[140px] text-right text-xs font-semibold py-3.5">Realisasi Keuangan</TableHead>
                    <TableHead className="w-20 text-center text-xs font-semibold py-3.5">% Keu</TableHead>
                    <TableHead className="w-20 text-center text-xs font-semibold py-3.5">Target</TableHead>
                    <TableHead className="w-20 text-center text-xs font-semibold py-3.5">Realisasi</TableHead>
                    <TableHead className="w-24 text-center text-xs font-semibold py-3.5">Deviasi</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs font-semibold py-3.5">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRfk ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-56 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                          <span className="text-xs text-muted-foreground">Memuat laporan evaluasi realisasi pembangunan...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-56 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <FileText className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            Belum ada data paket untuk kriteria filter ini
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Coba sesuaikan pilihan filter Unit Kerja, Bulan, atau kata kunci pencarian.
                          </p>
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
                            isKritis ? "bg-rose-500/5 dark:bg-rose-950/20" : ""
                          }`}
                        >
                          <TableCell className="text-center font-mono text-xs text-muted-foreground py-3.5">
                            {rowNo}
                          </TableCell>

                          <TableCell className="py-3.5">
                            <div className="font-semibold text-foreground">
                              {item.opd?.singkatan || item.opd?.namaOpd || "-"}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {item.subUnit?.namaSubUnit || "-"}
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <div className="font-semibold text-foreground line-clamp-2">
                              {item.namaPaket}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                              {item.nomorKontrak && <span>No: {item.nomorKontrak}</span>}
                              {item.pemenangRekanan && <span>• Rekanan: {item.pemenangRekanan}</span>}
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <div className="font-medium text-foreground">
                              {item.metodePemilihan || "-"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Dana: {item.sumberDana || "-"}
                            </div>
                          </TableCell>

                          <TableCell className="text-right py-3.5">
                            <div className="font-semibold font-mono text-foreground">
                              {formatRupiah(item.nilaiKontrak)}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              Pagu: {formatRupiah(item.nilaiPagu)}
                            </div>
                          </TableCell>

                          <TableCell className="text-right py-3.5">
                            <div className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(item.realisasiKeuangan)}
                            </div>
                          </TableCell>

                          <TableCell className="text-center font-bold font-mono py-3.5">
                            <span className={item.persenKeuangan > 0 ? "text-foreground" : "text-muted-foreground"}>
                              {item.persenKeuangan.toFixed(1)}%
                            </span>
                          </TableCell>

                          <TableCell className="text-center text-muted-foreground font-mono py-3.5">
                            {item.targetFisik.toFixed(1)}%
                          </TableCell>

                          <TableCell className="text-center font-bold font-mono py-3.5">
                            {item.realisasiFisik.toFixed(1)}%
                          </TableCell>

                          <TableCell className="text-center font-mono font-bold py-3.5">
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

                          <TableCell className="text-center py-3.5">
                            {item.status === "AMAN" && (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                                Aman
                              </Badge>
                            )}
                            {item.status === "PERHATIAN" && (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px]">
                                Waspada
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
              <div className="p-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
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
        <TabsContent value="matriks12" className="space-y-4 mt-0">
          <Card className="border-border/70 shadow-xs overflow-hidden bg-card/60 backdrop-blur-xs">
            <CardHeader className="p-4 sm:p-5 border-b border-border/70 bg-muted/20">
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
                <TableHeader className="bg-muted/50 border-b border-border/80">
                  <TableRow>
                    <TableHead className="w-10 text-center text-xs py-3.5">No</TableHead>
                    <TableHead className="min-w-[220px] text-xs py-3.5">Nama Paket & OPD</TableHead>
                    <TableHead className="min-w-[130px] text-right text-xs py-3.5">Nilai Kontrak</TableHead>
                    {BULAN_NAMES.map((bName, idx) => (
                      <TableHead
                        key={idx}
                        className={`w-20 text-center text-[11px] font-semibold py-3.5 ${
                          idx + 1 === bulan ? "bg-primary/10 text-primary border-x border-primary/20 font-bold" : ""
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
                      <TableCell colSpan={15} className="h-56 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                          <span className="text-xs text-muted-foreground">Menyusun matriks perkembangan 12 bulan...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !matriksData?.items || matriksData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="h-56 text-center text-muted-foreground text-xs">
                        Tidak ada data paket pembangunan untuk matriks 12 bulan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    matriksData.items.map((paket: any, pIdx: number) => (
                      <TableRow key={paket.id} className="hover:bg-muted/30 text-xs">
                        <TableCell className="text-center font-mono text-muted-foreground py-3">
                          {pIdx + 1}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="font-semibold text-foreground truncate max-w-[240px]">
                            {paket.namaPaket}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {paket.opd?.singkatan || paket.opd?.namaOpd}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium py-3">
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
        <TabsContent value="rekapOpd" className="space-y-4 mt-0">
          <Card className="border-border/70 shadow-xs overflow-hidden bg-card/60 backdrop-blur-xs">
            <CardHeader className="p-4 sm:p-5 border-b border-border/70 bg-muted/20">
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
                <TableHeader className="bg-muted/50 border-b border-border/80">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs py-3.5">Peringkat</TableHead>
                    <TableHead className="min-w-[240px] text-xs py-3.5">Perangkat Daerah (OPD)</TableHead>
                    <TableHead className="w-20 text-center text-xs py-3.5">Total Paket</TableHead>
                    <TableHead className="min-w-[140px] text-right text-xs py-3.5">Total Kontrak</TableHead>
                    <TableHead className="min-w-[140px] text-right text-xs py-3.5">Realisasi Keu</TableHead>
                    <TableHead className="min-w-[150px] text-xs py-3.5">% Serapan Keuangan</TableHead>
                    <TableHead className="w-24 text-center text-xs py-3.5">Rata-rata Fisik</TableHead>
                    <TableHead className="w-24 text-center text-xs py-3.5">Deviasi Fisik</TableHead>
                    <TableHead className="w-24 text-center text-xs py-3.5">Paket Kritis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRekapOpd ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-56 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                          <span className="text-xs text-muted-foreground">Menghitung rekapitulasi kinerja OPD...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !rekapOpdData?.rekap || rekapOpdData.rekap.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-56 text-center text-muted-foreground text-xs">
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
                            <TableCell className="text-center font-bold font-mono py-3.5">
                              {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : idx + 1}
                            </TableCell>

                            <TableCell className="py-3.5">
                              <div className="font-semibold text-foreground">
                                {opd.namaOpd}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Kode: {opd.kodeOpd || "-"}
                              </div>
                            </TableCell>

                            <TableCell className="text-center font-semibold font-mono text-foreground py-3.5">
                              {opd.totalPaket}
                            </TableCell>

                            <TableCell className="text-right font-mono font-medium py-3.5">
                              {formatRupiah(opd.totalKontrak)}
                            </TableCell>

                            <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 py-3.5">
                              {formatRupiah(opd.totalRealisasiKeuangan)}
                            </TableCell>

                            <TableCell className="py-3.5">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                                  <span>{opd.persenSerapanKeuangan.toFixed(1)}%</span>
                                </div>
                                <Progress value={Math.min(100, opd.persenSerapanKeuangan)} className="h-1.5" />
                              </div>
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold py-3.5">
                              {opd.avgRealisasiFisik.toFixed(1)}%
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold py-3.5">
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

                            <TableCell className="text-center py-3.5">
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
