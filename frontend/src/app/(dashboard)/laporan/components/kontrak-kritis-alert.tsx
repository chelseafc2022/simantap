"use client"

import React from "react"
import { ShieldAlert, ArrowRight, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface KontrakKritisAlertProps {
  kritisItems: any[]
  onFilterKritis?: () => void
}

export function KontrakKritisAlert({ kritisItems, onFilterKritis }: KontrakKritisAlertProps) {
  if (!kritisItems || kritisItems.length === 0) return null

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-xs p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                  Perhatian: {kritisItems.length} Paket Dalam Status Kontrak Kritis!
                </h3>
                <Badge variant="destructive" className="font-mono text-[10px] px-1.5 py-0 bg-rose-600">
                  Deviasi &lt; -10%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Paket berikut mengalami deviasi fisik signifikan dan wajib ditindaklanjuti dengan rapat pembuktian keterlambatan (<strong>Show Cause Meeting / SCM</strong>) atau Surat Peringatan (SP).
              </p>
            </div>

            {onFilterKritis && (
              <Button
                variant="outline"
                size="sm"
                onClick={onFilterKritis}
                className="shrink-0 h-8 text-xs gap-1.5 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Hanya Paket Kritis</span>
              </Button>
            )}
          </div>

          {/* List of top 3 critical packages preview */}
          <div className="mt-3.5 space-y-2">
            {kritisItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-background/80 border border-rose-500/20 shadow-2xs text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground truncate">
                    {item.namaPaket}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-[11px] mt-0.5 flex-wrap">
                    <span className="font-medium text-foreground/80">{item.opd?.singkatan || item.opd?.namaOpd}</span>
                    <span>•</span>
                    <span className="font-mono">Kontrak: {formatRupiah(item.nilaiKontrak)}</span>
                    {item.pemenangRekanan && (
                      <>
                        <span>•</span>
                        <span className="truncate">Rekanan: {item.pemenangRekanan}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  <div className="text-right text-[11px]">
                    <span className="text-muted-foreground">Fisik: </span>
                    <span className="font-bold font-mono text-foreground">{item.realisasiFisik}%</span>
                    <span className="text-muted-foreground font-mono"> / Tgt: {item.targetFisik}%</span>
                  </div>
                  <Badge variant="destructive" className="font-mono text-xs px-2 py-0.5 font-bold">
                    {item.deviasiFisik}%
                  </Badge>
                </div>
              </div>
            ))}

            {kritisItems.length > 3 && (
              <p className="text-[11px] text-muted-foreground italic text-right pt-1">
                + {kritisItems.length - 3} paket kritis lainnya dapat dilihat pada tabel evaluasi di bawah.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
