"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { getUserUnitLabel } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  HardHat,
  Banknote,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  ChevronRight,
  RotateCcw,
  ShieldAlert,
  Wallet,
  Clock,
  ArrowUpRight,
} from "lucide-react"
import { TerpaduHeritageCard } from "@/components/dashboard/terpadu-heritage-card"

function formatRupiah(val: number) {
  if (!val || isNaN(val)) return "0"
  return Number(val).toLocaleString("id-ID")
}

function formatCurrency(val: number) {
  if (!val || isNaN(val)) return "Rp 0"
  if (val >= 1_000_000_000_000) return `Rp ${(val / 1_000_000_000_000).toFixed(2)} T`
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(2)} M`
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(2)} Jt`
  return `Rp ${val.toLocaleString("id-ID")}`
}

function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400"
  if (pct >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
}

interface OpdUserDashboardProps {
  user: any
  tahun: number
  bulan: number
  namaBulanAktif: string
  tahunOptions: number[]
  onChangeTahun: (t: number) => void
  onChangeBulan: (b: number) => void
  onResetPeriode: () => void
  bulanOptions: { value: number; label: string }[]
  defaultTahun: number
  defaultBulan: number
}

function safeNum(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === "") return fallback
  const n = Number(val)
  return isNaN(n) ? fallback : n
}

