"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Building2,
  Calendar,
  CalendarDays,
  FileText,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  GitBranch,
  HardHat,
  Coins,
  FileBarChart2,
  ImageIcon,
  Eye,
  ExternalLink,
  Loader2,
  Sparkles,
  Info,
  Camera,
  FileDown,
  Plus,
  User,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { MonevDialog } from "./monev-dialog"
import { MonevListResponse, MonevPaketInfo, monevFotoUrl } from "../lib/monev-types"
import { cetakLaporanMonev } from "../lib/cetak-monev-pdf"
import { PaketItem } from "./paket-form-dialog"

const API_STORAGE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"

interface PaketDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paket: (PaketItem & {
    realisasiBulanan?: Array<{
      bulan: number
      realisasiFisik: number
      realisasiKeuangan: number | string
      catatanOperator?: string | null
    }>
  }) | null
}

const BULAN_NAMES = [
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

const BULAN_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
]

interface WeeklyItemDetail {
  id: string
  tersimpan: boolean
  bulan: number
  mingguKe: number
  tanggalMulai: string
  tanggalSelesai: string
  uraianKegiatan?: string | null
  targetFisik: number
  realisasiFisik: number
  realisasiKeuangan: number
  catatanOperator?: string | null
  deviasiFisik: number
  buktiFisik?: Array<{
    id: string
    namaFile: string
    pathFile: string
    mimeType?: string
    deskripsi?: string
    createdAt?: string
  }>
}

interface MonthlyTimelineItem {
  bulan: number
  targetFisik: number
  realisasiFisik: number
  deviasiFisik: number
  realisasiKeuangan: number
  persenKeuangan: number
  catatanOperator?: string | null
  pencairan?: Array<{
    id: string
    nominal: number
    catatan?: string | null
    createdAt?: string
    bukti?: Array<{
      id: string
      namaFile: string
      pathFile: string
    }>
  }>
}

