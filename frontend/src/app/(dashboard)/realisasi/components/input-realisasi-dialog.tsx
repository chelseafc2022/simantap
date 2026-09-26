"use client"

import { useState, useEffect, useRef } from "react"
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
import {
  Loader2, Calendar, CheckCircle2, AlertTriangle, AlertCircle,
  UserCheck, Save, Upload, X, Image, Send, Lock, RotateCcw,
  FileCheck, FileClock, FileX,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

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

interface BuktiFisikItem {
  id: string
  namaFile: string
  pathFile: string
  mimeType?: string
  ukuranBytes?: number
  deskripsi?: string
  uploadOleh?: { namaLengkap: string; nip?: string } | null
  createdAt?: string
}

interface MonthItemState {
  bulan: number
  targetFisik: number
  realisasiFisik: string
  realisasiKeuangan: string
  catatanOperator: string
  inputBy?: { namaLengkap: string; nip?: string } | null
  updatedAt?: string | null
  statusVerifikasi?: "DRAFT" | "DIAJUKAN" | "TERVERIFIKASI" | "DITOLAK"
  catatanVerifikasi?: string | null
  verifikasiOleh?: { namaLengkap: string } | null
  verifikasiAt?: string | null
  diajukanAt?: string | null
  buktiFisik?: BuktiFisikItem[]
}

// Format bytes
const formatBytes = (bytes?: number) => {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function InputRealisasiDialog({
  open, onOpenChange, paketId, activeBulan,
}: InputRealisasiDialogProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userRoles: string[] =
    user?.roles && user.roles.length > 0
      ? user.roles
      : user?.role
      ? [user.role]
      : []

  // Field-level permission flags (mendukung multi-role)
  const canEditFisik = userRoles.some((r) => ["ADMINISTRATOR", "ADMIN_PPK"].includes(r))
  const canEditKeuangan = userRoles.some((r) => ["ADMINISTRATOR", "BENDAHARA"].includes(r))
  const canAjukan = userRoles.some((r) => ["ADMINISTRATOR", "ADMIN_PPK", "BENDAHARA"].includes(r))
  const canUploadFoto = userRoles.some((r) => ["ADMINISTRATOR", "ADMIN_PPK"].includes(r))
  const canVerifikasi = userRoles.some((r) => ["ADMINISTRATOR", "MONEV"].includes(r))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedBulan, setSelectedBulan] = useState<number>(activeBulan || 1)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [deskripsiFile, setDeskripsiFile] = useState("")

  const [timelineState, setTimelineState] = useState<MonthItemState[]>(
    Array.from({ length: 12 }, (_, i) => ({
      bulan: i + 1,
      targetFisik: 0,
      realisasiFisik: "0",
      realisasiKeuangan: "0",
      catatanOperator: "",
      statusVerifikasi: "DRAFT" as const,
      buktiFisik: [],
    }))
  )

  // Fetch package details + 12 month realisasi
  const { data: detailData, isLoading } = useQuery({
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
    if (detailData?.timeline) {
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
          statusVerifikasi: t?.statusVerifikasi || "DRAFT",
          catatanVerifikasi: t?.catatanVerifikasi || null,
          verifikasiOleh: t?.verifikasiOleh || null,
          verifikasiAt: t?.verifikasiAt || null,
          diajukanAt: t?.diajukanAt || null,
          buktiFisik: t?.buktiFisik || [],
        }
      })
      setTimelineState(updated)
    }
    if (activeBulan >= 1 && activeBulan <= 12) setSelectedBulan(activeBulan)
  }, [detailData, activeBulan, open])

  const paket = detailData?.paket
  const nilaiKontrak = paket?.nilaiKontrak || 0

  const formatRupiah = (val: number | string | undefined | null) => {
    const num = typeof val === "string" ? parseFloat(val) : val || 0
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num)
  }

  const currentMonthData = timelineState[selectedBulan - 1] || {
    bulan: selectedBulan, targetFisik: 0, realisasiFisik: "0", realisasiKeuangan: "0",
    catatanOperator: "", statusVerifikasi: "DRAFT", buktiFisik: [],
  }

  const currentFisikNum = parseFloat(currentMonthData.realisasiFisik) || 0
  const currentTargetNum = currentMonthData.targetFisik || 0
  const currentDeviasiNum = parseFloat((currentFisikNum - currentTargetNum).toFixed(2))
  const currentKeuanganNum = parseFloat(currentMonthData.realisasiKeuangan) || 0
  const currentPersenKeuangan = nilaiKontrak > 0
    ? parseFloat(((currentKeuanganNum / nilaiKontrak) * 100).toFixed(2)) : 0
  const isLocked = currentMonthData.statusVerifikasi === "TERVERIFIKASI"
  const isDiajukan = currentMonthData.statusVerifikasi === "DIAJUKAN"
  const isDitolak = currentMonthData.statusVerifikasi === "DITOLAK"

  const getStatusBadge = (deviasi: number, target: number, realisasi: number) => {
    if (target === 0 && realisasi === 0) return (
      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Belum Mulai</Badge>
    )
    if (deviasi >= 0) return (
      <Badge className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />Aman ({deviasi > 0 ? `+${deviasi}` : deviasi}%)
      </Badge>
    )
    if (deviasi >= -10) return (
      <Badge className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />Perhatian ({deviasi}%)
      </Badge>
    )
    return (
      <Badge className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
        <AlertCircle className="h-3 w-3 mr-1" />Kontrak Kritis ({deviasi}%)
      </Badge>
    )
  }

  const getVerifikasiBadge = (status?: string) => {
    switch (status) {
      case "TERVERIFIKASI": return (
        <Badge className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          <FileCheck className="h-3 w-3 mr-1" />Terverifikasi MONEV
        </Badge>
      )
      case "DIAJUKAN": return (
        <Badge className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
          <FileClock className="h-3 w-3 mr-1" />Menunggu Verifikasi
        </Badge>
      )
      case "DITOLAK": return (
        <Badge className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
          <FileX className="h-3 w-3 mr-1" />Ditolak MONEV
        </Badge>
      )
      default: return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Draft
        </Badge>
      )
    }
  }

  // Handlers
  const handleFisikChange = (val: string) => {
    if (!canEditFisik || isLocked || isDiajukan) return
    const num = Math.min(100, Math.max(0, parseFloat(val) || 0))
    setTimelineState((prev) => {
      const next = [...prev]
      next[selectedBulan - 1] = { ...next[selectedBulan - 1], realisasiFisik: val === "" ? "" : String(num) }
      return next
    })
  }

  const handleKeuanganChange = (val: string) => {
    if (!canEditKeuangan || isLocked || isDiajukan) return
    const clean = val.replace(/\D/g, "")
    const num = Math.max(0, parseInt(clean) || 0)
    setTimelineState((prev) => {
      const next = [...prev]
      next[selectedBulan - 1] = { ...next[selectedBulan - 1], realisasiKeuangan: String(num) }
      return next
    })
  }

  const handleCatatanChange = (val: string) => {
    if (isLocked || isDiajukan) return
    setTimelineState((prev) => {
      const next = [...prev]
      next[selectedBulan - 1] = { ...next[selectedBulan - 1], catatanOperator: val }
      return next
    })
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!paketId) throw new Error("Paket ID tidak valid")
      const payload = {
        items: timelineState
          .filter((item) => {
            const existing = detailData?.timeline?.find((t: any) => t.bulan === item.bulan)
            const existingStatus = existing?.statusVerifikasi
            return existingStatus !== "TERVERIFIKASI"
          })
          .map((item) => ({
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

  // Ajukan mutation
  const ajukanMutation = useMutation({
    mutationFn: async () => {
      if (!paketId) throw new Error("Paket ID tidak valid")
      return apiClient.patch(`/pembangunan/${paketId}/realisasi/${selectedBulan}/ajukan`)
    },
    onSuccess: (res) => {
      toast.success(res.data?.data?.message || `Realisasi Bulan ${selectedBulan} berhasil diajukan ke MONEV`)
      queryClient.invalidateQueries({ queryKey: ["paket-realisasi-detail", paketId] })
      queryClient.invalidateQueries({ queryKey: ["rekap-realisasi"] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mengajukan realisasi")
    },
  })

  // ACC mutation (MONEV)
  const accMutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch(`/pembangunan/${paketId}/realisasi/${selectedBulan}/acc`, {
        catatanVerifikasi: "Terverifikasi sesuai kondisi lapangan",
      })
    },
    onSuccess: () => {
      toast.success(`Realisasi Bulan ${selectedBulan} berhasil di-ACC. Data terkunci.`)
      queryClient.invalidateQueries({ queryKey: ["paket-realisasi-detail", paketId] })
      queryClient.invalidateQueries({ queryKey: ["rekap-realisasi"] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal ACC realisasi"),
  })

  // Tolak mutation (MONEV)
  const [alasanTolak, setAlasanTolak] = useState("")
  const [showTolakInput, setShowTolakInput] = useState(false)
  const tolakMutation = useMutation({
    mutationFn: async () => {
      if (!alasanTolak.trim()) throw new Error("Alasan penolakan wajib diisi")
      return apiClient.patch(`/pembangunan/${paketId}/realisasi/${selectedBulan}/tolak`, {
        catatanVerifikasi: alasanTolak.trim(),
      })
    },
    onSuccess: () => {
      toast.success(`Realisasi Bulan ${selectedBulan} ditolak dan dikembalikan ke PPK`)
      setAlasanTolak("")
      setShowTolakInput(false)
      queryClient.invalidateQueries({ queryKey: ["paket-realisasi-detail", paketId] })
      queryClient.invalidateQueries({ queryKey: ["rekap-realisasi"] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menolak realisasi"),
  })

  // Upload bukti fisik mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!paketId || pendingFiles.length === 0) throw new Error("Tidak ada file")
      const formData = new FormData()
      pendingFiles.forEach((f) => formData.append("files", f))
      if (deskripsiFile) formData.append("deskripsi", deskripsiFile)
      return apiClient.post(`/pembangunan/${paketId}/realisasi/${selectedBulan}/bukti`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    },
    onSuccess: (res) => {
      toast.success(res.data?.data?.message || "Foto bukti fisik berhasil diupload")
      setPendingFiles([])
      setDeskripsiFile("")
      queryClient.invalidateQueries({ queryKey: ["paket-realisasi-detail", paketId] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal upload foto"),
  })

  // Delete bukti fisik
  const deleteBuktiMutation = useMutation({
    mutationFn: async (buktiFisikId: string) => {
      return apiClient.delete(`/pembangunan/bukti/${buktiFisikId}`)
    },
    onSuccess: () => {
      toast.success("Bukti fisik berhasil dihapus")
      queryClient.invalidateQueries({ queryKey: ["paket-realisasi-detail", paketId] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus bukti"),
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const existingCount = currentMonthData.buktiFisik?.length || 0
    const total = existingCount + pendingFiles.length + files.length
    if (total > 5) {
      toast.error(`Batas maksimal 5 foto. Saat ini sudah ada ${existingCount} foto.`)
      return
    }
    setPendingFiles((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const buktiFisikList = currentMonthData.buktiFisik || []
  const totalBukti = buktiFisikList.length + pendingFiles.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border/80">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-card via-card to-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">TA {paket?.tahunAnggaran || 2026}</Badge>
                {paket?.opd && (
                  <Badge variant="secondary" className="text-xs">{paket.opd.singkatan || paket.opd.namaOpd}</Badge>
                )}
                {paket?.subUnit && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">{paket.subUnit.namaSubUnit}</Badge>
                )}
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-foreground">
                {paket?.namaPaket || "Memuat paket..."}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5 text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>Nilai Kontrak:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(nilaiKontrak)}</span>
                <span>• Rekanan: {paket?.pemenangRekanan || "-"}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              {getStatusBadge(currentDeviasiNum, currentTargetNum, currentFisikNum)}
              {getVerifikasiBadge(currentMonthData.statusVerifikasi)}
              {isLocked && <Lock className="h-4 w-4 text-amber-500" />}
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
              const sv = item?.statusVerifikasi
              const dotColor = sv === "TERVERIFIKASI" ? "bg-emerald-500" : sv === "DIAJUKAN" ? "bg-blue-500" : sv === "DITOLAK" ? "bg-red-500" : "bg-muted-foreground/50"
              return (
                <button
                  key={b.no}
                  type="button"
                  onClick={() => { setSelectedBulan(b.no); setShowTolakInput(false) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border"
                  }`}
                >
                  <span>{b.singkatan}</span>
                  <span className="text-[11px] opacity-80">({b.nama.slice(0, 3)})</span>
                  {hasData && <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : dotColor}`} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="text-xs text-muted-foreground">Memuat data realisasi bulanan...</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Status lock / ditolak alert */}
              {isLocked && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 flex items-start gap-2.5">
                  <FileCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">Data Bulan ini Sudah Terverifikasi & Terkunci</p>
                    <p className="text-emerald-600/80 dark:text-emerald-500 mt-0.5">
                      Diverifikasi oleh {currentMonthData.verifikasiOleh?.namaLengkap || "MONEV"}.
                      {currentMonthData.catatanVerifikasi && ` Catatan: ${currentMonthData.catatanVerifikasi}`}
                    </p>
                  </div>
                </div>
              )}
              {isDiajukan && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 flex items-start gap-2.5">
                  <FileClock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-blue-700 dark:text-blue-400">Menunggu Verifikasi MONEV</p>
                    <p className="text-blue-600/80 dark:text-blue-500 mt-0.5">Data sudah diajukan ke tim MONEV. Tidak dapat diubah sampai diverifikasi.</p>
                  </div>
                </div>
              )}
              {isDitolak && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 flex items-start gap-2.5">
                  <FileX className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-red-700 dark:text-red-400">Data Ditolak oleh MONEV — Harap Diperbaiki</p>
                    {currentMonthData.catatanVerifikasi && (
                      <p className="text-red-600/80 dark:text-red-500 mt-0.5">Alasan: <span className="font-medium">{currentMonthData.catatanVerifikasi}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* Periode & Input Form */}
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
                  {/* Realisasi Fisik */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>
                        Realisasi Fisik (%) <span className="text-red-500">*</span>
                        {!canEditFisik && <span className="ml-1 text-amber-500 font-normal">(Hak PPK)</span>}
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground">Maks 100%</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder={canEditFisik ? "Contoh: 35.50" : "Hanya PPK yang dapat mengisi"}
                        value={currentMonthData.realisasiFisik}
                        onChange={(e) => handleFisikChange(e.target.value)}
                        disabled={!canEditFisik || isLocked || isDiajukan}
                        className={`font-mono text-sm pr-8 ${(!canEditFisik || isLocked || isDiajukan) ? "opacity-60 cursor-not-allowed bg-muted/50" : ""}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">%</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>Deviasi:</span>
                      <span className={`font-mono font-semibold ${currentDeviasiNum >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {currentDeviasiNum > 0 ? `+${currentDeviasiNum}` : currentDeviasiNum}%
                      </span>
                    </div>
                  </div>

                  {/* Realisasi Keuangan */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>
                        Realisasi Keuangan (Rp)
                        {!canEditKeuangan && <span className="ml-1 text-amber-500 font-normal">(Hak Bendahara)</span>}
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground">SP2D/Kas</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder={canEditKeuangan ? "Contoh: 150000000" : "Hanya Bendahara yang dapat mengisi"}
                        value={currentKeuanganNum > 0 ? currentKeuanganNum.toLocaleString("id-ID") : ""}
                        onChange={(e) => handleKeuanganChange(e.target.value)}
                        disabled={!canEditKeuangan || isLocked || isDiajukan}
                        className={`font-mono text-sm ${(!canEditKeuangan || isLocked || isDiajukan) ? "opacity-60 cursor-not-allowed bg-muted/50" : ""}`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>Serapan Kontrak:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{currentPersenKeuangan}%</span>
                    </div>
                  </div>

                  {/* Status Kinerja */}
                  <div className="sm:col-span-2 lg:col-span-1 rounded-lg border bg-muted/40 p-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Status Kinerja</div>
                      <div className="pt-1 space-y-1">
                        {getStatusBadge(currentDeviasiNum, currentTargetNum, currentFisikNum)}
                        <div className="pt-1">{getVerifikasiBadge(currentMonthData.statusVerifikasi)}</div>
                      </div>
                    </div>
                    {currentMonthData.updatedAt && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-2 border-t mt-2">
                        <UserCheck className="h-3 w-3" />
                        <span>Diinput: {currentMonthData.inputBy?.namaLengkap || "Operator"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Catatan Kendala */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-medium">Catatan Kendala Lapangan & Tindak Lanjut</Label>
                  <Textarea
                    placeholder={isLocked || isDiajukan ? "Data terkunci" : "Tuliskan kendala teknis, cuaca, keterlambatan material, atau solusi (opsional)..."}
                    value={currentMonthData.catatanOperator}
                    onChange={(e) => handleCatatanChange(e.target.value)}
                    disabled={isLocked || isDiajukan}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Upload Bukti Fisik (hanya PPK dan ADMINISTRATOR) */}
              {canUploadFoto && (
                <div className="rounded-xl border bg-card/60 p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold text-sm">Bukti Fisik Lapangan</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{totalBukti}/5 foto</span>
                  </div>

                  {/* Foto yang sudah disimpan */}
                  {buktiFisikList.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {buktiFisikList.map((b) => (
                        <div key={b.id} className="relative group rounded-lg border bg-muted/30 overflow-hidden aspect-square flex flex-col items-center justify-center p-2">
                          {b.mimeType?.startsWith("image/") ? (
                            <img
                              src={`http://localhost:4000${b.pathFile}`}
                              alt={b.deskripsi || b.namaFile}
                              className="w-full h-full object-cover rounded-md"
                              onError={(e) => { (e.target as HTMLImageElement).src = "" }}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-center">
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground truncate w-full">{b.namaFile}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                            <p className="text-white text-[9px] text-center leading-tight line-clamp-2">{b.deskripsi || b.namaFile}</p>
                            <p className="text-white/70 text-[9px]">{formatBytes(b.ukuranBytes)}</p>
                            {!isLocked && !isDiajukan && (
                              <button
                                onClick={() => deleteBuktiMutation.mutate(b.id)}
                                className="mt-1 bg-red-500 hover:bg-red-600 text-white rounded px-2 py-0.5 text-[9px] flex items-center gap-1"
                              >
                                <X className="h-2.5 w-2.5" />Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview pending files */}
                  {pendingFiles.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Siap diupload:</p>
                      <div className="flex flex-wrap gap-2">
                        {pendingFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            <button onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}>
                              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload controls */}
                  {!isLocked && !isDiajukan && totalBukti < 5 && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          type="text"
                          placeholder="Deskripsi foto (opsional)..."
                          value={deskripsiFile}
                          onChange={(e) => setDeskripsiFile(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/mp4,application/pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Pilih Foto
                      </Button>
                      {pendingFiles.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                          onClick={() => uploadMutation.mutate()}
                          disabled={uploadMutation.isPending}
                        >
                          {uploadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          Upload ({pendingFiles.length})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Panel Verifikasi MONEV */}
              {canVerifikasi && isDiajukan && (
                <div className="rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">Panel Verifikasi MONEV</span>
                  </div>
                  {!showTolakInput ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
                        onClick={() => accMutation.mutate()}
                        disabled={accMutation.isPending}
                      >
                        {accMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        ACC — Setujui & Kunci Data
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5 text-xs"
                        onClick={() => setShowTolakInput(true)}
                      >
                        <FileX className="h-3.5 w-3.5" />
                        TOLAK — Kembalikan ke PPK
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Tuliskan alasan penolakan (wajib diisi)..."
                        value={alasanTolak}
                        onChange={(e) => setAlasanTolak(e.target.value)}
                        rows={2}
                        className="text-xs border-red-300"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs"
                          onClick={() => tolakMutation.mutate()}
                          disabled={tolakMutation.isPending || !alasanTolak.trim()}
                        >
                          {tolakMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileX className="h-3.5 w-3.5" />}
                          Konfirmasi Tolak
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setShowTolakInput(false)}>
                          Batal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tabel Ringkasan 12 Bulan */}
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
                        <th className="py-2 px-3 text-center font-medium">Verifikasi</th>
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
                            onClick={() => { setSelectedBulan(row.bulan); setShowTolakInput(false) }}
                            className={`border-b transition-colors cursor-pointer hover:bg-muted/50 ${isRowActive ? "bg-primary/5 font-semibold" : ""}`}
                          >
                            <td className="py-2 px-3 text-center font-mono">{BULAN_LIST[row.bulan - 1]?.singkatan}</td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">{row.targetFisik}%</td>
                            <td className="py-2 px-3 text-right font-mono font-medium">{rFisik > 0 ? `${rFisik}%` : "-"}</td>
                            <td className={`py-2 px-3 text-right font-mono ${rFisik === 0 && row.targetFisik === 0 ? "text-muted-foreground" : dev >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}`}>
                              {rFisik === 0 && row.targetFisik === 0 ? "-" : `${dev > 0 ? `+${dev}` : dev}%`}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">{rKeu > 0 ? formatRupiah(rKeu) : "-"}</td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">{pSerap > 0 ? `${pSerap}%` : "-"}</td>
                            <td className="py-2 px-3 text-center">
                              {row.statusVerifikasi === "TERVERIFIKASI" ? (
                                <span className="text-[10px] text-emerald-600 font-medium">✓ ACC</span>
                              ) : row.statusVerifikasi === "DIAJUKAN" ? (
                                <span className="text-[10px] text-blue-600 font-medium">⏳</span>
                              ) : row.statusVerifikasi === "DITOLAK" ? (
                                <span className="text-[10px] text-red-600 font-medium">✗ Tolak</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">-</span>
                              )}
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

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
            Tutup
          </Button>

          <div className="flex items-center gap-2">
            {/* Tombol Ajukan ke MONEV */}
            {canAjukan && !isLocked && !isDiajukan && (currentFisikNum > 0 || currentKeuanganNum > 0) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50 gap-1.5 text-xs"
                onClick={() => ajukanMutation.mutate()}
                disabled={ajukanMutation.isPending}
              >
                {ajukanMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Ajukan ke MONEV
              </Button>
            )}

            {/* Tombol Simpan */}
            {(canEditFisik || canEditKeuangan) && !isLocked && !isDiajukan && (
              <Button
                type="button"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Realisasi
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