export function OpdUserDashboard({
  user,
  tahun,
  bulan,
  namaBulanAktif,
  tahunOptions,
  onChangeTahun,
  onChangeBulan,
  onResetPeriode,
  bulanOptions,
  defaultTahun,
  defaultBulan,
}: OpdUserDashboardProps) {
  const [searchPaket, setSearchPaket] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")

  const userOpdId = user?.opd?.id || user?.opdId
  const accessibleOpds: Array<{
    id: string
    namaOpd: string
    isHome: boolean
  }> = user?.accessibleOpds || []
  const hasMultipleOpdAccess = accessibleOpds.length > 1
  const [selectedOpdFilter, setSelectedOpdFilter] = useState<string>("AUTO")
  const selectedOpdId = selectedOpdFilter === "AUTO"
    ? (hasMultipleOpdAccess ? "ALL" : (userOpdId || "ALL"))
    : selectedOpdFilter
  const unitLabel = getUserUnitLabel(user)
  const selectedOpd = accessibleOpds.find((opd) => opd.id === selectedOpdId)
  const opdNama = selectedOpdId === "ALL" && hasMultipleOpdAccess
    ? `${accessibleOpds.length} Unit Kerja dalam Cakupan Anda`
    : selectedOpd?.namaOpd || user?.opd?.namaOpd || unitLabel.full || "Organisasi Perangkat Daerah"

  const userRoles: string[] = useMemo(() => {
    const raw = [
      ...(user?.role ? [user.role] : []),
      ...(user?.roles || []),
      ...(user?.userRoles?.map((ur: any) => ur.role?.kode || ur.role) || []),
    ]
    return [...new Set(raw)].filter(Boolean)
  }, [user])

  // ── Ambil data realisasi dan paket khusus OPD dari endpoint resmi ──
  const { data: realisasiRes, isLoading: realisasiLoading } = useQuery({
    queryKey: ["opd-dashboard-realisasi", selectedOpdId, tahun, bulan],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/realisasi", {
        params: {
          tahunAnggaran: tahun,
          bulan,
          opdId: selectedOpdId !== "ALL" ? selectedOpdId : undefined,
          limit: 1000,
          page: 1,
        },
      })
      return res.data
    },
    enabled: Boolean(userOpdId || accessibleOpds.length > 0),
    staleTime: 2 * 60 * 1000,
  })

  // Raw items dari response
  const rawPaketList: any[] = useMemo(() => {
    return Array.isArray(realisasiRes?.data) ? realisasiRes.data : []
  }, [realisasiRes])

  const summary = realisasiRes?.summary

  // Olah Paket beserta status deviasi bulan aktif
  const processedPaketList = useMemo(() => {
    return rawPaketList.map((p) => {
      const targetFisik = safeNum(p.targetFisik)
      const realisasiFisik = safeNum(p.realisasiFisik)
      const deviasiFisik = safeNum(p.deviasiFisik, Number((realisasiFisik - targetFisik).toFixed(2)))
      const realisasiKeuangan = safeNum(p.realisasiKeuangan)
      const nilaiPagu = safeNum(p.nilaiPagu)
      const nilaiKontrak = safeNum(p.nilaiKontrak)
      const basisAnggaran = nilaiKontrak > 0 ? nilaiKontrak : nilaiPagu
      const persenKeuangan = safeNum(
        p.persenKeuangan,
        basisAnggaran > 0 ? Number(((realisasiKeuangan / basisAnggaran) * 100).toFixed(2)) : 0
      )

      let statusKinerja: "SELESAI" | "AMAN" | "PERHATIAN" | "KRITIS" | "BELUM_MULAI" = "BELUM_MULAI"
      if (realisasiFisik >= 100) {
        statusKinerja = "SELESAI"
      } else if (p.status === "KRITIS") {
        statusKinerja = "KRITIS"
      } else if (p.status === "PERHATIAN") {
        statusKinerja = "PERHATIAN"
      } else if (p.status === "AMAN") {
        statusKinerja = "AMAN"
      } else if (p.status === "BELUM_MULAI" || (targetFisik === 0 && realisasiFisik === 0)) {
        statusKinerja = "BELUM_MULAI"
      } else if (deviasiFisik >= 0) {
        statusKinerja = "AMAN"
      } else if (deviasiFisik >= -10) {
        statusKinerja = "PERHATIAN"
      } else {
        statusKinerja = "KRITIS"
      }

      return {
        ...p,
        penyedia: p.pemenangRekanan || p.penyedia || "-",
        lokasi: p.lokasiKegiatan || p.lokasi || "",
        nilaiPagu,
        nilaiKontrak,
        basisAnggaran,
        targetFisik,
        realisasiFisik,
        deviasiFisik,
        realisasiKeuangan,
        persenKeuangan,
        statusKinerja,
      }
    })
  }, [rawPaketList])

  // Hitung Metrik Kinerja OPD (bebas dari NaN)
  const opdStats = useMemo(() => {
    const count = processedPaketList.length

    let totalPagu = safeNum(summary?.totalPagu)
    let totalKontrak = safeNum(summary?.totalKontrak)
    let totalRealisasiKeuangan = safeNum(summary?.totalRealisasiKeuangan)

    if (totalPagu === 0 && count > 0) {
      totalPagu = processedPaketList.reduce((acc, cur) => acc + cur.nilaiPagu, 0)
    }
    if (totalKontrak === 0 && count > 0) {
      totalKontrak = processedPaketList.reduce((acc, cur) => acc + cur.nilaiKontrak, 0)
    }
    if (totalRealisasiKeuangan === 0 && count > 0) {
      totalRealisasiKeuangan = processedPaketList.reduce((acc, cur) => acc + cur.realisasiKeuangan, 0)
    }

    const basisAnggaran = totalKontrak > 0 ? totalKontrak : totalPagu
    const persenKeuangan = safeNum(
      summary?.persenSerapanKeuangan,
      basisAnggaran > 0 ? Number(((totalRealisasiKeuangan / basisAnggaran) * 100).toFixed(2)) : 0
    )
    const sisaAnggaran = Math.max(0, basisAnggaran - totalRealisasiKeuangan)

    const avgTarget = safeNum(
      summary?.avgTargetFisik,
      count > 0 ? Number((processedPaketList.reduce((acc, cur) => acc + cur.targetFisik, 0) / count).toFixed(2)) : 0
    )
    const avgFisik = safeNum(
      summary?.avgRealisasiFisik,
      count > 0 ? Number((processedPaketList.reduce((acc, cur) => acc + cur.realisasiFisik, 0) / count).toFixed(2)) : 0
    )
    const deviasi = safeNum(
      summary?.avgDeviasiFisik,
      Number((avgFisik - avgTarget).toFixed(2))
    )

    let countAman = safeNum(summary?.countStatus?.aman)
    let countPerhatian = safeNum(summary?.countStatus?.perhatian)
    let countKritis = safeNum(summary?.countStatus?.kritis)
    let countBelumMulai = safeNum(summary?.countStatus?.belumMulai)
    let countSelesai = processedPaketList.filter((p) => p.statusKinerja === "SELESAI").length

    if (!summary?.countStatus && count > 0) {
      countAman = processedPaketList.filter((p) => p.statusKinerja === "AMAN" || p.statusKinerja === "SELESAI").length
      countPerhatian = processedPaketList.filter((p) => p.statusKinerja === "PERHATIAN").length
      countKritis = processedPaketList.filter((p) => p.statusKinerja === "KRITIS").length
      countBelumMulai = processedPaketList.filter((p) => p.statusKinerja === "BELUM_MULAI").length
    }

    return {
      totalPaket: count,
      totalPagu: basisAnggaran,
      totalKontrak,
      totalRealisasiKeuangan,
      persenKeuangan,
      sisaAnggaran,
      avgFisik,
      avgTarget,
      deviasi,
      countAman,
      countPerhatian,
      countKritis,
      countBelumMulai,
      countSelesai,
    }
  }, [processedPaketList, summary])

  // Filter paket di tabel
  const filteredPaket = useMemo(() => {
    return processedPaketList.filter((p) => {
      // Search
      const matchSearch =
        !searchPaket.trim() ||
        p.namaPaket?.toLowerCase().includes(searchPaket.toLowerCase()) ||
        p.penyedia?.toLowerCase().includes(searchPaket.toLowerCase()) ||
        p.lokasi?.toLowerCase().includes(searchPaket.toLowerCase())

      // Status
      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "SELESAI" && p.statusKinerja === "SELESAI") ||
        (filterStatus === "AMAN" && p.statusKinerja === "AMAN") ||
        (filterStatus === "PERHATIAN" && p.statusKinerja === "PERHATIAN") ||
        (filterStatus === "KRITIS" && p.statusKinerja === "KRITIS") ||
        (filterStatus === "BELUM_MULAI" && p.statusKinerja === "BELUM_MULAI")

      return matchSearch && matchStatus
    })
  }, [processedPaketList, searchPaket, filterStatus])

  // Paket yang membutuhkan percepatan (Kritis / Perhatian)
  const paketPerluPerhatian = useMemo(() => {
    return processedPaketList.filter((p) => p.statusKinerja === "KRITIS" || p.statusKinerja === "PERHATIAN")
  }, [processedPaketList])

  return (
    <div className="min-w-0 w-full px-3 sm:px-4 lg:px-6 space-y-3.5 sm:space-y-4 pb-6 pt-0.5">
      {/* ─── 1. BANNER HEADER KHUSUS OPD ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-700/10 via-indigo-600/10 to-sky-500/10 border border-blue-200/60 dark:border-blue-900/40 shadow-xs">
        <div className="space-y-1.5">
          {/* <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
              Dashboard Perangkat Daerah
            </Badge>
            {userRoles.map((r) => (
              <Badge key={r} variant="outline" className="text-[10px] font-mono border-blue-400 text-blue-700 dark:text-blue-300">
                {r === "ADMIN_PPK" && accessibleOpds.some((opd) => !opd.isHome)
                  ? `ADMIN PPK - ${accessibleOpds.filter((opd) => !opd.isHome).map((opd) => opd.namaOpd).join(", ")}`
                  : r.replace(/_/g, " ")}
              </Badge>
            ))}
          </div> */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
            {opdNama}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>Pejabat / Operator: <strong className="text-foreground">{user?.namaLengkap || "Petugas OPD"}</strong></span>
            <span>·</span>
            <span>NIP: <strong className="font-mono text-foreground">{user?.nip || "-"}</strong></span>
            {user?.subUnit?.namaSubUnit && (
              <>
                <span>·</span>
                <span>Unit Kerja: <strong className="text-foreground">{user.subUnit.namaSubUnit}</strong></span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ─── 2. FILTER PERIODE & AKSI CEPAT ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {hasMultipleOpdAccess && (
            <div className="w-52">
              <Select value={selectedOpdId} onValueChange={setSelectedOpdFilter}>
                <SelectTrigger className="h-8 text-xs bg-card border-border/70">
                  <SelectValue placeholder="Pilih Unit Kerja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Semua Unit Kerja Saya
                  </SelectItem>
                  {accessibleOpds.map((opd) => (
                    <SelectItem key={opd.id} value={opd.id} className="text-xs">
                      {opd.namaOpd}{opd.isHome ? " (OPD Asal)" : " (Penugasan PPK)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-36">
            <Select value={String(bulan)} onValueChange={(val) => onChangeBulan(Number(val))}>
              <SelectTrigger className="h-8 text-xs bg-card border-border/70">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {bulanOptions.map((b) => (
                  <SelectItem key={b.value} value={String(b.value)} className="text-xs">
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-24">
            <Select value={String(tahun)} onValueChange={(val) => onChangeTahun(Number(val))}>
              <SelectTrigger className="h-8 text-xs bg-card border-border/70">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {tahunOptions.map((t) => (
                  <SelectItem key={t} value={String(t)} className="text-xs">
                    TA {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(bulan !== defaultBulan || tahun !== defaultTahun) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetPeriode}
              title="Reset ke periode bulan ini"
              className="h-8 px-2 text-xs text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <Button asChild size="sm" variant="default" className="text-xs h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs shrink-0">
          <Link href="/realisasi">
            <TrendingUp className="h-3.5 w-3.5" />
            Input Realisasi
          </Link>
        </Button>
      </div>

      {/* ─── 3. EARLY WARNING CALLOUT (HANYA JIKA ADA PAKET KRITIS/PERHATIAN) ─── */}
      {paketPerluPerhatian.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold flex items-center gap-2">
                Perhatian: Terdapat {paketPerluPerhatian.length} Paket Pembangunan Mengalami Deviasi Minus
              </h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                Segera lakukan penyesuaian kurva S, koordinasi intensif bersama PPK & Penyedia Jasa, serta percepatan entri SP2D dan fisik lapangan periode {namaBulanAktif} {tahun}.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/40 text-xs shrink-0">
            <Link href="/realisasi">Buka Form Realisasi <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </div>
      )}

      {/* ─── 4. CORE METRICS CARDS KHUSUS OPD (6 CARDS) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3 min-w-0 w-full">
        {/* Pagu Anggaran OPD */}
        <Card className="border-border/60 shadow-xs min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-2.5 px-3 space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground truncate">Pagu OPD</CardTitle>
            <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0 min-w-0">
            {realisasiLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <div className="text-lg sm:text-xl font-bold tracking-tight">
                {formatCurrency(opdStats.totalPagu)}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {opdStats.totalKontrak > 0 ? `Kontrak: ${formatCurrency(opdStats.totalKontrak)}` : "Pagu Anggaran Kegiatan"}
            </div>
          </CardContent>
        </Card>

        {/* Realisasi Keuangan OPD */}
        <Card className="border-border/60 shadow-xs min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-2.5 px-3 space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground truncate">Realisasi Keu</CardTitle>
            <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Banknote className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0 min-w-0">
            {realisasiLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(opdStats.totalRealisasiKeuangan)}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground mt-0.5">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {opdStats.persenKeuangan.toFixed(2)}% APBD cair
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sisa Anggaran OPD */}
        <Card className="border-border/60 shadow-xs min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-2.5 px-3 space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground truncate">Sisa Anggaran</CardTitle>
            <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0 min-w-0">
            {realisasiLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <div className="text-lg sm:text-xl font-bold tracking-tight">
                {formatCurrency(opdStats.sisaAnggaran)}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Belum cair: {(100 - opdStats.persenKeuangan).toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        {/* Target Fisik OPD */}
        <Card className="border-border/60 shadow-xs min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-2.5 px-3 space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground truncate">Target Fisik</CardTitle>
            <div className="p-1 rounded-md bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 shrink-0">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0 min-w-0">
            {realisasiLoading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className="text-lg sm:text-xl font-bold tracking-tight">
                {opdStats.avgTarget.toFixed(2)}%
              </div>
            )}
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Rencana {namaBulanAktif}
            </div>
          </CardContent>
        </Card>

        {/* Realisasi Fisik OPD & Deviasi */}
        <Card className="border-border/60 shadow-xs min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-2.5 px-3 space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground truncate">Realisasi Fisik</CardTitle>
            <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0">
              <HardHat className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0 min-w-0">
            {realisasiLoading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className={`text-lg sm:text-xl font-bold tracking-tight ${pctColor(opdStats.avgFisik)}`}>
                {opdStats.avgFisik.toFixed(2)}%
              </div>
            )}
            <div className="text-[11px] mt-0.5 font-semibold">
              <span className={opdStats.deviasi >= 0 ? "text-emerald-600" : "text-rose-600"}>
                Deviasi: {opdStats.deviasi >= 0 ? "+" : ""}{opdStats.deviasi.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Paket OPD */}
        <Card className="border-border/60 shadow-xs min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-2.5 px-3 space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground truncate">Total Paket</CardTitle>
            <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0 min-w-0">
            {realisasiLoading ? (
              <Skeleton className="h-7 w-12 mb-1" />
            ) : (
              <div className="text-lg sm:text-xl font-bold tracking-tight">
                {opdStats.totalPaket} Pkt
              </div>
            )}
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {opdStats.countSelesai} Selesai · {opdStats.countKritis} Kritis
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 4. QUICK SHORTCUTS & ACTION BAR ─── */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/realisasi"
          className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Entri Progres & SP2D</p>
              <p className="text-[10px] text-muted-foreground">Input capaian fisik dan penyerapan keuangan bulanan</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>

        <Link
          href="/pembangunan"
          className="flex items-center justify-between p-3.5 rounded-xl border border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/15 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-300">
              <HardHat className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Kelola Paket Kegiatan</p>
              <p className="text-[10px] text-muted-foreground">Rincian kontrak, penyedia, dan lokasi paket pembangunan</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div> */}

      {/* ─── 5. DAFTAR PAKET PEMBANGUNAN KHUSUS OPD INI ─── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <HardHat className="h-4 w-4 text-blue-600" />
                Daftar Paket Pembangunan ({processedPaketList.length} Paket)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Monitoring progres fisik dan keuangan paket pembangunan khusus {opdNama} periode {namaBulanAktif} {tahun}
              </CardDescription>
            </div>

            <Button asChild size="sm" variant="outline" className="text-xs h-8 gap-1.5 shadow-2xs">
              <Link href="/pembangunan">
                Buka Semua Paket
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama paket, penyedia, lokasi..."
                value={searchPaket}
                onChange={(e) => setSearchPaket(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: "ALL", label: `Semua (${processedPaketList.length})` },
                { key: "SELESAI", label: `Selesai (${opdStats.countSelesai})` },
                { key: "AMAN", label: `Aman (${opdStats.countAman - opdStats.countSelesai})` },
                { key: "PERHATIAN", label: `Perhatian (${opdStats.countPerhatian})` },
                { key: "KRITIS", label: `Kritis (${opdStats.countKritis})` },
                { key: "BELUM_MULAI", label: `Belum Mulai (${opdStats.countBelumMulai})` },
              ].map((btn) => (
                <Button
                  key={btn.key}
                  variant={filterStatus === btn.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(btn.key)}
                  className="h-7 text-xs px-2.5 whitespace-nowrap"
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-gray-200 dark:border-neutral-700">
              <thead>
                <tr className="bg-gray-50/90 dark:bg-neutral-800/80 text-foreground border-b border-gray-200 dark:border-neutral-700 font-semibold">
                  <th className="py-2.5 px-3 text-center border-r border-b border-gray-200 dark:border-neutral-700 w-10">No</th>
                  <th className="py-2.5 px-3 text-left border-r border-b border-gray-200 dark:border-neutral-700 min-w-[260px]">
                    Nama Paket Pembangunan / Kegiatan
                  </th>
                  <th className="py-2.5 px-3 text-right border-r border-b border-gray-200 dark:border-neutral-700 w-36">
                    Pagu / Nilai Kontrak
                  </th>
                  <th className="py-2.5 px-3 text-left border-r border-b border-gray-200 dark:border-neutral-700 min-w-[160px]">
                    Penyedia / Pelaksana
                  </th>
                  <th className="py-2.5 px-3 text-center border-r border-b border-gray-200 dark:border-neutral-700 w-32 bg-amber-500/10">
                    Fisik (Tgt vs Capaian)
                  </th>
                  <th className="py-2.5 px-3 text-right border-r border-b border-gray-200 dark:border-neutral-700 w-32 bg-emerald-500/10">
                    Realisasi Keu (Rp)
                  </th>
                  <th className="py-2.5 px-2 text-center border-r border-b border-gray-200 dark:border-neutral-700 w-24">
                    Status
                  </th>
                  <th className="py-2.5 px-2 text-center border-b border-gray-200 dark:border-neutral-700 w-20">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                {realisasiLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Memuat daftar paket pembangunan OPD...
                    </td>
                  </tr>
                ) : filteredPaket.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Tidak ada paket pembangunan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredPaket.map((paket, idx) => (
                    <tr key={paket.id} className="hover:bg-muted/30 transition-colors border-b border-gray-200 dark:border-neutral-700">
                      <td className="py-2.5 px-3 text-center border-r border-gray-200 dark:border-neutral-700 text-muted-foreground font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-gray-200 dark:border-neutral-700 font-medium">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground text-xs leading-snug">{paket.namaPaket}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                            {paket.kodeSirup && <span className="font-mono bg-muted px-1 rounded">SIRUP: {paket.kodeSirup}</span>}
                            {paket.lokasi && <span>Lokasi: {paket.lokasi}</span>}
                            {paket.sumberDana && <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1 rounded">{paket.sumberDana}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right border-r border-gray-200 dark:border-neutral-700 font-mono">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs">{formatCurrency(paket.nilaiKontrak || paket.nilaiPagu)}</p>
                          {paket.nilaiKontrak > 0 && paket.nilaiPagu > 0 && (
                            <p className="text-[10px] text-muted-foreground">Pagu: {formatCurrency(paket.nilaiPagu)}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-gray-200 dark:border-neutral-700 text-xs">
                        <p className="font-medium truncate max-w-[180px]">{paket.penyedia || "-"}</p>
                        {paket.nomorKontrak && (
                          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
                            {paket.nomorKontrak}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-gray-200 dark:border-neutral-700 bg-amber-500/5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-muted-foreground">T: {paket.targetFisik}%</span>
                            <span className={`font-bold ${pctColor(paket.realisasiFisik)}`}>
                              F: {paket.realisasiFisik}%
                            </span>
                          </div>
                          <Progress value={Math.min(paket.realisasiFisik, 100)} className="h-1.5" />
                          <p className={`text-[10px] font-mono font-semibold text-right ${paket.deviasiFisik >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {paket.deviasiFisik >= 0 ? "+" : ""}{paket.deviasiFisik.toFixed(1)}%
                          </p>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right border-r border-gray-200 dark:border-neutral-700 font-mono bg-emerald-500/5">
                        <p className="font-semibold text-xs">{formatRupiah(paket.realisasiKeuangan)}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">{paket.persenKeuangan}%</p>
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-gray-200 dark:border-neutral-700">
                        {paket.statusKinerja === "SELESAI" ? (
                          <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1.5">Selesai</Badge>
                        ) : paket.statusKinerja === "AMAN" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300 text-[9px] py-0 px-1.5">Aman</Badge>
                        ) : paket.statusKinerja === "PERHATIAN" ? (
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300 text-[9px] py-0 px-1.5">Perhatian</Badge>
                        ) : paket.statusKinerja === "KRITIS" ? (
                          <Badge className="bg-rose-500/15 text-rose-700 border-rose-300 dark:text-rose-300 text-[9px] py-0 px-1.5">Kritis</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[9px] py-0 px-1.5">Belum Mulai</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40">
                          <Link href={`/realisasi?search=${encodeURIComponent(paket.namaPaket || "")}`}>
                            Entri
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── 6. HERITAGE KABUPATEN CARD ─── */}
      <TerpaduHeritageCard />
    </div>
  )
}
