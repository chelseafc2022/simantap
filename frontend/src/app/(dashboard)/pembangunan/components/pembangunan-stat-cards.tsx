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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Paket */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-xs transition-all hover:shadow-sm">
        <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/10 blur-xl dark:bg-emerald-500/15" />
        <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Paket
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {totalPaket}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">
              Paket PBJ / RUP Terdaftar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Pagu */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-xs transition-all hover:shadow-sm">
        <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-blue-500/10 blur-xl dark:bg-blue-500/15" />
        <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Pagu Anggaran
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate" title={formatRupiah(totalPagu)}>
              {formatRupiah(totalPagu)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">
              Pagu Induk APBD
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Nilai Kontrak */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-xs transition-all hover:shadow-sm">
        <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10 blur-xl dark:bg-indigo-500/15" />
        <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Nilai Kontrak
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate" title={formatRupiah(totalKontrak)}>
              {formatRupiah(totalKontrak)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">
              SPK / Kontrak Terikat
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Efisiensi Pengadaan */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-xs transition-all hover:shadow-sm">
        <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-amber-500/10 blur-xl dark:bg-amber-500/15" />
        <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Efisiensi PBJ
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base sm:text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {efisiensiPersen}%
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate" title={formatRupiah(efisiensiRp)}>
              Hemat {formatRupiah(efisiensiRp)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
