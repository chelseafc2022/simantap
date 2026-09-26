"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Coins,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  ShieldAlert,
  Clock,
} from "lucide-react"

interface LaporanSummary {
  activeBulan?: number
  totalPaket: number
  totalPagu: number
  totalKontrak: number
  totalRealisasiKeuangan: number
  persenSerapanKeuangan: number
  avgTargetFisik: number
  avgRealisasiFisik: number
  avgDeviasiFisik: number
  countStatus?: {
    aman: number
    perhatian: number
    kritis: number
    belumMulai: number
  }
}

interface LaporanStatCardsProps {
  summary?: LaporanSummary | null
  isLoading?: boolean
}

export function LaporanStatCards({ summary, isLoading = false }: LaporanStatCardsProps) {
  const formatRupiah = (val: number | undefined | null) => {
    const num = val || 0
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  const s = summary || {
    totalPaket: 0,
    totalPagu: 0,
    totalKontrak: 0,
    totalRealisasiKeuangan: 0,
    persenSerapanKeuangan: 0,
    avgTargetFisik: 0,
    avgRealisasiFisik: 0,
    avgDeviasiFisik: 0,
    countStatus: {
      aman: 0,
      perhatian: 0,
      kritis: 0,
      belumMulai: 0,
    },
  }

  const deviasi = s.avgDeviasiFisik || 0
  const isDeviasiPositif = deviasi >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: Realisasi Keuangan & Serapan */}
      <Card className="border-border/70 shadow-xs hover:border-emerald-500/40 transition-all bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Serapan Keuangan
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground truncate">
              {isLoading ? (
                <div className="h-7 w-32 bg-muted animate-pulse rounded" />
              ) : (
                formatRupiah(s.totalRealisasiKeuangan)
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <Badge
                variant="secondary"
                className="font-mono text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              >
                {(s.persenSerapanKeuangan || 0).toFixed(1)}% Serapan
              </Badge>
              <span className="truncate">dari total kontrak</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Rata-Rata Fisik */}
      <Card className="border-border/70 shadow-xs hover:border-blue-500/40 transition-all bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rata-Rata Fisik
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
              {isLoading ? (
                <div className="h-7 w-20 bg-muted animate-pulse rounded" />
              ) : (
                `${(s.avgRealisasiFisik || 0).toFixed(1)}%`
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span className="text-[11px]">
                Target: <strong className="text-foreground font-mono">{(s.avgTargetFisik || 0).toFixed(1)}%</strong>
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="truncate">{s.totalPaket} total paket</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: Rata-Rata Deviasi */}
      <Card
        className={`border-border/70 shadow-xs transition-all bg-card/60 backdrop-blur-xs ${
          isDeviasiPositif
            ? "hover:border-emerald-500/40"
            : deviasi >= -10
            ? "hover:border-amber-500/40"
            : "hover:border-rose-500/40 border-rose-500/30"
        }`}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Deviasi Fisik
            </span>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                isDeviasiPositif
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : deviasi >= -10
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse"
              }`}
            >
              {isDeviasiPositif ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                isDeviasiPositif
                  ? "text-emerald-600 dark:text-emerald-400"
                  : deviasi >= -10
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isLoading ? (
                <div className="h-7 w-20 bg-muted animate-pulse rounded" />
              ) : (
                `${isDeviasiPositif ? "+" : ""}${deviasi.toFixed(1)}%`
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <span className="truncate">
                {isDeviasiPositif
                  ? "Kinerja fisik melampaui target"
                  : deviasi >= -10
                  ? "Keterlambatan ringan (< 10%)"
                  : "Kritis butuh intervensi (> 10%)"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 4: Distribusi Status Capaian */}
      <Card className="border-border/70 shadow-xs hover:border-purple-500/40 transition-all bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status Capaian
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <PieChart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-muted-foreground text-[11px]">Aman:</span>
              <span className="font-semibold text-foreground">
                {s.countStatus?.aman || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-muted-foreground text-[11px]">Waspada:</span>
              <span className="font-semibold text-foreground">
                {s.countStatus?.perhatian || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <span className="text-muted-foreground text-[11px]">Kritis:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {s.countStatus?.kritis || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
              <span className="text-muted-foreground text-[11px]">Belum:</span>
              <span className="font-semibold text-muted-foreground">
                {s.countStatus?.belumMulai || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
