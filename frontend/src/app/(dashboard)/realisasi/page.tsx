"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { SearchableCombobox } from "@/components/searchable-combobox"
import { RealisasiStatCards } from "./components/realisasi-stat-cards"
import { InputRealisasiDialog, BULAN_LIST } from "./components/input-realisasi-dialog"
import { cetakLaporanRealisasiPDF, CetakRealisasiItem } from "./lib/cetak-pdf"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Edit3,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Building2,
  TrendingUp,
  Printer,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck2,
  Clock,
  Sparkles,
} from "lucide-react"

export default function RealisasiBulananPage() {
  const { user } = useAuth()
  const isSuperRole = !user?.role || ["ADMINISTRATOR", "PIMPINAN_DAERAH"].includes(user.role)
  const userOpdId = user?.opd?.id
  const userOpdNama = user?.opd?.namaOpd || user?.opd?.singkatan

  const currentMonthNo = new Date().getMonth() + 1

  // Filter state
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 400)
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026)
  const [bulan, setBulan] = useState<number>(currentMonthNo)
  const [selectedOpd, setSelectedOpd] = useState<string>("ALL")
  const [selectedSubUnit, setSelectedSubUnit] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [page, setPage] = useState<number>(1)
  const limit = 10

  // Dialog state
  const [inputModalOpen, setInputModalOpen] = useState<boolean>(false)
  const [selectedPaketId, setSelectedPaketId] = useState<string | null>(null)

  // Lock selectedOpd if non-super role
  useEffect(() => {
    if (!isSuperRole && userOpdId) {
      setSelectedOpd(userOpdId)
    }
  }, [isSuperRole, userOpdId])

  // 1. Fetch OPD list
  const { data: opdResponse } = useQuery({
    queryKey: ["opd-options"],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/opd-options")
      return res.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  // 2. Fetch Sub Unit Kerja based on selectedOpd
  const { data: subUnitResponse, isLoading: isLoadingSubUnit } = useQuery({
    queryKey: ["pembangunan-sub-units", selectedOpd],
    queryFn: async () => {
      const params: any = {}
      if (selectedOpd !== "ALL" && selectedOpd !== "all") {
        params.opdId = selectedOpd
      }
      const res = await apiClient.get("/pembangunan/sub-units", { params })
      return res.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  // 3. Fetch Rekapitulasi Realisasi
  const {
    data: realisasiResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "rekap-realisasi",
      page,
      debouncedSearch,
      tahunAnggaran,
      bulan,
      selectedOpd,
      selectedSubUnit,
      selectedStatus,
    ],
    queryFn: async () => {
      const params: any = {
        page,
        limit,
        tahunAnggaran,
        bulan,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (!isSuperRole && userOpdId) {
        params.opdId = userOpdId
      } else if (selectedOpd !== "ALL" && selectedOpd !== "all") {
        params.opdId = selectedOpd
      }
      if (selectedSubUnit !== "all" && selectedSubUnit !== "ALL") {
        params.subUnitId = selectedSubUnit
      }
      if (selectedStatus !== "ALL" && selectedStatus !== "all") {
        params.statusDeviasi = selectedStatus
      }

      const res = await apiClient.get("/pembangunan/realisasi", { params })
      return res.data?.data || null
    },
  })

  const opdList = Array.isArray(opdResponse) ? opdResponse : []
  const subUnitList = Array.isArray(subUnitResponse) ? subUnitResponse : []
  const items: CetakRealisasiItem[] = realisasiResponse?.data || []
  const summary = realisasiResponse?.summary
  const meta = realisasiResponse?.meta || { total: 0, totalPages: 1, page: 1 }

  // Combobox options
  const opdOptions = useMemo(() => {
    return opdList.map((opd: any) => ({
      id: opd.id,
      label: opd.namaOpd + (opd.singkatan ? ` (${opd.singkatan})` : ""),
    }))
  }, [opdList])

  const subUnitOptions = useMemo(() => {
    return subUnitList.map((su: any) => ({
      id: su.id,
      label: su.namaSubUnit,
    }))
  }, [subUnitList])

  const formatRupiah = (val: number | string | undefined | null) => {
    const num = typeof val === "string" ? parseFloat(val) : val || 0
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  const handleOpenInput = (id: string) => {
    setSelectedPaketId(id)
    setInputModalOpen(true)
  }

  const handleResetFilter = () => {
    setSearch("")
    setTahunAnggaran(2026)
    setBulan(currentMonthNo)
    setSelectedOpd(isSuperRole ? "ALL" : (userOpdId || "ALL"))
    setSelectedSubUnit("all")
    setSelectedStatus("ALL")
    setPage(1)
  }

  const handleCetakPDF = () => {
    const activeBulanObj = BULAN_LIST.find((b) => b.no === bulan)
    const selectedOpdObj = opdList.find((o: any) => o.id === selectedOpd)
    const namaOpd = selectedOpd !== "ALL" && selectedOpd !== "all"
      ? (selectedOpdObj?.namaOpd || userOpdNama || "Unit Kerja Terpilih")
      : "Seluruh Perangkat Daerah (Konawe Selatan)"

    cetakLaporanRealisasiPDF({
      tahunAnggaran,
      bulanNama: activeBulanObj?.nama || `Bulan ${bulan}`,
      bulanNo: bulan,
      namaOpd,
      items,
      summary: summary || {
        totalPagu: 0,
        totalKontrak: 0,
        totalRealisasiKeuangan: 0,
        persenSerapanKeuangan: 0,
        avgTargetFisik: 0,
        avgRealisasiFisik: 0,
        avgDeviasiFisik: 0,
      },
    })
  }

  const activeBulanName = BULAN_LIST.find((b) => b.no === bulan)?.nama || `Bulan ${bulan}`

  const isFilterActive =
    search ||
    (selectedOpd !== "ALL" && selectedOpd !== "all") ||
    (selectedSubUnit !== "all" && selectedSubUnit !== "ALL") ||
    selectedStatus !== "ALL" ||
    tahunAnggaran !== 2026 ||
    bulan !== currentMonthNo

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full max-w-[1600px] mx-auto">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Realisasi Fisik & Keuangan
            </h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold uppercase tracking-wider text-blue-600 border-blue-500/30 bg-blue-500/10"
            >
              Menu 2
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitoring capaian kurva-S fisik (B01–B12), deviasi target, dan realisasi penyerapan anggaran SP2D/Kas
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCetakPDF}
            disabled={isLoading || items.length === 0}
            className="gap-2 shadow-xs border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-700 text-orange-600 dark:text-orange-400"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Laporan RFK</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <RealisasiStatCards summary={summary} isLoading={isLoading} />

      {/* Filter Toolbar - Mengadopsi Layout & Style Presisi /users */}
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
                  onValueChange={(val) => {
                    setSelectedOpd(val === "all" ? "ALL" : val)
                    setSelectedSubUnit("all")
                    setPage(1)
                  }}
                  items={opdOptions}
                  placeholder="Ketik / Pilih Unit Kerja (OPD)..."
                  searchPlaceholder="Ketik nama Unit Kerja / OPD..."
                  emptyText="Unit Kerja tidak ditemukan."
                  allLabel="-- Semua Unit Kerja (OPD) --"
                  icon={<Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
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
                value={selectedSubUnit}
                onValueChange={(val) => {
                  setSelectedSubUnit(val)
                  setPage(1)
                }}
                items={subUnitOptions}
                placeholder={isLoadingSubUnit ? "Memuat Sub Unit..." : "Ketik / Pilih Sub Unit..."}
                searchPlaceholder="Ketik nama Sub Unit Kerja..."
                emptyText="Sub Unit Kerja tidak ditemukan."
                allLabel="-- Semua Sub Unit Kerja --"
                icon={<Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                disabled={isLoadingSubUnit}
              />
            </div>

            {/* Filter Tahun Anggaran */}
            <div className="w-full">
              <Select
                value={String(tahunAnggaran)}
                onValueChange={(val) => {
                  setTahunAnggaran(parseInt(val))
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
                  {BULAN_LIST.map((b) => (
                    <SelectItem key={b.no} value={String(b.no)} className="text-xs">
                      {b.singkatan} - {b.nama} {b.no === currentMonthNo ? "(Bulan Ini)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Status Capaian Deviasi */}
            <div className="w-full">
              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  setSelectedStatus(val)
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
                  {activeBulanName} {tahunAnggaran}
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

      {/* Main Table Card */}
      <Card className="border-border/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center text-xs font-semibold py-3.5">No</TableHead>
                <TableHead className="min-w-[260px] text-xs font-semibold py-3.5">
                  Paket Pembangunan & Identitas PBJ
                </TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold py-3.5">
                  OPD / Unit Kerja
                </TableHead>
                <TableHead className="min-w-[160px] text-right text-xs font-semibold py-3.5">
                  Pagu & Kontrak (Rp)
                </TableHead>
                <TableHead className="min-w-[90px] text-right text-xs font-semibold py-3.5">
                  Target (%)
                </TableHead>
                <TableHead className="min-w-[90px] text-right text-xs font-semibold py-3.5">
                  Realisasi (%)
                </TableHead>
                <TableHead className="min-w-[95px] text-right text-xs font-semibold py-3.5">
                  Deviasi (%)
                </TableHead>
                <TableHead className="min-w-[160px] text-right text-xs font-semibold py-3.5">
                  Realisasi Keuangan (Rp)
                </TableHead>
                <TableHead className="min-w-[110px] text-center text-xs font-semibold py-3.5">
                  Status
                </TableHead>
                <TableHead className="w-[110px] text-center text-xs font-semibold py-3.5">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-56 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      <span className="text-xs text-muted-foreground">Memuat data realisasi bulanan...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-56 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <TrendingUp className="h-5 w-5" />
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
                items.map((item, idx) => {
                  const no = (meta.page - 1) * limit + idx + 1
                  const isDeviasiPositif = item.deviasiFisik >= 0

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* No */}
                      <TableCell className="text-center font-mono text-xs text-muted-foreground py-3.5">
                        {no}
                      </TableCell>

                      {/* Identitas Paket */}
                      <TableCell className="py-3.5">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleOpenInput(item.id)}
                            className="font-semibold text-foreground hover:text-emerald-600 text-left line-clamp-2 transition-colors cursor-pointer text-sm"
                          >
                            {item.namaPaket}
                          </button>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            {item.kodeRupKontrak && (
                              <span className="font-mono bg-muted/80 px-1.5 py-0.5 rounded text-[11px]">
                                {item.kodeRupKontrak}
                              </span>
                            )}
                            {item.nomorKontrak && (
                              <span className="font-mono text-[11px] truncate max-w-[200px]" title={item.nomorKontrak}>
                                {item.nomorKontrak}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* OPD & Sub Unit */}
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-foreground">
                              {item.opd?.singkatan || item.opd?.namaOpd || "-"}
                            </span>
                          </div>
                          {item.subUnit?.namaSubUnit && (
                            <div className="text-[11px] text-muted-foreground pl-5 truncate max-w-[180px]" title={item.subUnit.namaSubUnit}>
                              {item.subUnit.namaSubUnit}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Pagu & Kontrak */}
                      <TableCell className="text-right py-3.5">
                        <div className="space-y-0.5 font-mono">
                          <div className="font-semibold text-xs text-foreground">
                            {formatRupiah(item.nilaiKontrak)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Pagu: {formatRupiah(item.nilaiPagu)}
                          </div>
                        </div>
                      </TableCell>

                      {/* Target Fisik */}
                      <TableCell className="text-right font-mono text-xs text-muted-foreground py-3.5">
                        {item.targetFisik}%
                      </TableCell>

                      {/* Realisasi Fisik */}
                      <TableCell className="text-right font-mono font-semibold text-xs py-3.5">
                        {item.realisasiFisik > 0 ? `${item.realisasiFisik}%` : "-"}
                      </TableCell>

                      {/* Deviasi Fisik */}
                      <TableCell className="text-right font-mono font-semibold text-xs py-3.5">
                        {item.targetFisik === 0 && item.realisasiFisik === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span className={isDeviasiPositif ? "text-emerald-600" : "text-red-600"}>
                            {item.deviasiFisik > 0 ? `+${item.deviasiFisik}` : item.deviasiFisik}%
                          </span>
                        )}
                      </TableCell>

                      {/* Realisasi Keuangan */}
                      <TableCell className="text-right py-3.5">
                        <div className="space-y-0.5 font-mono">
                          <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                            {item.realisasiKeuangan > 0 ? formatRupiah(item.realisasiKeuangan) : "-"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.persenKeuangan > 0 ? `${item.persenKeuangan}% Serap` : ""}
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center py-3.5">
                        {item.status === "BELUM_MULAI" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                            Belum Mulai
                          </Badge>
                        )}
                        {item.status === "AMAN" && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium whitespace-nowrap">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                            Aman
                          </Badge>
                        )}
                        {item.status === "PERHATIAN" && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium whitespace-nowrap">
                            <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                            Perhatian
                          </Badge>
                        )}
                        {item.status === "KRITIS" && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 font-medium whitespace-nowrap">
                            <AlertCircle className="h-2.5 w-2.5 mr-1" />
                            Kritis
                          </Badge>
                        )}
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center py-3.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenInput(item.id)}
                          className="h-8 px-2.5 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-primary" />
                          <span>Input</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-3 text-xs text-muted-foreground">
          <div>
            Menampilkan{" "}
            <span className="font-semibold text-foreground">
              {items.length > 0 ? (meta.page - 1) * limit + 1 : 0}
            </span>{" "}
            s.d.{" "}
            <span className="font-semibold text-foreground">
              {Math.min(meta.page * limit, meta.total)}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-foreground">{meta.total}</span> paket pada {activeBulanName} {tahunAnggaran}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1 || isLoading}
              className="h-8 text-xs gap-1 px-2.5"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Sebelumnya</span>
            </Button>
            <span className="px-2 font-mono text-xs">
              Hal. {meta.page} / {meta.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page >= meta.totalPages || isLoading}
              className="h-8 text-xs gap-1 px-2.5"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Input Realisasi Dialog */}
      <InputRealisasiDialog
        open={inputModalOpen}
        onOpenChange={setInputModalOpen}
        paketId={selectedPaketId}
        activeBulan={bulan}
      />
    </div>
  )
}