export function PaketDetailDialog({
  open,
  onOpenChange,
  paket,
}: PaketDetailDialogProps) {
  const { user } = useAuth()
  const userRoles: string[] =
    user?.roles && user.roles.length > 0
      ? user.roles
      : user?.role
      ? [user.role]
      : []
  const canManageMonev =
    userRoles.length === 0 ||
    userRoles.some((r) => ["ADMINISTRATOR", "MONEV"].includes(r))

  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string
    title: string
    desc?: string
  } | null>(null)
  const [isMonevDialogOpen, setIsMonevDialogOpen] = useState(false)

  // Fetch riwayat lengkap mingguan dan bulanan dari backend
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["paket-detail-realisasi", paket?.id],
    queryFn: async () => {
      if (!paket?.id) return null
      const res = await apiClient.get(`/pembangunan/${paket.id}/realisasi`)
      return res.data?.data || res.data
    },
    enabled: open && !!paket?.id,
    staleTime: 60 * 1000,
  })

  // Fetch riwayat monev lapangan
  const { data: monevResponse, isLoading: isLoadingMonev } = useQuery<MonevListResponse>({
    queryKey: ["monev-lapangan", paket?.id],
    queryFn: async () => {
      if (!paket?.id) return { paket: null as any, data: [] }
      const res = await apiClient.get(`/pembangunan/${paket.id}/monev`)
      return res.data?.data
    },
    enabled: open && !!paket?.id,
  })

  if (!paket) return null

  const formatRupiah = (val: number | string | undefined | null) => {
    const num = typeof val === "string" ? parseFloat(val) : val || 0
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  const formatDateRange = (d1?: string | null, d2?: string | null) => {
    if (!d1 || !d2) return "-"
    const dt1 = new Date(d1)
    const dt2 = new Date(d2)
    if (isNaN(dt1.getTime()) || isNaN(dt2.getTime())) return "-"
    return `${dt1.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })} – ${dt2.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`
  }

  const isKeuangan = paket.polaMonitoring === "KEUANGAN"
  const paguNum =
    typeof paket.nilaiPagu === "string"
      ? parseFloat(paket.nilaiPagu)
      : paket.nilaiPagu || 0
  const kontrakNum =
    typeof paket.nilaiKontrak === "string"
      ? parseFloat(paket.nilaiKontrak)
      : paket.nilaiKontrak || 0
  const efisiensiRp = paguNum > kontrakNum ? paguNum - kontrakNum : 0
  const efisiensiPersen =
    paguNum > 0 ? ((efisiensiRp / paguNum) * 100).toFixed(2) : "0.00"

  const realisasiData = detailData?.data || detailData

  // Data mingguan riil dari server
  const weeklyTimeline: WeeklyItemDetail[] =
    realisasiData?.weeklyTimeline || []

  // Data 12 bulan (gabungan server atau fallback paket props)
  const monthlyTimeline: MonthlyTimelineItem[] =
    realisasiData?.timeline ||
    Array.from({ length: 12 }, (_, i) => {
      const bulan = i + 1
      const targetItem = paket.targetBulanan?.find((t) => t.bulan === bulan)
      const realisasiItem = paket.realisasiBulanan?.find(
        (r) => r.bulan === bulan
      )
      const targetFisik = targetItem ? targetItem.targetFisik : 0
      const realisasiFisik = realisasiItem ? realisasiItem.realisasiFisik : 0
      const realisasiKeuangan = realisasiItem
        ? Number(realisasiItem.realisasiKeuangan)
        : 0
      const deviasiFisik = realisasiFisik - targetFisik
      const persenKeuangan =
        paguNum > 0
          ? parseFloat(((realisasiKeuangan / paguNum) * 100).toFixed(2))
          : 0

      return {
        bulan,
        targetFisik,
        realisasiFisik,
        deviasiFisik,
        realisasiKeuangan,
        persenKeuangan,
        catatanOperator: realisasiItem?.catatanOperator || "-",
        pencairan: [],
      }
    })

  // Ringkasan status fisik terakhir untuk paket fisik
  const latestSavedWeek = [...weeklyTimeline]
    .reverse()
    .find((w) => w.tersimpan || w.realisasiFisik > 0)
  const currentWeek =
    latestSavedWeek || weeklyTimeline[0] || null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl lg:max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto p-5 sm:p-7">
          {/* HEADER MODAL */}
          <DialogHeader className="border-b pb-4">
            <div className="flex flex-col gap-2">
              {/* Badges Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  TA {paket.tahunAnggaran}
                </Badge>

                {/* Pola Monitoring Badge */}
                {isKeuangan ? (
                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1.5 font-medium">
                    <Coins className="h-3.5 w-3.5" />
                    Pola Keuangan Saja (Bulanan)
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1.5 font-medium">
                    <HardHat className="h-3.5 w-3.5" />
                    Pola Fisik &amp; Keuangan (Mingguan)
                  </Badge>
                )}

                {paket.kodeRupKontrak && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    RUP: {paket.kodeRupKontrak}
                  </Badge>
                )}

                {paket.mak?.map((m: { mak: string }) => (
                  <Badge key={m.mak} variant="outline" className="font-mono text-[10px]" title="Mata Anggaran Kegiatan (MAK)">
                    MAK: {m.mak}
                  </Badge>
                ))}

                {paket.metodePemilihan && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {paket.metodePemilihan}
                  </Badge>
                )}

                {(paket.isIndukGelondongan ||
                  (paket.pecahanPakets?.length ?? 0) > 0) && (
                  <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25 text-xs gap-1">
                    <GitBranch className="h-3 w-3" />
                    Induk Gelondongan ({paket.pecahanPakets?.length || 0} Kontrak)
                  </Badge>
                )}

                {paket.parentId && (
                  <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25 text-xs gap-1">
                    <GitBranch className="h-3 w-3" />
                    Pecahan Kontrak
                  </Badge>
                )}
              </div>

              {/* Title & Organization */}
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {paket.namaPaket}
                </DialogTitle>
                {paket.parentPaket && (
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    Bagian dari Paket Induk: {paket.parentPaket.namaPaket}
                  </div>
                )}
              </div>

              <DialogDescription className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  {paket.opd?.namaOpd || "OPD Pemkab Konawe Selatan"}
                </span>
                {paket.subUnit?.namaSubUnit && (
                  <>
                    <span>•</span>
                    <span className="text-muted-foreground">
                      {paket.subUnit.namaSubUnit}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* RINGKASAN ANGGARAN & KONTRAK */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-3">
            <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Pagu Anggaran
              </span>
              <div className="font-semibold text-sm text-foreground">
                {formatRupiah(paket.nilaiPagu)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {paket.sumberDana || "APBD"}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Nilai Kontrak / SPK
              </span>
              <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {kontrakNum > 0 ? formatRupiah(paket.nilaiKontrak) : "-"}
              </div>
              {efisiensiRp > 0 && (
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                  Hemat {formatRupiah(efisiensiRp)} ({efisiensiPersen}%)
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 space-y-1 sm:col-span-1 lg:col-span-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Pelaksana / Rekanan
              </span>
              <div className="font-semibold text-xs text-foreground truncate" title={paket.pemenangRekanan || "-"}>
                {paket.pemenangRekanan || "-"}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono truncate" title={paket.nomorKontrak || "-"}>
                {paket.nomorKontrak || "Belum berkontrak"}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Waktu Pelaksanaan
              </span>
              <div className="text-xs font-medium text-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {formatDateRange(paket.tanggalMulai, paket.tanggalSelesai)}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {weeklyTimeline.length > 0 ? `${weeklyTimeline.length} Minggu Kontrak` : "Masa Kontrak"}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Lokasi &amp; Jenis
              </span>
              <div className="text-xs font-medium text-foreground flex items-center gap-1 truncate" title={paket.lokasiKegiatan || "-"}>
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{paket.lokasiKegiatan || "-"}</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {paket.jenisPengadaan || "Pengadaan Barang/Jasa"}
              </div>
            </div>
          </div>

          {/* PECAHAN KONTRAK (JIKA PAKET INDUK GELONDONGAN) */}
          {paket.pecahanPakets && paket.pecahanPakets.length > 0 && (
            <div className="space-y-2 py-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <GitBranch className="h-3.5 w-3.5 text-indigo-600" />
                Rincian Kontrak Pecahan ({paket.pecahanPakets.length} Kontrak)
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10 text-center text-xs">No</TableHead>
                      <TableHead className="text-xs">Nama Kontrak Pecahan</TableHead>
                      <TableHead className="text-xs">Nomor Kontrak &amp; Penyedia</TableHead>
                      <TableHead className="text-right text-xs">Nilai Kontrak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paket.pecahanPakets.map((child, idx) => (
                      <TableRow key={child.id}>
                        <TableCell className="text-center font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{child.namaPaket}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="font-mono">{child.nomorKontrak || "-"}</div>
                          <div>{child.pemenangRekanan || "-"}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(child.nilaiKontrak)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Separator className="my-2" />

          {/* KONTEN KONDISIONAL: PAKET FISIK VS PAKET KEUANGAN */}
          {!isKeuangan ? (
            /* ========================================================== */
            /* A. PAKET FISIK & KEUANGAN: TAB MINGGUAN & REKAP TEPRA      */
            /* ========================================================== */
            <div className="space-y-4 pt-1">
              <Tabs defaultValue="mingguan" className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
                  <TabsList className="bg-muted/60 p-1">
                    <TabsTrigger
                      value="mingguan"
                      className="gap-1.5 text-xs font-semibold data-[state=active]:bg-background"
                    >
                      <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                      Progres Mingguan (Fisik &amp; Bukti)
                      {weeklyTimeline.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                          {weeklyTimeline.length} M
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="tepra"
                      className="gap-1.5 text-xs font-semibold data-[state=active]:bg-background"
                    >
                      <FileBarChart2 className="h-3.5 w-3.5 text-blue-600" />
                      Rekap Bulanan TEPRA
                    </TabsTrigger>
                    <TabsTrigger
                      value="monev"
                      className="gap-1.5 text-xs font-semibold data-[state=active]:bg-background"
                    >
                      <Camera className="h-3.5 w-3.5 text-purple-600" />
                      Laporan MONEV Lapangan
                      {(monevResponse?.data?.length || 0) > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        >
                          {monevResponse?.data?.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* Ringkasan Realisasi Terakhir */}
                  {currentWeek && (
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Realisasi Terakhir:</span>
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {currentWeek.realisasiFisik.toFixed(2)}%
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          (Tgt: {currentWeek.targetFisik.toFixed(2)}%)
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          currentWeek.deviasiFisik >= 0
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : currentWeek.deviasiFisik >= -5
                            ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300"
                        }`}
                      >
                        Deviasi: {currentWeek.deviasiFisik > 0 ? `+${currentWeek.deviasiFisik.toFixed(2)}%` : `${currentWeek.deviasiFisik.toFixed(2)}%`}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* TAB 1: TABEL PROGRES MINGGUAN (FOKUS UTAMA PAKET FISIK) */}
                <TabsContent value="mingguan" className="space-y-3 pt-3 m-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        Paket fisik dipantau dan dilaporkan secara <strong>mingguan</strong> sesuai kurva masa kontrak. Setiap minggu mencakup target fisik kumulatif, capaian fisik, serapan dana, kendala, dan foto dokumentasi lapangan.
                      </span>
                    </div>
                  </div>

                  {isLoadingDetail ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      Memuat rincian mingguan dan bukti fisik...
                    </div>
                  ) : weeklyTimeline.length === 0 ? (
                    <div className="py-10 text-center rounded-xl border border-dashed text-xs text-muted-foreground space-y-2">
                      <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40" />
                      <p className="font-semibold text-foreground">Target fisik mingguan belum dikonfigurasi</p>
                      <p className="max-w-md mx-auto text-[11px]">
                        Lengkapi tanggal mulai dan selesai kontrak, lalu atur target mingguan pada menu Edit Paket Pembangunan.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-x-auto">
                      <Table className="min-w-[850px]">
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-24 text-xs font-semibold">Minggu</TableHead>
                            <TableHead className="w-44 text-xs font-semibold">Rentang Tanggal</TableHead>
                            <TableHead className="text-xs font-semibold">Uraian / Rencana Kegiatan</TableHead>
                            <TableHead className="w-24 text-right text-xs font-semibold">Target (%)</TableHead>
                            <TableHead className="w-24 text-right text-xs font-semibold">Realisasi (%)</TableHead>
                            <TableHead className="w-24 text-right text-xs font-semibold">Deviasi (%)</TableHead>
                            <TableHead className="w-32 text-right text-xs font-semibold">Keuangan (Rp)</TableHead>
                            <TableHead className="w-28 text-center text-xs font-semibold">Bukti Fisik</TableHead>
                            <TableHead className="w-48 text-xs font-semibold">Kendala / RTL</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {weeklyTimeline.map((item) => {
                            const isReported = item.tersimpan || item.realisasiFisik > 0
                            return (
                              <TableRow
                                key={item.id}
                                className={`text-xs ${
                                  isReported
                                    ? "bg-card hover:bg-muted/40"
                                    : "bg-muted/15 text-muted-foreground hover:bg-muted/30"
                                }`}
                              >
                                {/* Kolom Minggu */}
                                <TableCell className="font-semibold font-mono">
                                  <div className="flex flex-col">
                                    <span className="text-foreground">M{item.mingguKe}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {BULAN_SHORT[item.bulan - 1]}
                                    </span>
                                  </div>
                                </TableCell>

                                {/* Rentang Tanggal */}
                                <TableCell className="text-[11px] text-muted-foreground">
                                  {formatDateRange(item.tanggalMulai, item.tanggalSelesai)}
                                </TableCell>

                                {/* Uraian Kegiatan */}
                                <TableCell className="text-xs font-medium max-w-[200px] truncate" title={item.uraianKegiatan || "-"}>
                                  {item.uraianKegiatan || "-"}
                                </TableCell>

                                {/* Target Kumulatif */}
                                <TableCell className="text-right font-mono font-medium">
                                  {item.targetFisik.toFixed(2)}%
                                </TableCell>

                                {/* Realisasi Fisik */}
                                <TableCell className="text-right font-mono font-semibold">
                                  {isReported ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {item.realisasiFisik.toFixed(2)}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/60">-</span>
                                  )}
                                </TableCell>

                                {/* Deviasi */}
                                <TableCell className="text-right font-mono">
                                  {isReported ? (
                                    <span
                                      className={`font-semibold ${
                                        item.deviasiFisik >= 0
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : item.deviasiFisik >= -5
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-red-600 dark:text-red-400"
                                      }`}
                                    >
                                      {item.deviasiFisik > 0
                                        ? `+${item.deviasiFisik.toFixed(2)}%`
                                        : `${item.deviasiFisik.toFixed(2)}%`}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/60">-</span>
                                  )}
                                </TableCell>

                                {/* Keuangan */}
                                <TableCell className="text-right font-mono text-[11px]">
                                  {item.realisasiKeuangan > 0
                                    ? formatRupiah(item.realisasiKeuangan)
                                    : "-"}
                                </TableCell>

                                {/* Bukti Fisik Lapangan */}
                                <TableCell className="text-center">
                                  {item.buktiFisik && item.buktiFisik.length > 0 ? (
                                    <div className="flex items-center justify-center gap-1">
                                      {item.buktiFisik.slice(0, 2).map((foto) => (
                                        <button
                                          key={foto.id}
                                          type="button"
                                          onClick={() =>
                                            setSelectedPhoto({
                                              url: `${API_STORAGE_URL}${foto.pathFile}`,
                                              title: `Bukti M${item.mingguKe} · ${BULAN_SHORT[item.bulan - 1]}`,
                                              desc: foto.deskripsi || foto.namaFile,
                                            })
                                          }
                                          className="relative h-7 w-7 rounded overflow-hidden border hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer"
                                          title={foto.deskripsi || foto.namaFile}
                                        >
                                          <img
                                            src={`${API_STORAGE_URL}${foto.pathFile}`}
                                            alt={foto.namaFile}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                              // Fallback jika bukan image atau error
                                              (e.target as HTMLElement).style.display = "none"
                                            }}
                                          />
                                        </button>
                                      ))}
                                      {item.buktiFisik.length > 2 && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                                          +{item.buktiFisik.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground/50">—</span>
                                  )}
                                </TableCell>

                                {/* Catatan / Kendala */}
                                <TableCell className="text-[11px] text-muted-foreground max-w-[180px] truncate" title={item.catatanOperator || "-"}>
                                  {item.catatanOperator || "-"}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* TAB 2: REKAP BULANAN TEPRA (OTOMATISASI ROLL-UP DARI MINGGUAN) */}
                <TabsContent value="tepra" className="space-y-3 pt-3 m-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/20 p-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                      <span>
                        Tabel bulanan ini dihasilkan secara <strong>otomatis (roll-up)</strong> dari capaian minggu terakhir setiap bulan untuk memenuhi format pelaporan TEPRA (Pusat/Provinsi) dan grafik Dashboard E-Monev Daerah.
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">
                      Deviasi = Realisasi - Target
                    </span>
                  </div>

                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-20 text-xs font-semibold">Bulan</TableHead>
                          <TableHead className="text-right text-xs font-semibold">Target Fisik (%)</TableHead>
                          <TableHead className="text-right text-xs font-semibold">Realisasi Fisik (%)</TableHead>
                          <TableHead className="text-right text-xs font-semibold">Deviasi Fisik (%)</TableHead>
                          <TableHead className="text-right text-xs font-semibold">Realisasi Keuangan (Rp)</TableHead>
                          <TableHead className="text-xs font-semibold">Catatan / Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyTimeline.map((row) => (
                          <TableRow key={row.bulan} className="text-xs hover:bg-muted/30">
                            <TableCell className="font-semibold text-muted-foreground font-mono">
                              B{String(row.bulan).padStart(2, "0")} ({BULAN_SHORT[row.bulan - 1]})
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {row.targetFisik.toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {row.realisasiFisik > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {row.realisasiFisik.toFixed(2)}%
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {row.realisasiFisik > 0 ? (
                                <span
                                  className={`font-semibold ${
                                    row.deviasiFisik < -10
                                      ? "text-red-600 dark:text-red-400"
                                      : row.deviasiFisik < -5
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  }`}
                                >
                                  {row.deviasiFisik > 0
                                    ? `+${row.deviasiFisik.toFixed(2)}%`
                                    : `${row.deviasiFisik.toFixed(2)}%`}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {row.realisasiKeuangan > 0
                                ? formatRupiah(row.realisasiKeuangan)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-[11px] truncate max-w-[200px]" title={row.catatanOperator || "-"}>
                              {row.catatanOperator || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* TAB 3: LAPORAN HASIL MONITORING LAPANGAN (TIM MONEV) */}
                <TabsContent value="monev" className="space-y-4 pt-3 m-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20 border-purple-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-purple-600 shrink-0" />
                      <span>
                        Hasil Monitoring &amp; Evaluasi Lapangan oleh{" "}
                        <strong>Tim MONEV Kabupaten Konawe Selatan</strong>.
                      </span>
                    </div>
                    {canManageMonev && (
                      <Button
                        size="sm"
                        onClick={() => setIsMonevDialogOpen(true)}
                        className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shrink-0 text-xs h-7"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Input / Kelola MONEV
                      </Button>
                    )}
                  </div>

                  {isLoadingMonev ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                      Memuat riwayat monitoring lapangan...
                    </div>
                  ) : (monevResponse?.data?.length || 0) === 0 ? (
                    <div className="py-10 text-center rounded-xl border border-dashed text-xs text-muted-foreground space-y-2">
                      <Camera className="h-8 w-8 mx-auto text-muted-foreground/40" />
                      <p className="font-semibold">Belum Ada Catatan Monitoring Lapangan</p>
                      <p className="text-[11px] max-w-md mx-auto">
                        Tim MONEV belum menginputkan hasil kunjungan lapangan atau dokumentasi fisik untuk paket ini.
                      </p>
                      {canManageMonev && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsMonevDialogOpen(true)}
                          className="gap-1.5 text-xs text-purple-600 border-purple-300"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Input Hasil MONEV Sekarang
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {monevResponse?.data.map((item, idx) => {
                        const itemPaket: MonevPaketInfo = monevResponse.paket || {
                          id: paket.id,
                          namaPaket: paket.namaPaket,
                          tahunAnggaran: paket.tahunAnggaran || new Date().getFullYear(),
                          nomorKontrak: paket.nomorKontrak || null,
                          pemenangRekanan: paket.pemenangRekanan || null,
                          tanggalMulai: paket.tanggalMulai || null,
                          tanggalSelesai: paket.tanggalSelesai || null,
                          nilaiKontrak: Number(paket.nilaiKontrak) || 0,
                          lokasiKegiatan: paket.lokasiKegiatan || null,
                          opd: paket.opd ? { namaOpd: paket.opd.namaOpd } : null,
                          subUnit: paket.subUnit ? { namaSubUnit: paket.subUnit.namaSubUnit } : null,
                        }

                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border bg-card p-4 space-y-3.5 shadow-sm hover:border-purple-500/40 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-purple-600 text-white font-mono text-[10px]">
                                  Monev #{monevResponse.data.length - idx}
                                </Badge>
                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  {new Date(item.tanggalMonev).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 border-purple-400/40 bg-purple-50/50 dark:bg-purple-950/20"
                                >
                                  Progres: ± {item.progresFisik}%
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cetakLaporanMonev(itemPaket, item)}
                                  className="h-7 text-xs gap-1.5 text-emerald-700 border-emerald-500/40 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                                  title="Cetak format Word / PDF Folio F4"
                                >
                                  <FileDown className="h-3.5 w-3.5" />
                                  Cetak PDF (F4)
                                </Button>
                                {canManageMonev && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setIsMonevDialogOpen(true)}
                                    className="h-7 text-xs text-muted-foreground hover:text-purple-600"
                                  >
                                    Kelola
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Grid Foto Dokumentasi */}
                            {item.fotos.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                  Dokumentasi Lapangan ({item.fotos.length} Foto)
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {item.fotos.map((foto) => (
                                    <div
                                      key={foto.id}
                                      onClick={() =>
                                        setSelectedPhoto({
                                          url: monevFotoUrl(foto),
                                          title: `Dokumentasi Monev - ${itemPaket.namaPaket}`,
                                          desc: `Tanggal: ${item.tanggalMonev.split("T")[0]} | Progres: ± ${item.progresFisik}%`,
                                        })
                                      }
                                      className="group relative rounded-lg overflow-hidden border bg-muted aspect-video cursor-pointer"
                                    >
                                      <img
                                        src={monevFotoUrl(foto)}
                                        alt={foto.namaFile}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] gap-1">
                                        <Eye className="h-3 w-3" />
                                        <span>Perbesar</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 3 Bagian Konten Word: Kondisi Fisik, Permasalahan, Saran */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                              <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                                <div className="font-bold underline text-[11px] text-foreground">
                                  KONDISI FISIK KEGIATAN
                                </div>
                                <div className="text-muted-foreground whitespace-pre-line leading-relaxed font-serif text-[11px]">
                                  {item.kondisiFisik || "-"}
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                                <div className="font-bold underline text-[11px] text-foreground">
                                  PERMASALAHAN
                                </div>
                                <div className="text-muted-foreground whitespace-pre-line leading-relaxed font-serif text-[11px]">
                                  {item.permasalahan || "-"}
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                                <div className="font-bold underline text-[11px] text-foreground">
                                  SARAN
                                </div>
                                <div className="text-muted-foreground whitespace-pre-line leading-relaxed font-serif text-[11px]">
                                  {item.saran || "-"}
                                </div>
                              </div>
                            </div>

                            {item.createdBy && (
                              <div className="pt-2 border-t flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>
                                  Dicatat oleh:{" "}
                                  <strong className="text-foreground">
                                    {item.createdBy.namaLengkap || "Petugas Monev"}
                                  </strong>
                                  {item.createdBy.nip ? ` (NIP. ${item.createdBy.nip})` : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            /* ========================================================== */
            /* B. PAKET KEUANGAN SAJA: TABEL PENCAIRAN BULANAN (12 BULAN) */
            /* ========================================================== */
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-amber-50/70 dark:bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Paket ini menggunakan <strong>Pola Keuangan Saja</strong> (belanja rutin / non-fisik). Pemantauan berfokus pada jadwal pencairan dana anggaran dan realisasi SP2D bulanan (Januari s.d. Desember).
                  </span>
                </div>
              </div>

              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-20 text-xs font-semibold">Bulan</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Realisasi Keuangan (Rp)</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Serapan (%)</TableHead>
                      <TableHead className="text-xs font-semibold">Rincian Pencairan / Nomor SP2D</TableHead>
                      <TableHead className="text-xs font-semibold">Catatan / Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyTimeline.map((row) => {
                      const hasPencairan = (row.pencairan?.length || 0) > 0
                      const hasReal = row.realisasiKeuangan > 0
                      return (
                        <TableRow
                          key={row.bulan}
                          className={`text-xs ${
                            hasReal || hasPencairan
                              ? "bg-card hover:bg-muted/40"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <TableCell className="font-semibold font-mono text-muted-foreground">
                            B{String(row.bulan).padStart(2, "0")} ({BULAN_SHORT[row.bulan - 1]})
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {row.realisasiKeuangan > 0
                              ? formatRupiah(row.realisasiKeuangan)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {row.persenKeuangan > 0 ? `${row.persenKeuangan.toFixed(2)}%` : "0%"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {hasPencairan ? (
                              <div className="space-y-1">
                                {row.pencairan?.map((p) => (
                                  <div key={p.id} className="text-[11px] flex items-center gap-1.5">
                                    <span className="font-semibold text-foreground">
                                      {formatRupiah(p.nominal)}
                                    </span>
                                    {p.catatan && (
                                      <span className="text-muted-foreground">
                                        ({p.catatan})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 text-[11px]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[11px] max-w-[200px] truncate" title={row.catatanOperator || "-"}>
                            {row.catatanOperator || "-"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL POPUP PREVIEW FOTO BUKTI FISIK */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={(v) => !v && setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl p-4 sm:p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base font-semibold">
                {selectedPhoto.title}
              </DialogTitle>
              {selectedPhoto.desc && (
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedPhoto.desc}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black/5 flex items-center justify-center">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="max-h-[70vh] w-auto max-w-full object-contain mx-auto"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs gap-1.5"
              >
                <a href={selectedPhoto.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Buka Gambar Asli
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG MANAJEMEN / INPUT MONEV LAPANGAN */}
      <MonevDialog
        open={isMonevDialogOpen}
        onOpenChange={setIsMonevDialogOpen}
        paketId={paket?.id || null}
        initialPaket={paket}
      />
    </>
  )
}
