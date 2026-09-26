"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { apiClient } from "@/lib/api-client"
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
  // Filters state
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 400)
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026)
  const [selectedOpd, setSelectedOpd] = useState<string>("ALL")
  const [selectedMetode, setSelectedMetode] = useState<string>("ALL")
  const [page, setPage] = useState<number>(1)
  const limit = 10

  // Dialogs state
  const [formOpen, setFormOpen] = useState<boolean>(false)
  const [detailOpen, setDetailOpen] = useState<boolean>(false)
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false)
  const [selectedPaket, setSelectedPaket] = useState<PaketItem | null>(null)

  // 1. Fetch OPD list
  const { data: opdResponse } = useQuery({
    queryKey: ["opd-options"],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/opd-options")
      return res.data?.data as OpdOption[]
    },
    staleTime: 5 * 60 * 1000,
  })

  // 2. Fetch PBJ Constants
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

  // 3. Fetch Paket Pembangunan
  const {
    data: paketResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["paket-pembangunan", page, debouncedSearch, tahunAnggaran, selectedOpd, selectedMetode],
    queryFn: async () => {
      const params: any = {
        page,
        limit,
        tahunAnggaran,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (selectedOpd !== "ALL") params.opdId = selectedOpd
      if (selectedMetode !== "ALL") params.metodePemilihan = selectedMetode

      const res = await apiClient.get("/pembangunan", { params })
      return res.data
    },
  })

  const opdList = opdResponse || []
  const paketList: PaketItem[] = paketResponse?.data || []
  const meta = paketResponse?.meta || { total: 0, totalPages: 1, page: 1 }

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
    setFormOpen(true)
  }

  const handleOpenEdit = (paket: PaketItem) => {
    setSelectedPaket(paket)
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
    setSelectedOpd("ALL")
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
            <Badge
              variant="outline"
              className="text-xs font-semibold uppercase tracking-wider text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
            >
              Menu 1
            </Badge>
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
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Paket Baru</span>
          </Button>
        </div>
      </div>

      {/* Stat Cards Overview */}
      <PembangunanStatCards
        totalPaket={meta.total}
        totalPagu={totalPagu}
        totalKontrak={totalKontrak}
      />

      {/* Filter Toolbar */}
      <Card className="border-border/70 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama paket, no. SPK, kode RUP, rekanan..."
                className="pl-9 text-sm h-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            {/* Tahun Filter */}
            <div className="lg:col-span-2">
              <Select
                value={String(tahunAnggaran)}
                onValueChange={(val) => {
                  setTahunAnggaran(parseInt(val))
                  setPage(1)
                }}
              >
                <SelectTrigger className="text-sm h-10">
                  <SelectValue placeholder="Tahun Anggaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">TA 2026</SelectItem>
                  <SelectItem value="2025">TA 2025</SelectItem>
                  <SelectItem value="2024">TA 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* OPD Filter */}
            <div className="lg:col-span-3">
              <Select
                value={selectedOpd}
                onValueChange={(val) => {
                  setSelectedOpd(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="text-sm h-10">
                  <SelectValue placeholder="Semua Perangkat Daerah" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="ALL">Semua OPD / SKPD</SelectItem>
                  {opdList.map((opd) => (
                    <SelectItem key={opd.id} value={opd.id}>
                      {opd.namaOpd} {opd.singkatan ? `(${opd.singkatan})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Metode Pemilihan Filter */}
            <div className="lg:col-span-2">
              <Select
                value={selectedMetode}
                onValueChange={(val) => {
                  setSelectedMetode(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="text-sm h-10">
                  <SelectValue placeholder="Semua Metode" />
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

          {(search || selectedOpd !== "ALL" || selectedMetode !== "ALL" || tahunAnggaran !== 2026) && (
            <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
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
      <Card className="border-border/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center text-xs font-semibold py-3.5">No</TableHead>
                <TableHead className="min-w-[280px] text-xs font-semibold py-3.5">
                  Nama Paket & Identitas PBJ
                </TableHead>
                <TableHead className="min-w-[190px] text-xs font-semibold py-3.5">
                  OPD / SKPD
                </TableHead>
                <TableHead className="min-w-[140px] text-xs font-semibold py-3.5">
                  Metode & Sumber
                </TableHead>
                <TableHead className="min-w-[170px] text-right text-xs font-semibold py-3.5">
                  Pagu & Kontrak (Rp)
                </TableHead>
                <TableHead className="min-w-[110px] text-center text-xs font-semibold py-3.5">
                  Target B12
                </TableHead>
                <TableHead className="min-w-[170px] text-xs font-semibold py-3.5">
                  Rekanan & Kontrak
                </TableHead>
                <TableHead className="w-[120px] text-center text-xs font-semibold py-3.5">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-56 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      <span className="text-xs text-muted-foreground">Memuat data paket pembangunan...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paketList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-56 text-center">
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
                    <TableRow key={paket.id} className="hover:bg-muted/30 transition-colors">
                      {/* No */}
                      <TableCell className="text-center font-mono text-xs text-muted-foreground py-3.5">
                        {no}
                      </TableCell>

                      {/* Identitas Paket */}
                      <TableCell className="py-3.5">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(paket)}
                            className="font-semibold text-foreground hover:text-emerald-600 text-left line-clamp-2 transition-colors cursor-pointer text-sm"
                          >
                            {paket.namaPaket}
                          </button>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            {paket.kodeRupKontrak && (
                              <span className="font-mono bg-muted/80 px-1.5 py-0.5 rounded text-[11px]">
                                {paket.kodeRupKontrak}
                              </span>
                            )}
                            {paket.lokasiKegiatan && (
                              <span className="flex items-center gap-1 truncate max-w-[220px]" title={paket.lokasiKegiatan}>
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                {paket.lokasiKegiatan}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* OPD */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium text-foreground">
                            {paket.opd?.namaOpd || paket.opd?.singkatan || "-"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Metode & Sumber */}
                      <TableCell className="py-3.5">
                        <div className="space-y-1">
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            {paket.metodePemilihan || "PBJ"}
                          </Badge>
                          <div className="text-[11px] text-muted-foreground">
                            {paket.sumberDana || "-"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Nilai Pagu & Kontrak */}
                      <TableCell className="text-right py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatRupiah(kontrakNum)}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            Pagu: {formatRupiah(paguNum)}
                          </div>
                        </div>
                      </TableCell>

                      {/* Target B12 */}
                      <TableCell className="text-center py-3.5">
                        <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          <TrendingUp className="h-3 w-3" />
                          {targetB12.toFixed(1)}%
                        </div>
                      </TableCell>

                      {/* Rekanan & No Kontrak */}
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5 text-xs">
                          <div className="font-medium text-foreground truncate max-w-[160px]" title={paket.pemenangRekanan || "-"}>
                            {paket.pemenangRekanan || "-"}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[160px]">
                            {paket.nomorKontrak || "-"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title="Detail & Target 12 Bulan"
                            onClick={() => handleOpenDetail(paket)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            title="Ubah Paket"
                            onClick={() => handleOpenEdit(paket)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Hapus Paket"
                            onClick={() => handleOpenDelete(paket)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
