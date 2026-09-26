"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Calendar,
  Building2,
  TrendingUp,
  Coins,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  UserCheck,
  Save,
} from "lucide-react"
import { toast } from "sonner"

export const BULAN_LIST = [
  { no: 1, nama: "Januari", singkatan: "B01" },
  { no: 2, nama: "Februari", singkatan: "B02" },
  { no: 3, nama: "Maret", singkatan: "B03" },
  { no: 4, nama: "April", singkatan: "B04" },
  { no: 5, nama: "Mei", singkatan: "B05" },
  { no: 6, nama: "Juni", singkatan: "B06" },
  { no: 7, nama: "Juli", singkatan: "B07" },
  { no: 8, nama: "Agustus", singkatan: "B08" },
  { no: 9, nama: "September", singkatan: "B09" },
  { no: 10, nama: "Oktober", singkatan: "B10" },
  { no: 11, nama: "November", singkatan: "B11" },
  { no: 12, nama: "Desember", singkatan: "B12" },
]

interface InputRealisasiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paketId: string | null
  activeBulan: number
}

interface MonthItemState {
  bulan: number
  targetFisik: number
  realisasiFisik: string
  realisasiKeuangan: string
  catatanOperator: string
  inputBy?: {
    namaLengkap: string
    nip?: string
  } | null
  updatedAt?: string | null
}

