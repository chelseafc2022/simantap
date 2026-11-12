"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { SearchableCombobox } from "@/components/searchable-combobox"
import { isExcludedOpd } from "@/lib/utils"
import { RealisasiStatCards } from "./realisasi-stat-cards"
import { InputRealisasiDialog, BULAN_LIST } from "./input-realisasi-dialog"
import { MiniDonut } from "@/components/ui/mini-donut"
import { cetakLaporanRealisasiPDF, CetakRealisasiItem } from "../lib/cetak-pdf"
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
  GitBranch,
  Lock,
} from "lucide-react"

export function RealisasiContent({ polaMonitoring }: { polaMonitoring: "FISIK_KEUANGAN" | "KEUANGAN" }) {
  const selectedPola = polaMonitoring
  const keuanganSaja = polaMonitoring === "KEUANGAN"
  const { user } = useAuth()
  const userRoles: string[] =
    user?.roles && user.roles.length > 0
      ? user.roles
      : user?.role
      ? [user.role]
      : []
  const hasRole = (role: string) => userRoles.includes(role)
  const isSuperRole = userRoles.length === 0 || userRoles.some((r) => ["ADMINISTRATOR", "PIMPINAN_DAERAH", "MONEV"].includes(r))
  const isKepalaOpd = hasRole("KEPALA_OPD")
  const userOpdId = user?.opd?.id
  const userOpdNama = user?.opd?.namaOpd || user?.opd?.singkatan
  const userSubUnitId = user?.subUnit?.id
  const userSubUnitNama = user?.subUnit?.namaSubUnit
  const hasMultipleOpdAccess = (user?.accessibleOpds?.length || 0) > 1
  const hasAdditionalScope = (user?.accessScopes?.length || 0) > 0
  const canSelectOpd = isSuperRole || hasAdditionalScope

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

  // Lock selectedOpd & selectedSubUnit if non-super role
  useEffect(() => {
    if (!isSuperRole) {
      setSelectedOpd(hasMultipleOpdAccess ? "ALL" : (userOpdId || "ALL"))
    }
    if (!canSelectOpd && !isKepalaOpd && userSubUnitId) {
      setSelectedSubUnit(userSubUnitId)
    } else if (hasAdditionalScope) {
      setSelectedSubUnit("all")
    }
  }, [isSuperRole, canSelectOpd, hasMultipleOpdAccess, hasAdditionalScope, isKepalaOpd, userOpdId, userSubUnitId])

  // 1. Fetch OPD list
  const { data: opdResponse } = useQuery({
    queryKey: ["opd-options"],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/opd-options")
      return res.data?.data || []
    },
    staleTime: 10 * 60 * 1000,
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
    staleTime: 10 * 60 * 1000,
  })

  // 3. Fetch Rekapitulasi Realisasi
  const {
    data: realisasiResponse,
    isLoading,
    isFetching,
    isError,
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
      selectedPola,
    ],
    queryFn: async () => {
      const params: any = {
        page,
        limit,
        tahunAnggaran,
        bulan,
        polaMonitoring: selectedPola,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (!canSelectOpd && userOpdId) {
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

      try {
        const res = await apiClient.get("/pembangunan/realisasi", { params })
        return res.data
      } catch (error: any) {
        // Fallback untuk backend lama jika belum menerima polaMonitoring
        const message = error?.response?.data?.message
        const messages = Array.isArray(message) ? message : [message]
        if (
          params.polaMonitoring &&
          error?.response?.status === 400 &&
          messages.some(
            (m: string) =>
              typeof m === "string" && m.includes("polaMonitoring should not exist")
          )
        ) {
          const { polaMonitoring: _, ...fallbackParams } = params
          const res = await apiClient.get("/pembangunan/realisasi", {
            params: fallbackParams,
          })
          const filtered = (res.data?.data || []).filter(
            (item: CetakRealisasiItem) => item.polaMonitoring === selectedPola
          )
          return {
            ...res.data,
            data: filtered,
          }
        }
        throw error
      }
    },
    placeholderData: keepPreviousData,
  })

  const opdList = Array.isArray(opdResponse) ? opdResponse : []
  const subUnitList = Array.isArray(subUnitResponse) ? subUnitResponse : []
  const rawItems: CetakRealisasiItem[] = Array.isArray(realisasiResponse?.data)
    ? realisasiResponse.data
    : []

  // Dahulukan paket dengan realisasi fisik atau keuangan, lalu urutkan berdasarkan status.
  const items: CetakRealisasiItem[] = useMemo(() => {
    const sorted = [...rawItems].sort((a, b) => {
      const aKeu = a.agregatPecahan ? a.agregatPecahan.totalRealisasiKeuangan : Number(a.realisasiKeuangan || 0)
      const aFisik = a.agregatPecahan ? a.agregatPecahan.avgRealisasiFisik : Number(a.realisasiFisik || 0)
      const bKeu = b.agregatPecahan ? b.agregatPecahan.totalRealisasiKeuangan : Number(b.realisasiKeuangan || 0)
      const bFisik = b.agregatPecahan ? b.agregatPecahan.avgRealisasiFisik : Number(b.realisasiFisik || 0)
      const hasRealisasiA = aFisik > 0 || aKeu > 0
      const hasRealisasiB = bFisik > 0 || bKeu > 0
      if (hasRealisasiA !== hasRealisasiB) return hasRealisasiA ? -1 : 1

      const getPriority = (item: CetakRealisasiItem) => {
        const tgt = item.agregatPecahan ? item.agregatPecahan.avgTargetFisik : Number(item.targetFisik || 0)
        const real = item.agregatPecahan ? item.agregatPecahan.avgRealisasiFisik : Number(item.realisasiFisik || 0)
        if (item.status === "BELUM_MULAI" && tgt === 0 && real === 0) {
          return 5
        }
        if (item.status === "KRITIS") return 1
        if (item.status === "PERHATIAN") return 2
        if (real >= 100) return 4
        return 3 // AMAN (< 100%)
      }

      const pA = getPriority(a)
      const pB = getPriority(b)

      if (pA !== pB) return pA - pB

      // Jika sama-sama KRITIS atau PERHATIAN: urutkan deviasi paling parah (paling minus) di atas
      if (pA === 1 || pA === 2) {
        return Number(a.deviasiFisik || 0) - Number(b.deviasiFisik || 0)
      }

      // Jika sama-sama AMAN: progres fisik terendah ke tertinggi
      if (pA === 3) {
        return aFisik - bFisik
      }

      return (a.namaPaket || "").localeCompare(b.namaPaket || "")
    })

    const idSet = new Set(sorted.map((item) => item.id))
    const childrenByParent = new Map<string, CetakRealisasiItem[]>()
    const roots: CetakRealisasiItem[] = []
    for (const item of sorted) {
      if (item.parentId && idSet.has(item.parentId)) {
        const list = childrenByParent.get(item.parentId) || []
        list.push(item)
        childrenByParent.set(item.parentId, list)
      } else {
        roots.push(item)
      }
    }
    const ordered: CetakRealisasiItem[] = []
    for (const root of roots) {
      ordered.push(root)
      const children = childrenByParent.get(root.id)
      if (children?.length) {
        ordered.push(...children)
      }
    }
    return ordered
  }, [rawItems])
  const summary = realisasiResponse?.summary
  const meta = realisasiResponse?.meta || { total: 0, totalPages: 1, page: 1 }
  const availableMonthNumbers: number[] = useMemo(
    () => Array.isArray(summary?.availableMonths) ? summary.availableMonths : [],
    [summary]
  )
  const availableMonthOptions = availableMonthNumbers.length > 0
    ? BULAN_LIST.filter((item) => availableMonthNumbers.includes(item.no))
    : BULAN_LIST

  useEffect(() => {
    if (availableMonthNumbers.length > 0 && !availableMonthNumbers.includes(bulan)) {
      const nextMonth = availableMonthNumbers.find((item) => item >= bulan)
        || availableMonthNumbers.at(-1)
      if (nextMonth) {
        const timer = window.setTimeout(() => {
          setBulan(nextMonth)
          setPage(1)
        }, 0)
        return () => window.clearTimeout(timer)
      }
    }
  }, [availableMonthNumbers, bulan])

  // Combobox options
  const opdOptions = useMemo(() => {
    return opdList
      .filter((opd: any) => !isExcludedOpd(opd.id) && !isExcludedOpd(opd.namaOpd))
      .map((opd: any) => ({
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
    setSelectedOpd(hasMultipleOpdAccess ? "ALL" : (userOpdId || "ALL"))
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
    <div className="min-w-0 px-3 sm:px-4 lg:px-6 space-y-5 pb-8 pt-1 w-full">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          {/* <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              REALISASI FISIK & KEUANGAN
            </span>
            <Badge variant="outline" className="text-[10px] py-0 border-border">
              {activeBulanName} {tahunAnggaran}
            </Badge>
          </div> */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {keuanganSaja ? "Realisasi Keuangan" : "Realisasi Fisik & Keuangan"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {keuanganSaja ? "Monitoring pencairan dan serapan anggaran paket nonfisik" : "Monitoring progres fisik mingguan dan realisasi keuangan paket"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Tombol Cetak Laporan RFK HANYA untuk Administrator / Tim Monev Daerah */}
          {isSuperRole && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCetakPDF}
              disabled={isLoading || items.length === 0}
              // className="gap-2 shadow-xs border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-700 text-orange-600 dark:text-orange-400"
              className="gap-2 shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Laporan RFK</span>
            </Button>
          )}

          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </Button> */}
        </div>
      </div>

      {/* Stat Cards */}
      {!isError && <RealisasiStatCards summary={summary} isLoading={isLoading} keuanganSaja={keuanganSaja} />}

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
              {canSelectOpd ? (
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
                  // icon={<Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
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
              {!canSelectOpd && !isKepalaOpd && userSubUnitNama ? (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/40 text-xs font-medium text-foreground truncate">
                  <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{userSubUnitNama}</span>
                </div>
              ) : (
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
                  // icon={<Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                  disabled={isLoadingSubUnit}
                />
              )}
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

            {/* Hanya bulan yang tercakup masa kontrak/target paket */}
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
                    {/* <Calendar className="h-3.5 w-3.5 text-primary shrink-0" /> */}
                    <SelectValue placeholder="Bulan Pelaporan" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableMonthOptions.map((b) => (
                    <SelectItem key={b.no} value={String(b.no)} className="text-xs">
                      {b.singkatan} - {b.nama} {b.no === currentMonthNo ? "(Bulan Ini)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Status Capaian Deviasi */}
            <div className="w-full">
              {!keuanganSaja && <>
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
              </>}
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

      {isError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Data realisasi gagal dimuat.</p>
          <p className="mt-1 text-muted-foreground">Periksa koneksi ke server, lalu coba muat ulang.</p>
          <Button variant="outline" size="sm" className="mt-3" disabled={isFetching} onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="border border-gray-200 dark:border-neutral-700 shadow-xs overflow-hidden">
        {/* Mobile View: Tampilan Kartu Kompak di Layar HP (< md) */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-neutral-700">
          {isLoading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="text-xs text-muted-foreground">Memuat data realisasi bulanan...</span>
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Daftar paket belum dapat dimuat.</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
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
          ) : (
            items.map((item, idx) => {
              const no = (meta.page - 1) * limit + idx + 1
              const isInduk = !!(item.hasChildren && item.agregatPecahan)
              const isPecahan = !!item.parentId
              const dispTarget = isInduk && item.agregatPecahan ? item.agregatPecahan.avgTargetFisik : item.targetFisik
              const dispRealFisik = isInduk && item.agregatPecahan ? item.agregatPecahan.avgRealisasiFisik : item.realisasiFisik
              const dispDeviasi = isInduk && item.agregatPecahan ? item.agregatPecahan.avgDeviasiFisik : item.deviasiFisik
              const dispKontrak = isInduk && item.agregatPecahan ? item.agregatPecahan.totalKontrak : item.nilaiKontrak
              const dispRealKeu = isInduk && item.agregatPecahan ? item.agregatPecahan.totalRealisasiKeuangan : item.realisasiKeuangan
              const basisInduk = item.nilaiPagu > 0 ? item.nilaiPagu : dispKontrak
              const dispPersenKeu = isInduk && basisInduk > 0 ? parseFloat(((dispRealKeu / basisInduk) * 100).toFixed(2)) : item.persenKeuangan
              return (
                <div key={item.id} className={`p-4 space-y-3 hover:bg-muted/30 transition-colors ${isPecahan ? "pl-6 bg-indigo-500/[0.03] border-l-2 border-indigo-400/50" : isInduk ? "bg-indigo-500/[0.04]" : ""}`}>
                  {/* Header Card: No & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        #{no}
                      </span>
                      {isInduk && (
                        <Badge className="text-[10px] gap-1 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                          <GitBranch className="h-3 w-3" />
                          Induk ({item.agregatPecahan?.count || 0} Kontrak)
                        </Badge>
                      )}
                      {isPecahan && (
                        <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                          ↳ Pecahan
                        </Badge>
                      )}
                    </div>
                    <div>
                      {isInduk ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                          Rekap Otomatis
                        </Badge>
                      ) : item.polaMonitoring === "KEUANGAN" ? <Badge variant="outline">Keuangan</Badge> : dispTarget === 0 && dispRealFisik === 0 ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          Belum Mulai
                        </Badge>
                      ) : (
                        <Badge
                          className={`text-[10px] px-1.5 py-0 font-medium whitespace-nowrap ${
                            item.status === "AMAN"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : item.status === "PERHATIAN"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                          }`}
                        >
                          {item.status === "AMAN" ? (
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                          ) : item.status === "PERHATIAN" ? (
                            <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                          ) : (
                            <AlertCircle className="h-2.5 w-2.5 mr-1" />
                          )}
                          Dev: {dispDeviasi > 0 ? `+${dispDeviasi}` : dispDeviasi}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Nama Paket (Klik untuk buka modal input) */}
                  <div>
                    <button
                      type="button"
                      disabled={isInduk}
                      onClick={() => !isInduk && handleOpenInput(item.id)}
                      className={`font-semibold text-sm text-foreground text-left transition-colors leading-snug line-clamp-2 ${isInduk ? "cursor-default" : "hover:text-emerald-600 cursor-pointer"}`}
                    >
                      {item.namaPaket}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      {item.nomorKontrak && (
                        <span className="font-mono bg-muted/80 px-1.5 py-0.5 rounded text-[10px]">
                          SPK: {item.nomorKontrak}
                        </span>
                      )}
                      {item.kodeRupKontrak && (
                        <span className="font-mono bg-muted/80 px-1.5 py-0.5 rounded text-[10px]">
                          RUP: {item.kodeRupKontrak}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub Unit Kerja */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-md">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-foreground truncate">
                      {item.subUnit?.namaSubUnit || item.opd?.namaOpd || item.opd?.singkatan || "-"}
                    </span>
                  </div>

                  {/* Grid Realisasi Fisik & Keuangan dengan Mini Donut */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-md bg-muted/40 text-xs font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.polaMonitoring !== "KEUANGAN" && (
                        <MiniDonut
                          value={dispRealFisik}
                          size={34}
                          strokeWidth={3.5}
                          color={
                            item.status === "AMAN"
                              ? "#059669"
                              : item.status === "PERHATIAN"
                              ? "#d97706"
                              : dispRealFisik > 0
                              ? "#e11d48"
                              : "#94a3b8"
                          }
                          label="Fisik"
                        />
                      )}
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="text-[10px] text-muted-foreground font-sans">Kinerja Fisik</div>
                        <div className="font-bold text-foreground">
                          {item.polaMonitoring === "KEUANGAN" ? "—" : dispRealFisik > 0 ? `${dispRealFisik}%` : "-"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans truncate">
                          Target: {item.polaMonitoring === "KEUANGAN" ? "—" : `${dispTarget}%`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <MiniDonut
                        value={dispPersenKeu}
                        size={34}
                        strokeWidth={3.5}
                        color="#2563eb"
                        label="Serapan Keuangan"
                      />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="text-[10px] text-muted-foreground font-sans">Keuangan</div>
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                          {dispRealKeu > 0 ? formatRupiah(dispRealKeu) : "-"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans truncate">
                          {dispPersenKeu > 0 ? `${dispPersenKeu}% Serap` : "0% Serap"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nilai Pagu & Kontrak */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono px-1">
                    <span>{isPecahan ? "Pagu: Ikut Induk" : `Pagu: ${formatRupiah(item.nilaiPagu)}`}</span>
                    {item.polaMonitoring !== "KEUANGAN" && <span className="font-semibold text-foreground">Kontrak: {formatRupiah(dispKontrak)}</span>}
                  </div>

                  {/* Tombol Input / Ubah */}
                  <div className="pt-1 border-t border-dashed border-gray-200 dark:border-neutral-700">
                    {isInduk ? (
                      <Button variant="outline" size="sm" disabled className="w-full h-8 text-xs gap-1.5 opacity-80">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Input pada Baris Pecahan</span>
                      </Button>
                    ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenInput(item.id)}
                      className={`w-full h-8 text-xs gap-1.5 transition-colors justify-center ${
                        Number(item.realisasiFisik || 0) > 0 || Number(item.realisasiKeuangan || 0) > 0
                          ? "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          : "hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>
                        {Number(item.realisasiFisik || 0) > 0 || Number(item.realisasiKeuangan || 0) > 0
                          ? "Ubah Realisasi"
                          : "Input Realisasi"}
                      </span>
                    </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop & Tablet View: Tabel Terstruktur (>= md) */}
        <div className="hidden md:block w-full overflow-x-auto">
          <Table className="w-full table-fixed min-w-[850px] lg:min-w-full border-collapse">
            <TableHeader className="bg-gray-50/90 dark:bg-neutral-800/80">
              <TableRow className="hover:bg-transparent border-b border-gray-200 dark:border-neutral-700">
                <TableHead className="w-12 text-center text-xs font-semibold py-3.5 border-r border-b border-gray-200 dark:border-neutral-700">
                  No
                </TableHead>
                <TableHead className="w-[30%] text-xs font-semibold py-3.5 border-r border-b border-gray-200 dark:border-neutral-700">
                  Paket Pembangunan & Sub Unit
                </TableHead>
                <TableHead className="w-[20%] text-right text-xs font-semibold py-3.5 border-r border-b border-gray-200 dark:border-neutral-700">
                  Pagu & Kontrak
                </TableHead>
                {!keuanganSaja && <>
                <TableHead className="w-[20%] text-right text-xs font-semibold py-3.5 border-r border-b border-gray-200 dark:border-neutral-700">
                  Kinerja Fisik
                </TableHead>
                </>}
                <TableHead className="w-[18%] text-right text-xs font-semibold py-3.5 border-r border-b border-gray-200 dark:border-neutral-700">
                  Realisasi Keuangan
                </TableHead>
                <TableHead className="w-20 text-center text-xs font-semibold py-3.5 border-b border-gray-200 dark:border-neutral-700">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={keuanganSaja ? 5 : 6} className="h-56 text-center border-b border-gray-200 dark:border-neutral-700">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      <span className="text-xs text-muted-foreground">Memuat data realisasi bulanan...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={keuanganSaja ? 5 : 6} className="h-56 text-center text-sm text-muted-foreground">
                    Daftar paket belum dapat dimuat.
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={keuanganSaja ? 5 : 6} className="h-56 text-center border-b border-gray-200 dark:border-neutral-700">
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
                  const isInduk = !!(item.hasChildren && item.agregatPecahan)
                  const isPecahan = !!item.parentId
                  const dispTarget = isInduk && item.agregatPecahan ? item.agregatPecahan.avgTargetFisik : item.targetFisik
                  const dispRealFisik = isInduk && item.agregatPecahan ? item.agregatPecahan.avgRealisasiFisik : item.realisasiFisik
                  const dispDeviasi = isInduk && item.agregatPecahan ? item.agregatPecahan.avgDeviasiFisik : item.deviasiFisik
                  const dispKontrak = isInduk && item.agregatPecahan ? item.agregatPecahan.totalKontrak : item.nilaiKontrak
                  const dispRealKeu = isInduk && item.agregatPecahan ? item.agregatPecahan.totalRealisasiKeuangan : item.realisasiKeuangan
                  const basisInduk = item.nilaiPagu > 0 ? item.nilaiPagu : dispKontrak
                  const dispPersenKeu = isInduk && basisInduk > 0 ? parseFloat(((dispRealKeu / basisInduk) * 100).toFixed(2)) : item.persenKeuangan

                  return (
                    <TableRow key={item.id} className={`hover:bg-muted/30 transition-colors border-b border-gray-200 dark:border-neutral-700 ${isPecahan ? "bg-indigo-500/[0.025]" : isInduk ? "bg-indigo-500/[0.04]" : ""}`}>
                      {/* No */}
                      <TableCell className="text-center font-mono text-xs text-muted-foreground py-3.5 border-r border-b border-gray-200 dark:border-neutral-700">
                        {isPecahan ? <span className="text-indigo-600 dark:text-indigo-400">↳ {no}</span> : no}
                      </TableCell>

                      {/* Identitas Paket & Sub Unit */}
                      <TableCell className="max-w-0 py-3.5 border-r border-b border-gray-200 dark:border-neutral-700">
                        <div className={`w-full min-w-0 overflow-hidden space-y-1 ${isPecahan ? "pl-3 border-l-2 border-indigo-400/50" : ""}`}>
                          {(isInduk || isPecahan) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isInduk && (
                                <Badge className="gap-1 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px]">
                                  <GitBranch className="h-3 w-3" />
                                  Induk Gelondongan ({item.agregatPecahan?.count || 0} Kontrak)
                                </Badge>
                              )}
                              {isPecahan && (
                                <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                                  ↳ Pecahan Kontrak
                                </Badge>
                              )}
                            </div>
                          )}
                          <button
                            type="button"
                            disabled={isInduk}
                            onClick={() => !isInduk && handleOpenInput(item.id)}
                            className={`font-semibold text-foreground text-left truncate block w-full transition-colors text-sm leading-snug ${isInduk ? "cursor-default" : "hover:text-emerald-600 cursor-pointer"}`}
                            title={item.namaPaket}
                          >
                            {item.namaPaket}
                          </button>
                          <div className="flex items-center gap-1.5 overflow-hidden text-xs text-muted-foreground w-full min-w-0">
                            <div className="inline-flex items-center gap-1 font-medium text-foreground/80 bg-muted/70 px-1.5 py-0.5 rounded text-[11px] shrink-0 max-w-[180px]">
                              <Building2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span className="truncate" title={item.subUnit?.namaSubUnit || item.opd?.namaOpd || "-"}>
                                {item.subUnit?.namaSubUnit || item.opd?.singkatan || item.opd?.namaOpd || "-"}
                              </span>
                            </div>
                            {item.nomorKontrak && (
                              <span className="font-mono text-[10px] text-muted-foreground truncate shrink-0 max-w-[110px]" title={item.nomorKontrak}>
                                SPK: {item.nomorKontrak}
                              </span>
                            )}
                            {item.kodeRupKontrak && (
                              <span className="font-mono bg-muted/80 px-1.5 py-0.5 rounded text-[10px] shrink-0" title={`Kode RUP: ${item.kodeRupKontrak}`}>
                                RUP: {item.kodeRupKontrak}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Pagu & Kontrak */}
                      <TableCell className="max-w-0 text-right py-3.5 font-mono border-r border-b border-gray-200 dark:border-neutral-700">
                        <div className="w-full min-w-0 overflow-hidden space-y-0.5">
                          <div className="font-semibold text-xs text-foreground truncate">
                            {formatRupiah(item.polaMonitoring === "KEUANGAN" && !isInduk ? (isPecahan ? dispKontrak : item.nilaiPagu) : dispKontrak)}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {isPecahan
                              ? "Pagu: Ikut Induk"
                              : item.polaMonitoring === "KEUANGAN"
                                ? "Pagu anggaran"
                                : `Pagu: ${formatRupiah(item.nilaiPagu)}`}
                          </div>
                        </div>
                      </TableCell>

                      {!keuanganSaja && <>
                      {/* Kinerja Fisik: Target, Realisasi & Deviasi / Status */}
                      <TableCell className="max-w-0 py-3.5 font-mono border-r border-b border-gray-200 dark:border-neutral-700">
                        <div className="flex items-center justify-end gap-2.5">
                          {item.polaMonitoring !== "KEUANGAN" && (
                            <MiniDonut
                              value={dispRealFisik}
                              size={38}
                              strokeWidth={3.8}
                              color={
                                isInduk
                                  ? "#6366f1"
                                  : item.status === "AMAN"
                                  ? "#059669"
                                  : item.status === "PERHATIAN"
                                  ? "#d97706"
                                  : dispRealFisik > 0
                                  ? "#e11d48"
                                  : "#94a3b8"
                              }
                              label="Realisasi Fisik"
                            />
                          )}
                          <div className="min-w-0 text-right space-y-1">
                            <div className="flex items-center justify-end gap-1.5 text-xs truncate">
                              <span className="text-muted-foreground text-[11px]">Tgt: {item.polaMonitoring === "KEUANGAN" ? "—" : `${dispTarget}%`}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-bold text-foreground">
                                Real: {item.polaMonitoring === "KEUANGAN" ? "—" : dispRealFisik > 0 ? `${dispRealFisik}%` : "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-end gap-1">
                              {isInduk ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                                  Rekap Otomatis ({dispDeviasi > 0 ? `+${dispDeviasi}` : dispDeviasi}%)
                                </Badge>
                              ) : item.polaMonitoring === "KEUANGAN" ? <Badge variant="outline">Keuangan</Badge> : dispTarget === 0 && dispRealFisik === 0 ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                  Belum Mulai
                                </Badge>
                              ) : (
                                <Badge
                                  className={`text-[10px] px-1.5 py-0 font-medium whitespace-nowrap ${
                                    item.status === "AMAN"
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                      : item.status === "PERHATIAN"
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                      : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                                  }`}
                                >
                                  {item.status === "AMAN" ? (
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                  ) : item.status === "PERHATIAN" ? (
                                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                  ) : (
                                    <AlertCircle className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  Dev: {dispDeviasi > 0 ? `+${dispDeviasi}` : dispDeviasi}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      </>}

                      {/* Realisasi Keuangan */}
                      <TableCell className="max-w-0 py-3.5 font-mono border-r border-b border-gray-200 dark:border-neutral-700">
                        <div className="flex items-center justify-end gap-2.5">
                          <MiniDonut
                            value={dispPersenKeu}
                            size={38}
                            strokeWidth={3.8}
                            color="#2563eb"
                            label="Serapan Keuangan"
                          />
                          <div className="min-w-0 text-right space-y-0.5">
                            <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 truncate">
                              {dispRealKeu > 0 ? formatRupiah(dispRealKeu) : "-"}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {dispPersenKeu > 0 ? `${dispPersenKeu}% Serap` : "0% Serap"}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center py-3.5 border-b border-gray-200 dark:border-neutral-700">
                        {isInduk ? (
                          <Button variant="outline" size="sm" disabled className="h-8 px-2.5 text-[11px] gap-1 opacity-75">
                            <Lock className="h-3 w-3" />
                            <span>Di Pecahan</span>
                          </Button>
                        ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenInput(item.id)}
                          className={`h-8 px-2.5 text-xs gap-1.5 transition-colors ${
                            Number(item.realisasiFisik || 0) > 0 || Number(item.realisasiKeuangan || 0) > 0
                              ? "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              : "hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>
                            {Number(item.realisasiFisik || 0) > 0 || Number(item.realisasiKeuangan || 0) > 0
                              ? "Ubah"
                              : "Input"}
                          </span>
                        </Button>
                        )}
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
        key={`${selectedPaketId}-${inputModalOpen}`}
        open={inputModalOpen}
        onOpenChange={setInputModalOpen}
        paketId={selectedPaketId}
        activeBulan={bulan}
      />
    </div>
  )
}
