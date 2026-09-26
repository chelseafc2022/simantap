"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Coins,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface RealisasiSummary {
  activeBulan: number
  totalPaket: number
  totalPagu: number
  totalKontrak: number
  totalRealisasiKeuangan: number
  persenSerapanKeuangan: number
  avgTargetFisik: number
  avgRealisasiFisik: number
  avgDeviasiFisik: number
  countStatus: {
    aman: number
    perhatian: number
    kritis: number
    belumMulai: number
  }
}

interface RealisasiStatCardsProps {
  summary?: RealisasiSummary | null
  isLoading?: boolean
}

export function RealisasiStatCards({ summary, isLoading = false }: RealisasiStatCardsProps) {
  const formatRupiah = (val: number | undefined | null) => {
    const num = val || 0
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  const s = summary || {
    activeBulan: new Date().getMonth() + 1,
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

  const isDeviasiPositif = s.avgDeviasiFisik >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: Realisasi Keuangan */}
      <Card className="border-border/70 shadow-xs hover:border-emerald-500/40 transition-all bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Realisasi Keuangan
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
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                {s.persenSerapanKeuangan}% Serapan
              </Badge>
              <span className="truncate">dari total kontrak</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Capaian Fisik Rata-rata */}
      <Card className="border-border/70 shadow-xs hover:border-blue-500/40 transition-all bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rata-rata Fisik Riil
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
              {isLoading ? (
                <div className="h-7 w-20 bg-muted animate-pulse rounded" />
              ) : (
                `${s.avgRealisasiFisik}%`
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Target Rencana:</span>
              <span className="font-semibold text-foreground font-mono">{s.avgTargetFisik}%</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: Rata-rata Deviasi Fisik */}
      <Card className="border-border/70 shadow-xs hover:border-amber-500/40 transition-all bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rata-rata Deviasi Fisik
            </span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              isDeviasiPositif
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-red-500/10 text-red-600"
            }`}>
              {isDeviasiPositif ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
              isDeviasiPositif ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}>
              {isLoading ? (
                <div className="h-7 w-24 bg-muted animate-pulse rounded" />
              ) : (
                `${s.avgDeviasiFisik > 0 ? "+" : ""}${s.avgDeviasiFisik}%`
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Status Kumulatif:</span>
              <span className={`font-semibold ${isDeviasiPositif ? "text-emerald-600" : "text-red-600"}`}>
                {isDeviasiPositif ? "On Track / Lebih Cepat" : "Terlambat dari Rencana"}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CARD 4: Klasifikasi Status Capaian */}
      <Card className="border-border/70 shadow-xs hover:border-primary/40 transition-all bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Kondisi Lapangan
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {s.countStatus.aman} Aman
              </Badge>
              <Badge variant="outline" className="text-xs font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {s.countStatus.perhatian} Waspada
              </Badge>
              <Badge variant="outline" className="text-xs font-mono bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                {s.countStatus.kritis} Kritis
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Total <span className="font-semibold text-foreground">{s.totalPaket}</span> paket terdaftar
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