export function InputRealisasiDialog({
  open,
  onOpenChange,
  paketId,
  activeBulan,
}: InputRealisasiDialogProps) {
  const queryClient = useQueryClient()
  const [selectedBulan, setSelectedBulan] = useState<number>(activeBulan || 1)

  // 12 months local state
  const [timelineState, setTimelineState] = useState<MonthItemState[]>(
    Array.from({ length: 12 }, (_, i) => ({
      bulan: i + 1,
      targetFisik: 0,
      realisasiFisik: "0",
      realisasiKeuangan: "0",
      catatanOperator: "",
    }))
  )

  // Fetch package details + 12 month realisasi
  const { data: detailData, isLoading, isFetching } = useQuery({
    queryKey: ["paket-realisasi-detail", paketId],
    queryFn: async () => {
      if (!paketId) return null
      const res = await apiClient.get(`/pembangunan/${paketId}/realisasi`)
      return res.data?.data || null
    },
    enabled: !!paketId && open,
  })

  // Sync server data to local form state
  useEffect(() => {
    if (detailData && detailData.timeline) {
      const updated = Array.from({ length: 12 }, (_, idx) => {
        const b = idx + 1
        const t = detailData.timeline.find((item: any) => item.bulan === b)
        return {
          bulan: b,
          targetFisik: t?.targetFisik ?? 0,
          realisasiFisik: t?.realisasiFisik !== undefined ? String(t.realisasiFisik) : "0",
          realisasiKeuangan: t?.realisasiKeuangan !== undefined ? String(t.realisasiKeuangan) : "0",
          catatanOperator: t?.catatanOperator || "",
          inputBy: t?.inputBy || null,
          updatedAt: t?.updatedAt || null,
        }
      })
      setTimelineState(updated)
    }
    if (activeBulan >= 1 && activeBulan <= 12) {
      setSelectedBulan(activeBulan)
    }
  }, [detailData, activeBulan, open])

  const paket = detailData?.paket
  const nilaiKontrak = paket?.nilaiKontrak || 0

  const formatRupiah = (val: number | string | undefined | null) => {
    const num = typeof val === "string" ? parseFloat(val) : val || 0
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  // Active month object
  const currentMonthData = timelineState[selectedBulan - 1] || {
    bulan: selectedBulan,
    targetFisik: 0,
    realisasiFisik: "0",
    realisasiKeuangan: "0",
    catatanOperator: "",
  }

  const currentFisikNum = parseFloat(currentMonthData.realisasiFisik) || 0
  const currentTargetNum = currentMonthData.targetFisik || 0
  const currentDeviasiNum = parseFloat((currentFisikNum - currentTargetNum).toFixed(2))
  const currentKeuanganNum = parseFloat(currentMonthData.realisasiKeuangan) || 0
  const currentPersenKeuangan = nilaiKontrak > 0
    ? parseFloat(((currentKeuanganNum / nilaiKontrak) * 100).toFixed(2))
    : 0

  const getStatusBadge = (deviasi: number, target: number, realisasi: number) => {
    if (target === 0 && realisasi === 0) {
      return (
        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
          Belum Mulai
        </Badge>
      )
    }
    if (deviasi >= 0) {
      return (
        <Badge className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Aman ({deviasi > 0 ? `+${deviasi}` : deviasi}%)
        </Badge>
      )
    }
    if (deviasi >= -10) {
      return (
        <Badge className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Perhatian ({deviasi}%)
        </Badge>
      )
    }
    return (
      <Badge className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 font-medium">
        <AlertCircle className="h-3 w-3 mr-1" />
        Kontrak Kritis ({deviasi}%)
      </Badge>
    )
  }

  // Handlers
  const handleFisikChange = (val: string) => {
    const num = Math.min(100, Math.max(0, parseFloat(val) || 0))
    setTimelineState((prev) => {
      const next = [...prev]
      next[selectedBulan - 1] = {
        ...next[selectedBulan - 1],
        realisasiFisik: val === "" ? "" : String(num),
      }
      return next
    })
  }

  const handleKeuanganChange = (val: string) => {
    const clean = val.replace(/\D/g, "")
    const num = Math.max(0, parseInt(clean) || 0)
    setTimelineState((prev) => {
      const next = [...prev]
      next[selectedBulan - 1] = {
        ...next[selectedBulan - 1],
        realisasiKeuangan: String(num),
      }
      return next
    })
  }

  const handleCatatanChange = (val: string) => {
    setTimelineState((prev) => {
      const next = [...prev]
      next[selectedBulan - 1] = {
        ...next[selectedBulan - 1],
        catatanOperator: val,
      }
      return next
    })
  }

  // Save mutation (Bulk update all 12 months)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!paketId) throw new Error("Paket ID tidak valid")
      const payload = {
        items: timelineState.map((item) => ({
          bulan: item.bulan,
          realisasiFisik: parseFloat(item.realisasiFisik) || 0,
          realisasiKeuangan: parseFloat(item.realisasiKeuangan) || 0,
          catatanOperator: item.catatanOperator.trim() || undefined,
        })),
      }
      return apiClient.put(`/pembangunan/${paketId}/realisasi/bulk`, payload)
    },
    onSuccess: () => {
      toast.success("Data realisasi fisik & keuangan bulanan berhasil disimpan")
      queryClient.invalidateQueries({ queryKey: ["rekap-realisasi"] })
      queryClient.invalidateQueries({ queryKey: ["paket-realisasi-detail", paketId] })
      queryClient.invalidateQueries({ queryKey: ["paket-pembangunan"] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Gagal menyimpan realisasi"
      toast.error(msg)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border/80">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-card via-card to-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  TA {paket?.tahunAnggaran || 2026}
                </Badge>
                {paket?.opd && (
                  <Badge variant="secondary" className="text-xs">
                    {paket.opd.singkatan || paket.opd.namaOpd}
                  </Badge>
                )}
                {paket?.subUnit && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {paket.subUnit.namaSubUnit}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-foreground">
                {paket?.namaPaket || "Memuat paket..."}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5 text-muted-foreground flex items-center gap-2">
                <span>Nilai Kontrak:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(nilaiKontrak)}
                </span>
                <span>• Rekanan: {paket?.pemenangRekanan || "-"}</span>
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {getStatusBadge(currentDeviasiNum, currentTargetNum, currentFisikNum)}
            </div>
          </div>
        </DialogHeader>

        {/* Month Selector Tabs */}
        <div className="px-6 py-2.5 border-b bg-muted/20 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {BULAN_LIST.map((b) => {
              const item = timelineState[b.no - 1]
              const hasData = parseFloat(item?.realisasiFisik || "0") > 0 || parseFloat(item?.realisasiKeuangan || "0") > 0
              const isActive = selectedBulan === b.no
              return (
                <button
                  key={b.no}
                  type="button"
                  onClick={() => setSelectedBulan(b.no)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border"
                  }`}
                >
                  <span>{b.singkatan}</span>
                  <span className="text-[11px] opacity-80">({b.nama.slice(0, 3)})</span>
                  {hasData && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : "bg-emerald-500"}`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="text-xs text-muted-foreground">Memuat data realisasi bulanan...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Box Info Bulan Terpilih */}
              <div className="rounded-xl border bg-card/60 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-sm">
                      Periode {BULAN_LIST[selectedBulan - 1]?.nama} (Bulan ke-{selectedBulan})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Target Rencana Fisik: <span className="font-mono font-bold text-foreground">{currentTargetNum}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Input Realisasi Fisik */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Realisasi Fisik Kumulatif (%) <span className="text-red-500">*</span></span>
                      <span className="text-[11px] font-normal text-muted-foreground">Maks 100%</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="Contoh: 35.50"
                        value={currentMonthData.realisasiFisik}
                        onChange={(e) => handleFisikChange(e.target.value)}
                        className="font-mono text-sm pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                        %
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>Deviasi:</span>
                      <span className={`font-mono font-semibold ${
                        currentDeviasiNum >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {currentDeviasiNum > 0 ? `+${currentDeviasiNum}` : currentDeviasiNum}%
                      </span>
                    </div>
                  </div>

                  {/* Input Realisasi Keuangan */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Realisasi Keuangan (SP2D/Kas Rp)</span>
                      <span className="text-[11px] font-normal text-muted-foreground">Rupiah</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Contoh: 150000000"
                        value={currentKeuanganNum > 0 ? currentKeuanganNum.toLocaleString("id-ID") : ""}
                        onChange={(e) => handleKeuanganChange(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>Serapan Kontrak:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {currentPersenKeuangan}%
                      </span>
                    </div>
                  </div>

                  {/* Perbandingan Target vs Realisasi Card */}
                  <div className="sm:col-span-2 lg:col-span-1 rounded-lg border bg-muted/40 p-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Status Kinerja Periode Ini
                      </div>
                      <div className="pt-1">
                        {getStatusBadge(currentDeviasiNum, currentTargetNum, currentFisikNum)}
                      </div>
                    </div>
                    {currentMonthData.updatedAt && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-2 border-t mt-2">
                        <UserCheck className="h-3 w-3" />
                        <span>Diperbarui oleh: {currentMonthData.inputBy?.namaLengkap || "Operator"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Catatan Operator */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-medium">
                    Catatan Kendala Lapangan & Tindak Lanjut
                  </Label>
                  <Textarea
                    placeholder="Tuliskan kendala teknis cuaca, keterlambatan material, atau solusi lapangan (opsional)..."
                    value={currentMonthData.catatanOperator}
                    onChange={(e) => handleCatatanChange(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Tabel Ringkasan 12 Bulan (Timeline Preview) */}
              <div className="rounded-xl border overflow-hidden shadow-xs">
                <div className="p-3 bg-muted/60 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold">Ringkasan Kurva 12 Bulan (Januari – Desember)</span>
                  <span className="text-[11px] text-muted-foreground">Klik baris bulan untuk beralih input</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b text-muted-foreground text-[11px]">
                        <th className="py-2 px-3 text-center w-12 font-medium">Bulan</th>
                        <th className="py-2 px-3 text-right font-medium">Target Fisik</th>
                        <th className="py-2 px-3 text-right font-medium">Realisasi Fisik</th>
                        <th className="py-2 px-3 text-right font-medium">Deviasi</th>
                        <th className="py-2 px-3 text-right font-medium">Realisasi Keuangan (Rp)</th>
                        <th className="py-2 px-3 text-right font-medium">% Serap</th>
                        <th className="py-2 px-3 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timelineState.map((row) => {
                        const rFisik = parseFloat(row.realisasiFisik) || 0
                        const dev = parseFloat((rFisik - row.targetFisik).toFixed(2))
                        const rKeu = parseFloat(row.realisasiKeuangan) || 0
                        const pSerap = nilaiKontrak > 0 ? parseFloat(((rKeu / nilaiKontrak) * 100).toFixed(2)) : 0
                        const isRowActive = row.bulan === selectedBulan

                        return (
                          <tr
                            key={row.bulan}
                            onClick={() => setSelectedBulan(row.bulan)}
                            className={`border-b transition-colors cursor-pointer hover:bg-muted/50 ${
                              isRowActive ? "bg-primary/5 font-semibold" : ""
                            }`}
                          >
                            <td className="py-2 px-3 text-center font-mono">
                              {BULAN_LIST[row.bulan - 1]?.singkatan}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              {row.targetFisik}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium">
                              {rFisik > 0 ? `${rFisik}%` : "-"}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${
                              rFisik === 0 && row.targetFisik === 0
                                ? "text-muted-foreground"
                                : dev >= 0
                                ? "text-emerald-600 font-medium"
                                : "text-red-600 font-medium"
                            }`}>
                              {rFisik === 0 && row.targetFisik === 0 ? "-" : `${dev > 0 ? `+${dev}` : dev}%`}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {rKeu > 0 ? formatRupiah(rKeu) : "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              {pSerap > 0 ? `${pSerap}%` : "-"}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {getStatusBadge(dev, row.targetFisik, rFisik)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Tutup
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Realisasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
