"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { getUserUnitLabel } from "@/lib/utils"
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
  FolderGit2,
  Printer,
} from "lucide-react"
import { TerpaduHeritageCard } from "@/components/dashboard/terpadu-heritage-card"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { RekapEmonevTable } from "@/components/dashboard/rekap-emonev-table"
import { OpdSubunitProgressTable } from "@/components/dashboard/opd-subunit-progress-table"
import { isExcludedOpd } from "@/lib/utils"

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
      <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4 space-y-0">
        <CardTitle className="text-xs font-semibold text-muted-foreground">{label}</CardTitle>
        <div className={`p-1.5 rounded-lg ${iconClass ?? "bg-muted"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3.5 pt-0">
        {loading ? (
          <Skeleton className="h-7 w-24 mb-1" />
        ) : (
          <div className={`text-lg sm:text-xl font-bold tracking-tight ${valueClass ?? ""}`}>{value}</div>
        )}
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
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

  // Filter Periode
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

  // ── Backend Health ──
  const { isError: healthErr } = useQuery({
    queryKey: ["backend-health"],
    queryFn: async () => {
      const res = await apiClient.get("/health")
      return res.data
    },
    refetchInterval: 30000,
    retry: 1,
  })

  // ── Master OPD Options (Shared query key across pages) ──
  const { data: opdOptionsRes } = useQuery({
    queryKey: ["opd-options"],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/opd-options")
      return res.data?.data ?? res.data
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  // ── Paket Pembangunan (all, for stats) ──
  const { data: paketRes, isLoading: paketLoading } = useQuery({
    queryKey: ["dashboard-paket", tahun],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan", {
        params: { tahunAnggaran: tahun, limit: 2000, page: 1 },
      })
      return res.data?.data ?? res.data
    },
    staleTime: 3 * 60 * 1000,
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
    staleTime: 3 * 60 * 1000,
    retry: 1,
  })

  // ── Raw lists ──
  const opdMasterList: any[] = useMemo(() => {
    const list = Array.isArray(opdOptionsRes) ? opdOptionsRes : []
    return list.filter((o: any) => !isExcludedOpd(o.id) && !isExcludedOpd(o.namaOpd))
  }, [opdOptionsRes])

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

  // ── Serapan Keuangan Riil & Statistik Makro ──
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

    const nominalRealisasiKeuangan =
      rekapList.length > 0
        ? rekapList.reduce((acc, o) => acc + (Number(o.totalRealisasiKeuangan) || 0), 0)
        : sumKeuanganFromPaket

    const persenSerapanKeuangan =
      nilaiKontrak > 0
        ? (nominalRealisasiKeuangan / nilaiKontrak) * 100
        : n > 0
        ? sumKeuanganFromPaket / n
        : 0

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

  // ── Status Kesehatan Proyek se-Kabupaten ──
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

  // ── OPD Lists: Top Performers & OPD Kritis ──
  const opdFull = useMemo(() => {
    return rekapList
      .filter((o: any) => !isExcludedOpd(o.opdId) && !isExcludedOpd(o.namaOpd))
      .map((o: any) => ({
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

  const topOpdList = useMemo(() => {
    return [...opdFull]
      .sort((a, b) => b.fisik - a.fisik)
      .slice(0, 8)
  }, [opdFull])

  const alertOpdList = useMemo(() => {
    return [...opdFull]
      .sort((a, b) => {
        if (b.kritis !== a.kritis) return b.kritis - a.kritis
        return a.deviasi - b.deviasi
      })
      .slice(0, 8)
  }, [opdFull])

  const bulanObj = BULAN_OPTIONS.find((b) => b.value === bulan)
  const namaBulanAktif = bulanObj ? bulanObj.label : `Bulan ${bulan}`

  return (
    <div className="px-4 lg:px-6 space-y-5 pb-8 pt-1">

      {/* ─── 1. HEADER RINGKAS & LANGSUNG KE INTI (COMPACT EXECUTIVE HEADER) ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              SIMANTAP EXECUTIVE
            </span>
            <Badge variant="outline" className="text-[10px] py-0 border-border">
              Konawe Selatan · TA {tahun}
            </Badge>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${healthErr ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
              {healthErr ? "Offline" : "Sistem Aktif"}
            </span>

            {/* User role & unit badge */}
            {(() => {
              const unitInfo = getUserUnitLabel(user)
              if (unitInfo.short === "-") return null
              return (
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  · <Building2 className="h-3 w-3 inline text-primary" /> {unitInfo.short}
                </span>
              )
            })()}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Monitoring Realisasi Fisik & Keuangan (RFK)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluasi capaian paket pembangunan daerah periode{" "}
            <span className="font-semibold text-foreground">{namaBulanAktif} {tahun}</span>
          </p>
        </div>

        {/* Action Buttons & Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Select Bulan */}
          <div className="w-36">
            <Select
              value={String(bulan)}
              onValueChange={(val) => setBulan(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs bg-card border-border/70">
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
          <div className="w-24">
            <Select
              value={String(tahun)}
              onValueChange={(val) => setTahun(Number(val))}
            >
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

          {/* Reset button */}
          {(bulan !== defaultBulan || tahun !== defaultTahun) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBulan(defaultBulan)
                setTahun(defaultTahun)
              }}
              title="Reset ke periode bulan ini"
              className="h-8 px-2 text-xs text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button asChild size="sm" variant="outline" className="text-xs h-8 gap-1.5 shadow-2xs">
            <Link href="/laporan">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Matriks RFK
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="text-xs h-8 gap-1.5 shadow-2xs">
            <Link href="/pembangunan">
              <HardHat className="h-3.5 w-3.5 text-blue-600" />
              Paket
            </Link>
          </Button>
        </div>
      </div>

      {/* ─── 2. CORE METRICS CARDS (PAGU, REALISASI KEUANGAN, TARGET FISIK, CAPAIAN) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Nilai Kontrak / Pagu Terkontrak */}
        <StatCard
          icon={Wallet}
          label="Pagu Anggaran"
          value={paketLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(macroStats.nilaiKontrak)}
          sub="Total pagu terkontrak"
          iconClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />

        {/* 2. Realisasi Keuangan (SP2D Cair) */}
        <StatCard
          icon={Banknote}
          label="Realisasi Keuangan"
          value={rekapLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(macroStats.nominalRealisasiKeuangan)}
          sub={
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {macroStats.persenSerapanKeuangan.toFixed(1)}% APBD cair
            </span>
          }
          iconClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />

        {/* 3. Sisa Anggaran Belum Cair */}
        <StatCard
          icon={BarChart3}
          label="Sisa Anggaran"
          value={rekapLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(macroStats.sisaAnggaran)}
          sub={`Belum cair: ${(100 - macroStats.persenSerapanKeuangan).toFixed(1)}%`}
          iconClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        />

        {/* 4. Target Fisik Rencana */}
        <StatCard
          icon={Calendar}
          label="Target Fisik"
          value={rekapLoading ? <Skeleton className="h-6 w-14" /> : `${executiveStatus.avgTargetDaerah.toFixed(1)}%`}
          sub={`Target rencana ${namaBulanAktif}`}
          iconClass="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
        />

        {/* 5. Realisasi Fisik Tercapai */}
        <StatCard
          icon={HardHat}
          label="Realisasi Fisik"
          value={paketLoading ? <Skeleton className="h-6 w-14" /> : `${macroStats.avgFisik.toFixed(1)}%`}
          sub={
            <span className={executiveStatus.deviasiDaerah >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
              Deviasi: {executiveStatus.deviasiDaerah >= 0 ? "+" : ""}{executiveStatus.deviasiDaerah.toFixed(1)}%
            </span>
          }
          iconClass="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
          valueClass={macroStats.avgFisik >= executiveStatus.avgTargetDaerah ? "text-emerald-600" : "text-amber-600"}
        />

        {/* 6. Total Paket & Status */}
        <StatCard
          icon={Layers}
          label="Total Paket"
          value={paketLoading ? <Skeleton className="h-6 w-12" /> : macroStats.totalPaket.toLocaleString("id-ID")}
          sub={`${macroStats.selesai} Selesai · ${macroStats.berjalan} Berjalan`}
          iconClass="bg-slate-100 dark:bg-slate-800 text-slate-500"
        />
      </div>

      {/* ─── 3. GRAFIK DIAGRAM BATANG & DIAGRAM PIE (RECHARTS) ─── */}
      <DashboardCharts
        rekapList={rekapList}
        paketList={paketList}
        macroStats={macroStats}
        executiveStatus={executiveStatus}
        bulan={bulan}
        tahun={tahun}
        namaBulanAktif={namaBulanAktif}
      />

      {/* ─── 4. TABS LAPORAN KINERJA DAERAH ─── */}
      <Tabs defaultValue="rekap-emonev" className="w-full space-y-4">
        {/* TabsList scrollable di mobile */}
        <div className="overflow-x-auto pb-0.5 border-b">
          <TabsList className="h-9 p-1 bg-muted/60 flex w-max min-w-full sm:w-auto sm:min-w-0">
            <TabsTrigger value="rekap-emonev" className="text-xs gap-1.5 font-semibold whitespace-nowrap">
              <Printer className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="hidden md:inline">Rekap Seluruh OPD (Standar E-MONEV) & Cetak PDF</span>
              <span className="md:hidden">Rekap OPD</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring-opd" className="text-xs gap-1.5 font-semibold whitespace-nowrap">
              <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="hidden sm:inline">Monitoring Kinerja (Top & Kritis)</span>
              <span className="sm:hidden">Monitoring</span>
            </TabsTrigger>
            <TabsTrigger value="progres-pengisian" className="text-xs gap-1.5 font-semibold whitespace-nowrap">
              <FolderGit2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">Progres Pengisian OPD & Sub-Unit</span>
              <span className="sm:hidden">Progres</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── TAB 1: REKAPITULASI SELURUH OPD (STANDAR E-MONEV) & CETAK PDF ─── */}
        <TabsContent value="rekap-emonev" className="mt-0 space-y-4">
          <RekapEmonevTable
            opdMasterList={opdMasterList}
            rekapList={rekapList}
            tahun={tahun}
            bulan={bulan}
            namaBulanAktif={namaBulanAktif}
          />
        </TabsContent>

        {/* ─── TAB 2: MONITORING KINERJA OPD (TOP PERFORMER & PERLU PERHATIAN KRITIS) ─── */}
        <TabsContent value="monitoring-opd" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card Tab Kinerja OPD */}
            <Card className="lg:col-span-2 border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Monitoring Kinerja Perangkat Daerah</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Evaluasi perbandingan OPD terbaik vs OPD yang membutuhkan asistensi percepatan
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
        </TabsContent>

        {/* ─── TAB 3: PROGRES PENGISIAN DATA OPD & SUB-UNIT KERJA ─── */}
        <TabsContent value="progres-pengisian" className="mt-0">
          <OpdSubunitProgressTable
            paketList={paketList}
            rekapList={rekapList}
            opdMasterList={opdMasterList}
            bulan={bulan}
            tahun={tahun}
            namaBulanAktif={namaBulanAktif}
          />
        </TabsContent>
      </Tabs>

      {/* ─── 5. APRESIASI INTEGRASI TERPADU (SIDAPEM & MONEV) ─── */}
      <TerpaduHeritageCard />

    </div>
  )
}
