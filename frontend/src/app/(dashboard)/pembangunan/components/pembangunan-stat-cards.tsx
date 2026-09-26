"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Briefcase, Coins, FileCheck, Percent } from "lucide-react"

interface PembangunanStatCardsProps {
  totalPaket: number
  totalPagu: number
  totalKontrak: number
}

export function PembangunanStatCards({
  totalPaket,
  totalPagu,
  totalKontrak,
}: PembangunanStatCardsProps) {
  const efisiensiRp = totalPagu > totalKontrak ? totalPagu - totalKontrak : 0
  const efisiensiPersen =
    totalPagu > 0 && totalKontrak > 0 ? ((efisiensiRp / totalPagu) * 100).toFixed(2) : "0.00"

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Paket */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/10 blur-xl dark:bg-emerald-500/15" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Paket
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {totalPaket}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Paket Pekerjaan / Pembangunan</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Pagu */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-blue-500/10 blur-xl dark:bg-blue-500/15" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Pagu Anggaran
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-foreground truncate" title={formatRupiah(totalPagu)}>
              {formatRupiah(totalPagu)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Alokasi Pagu Keseluruhan</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Nilai Kontrak */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10 blur-xl dark:bg-indigo-500/15" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Nilai Kontrak
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-foreground truncate" title={formatRupiah(totalKontrak)}>
              {formatRupiah(totalKontrak)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Nilai Kontrak / SPK Terikat</p>
          </div>
        </CardContent>
      </Card>

      {/* Efisiensi Pengadaan */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-amber-500/10 blur-xl dark:bg-amber-500/15" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Efisiensi PBJ
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {efisiensiPersen}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground truncate" title={formatRupiah(efisiensiRp)}>
              Hemat {formatRupiah(efisiensiRp)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
