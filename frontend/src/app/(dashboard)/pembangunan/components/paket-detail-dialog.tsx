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
import { Building2, Calendar, FileText, MapPin, User, CheckCircle2, AlertTriangle } from "lucide-react"
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
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {paket.namaPaket}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 mt-1">
                <Building2 className="h-3.5 w-3.5" />
                {paket.opd?.namaOpd || "OPD Pemkab Konawe Selatan"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Pagu Anggaran</span>
            <div className="font-semibold text-foreground">{formatRupiah(paguNum)}</div>
            <span className="text-xs text-muted-foreground">{paket.sumberDana || "Sumber Dana: -"}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Nilai Kontrak / SPK</span>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatRupiah(kontrakNum)}
            </div>
            <span className="text-xs text-muted-foreground">
              Hemat: {formatRupiah(efisiensiRp)} ({efisiensiPersen}%)
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

        {/* 12 Months Target vs Realisasi Progress */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Matriks Target Fisik Kumulatif & Realisasi (12 Bulan)
            </h4>
            <span className="text-xs text-muted-foreground">
              Deviasi = Realisasi Fisik - Target Fisik
            </span>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">Bulan</TableHead>
                  <TableHead className="text-right">Target Fisik (%)</TableHead>
                  <TableHead className="text-right">Realisasi Fisik (%)</TableHead>
                  <TableHead className="text-right">Deviasi (%)</TableHead>
                  <TableHead className="text-right">Realisasi Keuangan (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((row) => (
                  <TableRow key={row.bulan} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-xs text-muted-foreground">
                      B{String(row.bulan).padStart(2, "0")} ({row.namaBulan})
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {row.targetFisik.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium">
                      {row.realisasiFisik > 0 ? `${row.realisasiFisik.toFixed(2)}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {row.realisasiFisik > 0 ? (
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
                    <TableCell className="text-right font-mono text-xs">
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
