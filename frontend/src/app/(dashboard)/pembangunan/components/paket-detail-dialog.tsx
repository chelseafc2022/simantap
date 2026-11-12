"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2, Calendar, FileText, MapPin, User, CheckCircle2, AlertTriangle, GitBranch } from "lucide-react"
import { PaketItem } from "./paket-form-dialog"

interface PaketDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paket: (PaketItem & {
    realisasiBulanan?: Array<{
      bulan: number
      realisasiFisik: number
      realisasiKeuangan: number | string
      catatanOperator?: string | null
    }>
  }) | null
}

const BULAN_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
]

export function PaketDetailDialog({
  open,
  onOpenChange,
  paket,
}: PaketDetailDialogProps) {
  if (!paket) return null

  const formatRupiah = (val: number | string | undefined | null) => {
    const num = typeof val === "string" ? parseFloat(val) : val || 0
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  const isKeuangan = paket.polaMonitoring === "KEUANGAN"
  const paguNum = typeof paket.nilaiPagu === "string" ? parseFloat(paket.nilaiPagu) : paket.nilaiPagu || 0
  const kontrakNum = typeof paket.nilaiKontrak === "string" ? parseFloat(paket.nilaiKontrak) : paket.nilaiKontrak || 0
  const efisiensiRp = paguNum > kontrakNum ? paguNum - kontrakNum : 0
  const efisiensiPersen = paguNum > 0 ? ((efisiensiRp / paguNum) * 100).toFixed(2) : "0.00"

  // Merge 12 months target & realisasi
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const bulan = i + 1
    const targetItem = paket.targetBulanan?.find((t) => t.bulan === bulan)
    const realisasiItem = paket.realisasiBulanan?.find((r) => r.bulan === bulan)

    const targetFisik = targetItem ? targetItem.targetFisik : 0
    const realisasiFisik = realisasiItem ? realisasiItem.realisasiFisik : 0
    const realisasiKeuangan = realisasiItem ? Number(realisasiItem.realisasiKeuangan) : 0
    const deviasi = realisasiFisik - targetFisik

    return {
      bulan,
      namaBulan: BULAN_NAMES[i],
      targetFisik,
      realisasiFisik,
      realisasiKeuangan,
      deviasi,
      catatan: realisasiItem?.catatanOperator || "-",
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {paket.tahunAnggaran}
                </Badge>
                {paket.kodeRupKontrak && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {paket.kodeRupKontrak}
                  </Badge>
                )}
                {paket.metodePemilihan && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs">
                    {paket.metodePemilihan}
                  </Badge>
                )}
                {(paket.isIndukGelondongan || (paket.pecahanPakets?.length ?? 0) > 0) && (
                  <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25 text-xs gap-1">
                    <GitBranch className="h-3 w-3" />
                    Induk Gelondongan ({paket.pecahanPakets?.length || 0} Kontrak)
                  </Badge>
                )}
                {paket.parentId && (
                  <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25 text-xs gap-1">
                    <GitBranch className="h-3 w-3" />
                    Pecahan Kontrak
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {paket.namaPaket}
              </DialogTitle>
              {paket.parentPaket && (
                <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">
                  Bagian dari Paket Induk: {paket.parentPaket.namaPaket}
                </div>
              )}
              <DialogDescription className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {paket.opd?.namaOpd || "OPD Pemkab Konawe Selatan"}
                </span>
                {paket.subUnit?.namaSubUnit && (
                  <>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground font-medium">{paket.subUnit.namaSubUnit}</span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Pagu Anggaran</span>
            <div className="font-semibold text-foreground">
              {paket.parentId ? "Rp 0 (Ikut Induk)" : formatRupiah(paguNum)}
            </div>
            <span className="text-xs text-muted-foreground">{paket.sumberDana || "Sumber Dana: -"}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Nilai Kontrak / SPK</span>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatRupiah(kontrakNum)}
            </div>
            <span className="text-xs text-muted-foreground">
              {isKeuangan ? "Monitoring keuangan" : `Hemat: ${formatRupiah(efisiensiRp)} (${efisiensiPersen}%)`}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Pelaksana / Rekanan</span>
            <div className="font-medium text-foreground">{paket.pemenangRekanan || "-"}</div>
            <span className="text-xs text-muted-foreground font-mono">
              {paket.nomorKontrak || "No Kontrak: -"}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Lokasi Kegiatan</span>
            <div className="flex items-center gap-1 text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {paket.lokasiKegiatan || "-"}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Waktu Pelaksanaan</span>
            <div className="flex items-center gap-1 text-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {paket.tanggalMulai ? paket.tanggalMulai.substring(0, 10) : "-"} s.d.{" "}
              {paket.tanggalSelesai ? paket.tanggalSelesai.substring(0, 10) : "-"}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Jenis Pengadaan</span>
            <div className="font-medium text-foreground">{paket.jenisPengadaan || "-"}</div>
          </div>
        </div>

        <Separator />

        {paket.pecahanPakets && paket.pecahanPakets.length > 0 && (
          <div className="space-y-2 py-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-indigo-600" />
              Rincian Kontrak Pecahan ({paket.pecahanPakets.length} Kontrak)
            </h3>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 text-center">No</TableHead>
                    <TableHead>Nama Kontrak Pecahan</TableHead>
                    <TableHead>Nomor Kontrak & Penyedia</TableHead>
                    <TableHead className="text-right">Nilai Kontrak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paket.pecahanPakets.map((child, idx) => (
                    <TableRow key={child.id}>
                      <TableCell className="text-center font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{child.namaPaket}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="font-mono">{child.nomorKontrak || "-"}</div>
                        <div>{child.pemenangRekanan || "-"}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(child.nilaiKontrak)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Rekap bulanan untuk kebutuhan dashboard dan TEPRA */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Rekap Bulanan Target & Realisasi untuk TEPRA
            </h4>
            <span className="text-xs text-muted-foreground">
              Deviasi = Realisasi Fisik - Target Fisik
            </span>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
            <Table className="border-collapse">
              <TableHeader className="bg-gray-50/90 dark:bg-neutral-800/80">
                <TableRow className="hover:bg-transparent border-b border-gray-200 dark:border-neutral-700">
                  <TableHead className="w-16 border-r border-b border-gray-200 dark:border-neutral-700">Bulan</TableHead>
                  <TableHead className="text-right border-r border-b border-gray-200 dark:border-neutral-700">Target Fisik (%)</TableHead>
                  <TableHead className="text-right border-r border-b border-gray-200 dark:border-neutral-700">Realisasi Fisik (%)</TableHead>
                  <TableHead className="text-right border-r border-b border-gray-200 dark:border-neutral-700">Deviasi (%)</TableHead>
                  <TableHead className="text-right border-b border-gray-200 dark:border-neutral-700">Realisasi Keuangan (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((row) => (
                  <TableRow key={row.bulan} className="hover:bg-muted/30 border-b border-gray-200 dark:border-neutral-700">
                    <TableCell className="font-semibold text-xs text-muted-foreground border-r border-b border-gray-200 dark:border-neutral-700">
                      B{String(row.bulan).padStart(2, "0")} ({row.namaBulan})
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs border-r border-b border-gray-200 dark:border-neutral-700">
                      {isKeuangan ? "—" : `${row.targetFisik.toFixed(2)}%`}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium border-r border-b border-gray-200 dark:border-neutral-700">
                      {isKeuangan ? "—" : row.realisasiFisik > 0 ? `${row.realisasiFisik.toFixed(2)}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs border-r border-b border-gray-200 dark:border-neutral-700">
                      {isKeuangan ? "Tidak berlaku" : row.realisasiFisik > 0 ? (
                        <span
                          className={`font-semibold ${
                            row.deviasi < -10
                              ? "text-red-600 dark:text-red-400"
                              : row.deviasi < -5
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {row.deviasi > 0 ? `+${row.deviasi.toFixed(2)}%` : `${row.deviasi.toFixed(2)}%`}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs border-b border-gray-200 dark:border-neutral-700">
                      {row.realisasiKeuangan > 0 ? formatRupiah(row.realisasiKeuangan) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
