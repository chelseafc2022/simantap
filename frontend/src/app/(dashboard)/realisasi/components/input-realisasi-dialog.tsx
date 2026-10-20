"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle, AlertTriangle, CalendarDays, CheckCircle2, FileCheck,
  FileClock, FileX, Image as ImageIcon, Loader2, Save, Send,
  TrendingUp, Upload, X,
} from "lucide-react"
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts"
import { toast } from "sonner"

import { apiClient } from "@/lib/api-client"
import { formatContractDate } from "@/lib/contract-weeks"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

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
}

interface WeeklyItem {
  id: string
  bulan: number
  mingguKe: number
  tanggalMulai: string
  tanggalSelesai: string
  uraianKegiatan: string
  targetFisik: number
  realisasiFisik: string
  realisasiKeuangan: string
  catatanOperator: string
  statusVerifikasi: "DRAFT" | "DIAJUKAN" | "TERVERIFIKASI" | "DITOLAK"
  catatanVerifikasi?: string | null
  buktiFisik: BuktiFisikItem[]
}

type ServerWeeklyItem = Omit<WeeklyItem, "realisasiFisik" | "realisasiKeuangan"> & {
  realisasiFisik: number
  realisasiKeuangan: number
}

interface LockingPeriodItem {
  bulan: number
  isEffectiveLocked?: boolean
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const value = error as {
    message?: string
    response?: { data?: { message?: string } }
  }
  return value.response?.data?.message || value.message || fallback
}

const API_STORAGE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1")
  .replace(/\/api\/v1\/?$/, "")

const formatRupiah = (value: number | string | undefined) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const formatBytes = (bytes?: number) => {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const getContractDuration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return null
  }
  return Math.floor((endTime - startTime) / 86_400_000) + 1
}

