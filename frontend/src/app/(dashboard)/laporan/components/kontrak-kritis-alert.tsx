import React from "react"
import { AlertCircle, AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface KontrakKritisAlertProps {
  kritisItems: any[]
  onSelectPaket?: (paketId: string) => void
}

export function KontrakKritisAlert({ kritisItems, onSelectPaket }: KontrakKritisAlertProps) {
  if (!kritisItems || kritisItems.length === 0) return null

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20 p-4 sm:p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-rose-950 dark:text-rose-200 flex items-center gap-2">
                Peringatan: Terdeteksi {kritisItems.length} Paket Dalam Status Kontrak Kritis!
                <Badge variant="destructive" className="bg-rose-600 text-xs">
                  Deviasi &lt; -10%
                </Badge>
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                Sesuai ketentuan pengadaan barang/jasa pemerintah, paket dengan deviasi fisik di bawah -10% wajib dilakukan evaluasi khusus, penerbitan Surat Peringatan (SP), atau pelaksanaan rapat pembuktian keterlambatan (<strong>Show Cause Meeting / SCM</strong>).
              </p>
            </div>
          </div>

          {/* List of critical packages preview */}
          <div className="mt-3.5 space-y-2">
            {kritisItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/60 border border-rose-200/60 dark:border-rose-900/40 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {item.namaPaket}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-[11px] mt-0.5">
                    <span>{item.opd?.singkatan || item.opd?.namaOpd}</span>
                    <span>•</span>
                    <span>Kontrak: {formatRupiah(item.nilaiKontrak)}</span>
                    <span>•</span>
                    <span>Rekanan: {item.pemenangRekanan || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground">Realisasi: </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {item.realisasiFisik}%
                    </span>
                    <span className="text-[11px] text-muted-foreground"> (Target: {item.targetFisik}%)</span>
                  </div>
                  <Badge variant="destructive" className="font-mono text-xs">
                    {item.deviasiFisik}%
                  </Badge>
                </div>
              </div>
            ))}
            {kritisItems.length > 3 && (
              <p className="text-xs text-rose-700 dark:text-rose-400 italic text-right">
                + {kritisItems.length - 3} paket kritis lainnya tercantum dalam tabel evaluasi di bawah.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
