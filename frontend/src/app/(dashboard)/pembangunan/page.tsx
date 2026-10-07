"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { SearchableCombobox } from "@/components/searchable-combobox"
import { isExcludedOpd } from "@/lib/utils"
import { PembangunanStatCards } from "./components/pembangunan-stat-cards"
import {
  PaketFormDialog,
  PaketItem,
  OpdOption,
} from "./components/paket-form-dialog"
import { PaketDetailDialog } from "./components/paket-detail-dialog"
import { DeletePaketDialog } from "./components/delete-paket-dialog"
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
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FilterX,
  Building2,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
} from "lucide-react"

export default function PaketPembangunanPage() {
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

  // Filters state
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 400)
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026)
  const [selectedOpd, setSelectedOpd] = useState<string>("ALL")
  const [selectedSubUnit, setSelectedSubUnit] = useState<string>("all")
  const [selectedMetode, setSelectedMetode] = useState<string>("ALL")
  const [page, setPage] = useState<number>(1)
  const limit = 10

  // Lock selectedOpd & selectedSubUnit if not super role
  useEffect(() => {
    if (!isSuperRole && userOpdId) {
      setSelectedOpd(userOpdId)
    }
    if (!isSuperRole && !isKepalaOpd && userSubUnitId) {
      setSelectedSubUnit(userSubUnitId)
    }
  }, [isSuperRole, isKepalaOpd, userOpdId, userSubUnitId])

  // Dialogs state
  const [formOpen, setFormOpen] = useState<boolean>(false)
  const [formDefaultTab, setFormDefaultTab] = useState<"info" | "targets">("info")
  const [detailOpen, setDetailOpen] = useState<boolean>(false)
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false)
  const [selectedPaket, setSelectedPaket] = useState<PaketItem | null>(null)

  // 1. Fetch OPD list (from real SIMPEG instansi)
  const { data: opdResponse } = useQuery({
    queryKey: ["opd-options"],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/opd-options")
      return res.data?.data as OpdOption[]
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

  // 3. Fetch PBJ Constants
  const { data: constantsResponse } = useQuery({
    queryKey: ["pbj-constants"],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/constants")
      return res.data?.data as {
        metodePemilihan: string[]
        jenisPengadaan: string[]
        sumberDana: string[]
      }
    },
    staleTime: 10 * 60 * 1000,
  })

  // 4. Fetch Paket Pembangunan
  const {
    data: paketResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["paket-pembangunan", page, debouncedSearch, tahunAnggaran, selectedOpd, selectedSubUnit, selectedMetode],
    queryFn: async () => {
      const params: any = {
        page,
        limit,
        tahunAnggaran,
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
      if (selectedMetode !== "ALL" && selectedMetode !== "all") {
        params.metodePemilihan = selectedMetode
      }

      const res = await apiClient.get("/pembangunan", { params })
      return res.data
    },
  })

  const opdList = opdResponse || []
  const paketList: PaketItem[] = paketResponse?.data || []
  const meta = paketResponse?.meta || { total: 0, totalPages: 1, page: 1 }

  // Combobox options for Unit Kerja & Sub Unit
  const opdOptions = useMemo(() => {
    const list = Array.isArray(opdList) ? opdList : []
    return list
      .filter((opd) => !isExcludedOpd(opd.id) && !isExcludedOpd(opd.namaOpd))
      .map((opd) => ({
        id: opd.id,
        label: opd.namaOpd + (opd.singkatan ? ` (${opd.singkatan})` : ""),
      }))
  }, [opdList])

  const subUnitOptions = useMemo(() => {
    const list = Array.isArray(subUnitResponse) ? subUnitResponse : []
    return list.map((su: any) => ({
      id: su.id,
      label: su.namaSubUnit,
    }))
  }, [subUnitResponse])

  // Calculate totals for stats
  const totalPagu = paketList.reduce(
    (acc, cur) => acc + (typeof cur.nilaiPagu === "string" ? parseFloat(cur.nilaiPagu) : cur.nilaiPagu || 0),
    0,
  )
  const totalKontrak = paketList.reduce(
    (acc, cur) => acc + (typeof cur.nilaiKontrak === "string" ? parseFloat(cur.nilaiKontrak) : cur.nilaiKontrak || 0),
    0,
  )

  const formatRupiah = (val: number | string | undefined | null) => {
    const num = typeof val === "string" ? parseFloat(val) : val || 0
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  const handleOpenCreate = () => {
    setSelectedPaket(null)
    setFormDefaultTab("info")
    setFormOpen(true)
  }

  const handleOpenEdit = (paket: PaketItem) => {
    setSelectedPaket(paket)
    setFormDefaultTab("info")
    setFormOpen(true)
  }

  const handleOpenTarget = (paket: PaketItem) => {
    setSelectedPaket(paket)
    setFormDefaultTab("targets")
    setFormOpen(true)
  }

  const handleOpenDetail = (paket: PaketItem) => {
    setSelectedPaket(paket)
    setDetailOpen(true)
  }

  const handleOpenDelete = (paket: PaketItem) => {
    setSelectedPaket(paket)
    setDeleteOpen(true)
  }

  const handleResetFilter = () => {
    setSearch("")
    setTahunAnggaran(2026)
    setSelectedOpd(isSuperRole ? "ALL" : (userOpdId || "ALL"))
    setSelectedSubUnit("all")
    setSelectedMetode("ALL")
    setPage(1)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full max-w-[1600px] mx-auto">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Data Paket Pembangunan
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pengelolaan paket pekerjaan pengadaan fisik & penetapan kurva rencana fisik bulanan (B01–B12)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
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
          {(isSuperRole || hasRole("ADMIN_SIRUP")) && (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Paket Baru</span>
              <span className="sm:hidden">Tambah Paket</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards Overview */}
      <PembangunanStatCards
        totalPaket={meta.total}
        totalPagu={totalPagu}
        totalKontrak={totalKontrak}
      />

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

          {/* Baris 2: Sejajar 4 Filter: Unit Kerja (OPD), Sub Unit Kerja, Tahun, Metode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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
              {!isSuperRole && !isKepalaOpd && userSubUnitNama ? (
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
                  icon={<Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
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

            {/* Filter Metode Pemilihan PBJ */}
            <div className="w-full">
              <Select
                value={selectedMetode}
                onValueChange={(val) => {
                  setSelectedMetode(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background w-full">
                  <SelectValue placeholder="Semua Metode PBJ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Metode PBJ</SelectItem>
                  {(constantsResponse?.metodePemilihan || [
                    "E-Purchasing",
                    "Pengadaan Langsung",
                    "Tender",
                    "Swakelola Tipe I",
                  ]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(search || (selectedOpd !== "ALL" && selectedOpd !== "all") || (selectedSubUnit !== "all" && selectedSubUnit !== "ALL") || selectedMetode !== "ALL" || tahunAnggaran !== 2026) && (
            <div className="flex items-center justify-between pt-2.5 border-t text-xs text-muted-foreground">
              <span>Filter aktif diterapkan pada daftar paket</span>
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
      <Card className="border border-gray-200 dark:border-neutral-700 shadow-xs overflow-hidden">
        {/* Mobile View: Tampilan Kartu Kompak & Nyaman di Layar HP (< md) */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-neutral-700">
          {isLoading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="text-xs text-muted-foreground">Memuat data paket pembangunan...</span>
            </div>
          ) : paketList.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/80">
                <Briefcase className="h-6 w-6 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                Belum ada data paket pembangunan
              </span>
              <p className="text-xs text-muted-foreground max-w-sm">
                Silakan klik tombol <strong>Tambah Paket Baru</strong> untuk menginput rincian paket pengadaan.
              </p>
            </div>
          ) : (
            paketList.map((paket, index) => {
              const no = (page - 1) * limit + index + 1
              const paguNum = typeof paket.nilaiPagu === "string" ? parseFloat(paket.nilaiPagu) : paket.nilaiPagu || 0
              const kontrakNum = typeof paket.nilaiKontrak === "string" ? parseFloat(paket.nilaiKontrak) : paket.nilaiKontrak || 0
              const targetB12 = paket.targetBulanan?.find((t) => t.bulan === 12)?.targetFisik || 0

              return (
                <div key={paket.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                  {/* Header Card: No & Badge Metode + Target B12 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        #{no}
                      </span>
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {paket.metodePemilihan || "PBJ"}
                      </Badge>
                      {paket.sumberDana && (
                        <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                          • {paket.sumberDana}
                        </span>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
                      <TrendingUp className="h-3 w-3" />
                      <span>B12: {targetB12.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Nama Paket (Klik untuk buka detail) */}
                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(paket)}
                      className="font-semibold text-sm text-foreground hover:text-emerald-600 text-left transition-colors cursor-pointer leading-snug line-clamp-2"
                    >
                      {paket.namaPaket}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      {paket.kodeRupKontrak && (
                        <span className="font-mono bg-muted/80 px-1.5 py-0.5 rounded text-[10px]">
                          RUP: {paket.kodeRupKontrak}
                        </span>
                      )}
                      {paket.lokasiKegiatan && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[200px]">{paket.lokasiKegiatan}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub Unit Kerja */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-md">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-foreground truncate">
                      {paket.subUnit?.namaSubUnit || paket.opd?.namaOpd || paket.opd?.singkatan || "-"}
                    </span>
                  </div>

                  {/* Nilai Pagu & Kontrak */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-md bg-muted/40 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-muted-foreground font-sans">Nilai Kontrak</div>
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                        {formatRupiah(kontrakNum)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-sans">Nilai Pagu</div>
                      <div className="text-muted-foreground truncate">
                        {formatRupiah(paguNum)}
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi di Mobile */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-dashed border-gray-200 dark:border-neutral-700">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 text-muted-foreground hover:text-emerald-600"
                      onClick={() => handleOpenDetail(paket)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Detail</span>
                    </Button>

                    {(isSuperRole || hasRole("ADMIN_PERENCANAAN")) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => handleOpenTarget(paket)}
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Target</span>
                      </Button>
                    )}

                    {(isSuperRole || hasRole("ADMIN_SIRUP")) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        onClick={() => handleOpenEdit(paket)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Ubah</span>
                      </Button>
                    )}

                    {(isSuperRole || hasRole("ADMIN_SIRUP")) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => handleOpenDelete(paket)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop & Tablet View: Tabel Lebar Penuh dengan Border Abu-Abu Tipis (>= md) */}
        <div className="hidden md:block w-full overflow-x-auto">
          <Table className="w-full table-fixed min-w-[850px] lg:min-w-full border-collapse">
            <TableHeader className="bg-gray-50/90 dark:bg-neutral-800/80">
              <TableRow className="hover:bg-transparent border-b border-gray-200 dark:border-neutral-700">
                <TableHead className="w-10 text-center text-xs font-semibold py-3 px-1 border-r border-b border-gray-200 dark:border-neutral-700">
                  No
                </TableHead>
                <TableHead className="w-[30%] text-xs font-semibold py-3 px-3 border-r border-b border-gray-200 dark:border-neutral-700">
                  Nama Paket & Identitas PBJ
                </TableHead>
                <TableHead className="w-[19%] text-xs font-semibold py-3 px-3 border-r border-b border-gray-200 dark:border-neutral-700">
                  Sub Unit Kerja
                </TableHead>
                <TableHead className="w-[13%] text-xs font-semibold py-3 px-3 border-r border-b border-gray-200 dark:border-neutral-700">
                  Metode & Sumber
                </TableHead>
                <TableHead className="w-[17%] text-right text-xs font-semibold py-3 px-3 border-r border-b border-gray-200 dark:border-neutral-700">
                  Pagu & Kontrak (Rp)
                </TableHead>
                <TableHead className="w-[9%] text-center text-xs font-semibold py-3 px-2 border-r border-b border-gray-200 dark:border-neutral-700">
                  Target B12
                </TableHead>
                <TableHead className="w-32 text-center text-xs font-semibold py-3 px-1 border-b border-gray-200 dark:border-neutral-700">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-56 text-center border-b border-gray-200 dark:border-neutral-700">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      <span className="text-xs text-muted-foreground">Memuat data paket pembangunan...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paketList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-56 text-center border-b border-gray-200 dark:border-neutral-700">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/80">
                        <Briefcase className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        Belum ada data paket pembangunan
                      </span>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Silakan klik tombol <strong>Tambah Paket Baru</strong> untuk menginput rincian paket pengadaan dan rancangan target bulanan Anda.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paketList.map((paket, index) => {
                  const no = (page - 1) * limit + index + 1
                  const paguNum = typeof paket.nilaiPagu === "string" ? parseFloat(paket.nilaiPagu) : paket.nilaiPagu || 0
                  const kontrakNum = typeof paket.nilaiKontrak === "string" ? parseFloat(paket.nilaiKontrak) : paket.nilaiKontrak || 0
                  const targetB12 = paket.targetBulanan?.find((t) => t.bulan === 12)?.targetFisik || 0

                  return (
                    <TableRow key={paket.id} className="hover:bg-muted/30 transition-colors border-b border-gray-200 dark:border-neutral-700">
                      {/* No */}
                      <TableCell className="text-center font-mono text-xs text-muted-foreground py-3 px-1 border-r border-b border-gray-200 dark:border-neutral-700">
                        {no}
                      </TableCell>

                      {/* Identitas Paket */}
                      <TableCell className="max-w-0 py-3 px-3 border-r border-b border-gray-200 dark:border-neutral-700">
                        <div className="w-full min-w-0 overflow-hidden space-y-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(paket)}
                            className="font-semibold text-foreground hover:text-emerald-600 text-left truncate block w-full transition-colors cursor-pointer text-xs sm:text-sm leading-snug"
                            title={paket.namaPaket}
                          >
                            {paket.namaPaket}
                          </button>
                          <div className="flex items-center gap-1.5 overflow-hidden text-xs text-muted-foreground w-full min-w-0">
                            {paket.kodeRupKontrak && (
                              <span className="font-mono bg-muted/80 px-1.5 py-0.5 rounded text-[10px] shrink-0" title={`Kode RUP: ${paket.kodeRupKontrak}`}>
                                RUP: {paket.kodeRupKontrak}
                              </span>
                            )}
                            {paket.lokasiKegiatan && (
                              <span className="flex items-center gap-1 truncate shrink min-w-0 text-[11px]" title={paket.lokasiKegiatan}>
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{paket.lokasiKegiatan}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Sub Unit Kerja */}
                      <TableCell className="max-w-0 py-3 px-3 border-r border-b border-gray-200 dark:border-neutral-700">
                        <div className="flex items-center gap-1.5 w-full min-w-0 overflow-hidden">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span
                            className="text-xs font-medium text-foreground truncate block flex-1 min-w-0"
                            title={paket.subUnit?.namaSubUnit || paket.opd?.namaOpd || paket.opd?.singkatan || "-"}
                          >
                            {paket.subUnit?.namaSubUnit || paket.opd?.namaOpd || paket.opd?.singkatan || "-"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Metode & Sumber */}
                      <TableCell className="max-w-0 py-3 px-3 border-r border-b border-gray-200 dark:border-neutral-700">
                        <div className="w-full min-w-0 overflow-hidden space-y-1">
                          <div className="w-full overflow-hidden">
                            <Badge variant="secondary" className="text-[10px] sm:text-[11px] font-normal truncate max-w-full block text-center whitespace-nowrap" title={paket.metodePemilihan || "PBJ"}>
                              {paket.metodePemilihan || "PBJ"}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate block w-full" title={paket.sumberDana || "-"}>
                            {paket.sumberDana || "-"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Nilai Pagu & Kontrak */}
                      <TableCell className="max-w-0 text-right py-3 px-3 border-r border-b border-gray-200 dark:border-neutral-700 font-mono">
                        <div className="w-full min-w-0 overflow-hidden space-y-0.5">
                          <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 truncate">
                            {formatRupiah(kontrakNum)}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            Pagu: {formatRupiah(paguNum)}
                          </div>
                        </div>
                      </TableCell>

                      {/* Target B12 */}
                      <TableCell className="max-w-0 text-center py-3 px-2 border-r border-b border-gray-200 dark:border-neutral-700">
                        <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          <TrendingUp className="h-3 w-3 shrink-0" />
                          <span>{targetB12.toFixed(1)}%</span>
                        </div>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center py-3 px-1 border-b border-gray-200 dark:border-neutral-700">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title="Detail & Target 12 Bulan"
                            onClick={() => handleOpenDetail(paket)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Tombol Khusus Admin Perencanaan: Tetapkan / Ubah Target Fisik */}
                          {(isSuperRole || hasRole("ADMIN_PERENCANAAN")) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              title="Tetapkan / Ubah Target Fisik (12 Bulan)"
                              onClick={() => handleOpenTarget(paket)}
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Tombol Ubah Rincian Pengadaan: Admin SiRUP & Administrator */}
                          {(isSuperRole || hasRole("ADMIN_SIRUP")) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              title="Ubah Rincian PBJ / Kontrak"
                              onClick={() => handleOpenEdit(paket)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Tombol Hapus: Hanya Administrator & Admin SiRUP pembuat */}
                          {(isSuperRole || hasRole("ADMIN_SIRUP")) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Hapus Paket"
                              onClick={() => handleOpenDelete(paket)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        {meta.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground bg-muted/20">
            <div>
              Menampilkan <span className="font-semibold text-foreground">{paketList.length}</span> dari{" "}
              <span className="font-semibold text-foreground">{meta.total}</span> paket pembangunan
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Sebelumnya
              </Button>
              <span className="font-medium text-foreground px-2">
                Halaman {page} dari {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="h-8 px-2.5 gap-1 text-xs"
              >
                Selanjutnya
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <PaketFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={selectedPaket}
        opdList={opdList}
        constants={constantsResponse}
        defaultTab={formDefaultTab}
      />

      <PaketDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        paket={selectedPaket}
      />

      <DeletePaketDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        paket={selectedPaket}
      />
    </div>
  )
}
