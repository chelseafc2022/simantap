import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PieChart,
} from "lucide-react"

interface LaporanStatCardsProps {
  summary: {
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
}

export function LaporanStatCards({ summary }: LaporanStatCardsProps) {
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  const deviasi = summary.avgDeviasiFisik || 0
  const isDeviasiPositif = deviasi >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: Realisasi Keuangan */}
      <Card className="border border-border/60 shadow-xs hover:border-primary/40 transition-colors">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Serapan Keuangan
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summary.persenSerapanKeuangan.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {formatRupiah(summary.totalRealisasiKeuangan)}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Kontrak:</span>
            <span className="font-medium text-foreground">{formatRupiah(summary.totalKontrak)}</span>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Rata-Rata Fisik */}
      <Card className="border border-border/60 shadow-xs hover:border-primary/40 transition-colors">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rata-Rata Fisik
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summary.avgRealisasiFisik.toFixed(1)}%
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, summary.avgRealisasiFisik))}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Target Rencana:</span>
            <span className="font-medium text-foreground">{summary.avgTargetFisik.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: Rata-Rata Deviasi */}
      <Card className="border border-border/60 shadow-xs hover:border-primary/40 transition-colors">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Deviasi Fisik Rata-rata
            </span>
            <div
              className={`p-2 rounded-lg ${
                isDeviasiPositif
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : deviasi >= -10
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse"
              }`}
            >
              {isDeviasiPositif ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-bold tracking-tight ${
                isDeviasiPositif
                  ? "text-emerald-600 dark:text-emerald-400"
                  : deviasi >= -10
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isDeviasiPositif ? `+${deviasi.toFixed(1)}%` : `${deviasi.toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isDeviasiPositif
                ? "Pelaksanaan melebihi rencana"
                : deviasi >= -10
                ? "Keterlambatan ringan (< 10%)"
                : "Kritis butuh intervensi (> 10%)"}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Status Evaluasi:</span>
            <Badge
              variant="outline"
              className={
                isDeviasiPositif
                  ? "text-emerald-600 border-emerald-300 dark:border-emerald-800"
                  : deviasi >= -10
                  ? "text-amber-600 border-amber-300 dark:border-amber-800"
                  : "text-rose-600 border-rose-300 dark:border-rose-800"
              }
            >
              {isDeviasiPositif ? "Aman" : deviasi >= -10 ? "Perhatian" : "Kritis"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CARD 4: Distribusi Status Paket */}
      <Card className="border border-border/60 shadow-xs hover:border-primary/40 transition-colors">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Distribusi Status
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-muted-foreground">Aman:</span>
              <span className="font-semibold text-foreground">
                {summary.countStatus?.aman || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span className="text-muted-foreground">Perhatian:</span>
              <span className="font-semibold text-foreground">
                {summary.countStatus?.perhatian || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span className="text-muted-foreground">Kritis:</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {summary.countStatus?.kritis || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              <span className="text-muted-foreground">Belum:</span>
              <span className="font-semibold text-foreground">
                {summary.countStatus?.belumMulai || 0}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Paket:</span>
            <span className="font-semibold text-foreground">{summary.totalPaket} Paket</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