export function InputRealisasiDialog({
  open, onOpenChange, paketId, activeBulan,
}: InputRealisasiDialogProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const roles: string[] = user?.roles?.length ? user.roles : user?.role ? [user.role] : []
  const isAdmin = roles.includes("ADMINISTRATOR")
  const canEditFisik = roles.some((role) => ["ADMINISTRATOR", "ADMIN_PPK"].includes(role))
  const canEditKeuangan = roles.some((role) => ["ADMINISTRATOR", "BENDAHARA"].includes(role))
  const canUploadFoto = roles.some((role) => ["ADMINISTRATOR", "ADMIN_PPK"].includes(role))
  const canAjukan = roles.some((role) => ["ADMINISTRATOR", "ADMIN_PPK", "BENDAHARA"].includes(role))
  const canVerifikasi = roles.some((role) => ["ADMINISTRATOR", "MONEV"].includes(role))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [weeklyState, setWeeklyState] = useState<WeeklyItem[]>([])
  const [selectedBulan, setSelectedBulan] = useState(activeBulan)
  const [selectedMinggu, setSelectedMinggu] = useState(1)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [deskripsiFile, setDeskripsiFile] = useState("")
  const [showTolakInput, setShowTolakInput] = useState(false)
  const [alasanTolak, setAlasanTolak] = useState("")

  const { data: detailData, isLoading } = useQuery({
    queryKey: ["paket-realisasi-detail", paketId],
    queryFn: async () => {
      if (!paketId) return null
      const response = await apiClient.get(`/pembangunan/${paketId}/realisasi`)
      return response.data?.data || null
    },
    enabled: open && !!paketId,
  })

  const { data: lockingPeriods = [] } = useQuery<LockingPeriodItem[]>({
    queryKey: ["locking-periods", detailData?.paket?.tahunAnggaran || 2026],
    queryFn: async () => {
      const response = await apiClient.get("/pembangunan/periode", {
        params: { tahun: detailData?.paket?.tahunAnggaran || 2026 },
      })
      return response.data?.data || []
    },
    enabled: open,
  })

  useEffect(() => {
    const rows: ServerWeeklyItem[] = detailData?.weeklyTimeline || []
    // Data formulir lokal perlu disegarkan saat paket/dialog yang dipilih berubah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeeklyState(rows.map((item) => ({
      ...item,
      realisasiFisik: String(item.realisasiFisik || 0),
      realisasiKeuangan: String(item.realisasiKeuangan || 0),
      catatanOperator: item.catatanOperator || "",
      buktiFisik: item.buktiFisik || [],
    })))

    const months: number[] = detailData?.availableMonths || []
    if (months.length > 0) {
      const preferred = months.includes(activeBulan)
        ? activeBulan
        : months.find((month) => month >= activeBulan) || months.at(-1) || months[0]
      setSelectedBulan(preferred)
      setSelectedMinggu(rows.find((item) => item.bulan === preferred)?.mingguKe || 1)
    }
  }, [detailData, activeBulan, open])

  const availableMonths = useMemo(
    () => Array.from(new Set(weeklyState.map((item) => item.bulan))).sort((a, b) => a - b),
    [weeklyState]
  )
  const visibleWeeks = weeklyState.filter((item) => item.bulan === selectedBulan)
  const current = weeklyState.find(
    (item) => item.bulan === selectedBulan && item.mingguKe === selectedMinggu
  )
  const paket = detailData?.paket
  const nilaiKontrak = Number(paket?.nilaiKontrak || 0)
  const durasiPelaksanaan = getContractDuration(
    paket?.tanggalMulai,
    paket?.tanggalSelesai
  )
  const currentFisik = Number(current?.realisasiFisik || 0)
  const currentTarget = Number(current?.targetFisik || 0)
  const currentKeuangan = Number(current?.realisasiKeuangan || 0)
  const currentDeviasi = Number((currentFisik - currentTarget).toFixed(2))
  const currentSerapan = nilaiKontrak > 0
    ? Number(((currentKeuangan / nilaiKontrak) * 100).toFixed(2)) : 0
  const monthStatus = current?.statusVerifikasi || "DRAFT"
  const isLocked = monthStatus === "TERVERIFIKASI"
  const isDiajukan = monthStatus === "DIAJUKAN"
  const lockPeriod = lockingPeriods.find((item) => item.bulan === selectedBulan)
  const isPeriodLocked = !isAdmin && !!lockPeriod?.isEffectiveLocked
  const isFormDisabled = isLocked || isDiajukan || isPeriodLocked

  const updateCurrent = (changes: Partial<WeeklyItem>) => {
    setWeeklyState((rows) => rows.map((item) =>
      item.bulan === selectedBulan && item.mingguKe === selectedMinggu
        ? { ...item, ...changes } : item
    ))
  }

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: ["paket-realisasi-detail", paketId] })
    queryClient.invalidateQueries({ queryKey: ["rekap-realisasi"] })
    queryClient.invalidateQueries({ queryKey: ["paket-pembangunan"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard-paket"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard-rekap-opd"] })
    queryClient.invalidateQueries({ queryKey: ["laporan-rfk"] })
    queryClient.invalidateQueries({ queryKey: ["laporan-matriks-12"] })
    queryClient.invalidateQueries({ queryKey: ["laporan-rekap-opd"] })
  }

  const uploadFiles = async () => {
    if (!paketId || !current || pendingFiles.length === 0) return
    const formData = new FormData()
    pendingFiles.forEach((file) => formData.append("files", file))
    if (deskripsiFile.trim()) formData.append("deskripsi", deskripsiFile.trim())
    await apiClient.post(
      `/pembangunan/${paketId}/realisasi/${current.bulan}/${current.mingguKe}/bukti`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
    setPendingFiles([])
    setDeskripsiFile("")
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!paketId || !current) throw new Error("Periode minggu tidak valid")
      if (currentFisik > 0 && current.buktiFisik.length === 0 && pendingFiles.length === 0) {
        throw new Error("Realisasi fisik wajib disertai minimal satu foto bukti pada minggu ini")
      }
      if (pendingFiles.length > 0) await uploadFiles()
      return apiClient.put(`/pembangunan/${paketId}/realisasi-mingguan`, {
        bulan: current.bulan,
        mingguKe: current.mingguKe,
        ...(canEditFisik ? { uraianKegiatan: current.uraianKegiatan } : {}),
        realisasiFisik: currentFisik,
        realisasiKeuangan: currentKeuangan,
        catatanOperator: current.catatanOperator.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success(`Realisasi B${String(selectedBulan).padStart(2, "0")} Minggu ${selectedMinggu} berhasil disimpan`)
      invalidateData()
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal menyimpan realisasi")),
  })

  const uploadMutation = useMutation({
    mutationFn: uploadFiles,
    onSuccess: () => {
      toast.success("Bukti fisik mingguan berhasil diunggah")
      invalidateData()
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal mengunggah bukti")),
  })

  const deleteBuktiMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pembangunan/bukti/${id}`),
    onSuccess: () => {
      toast.success("Bukti fisik berhasil dihapus")
      invalidateData()
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal menghapus bukti")),
  })

  const ajukanMutation = useMutation({
    mutationFn: async () => {
      if (!paketId) throw new Error("Paket tidak valid")
      return apiClient.patch(`/pembangunan/${paketId}/realisasi/${selectedBulan}/ajukan`)
    },
    onSuccess: () => {
      toast.success(`Rekap Bulan ${BULAN_LIST[selectedBulan - 1].nama} diajukan ke MONEV`)
      invalidateData()
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal mengajukan realisasi")),
  })

  const accMutation = useMutation({
    mutationFn: () => apiClient.patch(`/pembangunan/${paketId}/realisasi/${selectedBulan}/acc`, {
      catatanVerifikasi: "Terverifikasi sesuai laporan progres mingguan",
    }),
    onSuccess: () => {
      toast.success("Rekap bulanan berhasil diverifikasi")
      invalidateData()
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal memverifikasi")),
  })

  const tolakMutation = useMutation({
    mutationFn: () => {
      if (!alasanTolak.trim()) throw new Error("Alasan penolakan wajib diisi")
      return apiClient.patch(`/pembangunan/${paketId}/realisasi/${selectedBulan}/tolak`, {
        catatanVerifikasi: alasanTolak.trim(),
      })
    },
    onSuccess: () => {
      toast.success("Rekap bulanan dikembalikan untuk diperbaiki")
      setShowTolakInput(false)
      setAlasanTolak("")
      invalidateData()
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal menolak realisasi")),
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    const available = Math.max(
      0, 5 - (current?.buktiFisik.length || 0) - pendingFiles.length
    )
    if (selected.length > available) {
      toast.warning(`Maksimal 5 bukti per minggu. Hanya ${available} file yang dapat ditambahkan.`)
    }
    setPendingFiles((files) => [...files, ...selected.slice(0, available)])
    event.target.value = ""
  }

  const chartData = weeklyState.map((item) => ({
    label: `${BULAN_LIST[item.bulan - 1].singkatan}-M${item.mingguKe}`,
    target: Number(item.targetFisik || 0),
    realisasi: Number(item.realisasiFisik || 0),
  }))

  const performanceBadge = currentTarget === 0 && currentFisik === 0 ? (
    <Badge variant="outline">Belum Mulai</Badge>
  ) : currentDeviasi >= 0 ? (
    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
      <CheckCircle2 className="mr-1 h-3 w-3" />Aman (+{currentDeviasi}%)
    </Badge>
  ) : currentDeviasi >= -10 ? (
    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700">
      <AlertTriangle className="mr-1 h-3 w-3" />Perhatian ({currentDeviasi}%)
    </Badge>
  ) : (
    <Badge className="border-red-500/30 bg-red-500/10 text-red-700">
      <AlertCircle className="mr-1 h-3 w-3" />Kritis ({currentDeviasi}%)
    </Badge>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[92vw] sm:max-w-[92vw] 2xl:w-[1400px] 2xl:max-w-[1400px]">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="h-5 w-5 text-emerald-600" />Realisasi Progres Mingguan
          </DialogTitle>
          <DialogDescription>
            {paket?.namaPaket || "Memuat paket..."} · Rekap minggu terakhir tiap bulan otomatis masuk ke laporan TEPRA.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            </div>
          ) : weeklyState.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
              <p className="font-semibold">Target mingguan belum tersedia</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Admin Perencanaan perlu menetapkan target mingguan berdasarkan tanggal kontrak terlebih dahulu.
              </p>
            </div>
          ) : current ? (
            <div className="space-y-5">
              <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 xl:grid-cols-4">
                <div className="min-w-0 bg-background p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Pemenang Tender/Rekanan
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold" title={paket?.pemenangRekanan || "-"}>
                    {paket?.pemenangRekanan || "Belum diisi"}
                  </p>
                </div>
                <div className="min-w-0 bg-background p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Nilai Kontrak
                  </p>
                  <p className="mt-1 truncate font-mono text-sm font-bold text-emerald-600">
                    {formatRupiah(nilaiKontrak)}
                  </p>
                </div>
                <div className="min-w-0 bg-background p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Periode Pelaksanaan
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5">
                    {paket?.tanggalMulai && paket?.tanggalSelesai
                      ? `${formatContractDate(paket.tanggalMulai)} – ${formatContractDate(paket.tanggalSelesai)}`
                      : "Belum ditentukan"}
                  </p>
                </div>
                <div className="min-w-0 bg-background p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Total Waktu Pelaksanaan
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {durasiPelaksanaan ? `${durasiPelaksanaan} hari kalender` : "Belum ditentukan"}
                  </p>
                  {paket?.nomorKontrak && (
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={paket.nomorKontrak}>
                      Kontrak: {paket.nomorKontrak}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[240px_1fr]">
                <div className="space-y-1.5">
                  <Label>Filter Bulan Kontrak</Label>
                  <Select value={String(selectedBulan)} onValueChange={(value) => {
                    const month = Number(value)
                    setSelectedBulan(month)
                    setSelectedMinggu(
                      weeklyState.find((item) => item.bulan === month)?.mingguKe || 1
                    )
                    setPendingFiles([])
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableMonths.map((month) => (
                        <SelectItem key={month} value={String(month)}>
                          {BULAN_LIST[month - 1].singkatan} · {BULAN_LIST[month - 1].nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  {visibleWeeks.map((week) => (
                    <Button
                      key={week.mingguKe}
                      type="button"
                      size="sm"
                      variant={selectedMinggu === week.mingguKe ? "default" : "outline"}
                      onClick={() => {
                        setSelectedMinggu(week.mingguKe)
                        setPendingFiles([])
                      }}
                      className={selectedMinggu === week.mingguKe
                        ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      Minggu {week.mingguKe}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
                <div>
                  <Card>
                    <CardHeader className="border-b pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">MINGGU {current.mingguKe}</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatContractDate(current.tanggalMulai)} sampai {formatContractDate(current.tanggalSelesai)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {performanceBadge}
                          {monthStatus === "TERVERIFIKASI" ? (
                            <Badge className="bg-blue-600"><FileCheck className="mr-1 h-3 w-3" />ACC Bulanan</Badge>
                          ) : monthStatus === "DIAJUKAN" ? (
                            <Badge variant="outline"><FileClock className="mr-1 h-3 w-3" />Diajukan</Badge>
                          ) : monthStatus === "DITOLAK" ? (
                            <Badge variant="destructive"><FileX className="mr-1 h-3 w-3" />Ditolak</Badge>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="space-y-1.5">
                        <Label>Nama/Uraian Kegiatan Mingguan</Label>
                        <Textarea
                          value={current.uraianKegiatan}
                          disabled={!canEditFisik || isFormDisabled}
                          onChange={(event) => updateCurrent({
                            uraianKegiatan: event.target.value,
                          })}
                          placeholder="Tuliskan atau sesuaikan uraian kegiatan aktual minggu ini..."
                          rows={2}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Diambil dari target mingguan dan dapat disesuaikan oleh Administrator atau PPK.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label>Target Fisik</Label>
                          <div className="flex h-10 items-center justify-end rounded-md border bg-muted/40 px-3 font-mono font-bold">
                            {current.targetFisik}%
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Realisasi Fisik (%)</Label>
                          <Input
                            type="number" min="0" max="100" step="0.1"
                            value={current.realisasiFisik}
                            disabled={!canEditFisik || isFormDisabled}
                            onChange={(event) => updateCurrent({
                              realisasiFisik: String(
                                Math.min(100, Math.max(0, Number(event.target.value)))
                              ),
                            })}
                            className="text-right font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Realisasi Keuangan (Rp)</Label>
                          <Input
                            value={currentKeuangan > 0
                              ? currentKeuangan.toLocaleString("id-ID") : ""}
                            disabled={!canEditKeuangan || isFormDisabled}
                            onChange={(event) => updateCurrent({
                              realisasiKeuangan: String(
                                Number(event.target.value.replace(/\D/g, "")) || 0
                              ),
                            })}
                            className="text-right font-mono"
                          />
                          <p className="text-right text-[11px] text-muted-foreground">Serapan {currentSerapan}%</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Catatan Kendala dan Tindak Lanjut</Label>
                        <Textarea
                          value={current.catatanOperator}
                          disabled={isFormDisabled}
                          onChange={(event) => updateCurrent({ catatanOperator: event.target.value })}
                          placeholder="Tuliskan kendala lapangan atau tindak lanjut minggu ini..."
                          rows={3}
                        />
                      </div>
                      {isPeriodLocked && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                          Periode input bulan ini sudah ditutup oleh Administrator.
                        </div>
                      )}
                      {current.catatanVerifikasi && (
                        <div className="rounded-lg border p-3 text-xs">
                          <strong>Catatan MONEV:</strong> {current.catatanVerifikasi}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>

                <Card className="h-fit xl:sticky xl:top-0">
                  <CardHeader className="border-b pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ImageIcon className="h-4 w-4 text-purple-600" />Foto Bukti Minggu {current.mingguKe}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {current.buktiFisik.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {current.buktiFisik.map((item) => (
                          <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                            {item.mimeType?.startsWith("image/") ? (
                              // Bukti berasal dari host API dinamis sehingga tidak memakai optimisasi next/image.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`${API_STORAGE_URL}${item.pathFile}`}
                                alt={item.deskripsi || item.namaFile}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center p-2 text-center text-xs">{item.namaFile}</div>
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 p-2 text-center text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                              <span>{item.deskripsi || item.namaFile}</span>
                              <span>{formatBytes(item.ukuranBytes)}</span>
                              {!isFormDisabled && (
                                <button
                                  type="button"
                                  onClick={() => deleteBuktiMutation.mutate(item.id)}
                                  className="mt-2 rounded bg-red-600 px-2 py-1"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                        Belum ada foto bukti untuk minggu ini.
                      </div>
                    )}
                    {currentFisik > 0 && current.buktiFisik.length === 0 && pendingFiles.length === 0 && (
                      <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                        Minimal satu foto bukti wajib dilampirkan untuk realisasi fisik minggu ini.
                      </div>
                    )}
                    {canUploadFoto && !isFormDisabled && current.buktiFisik.length + pendingFiles.length < 5 && (
                      <div className="space-y-2">
                        <Input
                          value={deskripsiFile}
                          onChange={(event) => setDeskripsiFile(event.target.value)}
                          placeholder="Deskripsi foto (opsional)"
                        />
                        <input
                          ref={fileInputRef} type="file" multiple
                          accept="image/*,video/mp4,application/pdf"
                          className="hidden" onChange={handleFileSelect}
                        />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-1 h-4 w-4" />Pilih Bukti
                          </Button>
                          {pendingFiles.length > 0 && (
                            <Button
                              type="button" onClick={() => uploadMutation.mutate()}
                              disabled={uploadMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Upload className="mr-1 h-4 w-4" />Upload ({pendingFiles.length})
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {pendingFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pendingFiles.map((file, index) => (
                          <Badge key={`${file.name}-${index}`} variant="secondary" className="max-w-full">
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setPendingFiles((files) => files.filter((_, i) => i !== index))}
                            >
                              <X className="ml-1 h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="w-full">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />Kurva S Paket
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[380px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 16, left: -10, bottom: 35 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="label" angle={-45} textAnchor="end" height={55} tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="target" name="Target" stroke="#059669" strokeWidth={2.5} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="realisasi" name="Realisasi" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {canVerifikasi && isDiajukan && (
                <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center gap-2 font-semibold text-blue-700">
                    <FileCheck className="h-4 w-4" />Verifikasi Rekap Bulanan MONEV
                  </div>
                  {!showTolakInput ? (
                    <div className="flex gap-2">
                      <Button onClick={() => accMutation.mutate()} className="bg-emerald-600 hover:bg-emerald-700">ACC & Kunci Bulan</Button>
                      <Button variant="outline" onClick={() => setShowTolakInput(true)} className="border-red-300 text-red-600">Tolak</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea value={alasanTolak} onChange={(event) => setAlasanTolak(event.target.value)} placeholder="Alasan penolakan..." />
                      <div className="flex gap-2">
                        <Button variant="destructive" onClick={() => tolakMutation.mutate()}>Konfirmasi Tolak</Button>
                        <Button variant="ghost" onClick={() => setShowTolakInput(false)}>Batal</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-hidden rounded-xl border">
                <div className="border-b bg-muted/50 p-3">
                  <span className="text-sm font-semibold">
                    Ringkasan Progres Mingguan · {BULAN_LIST[selectedBulan - 1].nama}
                  </span>
                  <p className="text-[11px] text-muted-foreground">Klik baris minggu untuk beralih input.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-xs">
                    <thead className="bg-muted/20 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Minggu/Tanggal</th>
                        <th className="px-3 py-2 text-left">Nama/Uraian Kegiatan</th>
                        <th className="px-3 py-2 text-right">Target</th>
                        <th className="px-3 py-2 text-right">Realisasi Fisik</th>
                        <th className="px-3 py-2 text-right">Realisasi Keuangan</th>
                        <th className="px-3 py-2 text-center">Foto Bukti</th>
                        <th className="px-3 py-2 text-left">Catatan Kendala</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleWeeks.map((week) => (
                        <tr
                          key={week.mingguKe}
                          onClick={() => setSelectedMinggu(week.mingguKe)}
                          className={`cursor-pointer border-t hover:bg-muted/40 ${week.mingguKe === selectedMinggu ? "bg-emerald-500/5" : ""}`}
                        >
                          <td className="px-3 py-3">
                            <strong>MINGGU {week.mingguKe}</strong>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {formatContractDate(week.tanggalMulai)} – {formatContractDate(week.tanggalSelesai)}
                            </div>
                          </td>
                          <td className="max-w-64 px-3 py-3">{week.uraianKegiatan || "-"}</td>
                          <td className="px-3 py-3 text-right font-mono">{week.targetFisik}%</td>
                          <td className="px-3 py-3 text-right font-mono">
                            {Number(week.realisasiFisik) > 0 ? `${week.realisasiFisik}%` : "-"}
                          </td>
                          <td className="px-3 py-3 text-right font-mono">
                            {Number(week.realisasiKeuangan) > 0 ? formatRupiah(week.realisasiKeuangan) : "-"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {week.buktiFisik.length > 0 ? `${week.buktiFisik.length} file` : "-"}
                          </td>
                          <td className="max-w-64 px-3 py-3 text-muted-foreground">
                            {week.catatanOperator || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t bg-muted/10 p-4 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          {current && (
            <div className="flex gap-2">
              {canAjukan && !isFormDisabled && (currentFisik > 0 || currentKeuangan > 0) && (
                <Button
                  variant="outline" onClick={() => ajukanMutation.mutate()}
                  disabled={ajukanMutation.isPending}
                  className="border-blue-300 text-blue-600"
                >
                  <Send className="mr-1 h-4 w-4" />Ajukan Rekap Bulan
                </Button>
              )}
              {(canEditFisik || canEditKeuangan) && !isFormDisabled && (
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {saveMutation.isPending
                    ? <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    : <Save className="mr-1 h-4 w-4" />}
                  Simpan Minggu {current.mingguKe}
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
