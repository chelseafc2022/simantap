"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Users,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronRight,
  Timer,
  Wallet,
  HardHat,
  UserCog,
  Layers,
  AlertTriangle,
  AlertCircle,
  Banknote,
  Calendar,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
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

function barColor(pct: number) {
  if (pct >= 75) return "bg-emerald-500"
  if (pct >= 40) return "bg-amber-500"
  return "bg-rose-500"
}

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return "Selamat pagi"
  if (h < 15) return "Selamat siang"
  if (h < 18) return "Selamat sore"
  return "Selamat malam"
}

const BULAN_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret (TW I)" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni (TW II)" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September (TW III)" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember (TW IV)" },
]

// ────────────────────────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconClass,
  loading,
  valueClass,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  iconClass?: string
  loading?: boolean
  valueClass?: string
}) {
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`p-1.5 rounded-lg ${iconClass ?? "bg-muted"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-24 mb-1" />
        ) : (
          <div className={`text-xl sm:text-2xl font-bold tracking-tight ${valueClass ?? ""}`}>{value}</div>
        )}
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function OpdProgressRow({
  nama,
  singkatan,
  fisik,
  keuangan,
  target,
  deviasi,
}: {
  nama: string
  singkatan: string
  fisik: number
  keuangan: number
  target?: number
  deviasi?: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold truncate max-w-[170px]" title={nama}>
            {singkatan || nama}
          </span>
          {typeof deviasi === "number" && deviasi < -10 && (
            <Badge variant="outline" className="text-[9px] py-0 px-1 border-rose-500/40 text-rose-600 bg-rose-500/10">
              Kritis
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0 text-[11px]">
          {typeof target === "number" && (
            <span className="text-muted-foreground font-mono">Tgt: {target.toFixed(1)}%</span>
          )}
          <span className={`font-semibold font-mono ${pctColor(fisik)}`}>F {fisik.toFixed(1)}%</span>
          <span className={`font-semibold font-mono ${pctColor(keuangan)}`}>K {keuangan.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${barColor(fisik)}`} style={{ width: `${Math.min(fisik, 100)}%` }} />
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full opacity-65 ${barColor(keuangan)}`}
          style={{ width: `${Math.min(keuangan, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const now = new Date()
  const defaultTahun = now.getFullYear()
  const defaultBulan = now.getMonth() + 1

  // Filter Periode (Poin 1: Interaktif untuk Pimpinan Daerah)
  const [tahun, setTahun] = useState<number>(defaultTahun)
  const [bulan, setBulan] = useState<number>(defaultBulan)

  const tahunOptions = useMemo(() => {
    return [defaultTahun + 1, defaultTahun, defaultTahun - 1, defaultTahun - 2]
  }, [defaultTahun])

  // De-duplicate user roles
  const userRoles: string[] = useMemo(() => {
    const raw = [
      ...(user?.role ? [user.role] : []),
      ...(user?.roles || []),
      ...(user?.userRoles?.map((ur: any) => ur.role?.kode || ur.role) || []),
    ]
    return [...new Set(raw)].filter(Boolean)
  }, [user])

  const isAdministrator = userRoles.includes("ADMINISTRATOR")
  const isPimpinan = userRoles.includes("PIMPINAN_DAERAH")

  // ── Backend Health ──
  const { data: healthRaw, isError: healthErr, isLoading: healthLoading } = useQuery({
    queryKey: ["backend-health"],
    queryFn: async () => {
      const res = await apiClient.get("/health")
      return res.data
    },
    refetchInterval: 30000,
    retry: 1,
  })
  const healthData = healthRaw?.data ?? healthRaw

  // ── Paket Pembangunan (all, for stats) ──
  const { data: paketRes, isLoading: paketLoading } = useQuery({
    queryKey: ["dashboard-paket", tahun],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan", {
        params: { tahunAnggaran: tahun, limit: 2000, page: 1 },
      })
      return res.data?.data ?? res.data
    },
    retry: 1,
  })

  // ── Rekap OPD (RFK bulanan) ──
  const { data: rekapRes, isLoading: rekapLoading } = useQuery({
    queryKey: ["dashboard-rekap-opd", tahun, bulan],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/laporan/rekap-opd", {
        params: { tahunAnggaran: tahun, bulan },
      })
      return res.data?.data ?? res.data
    },
    retry: 1,
  })

  // ── Raw lists ──
  const paketList: any[] = useMemo(() => {
    return Array.isArray(paketRes?.data)
      ? paketRes.data
      : Array.isArray(paketRes)
      ? paketRes
      : []
  }, [paketRes])

  const rekapList: any[] = useMemo(() => {
    return Array.isArray(rekapRes?.rekap)
      ? rekapRes.rekap
      : Array.isArray(rekapRes)
      ? rekapRes
      : []
  }, [rekapRes])

  // ── Poin 4: Perhitungan Serapan Keuangan Riil & Statistik Makro ──
  const macroStats = useMemo(() => {
    let nilaiKontrak = 0
    let sumFisik = 0
    let sumKeuanganFromPaket = 0
    let selesai = 0
    let berjalan = 0
    let belumMulai = 0

    for (const p of paketList) {
      nilaiKontrak += Number(p.nilaiKontrak) || 0
      const f = Number(p.realisasiFisik) || 0
      const k = Number(p.realisasiKeuangan) || 0
      sumFisik += f
      sumKeuanganFromPaket += k
      if (f >= 100) selesai++
      else if (f > 0) berjalan++
      else belumMulai++
    }

    const n = paketList.length
    const avgFisik = n > 0 ? sumFisik / n : 0

    // Serapan keuangan riil dalam Rupiah dari data rekap bulanan (atau akumulasi paket)
    const nominalRealisasiKeuangan = rekapList.length > 0
      ? rekapList.reduce((acc, o) => acc + (Number(o.totalRealisasiKeuangan) || 0), 0)
      : sumKeuanganFromPaket

    const persenSerapanKeuangan = nilaiKontrak > 0
      ? (nominalRealisasiKeuangan / nilaiKontrak) * 100
      : (n > 0 ? sumKeuanganFromPaket / n : 0)

    const sisaAnggaran = Math.max(0, nilaiKontrak - nominalRealisasiKeuangan)

    return {
      totalPaket: n,
      nilaiKontrak,
      nominalRealisasiKeuangan,
      persenSerapanKeuangan,
      sisaAnggaran,
      avgFisik,
      selesai,
      berjalan,
      belumMulai,
    }
  }, [paketList, rekapList])

  // ── Poin 2: Executive Summary Status Kesehatan Proyek se-Kabupaten ──
  const executiveStatus = useMemo(() => {
    let countAman = 0
    let countPerhatian = 0
    let countKritis = 0
    let countBelumMulai = 0
    let sumWeightedTarget = 0
    let totalPaketWithTarget = 0

    for (const o of rekapList) {
      countAman += o.rekapStatus?.aman || 0
      countPerhatian += o.rekapStatus?.perhatian || 0
      countKritis += o.rekapStatus?.kritis || 0
      countBelumMulai += o.rekapStatus?.belumMulai || 0

      const pakets = Number(o.totalPaket) || 0
      const tgt = Number(o.avgTargetFisik) || 0
      sumWeightedTarget += tgt * pakets
      totalPaketWithTarget += pakets
    }

    const avgTargetDaerah = totalPaketWithTarget > 0 ? sumWeightedTarget / totalPaketWithTarget : 0
    const deviasiDaerah = macroStats.avgFisik - avgTargetDaerah

    // Berapa OPD yang memiliki status kritis
    const opdKritisCount = rekapList.filter(
      (o) => (o.rekapStatus?.kritis || 0) > 0 || (o.avgDeviasiFisik || 0) < -10
    ).length

    return {
      aman: countAman,
      perhatian: countPerhatian,
      kritis: countKritis,
      belumMulai: countBelumMulai,
      avgTargetDaerah,
      deviasiDaerah,
      opdKritisCount,
    }
  }, [rekapList, macroStats.avgFisik])

  // ── OPD Lists: Top Performers & Poin 3: OPD Perlu Perhatian Khusus ──
  const opdFull = useMemo(() => {
    return rekapList.map((o: any) => ({
      opdId: o.opdId ?? "",
      namaOpd: o.namaOpd ?? o.opdId ?? "-",
      singkatan: o.singkatan || (o.namaOpd ?? "").substring(0, 10),
      totalPaket: o.totalPaket ?? 0,
      nilaiKontrak: o.totalKontrak ?? o.nilaiKontrak ?? 0,
      totalRealisasiKeuangan: o.totalRealisasiKeuangan ?? 0,
      fisik: o.avgRealisasiFisik ?? 0,
      target: o.avgTargetFisik ?? 0,
      deviasi: o.avgDeviasiFisik ?? ((o.avgRealisasiFisik ?? 0) - (o.avgTargetFisik ?? 0)),
      keuangan: o.persenSerapanKeuangan ?? 0,
      aman: o.rekapStatus?.aman ?? 0,
      perhatian: o.rekapStatus?.perhatian ?? 0,
      kritis: o.rekapStatus?.kritis ?? 0,
    }))
  }, [rekapList])

  // Top performers (tertinggi realisasi fisik)
  const topOpdList = useMemo(() => {
    return [...opdFull]
      .sort((a, b) => b.fisik - a.fisik)
      .slice(0, 8)
  }, [opdFull])

  // Poin 3: OPD Perlu Perhatian Khusus (Kritis, deviasi paling minus, atau realisasi fisik paling rendah)
  const alertOpdList = useMemo(() => {
    return [...opdFull]
      .sort((a, b) => {
        // Prioritaskan yang punya paket kritis terbanyak
        if (b.kritis !== a.kritis) return b.kritis - a.kritis
        // Lalu deviasi paling negatif
        return a.deviasi - b.deviasi
      })
      .slice(0, 8)
  }, [opdFull])

  const bulanObj = BULAN_OPTIONS.find((b) => b.value === bulan)
  const namaBulanAktif = bulanObj ? bulanObj.label : `Bulan ${bulan}`

  return (
    <div className="px-4 lg:px-6 space-y-6 pb-8">

      {/* ─── HERO BANNER ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-5 sm:p-6 text-white shadow-lg">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/8 blur-3xl" />
          <div className="absolute bottom-0 left-20 w-48 h-48 rounded-full bg-blue-500/6 blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: text */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                SIMANTAP EXECUTIVE
              </Badge>
              <Badge variant="outline" className="text-slate-300 border-slate-600 text-[10px]">
                Konawe Selatan · TA {tahun}
              </Badge>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${healthErr ? "bg-rose-400" : "bg-emerald-400"}`} />
                {healthErr ? "Koneksi bermasalah" : "Sistem aktif"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
              {greeting()},{" "}
              <span className="text-emerald-300">
                {user?.namaLengkap?.split(" ").slice(0, 2).join(" ") ?? "Pimpinan Daerah"}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Executive Dashboard Monitoring & Evaluasi Realisasi Fisik dan Keuangan (RFK) Kabupaten Konawe Selatan
            </p>

            {/* Role + OPD badges */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {userRoles.slice(0, 4).map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="text-[10px] py-0 text-emerald-300 border-emerald-700/50 bg-emerald-950/50"
                >
                  {r.replace(/_/g, " ")}
                </Badge>
              ))}
              {user?.opd?.singkatan && (
                <Badge variant="outline" className="text-[10px] py-0 text-blue-300 border-blue-700/50 bg-blue-950/50">
                  <Building2 className="h-2.5 w-2.5 mr-1" />
                  {user.opd.singkatan}
                </Badge>
              )}
            </div>
          </div>

          {/* Right: Quick action buttons */}
          <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
              <Link href="/laporan">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                Matriks RFK 12 Bulan
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs h-8">
              <Link href="/pembangunan">
                <HardHat className="h-3.5 w-3.5 mr-1.5" />
                Paket Pembangunan
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── POIN 1: FILTER PERIODE EVALUASI (INTERAKTIF EKSEKUTIF) ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/60 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-foreground">Periode Evaluasi Pimpinan:</span>
            <span className="ml-1.5 text-xs text-muted-foreground font-medium">
              {namaBulanAktif} {tahun}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Select Bulan */}
          <div className="w-44">
            <Select
              value={String(bulan)}
              onValueChange={(val) => setBulan(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {BULAN_OPTIONS.map((b) => (
                  <SelectItem key={b.value} value={String(b.value)} className="text-xs">
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Tahun */}
          <div className="w-28">
            <Select
              value={String(tahun)}
              onValueChange={(val) => setTahun(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs">
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

          {/* Reset button */}
          {(bulan !== defaultBulan || tahun !== defaultTahun) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBulan(defaultBulan)
                setTahun(defaultTahun)
              }}
              title="Reset ke bulan & tahun sekarang"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── POIN 4 & STAT CARDS EKSEKUTIF (DENGAN NOMINAL RUPIAH) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Paket */}
        <StatCard
          icon={Layers}
          label="Total Paket"
          value={paketLoading ? <Skeleton className="h-7 w-12" /> : macroStats.totalPaket.toLocaleString("id-ID")}
          sub={`Tahun Anggaran ${tahun}`}
          iconClass="bg-slate-100 dark:bg-slate-800 text-slate-500"
        />

        {/* 2. Total Nilai Kontrak */}
        <StatCard
          icon={Wallet}
          label="Nilai Kontrak"
          value={paketLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(macroStats.nilaiKontrak)}
          sub="Total pagu terkontrak"
          iconClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />

        {/* 3. Realisasi Keuangan Riil (Nominal Rupiah) - POIN 4 */}
        <StatCard
          icon={Banknote}
          label="Keuangan Terealisasi"
          value={rekapLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(macroStats.nominalRealisasiKeuangan)}
          sub={
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {macroStats.persenSerapanKeuangan.toFixed(1)}% APBD cair
            </span>
          }
          iconClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />

        {/* 4. Sisa Anggaran Belum Cair - POIN 4 */}
        <StatCard
          icon={BarChart3}
          label="Sisa Anggaran"
          value={rekapLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(macroStats.sisaAnggaran)}
          sub={`Belum cair: ${(100 - macroStats.persenSerapanKeuangan).toFixed(1)}%`}
          iconClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        />

        {/* 5. Realisasi Fisik (Capaian) */}
        <StatCard
          icon={HardHat}
          label="Realisasi Fisik"
          value={paketLoading ? <Skeleton className="h-7 w-16" /> : `${macroStats.avgFisik.toFixed(1)}%`}
          sub={
            rekapLoading ? (
              "Memuat target..."
            ) : (
              <span>Target: {executiveStatus.avgTargetDaerah.toFixed(1)}%</span>
            )
          }
          iconClass="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
        />

        {/* 6. Deviasi Fisik Daerah (Early Warning) */}
        <StatCard
          icon={executiveStatus.deviasiDaerah >= 0 ? TrendingUp : TrendingDown}
          label="Deviasi Capaian"
          value={
            rekapLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              `${executiveStatus.deviasiDaerah >= 0 ? "+" : ""}${executiveStatus.deviasiDaerah.toFixed(1)}%`
            )
          }
          sub={
            executiveStatus.deviasiDaerah >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">On Track / Surplus</span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-medium">Keterlambatan Daerah</span>
            )
          }
          iconClass={
            executiveStatus.deviasiDaerah >= 0
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
          }
          valueClass={
            executiveStatus.deviasiDaerah >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }
        />
      </div>

      {/* ─── POIN 2: EXECUTIVE SUMMARY CARD (RADAR KESEHATAN PROYEK) ─── */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-muted/70 via-muted/40 to-muted/10 p-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Radar Kesehatan Pembangunan Daerah
                </h3>
                <p className="text-xs text-muted-foreground">
                  Klasifikasi kepatuhan target fisik paket se-Kabupaten Konawe Selatan (Evaluasi {namaBulanAktif})
                </p>
              </div>
            </div>

            {/* Status Alert Badge */}
            {rekapLoading ? (
              <Skeleton className="h-6 w-36" />
            ) : executiveStatus.kritis > 0 ? (
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold">
                <ShieldAlert className="h-3.5 w-3.5" />
                {executiveStatus.opdKritisCount} OPD Memerlukan Intervensi
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Kondisi Pembangunan On-Track
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Grid 4 Indikator Lampu */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Aman */}
            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Aman (On Track)
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {rekapLoading ? "..." : executiveStatus.aman}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deviasi ≥ 0% (Sesuai atau melebihi target)
              </p>
            </div>

            {/* 2. Perhatian */}
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Perhatian
                </span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {rekapLoading ? "..." : executiveStatus.perhatian}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deviasi -10% s.d. 0% (Keterlambatan ringan)
              </p>
            </div>

            {/* 3. Kritis */}
            <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  Kritis
                </span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {rekapLoading ? "..." : executiveStatus.kritis}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deviasi &lt; -10% (Butuh atensi pimpinan)
              </p>
            </div>

            {/* 4. Belum Mulai */}
            <div className="p-3 rounded-xl border border-slate-500/20 bg-slate-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Belum Mulai
                </span>
                <span className="text-lg font-bold text-slate-600 dark:text-slate-400">
                  {rekapLoading ? "..." : executiveStatus.belumMulai}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Belum ada pergerakan fisik dilaporkan
              </p>
            </div>
          </div>

          {/* Narasi Ringkas untuk Pimpinan Daerah */}
          <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
            executiveStatus.kritis > 0
              ? "bg-rose-500/8 border-rose-500/20 text-rose-900 dark:text-rose-200"
              : "bg-emerald-500/8 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
          }`}>
            {executiveStatus.kritis > 0 ? (
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed">
              {executiveStatus.kritis > 0 ? (
                <>
                  <span className="font-semibold">Perhatian Pimpinan: </span>
                  Terdapat <span className="font-bold underline">{executiveStatus.kritis} paket pekerjaan</span> pada{" "}
                  <span className="font-bold underline">{executiveStatus.opdKritisCount} Perangkat Daerah</span> yang mengalami
                  keterlambatan kritis (deviasi fisik &gt;10% di bawah target rencana). Pimpinan dapat memeriksa tab{" "}
                  <span className="font-semibold">"Perlu Perhatian (Kritis)"</span> pada tabel di bawah untuk menentukan OPD yang membutuhkan intervensi atau instruksi percepatan.
                </>
              ) : (
                <>
                  <span className="font-semibold">Catatan Kinerja Positif: </span>
                  Hingga periode {namaBulanAktif} {tahun}, secara keseluruhan pelaksanaan paket pembangunan se-Kabupaten Konawe Selatan berjalan optimal tanpa paket berkategori kritis. Terus dorong percepatan pengajuan termin keuangan agar berbanding lurus dengan progres fisik.
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── MIDDLE ROW: REALISASI PER OPD & DISTRIBUSI STATUS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Realisasi per OPD */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Progres Fisik & Serapan per OPD</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Fisik (bar tebal) · Serapan Keuangan (bar tipis) — Evaluasi {namaBulanAktif} {tahun}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1 -mr-2">
                <Link href="/laporan">Lihat Matriks <ChevronRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rekapLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-1.5 w-full" />
                    <Skeleton className="h-1 w-full" />
                  </div>
                ))}
              </div>
            ) : topOpdList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <BarChart3 className="h-9 w-9 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Belum ada data realisasi OPD untuk periode ini</p>
                <p className="text-xs text-muted-foreground">Pilih bulan evaluasi lain atau pastikan data paket telah diisi</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topOpdList.map((opd) => (
                  <OpdProgressRow
                    key={opd.opdId}
                    nama={opd.namaOpd}
                    singkatan={opd.singkatan}
                    fisik={opd.fisik}
                    keuangan={opd.keuangan}
                    target={opd.target}
                    deviasi={opd.deviasi}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Distribusi Status & Status Sistem */}
        <div className="space-y-4">
          {/* Status Distribusi Paket */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Distribusi Paket Fisik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {paketLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)
              ) : (
                <>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs sm:text-sm font-medium">Selesai (100%)</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {macroStats.selesai} paket
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/8 border border-blue-500/15">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-xs sm:text-sm font-medium">Sedang Berjalan</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {macroStats.berjalan} paket
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-500/8 border border-slate-500/15">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-slate-500" />
                      <span className="text-xs sm:text-sm font-medium">Belum Mulai</span>
                    </div>
                    <span className="text-sm font-bold text-slate-500">
                      {macroStats.belumMulai} paket
                    </span>
                  </div>

                  {macroStats.totalPaket > 0 && (
                    <div className="pt-1.5">
                      <Progress
                        value={(macroStats.selesai / macroStats.totalPaket) * 100}
                        className="h-2"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                        {((macroStats.selesai / macroStats.totalPaket) * 100).toFixed(1)}% total pekerjaan telah rampung
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Status Koneksi Integrasi Daerah */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Integrasi Sistem Daerah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: "Backend Server (NestJS)",
                  ok: !healthErr && !healthLoading,
                  loading: healthLoading,
                  detail: healthData?.details?.database?.responseTime
                    ? `${healthData.details.database.responseTime}ms`
                    : undefined,
                },
                {
                  label: "PostgreSQL Database",
                  ok: healthData?.details?.database?.status === "up",
                  loading: healthLoading,
                },
                {
                  label: "Database E-Gov Konawe Selatan",
                  ok: true,
                  loading: false,
                  detail: "Read-Only Active",
                },
                {
                  label: "Database SIMPEG Konawe Selatan",
                  ok: true,
                  loading: false,
                  detail: "Read-Only Active",
                },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.label}</span>
                  {c.loading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <Badge
                      className={`text-[10px] border-0 py-0 ${
                        c.ok
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {c.ok ? "✓" : "✗"} {c.detail ?? (c.ok ? "Online" : "Offline")}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── POIN 3: PANEL KINERJA DENGAN DUA TAB (TOP PERFORMER & PERLU PERHATIAN KRITIS) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Card Tab Kinerja OPD: Poin 3 */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Monitoring Kinerja Perangkat Daerah</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Evaluasi perbandingan OPD terbaik vs OPD yang membutuhkan asistensi pimpinan
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1 -mr-2 w-fit">
                <Link href="/laporan">Buka Matriks RFK <ChevronRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Tabs defaultValue="perhatian" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="perhatian" className="text-xs gap-1.5 font-medium data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                  Perlu Perhatian / Kritis
                  {alertOpdList.filter(o => o.kritis > 0).length > 0 && (
                    <Badge className="ml-1 bg-rose-500 text-white text-[9px] px-1.5 py-0 h-4 rounded-full">
                      {alertOpdList.filter(o => o.kritis > 0).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tertinggi" className="text-xs gap-1.5 font-medium data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  Capaian Tertinggi
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: OPD Perlu Perhatian / Kritis */}
              <TabsContent value="perhatian" className="mt-0">
                {rekapLoading ? (
                  <div className="space-y-3 py-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : alertOpdList.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
                    <p className="text-xs font-medium text-muted-foreground">Tidak ada OPD dalam kondisi keterlambatan kritis</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {alertOpdList.map((opd, idx) => (
                      <div key={opd.opdId} className="flex items-center justify-between gap-3 py-2.5 px-2 hover:bg-muted/40 rounded-lg transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-xs font-bold w-5 text-center shrink-0 ${
                            opd.kritis > 0 ? "text-rose-500" : "text-amber-500"
                          }`}>
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold truncate max-w-[200px] sm:max-w-xs">{opd.namaOpd}</p>
                              {opd.kritis > 0 ? (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-rose-500/40 text-rose-600 bg-rose-500/10">
                                  {opd.kritis} Paket Kritis
                                </Badge>
                              ) : opd.perhatian > 0 ? (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-600 bg-amber-500/10">
                                  {opd.perhatian} Perhatian
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {opd.totalPaket} paket · Kontrak: {formatCurrency(opd.nilaiKontrak)} · Serapan: {formatCurrency(opd.totalRealisasiKeuangan)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Tgt: {opd.target.toFixed(1)}%
                            </span>
                            <span className={`text-xs font-bold font-mono ${pctColor(opd.fisik)}`}>
                              F: {opd.fisik.toFixed(1)}%
                            </span>
                          </div>
                          <span className={`text-[10px] font-semibold font-mono block ${
                            opd.deviasi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}>
                            Deviasi: {opd.deviasi >= 0 ? "+" : ""}{opd.deviasi.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Capaian Tertinggi */}
              <TabsContent value="tertinggi" className="mt-0">
                {rekapLoading ? (
                  <div className="space-y-3 py-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : topOpdList.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <Building2 className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Belum ada data OPD</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {topOpdList.map((opd, idx) => (
                      <div key={opd.opdId} className="flex items-center justify-between gap-3 py-2.5 px-2 hover:bg-muted/40 rounded-lg transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-xs font-bold w-5 text-center shrink-0 ${
                            idx < 3 ? "text-amber-500" : "text-muted-foreground"
                          }`}>
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate max-w-[200px] sm:max-w-xs">{opd.namaOpd}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {opd.totalPaket} paket · Kontrak: {formatCurrency(opd.nilaiKontrak)} · Serapan: {opd.keuangan.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 w-20">
                          <p className={`text-xs font-bold font-mono ${pctColor(opd.fisik)}`}>
                            {opd.fisik.toFixed(1)}%
                          </p>
                          <Progress value={Math.min(opd.fisik, 100)} className="h-1.5 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Akses Cepat & Navigasi Eksekutif */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Akses Cepat Pengawasan</CardTitle>
            <CardDescription className="text-xs">Pintasan menu monitoring pembangunan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              {[
                {
                  href: "/laporan",
                  icon: FileSpreadsheet,
                  title: "Laporan Matriks RFK",
                  desc: "Matriks target vs realisasi 12 bulan per OPD",
                  cls: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/18",
                  iconCls: "text-emerald-600 dark:text-emerald-400",
                  show: true,
                },
                {
                  href: "/pembangunan",
                  icon: HardHat,
                  title: "Daftar Paket Pembangunan",
                  desc: "Rincian kontrak, PPK, dan lokasi kegiatan",
                  cls: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/18",
                  iconCls: "text-blue-600 dark:text-blue-400",
                  show: true,
                },
                {
                  href: "/realisasi",
                  icon: TrendingUp,
                  title: "Entri & Rekap Realisasi",
                  desc: "Progres fisik dan SP2D keuangan bulanan",
                  cls: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/18",
                  iconCls: "text-amber-600 dark:text-amber-400",
                  show: true,
                },
                {
                  href: "/roles",
                  icon: UserCog,
                  title: "Matriks Hak Akses Sistem",
                  desc: "Konfigurasi otorisasi & role pengguna",
                  cls: "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/18",
                  iconCls: "text-purple-600 dark:text-purple-400",
                  show: isAdministrator,
                },
                {
                  href: "/users",
                  icon: Users,
                  title: "Kelola Pengguna Daerah",
                  desc: "Manajemen akun ASN & pejabat",
                  cls: "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/18",
                  iconCls: "text-slate-600 dark:text-slate-400",
                  show: isAdministrator,
                },
              ]
                .filter((m) => m.show)
                .map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${m.cls}`}
                  >
                    <div className="p-1.5 rounded-lg bg-background/60 shrink-0 mt-0.5">
                      <m.icon className={`h-4 w-4 ${m.iconCls}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-tight">{m.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{m.desc}</p>
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
