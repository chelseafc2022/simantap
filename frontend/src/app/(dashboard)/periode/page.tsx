"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import {
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Loader2,
  Calendar,
  Save,
  PlusCircle,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

interface LockingPeriodItem {
  id: string
  tahun: number
  bulan: number
  isLocked: boolean
  batasInput: string
  updatedById?: string
  updatedAt: string
  isExpired: boolean
  isEffectiveLocked: boolean
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

export default function PeriodePage() {
  const queryClient = useClientQueries()
  const { user, isLoading: isAuthLoading } = useAuth()
  const selectedTahun = 2026
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [editDates, setEditDates] = useState<Record<number, string>>({})

  // Form State untuk Pengaturan Massal Dinamis
  const [batchTab, setBatchTab] = useState<"pola" | "seragam">("pola")
  const [customCutoffDay, setCustomCutoffDay] = useState<number>(10)
  const [customCutoffTime, setCustomCutoffTime] = useState<string>("23:59")
  const [uniformDateTime, setUniformDateTime] = useState<string>("")

  const userRoles: string[] = [
    ...(user?.role ? [user.role] : []),
    ...(user?.roles || []),
    ...(user?.userRoles?.flatMap((ur) =>
      ur.role?.kode ? [ur.role.kode] : []
    ) || []),
  ]
  const isAdministrator = userRoles.includes("ADMINISTRATOR")

  // Fetch locking periods
  const {
    data: periods = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<LockingPeriodItem[]>({
    queryKey: ["locking-periods", selectedTahun],
    queryFn: async () => {
      const res = await apiClient.get(`/pembangunan/periode?tahun=${selectedTahun}`)
      return res.data?.data || []
    },
    enabled: isAdministrator,
  })

  // Mutasi update single locking period
  const updateMutation = useMutation({
    mutationFn: async ({
      bulan,
      batasInput,
      isLocked,
    }: {
      bulan: number
      batasInput?: string
      isLocked?: boolean
    }) => {
      return apiClient.patch(`/pembangunan/periode/${bulan}`, {
        tahun: selectedTahun,
        batasInput,
        isLocked,
      })
    },
    onSuccess: (_, vars) => {
      toast.success(`Jadwal Bulan ${vars.bulan} (${NAMA_BULAN[vars.bulan - 1]}) berhasil disimpan`)
      queryClient.invalidateQueries({ queryKey: ["locking-periods"] })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal memperbarui jadwal periode"))
    },
  })

  // Mutasi batch action (Kunci Semua, Buka Semua, Atur Hari Massal)
  const batchMutation = useMutation({
    mutationFn: async (payload: {
      action: "LOCK_ALL" | "UNLOCK_ALL" | "SET_CUTOFF_DAY" | "SET_CUSTOM_DATE"
      cutoffDay?: number
      cutoffHour?: number
      cutoffMinute?: number
      customDate?: string
    }) => {
      return apiClient.post("/pembangunan/periode/batch", {
        tahun: selectedTahun,
        ...payload,
      })
    },
    onSuccess: (_, vars) => {
      if (vars.action === "LOCK_ALL") {
        toast.success("Seluruh periode bulan (B01 - B12) berhasil dikunci")
      } else if (vars.action === "UNLOCK_ALL") {
        toast.success("Seluruh periode bulan berhasil dibuka")
      } else {
        toast.success("Batas waktu seluruh bulan berhasil diperbarui secara massal")
      }
      setBatchModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ["locking-periods"] })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal menjalankan operasi massal"))
    },
  })

  // Format Helper: konversi ISO ke datetime-local string (YYYY-MM-DDTHH:mm)
  const toLocalInputValue = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      if (isNaN(d.getTime())) return ""
      const pad = (n: number) => String(n).padStart(2, "0")
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch {
      return ""
    }
  }

  // Format Helper: Teks waktu Indonesia
  const formatDateTimeDisplay = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      if (isNaN(d.getTime())) return "-"
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d)
    } catch {
      return "-"
    }
  }

  // Helper Hitung Sisa Waktu
  const getRemainingTimeBadge = (item: LockingPeriodItem) => {
    const deadline = new Date(item.batasInput)
    const now = new Date()
    const diffMs = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffMs <= 0) {
      const pastDays = Math.abs(diffDays)
      return (
        <Badge variant="outline" className="text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Lewat {pastDays === 0 ? "hari ini" : `${pastDays} hari lalu`}
        </Badge>
      )
    }

    if (diffDays <= 3) {
      return (
        <Badge className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Sisa {diffDays} hari lagi
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
        <Clock className="h-3 w-3 mr-1" />
        Sisa {diffDays} hari lagi
      </Badge>
    )
  }

  // Handle eksekusi modal batch
  const handleApplyBatchDate = () => {
    if (batchTab === "pola") {
      const [h, m] = customCutoffTime.split(":").map(Number)
      batchMutation.mutate({
        action: "SET_CUTOFF_DAY",
        cutoffDay: customCutoffDay,
        cutoffHour: isNaN(h) ? 23 : h,
        cutoffMinute: isNaN(m) ? 59 : m,
      })
    } else {
      if (!uniformDateTime) {
        toast.error("Silakan tentukan tanggal dan jam batas waktu")
        return
      }
      batchMutation.mutate({
        action: "SET_CUSTOM_DATE",
        customDate: new Date(uniformDateTime).toISOString(),
      })
    }
  }

  if (isAuthLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdministrator) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 p-8 text-center max-w-xl mx-auto space-y-3">
          <ShieldAlert className="h-12 w-12 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400">Akses Terbatas</h2>
          <p className="text-sm text-red-600 dark:text-red-300">
            Halaman pengaturan jadwal dan batas waktu pelaporan bulanan ini hanya dapat diakses oleh Administrator Sistem.
          </p>
        </div>
      </div>
    )
  }

  const totalTerbuka = periods.filter((p) => !p.isEffectiveLocked).length
  const totalTerkunci = periods.filter((p) => p.isEffectiveLocked).length
  const oktPeriod = periods.find((p) => p.bulan === 10)

  return (
    <div className="min-w-0 px-3 sm:px-4 lg:px-6 space-y-5 pb-8 pt-1 w-full">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
              JADWAL & BATAS WAKTU
            </span>
            <Badge variant="outline" className="text-[10px] py-0 border-border">
              Tahun Anggaran {selectedTahun}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Jadwal & Batas Waktu Pelaporan RFK
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pengaturan dinamis batas waktu (*cut-off*) penginputan realisasi fisik & keuangan bagi seluruh OPD
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Tombol Kunci Semua */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => batchMutation.mutate({ action: "LOCK_ALL" })}
            disabled={batchMutation.isPending || isLoading}
            className="text-xs h-8 gap-1.5 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Kunci Semua</span>
          </Button>

          {/* Tombol Buka Semua */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => batchMutation.mutate({ action: "UNLOCK_ALL" })}
            disabled={batchMutation.isPending || isLoading}
            className="text-xs h-8 gap-1.5 border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>Buka Semua</span>
          </Button>

          {/* Tombol Atur Batas Waktu Massal (Dinamis) */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setBatchModalOpen(true)}
            className="text-xs h-8 gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Atur Batas Waktu Massal</span>
          </Button>

          {/* Segarkan */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="text-xs h-8 px-2.5"
            title="Segarkan data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Ringkasan Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <span>Periode Terbuka</span>
              <Unlock className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground font-mono">{totalTerbuka} Bulan</div>
            <p className="text-[11px] text-muted-foreground mt-1">OPD dapat mengisi realisasi</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-red-500/20 bg-red-50/30 dark:bg-red-950/10">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center justify-between">
              <span>Periode Terkunci</span>
              <Lock className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground font-mono">{totalTerkunci} Bulan</div>
            <p className="text-[11px] text-muted-foreground mt-1">Form terkunci bagi non-Admin</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Bulan Berjalan (Oktober)</span>
              <Calendar className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>{oktPeriod?.isEffectiveLocked ? "Terkunci" : "Terbuka Aktif"}</span>
              <Badge className={oktPeriod?.isEffectiveLocked ? "bg-red-500 text-white" : "bg-emerald-600 text-white"}>
                {oktPeriod?.isEffectiveLocked ? "Locked" : "Open"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Batas: {oktPeriod ? formatDateTimeDisplay(oktPeriod.batasInput) : "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Pengaturan Jadwal</span>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-semibold text-foreground">Fleksibel & Dinamis</div>
            <p className="text-[11px] text-muted-foreground mt-1">Bebas diatur per bulan atau massal</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Pengaturan 12 Bulan */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Tabel Periode Pelaporan Bulanan (TA {selectedTahun})</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ubah tanggal batas waktu per bulan atau gunakan saklar kunci untuk menutup/membuka akses OPD secara instan.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Memuat daftar periode 12 bulan...</span>
            </div>
          ) : (
            <>
              <div className="border-b bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground md:hidden">
                ← Geser tabel ke kiri atau kanan untuk mengatur seluruh kolom →
              </div>
              <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                <Table>
                <TableHeader>
                  <tr className="bg-muted/40 border-b text-xs text-muted-foreground">
                    <TableHead className="w-16 text-center font-semibold">Kode</TableHead>
                    <TableHead className="font-semibold min-w-[140px]">Bulan Pelaporan</TableHead>
                    <TableHead className="font-semibold min-w-[240px]">Batas Waktu Input (Cut-off)</TableHead>
                    <TableHead className="font-semibold min-w-[130px]">Sisa Waktu</TableHead>
                    <TableHead className="text-center font-semibold min-w-[100px]">Kunci Manual</TableHead>
                    <TableHead className="font-semibold min-w-[130px]">Status Efektif</TableHead>
                    <TableHead className="font-semibold min-w-[160px]">Terakhir Diubah</TableHead>
                    <TableHead className="text-right font-semibold min-w-[140px] pr-4">Aksi Cepat</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {periods.map((item) => {
                    const currentInputVal =
                      editDates[item.bulan] !== undefined
                        ? editDates[item.bulan]
                        : toLocalInputValue(item.batasInput)

                    const isDateChanged =
                      editDates[item.bulan] !== undefined &&
                      editDates[item.bulan] !== toLocalInputValue(item.batasInput)

                    return (
                      <TableRow key={item.bulan} className="hover:bg-muted/40 transition-colors">
                        {/* Kode Bulan */}
                        <TableCell className="text-center font-mono font-bold text-xs py-3.5">
                          <span className="px-2 py-1 rounded-md bg-muted text-foreground border">
                            B{String(item.bulan).padStart(2, "0")}
                          </span>
                        </TableCell>

                        {/* Nama Bulan */}
                        <TableCell className="py-3.5">
                          <div className="font-medium text-sm text-foreground">
                            {NAMA_BULAN[item.bulan - 1]}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Laporan RFK Bulan ke-{item.bulan}
                          </div>
                        </TableCell>

                        {/* Input Batas Waktu */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            <Input
                              type="datetime-local"
                              value={currentInputVal}
                              onChange={(e) =>
                                setEditDates((prev) => ({
                                  ...prev,
                                  [item.bulan]: e.target.value,
                                }))
                              }
                              className="text-xs font-mono h-8 w-auto min-w-[200px]"
                            />
                            {isDateChanged && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  updateMutation.mutate({
                                    bulan: item.bulan,
                                    batasInput: new Date(currentInputVal).toISOString(),
                                  })
                                }}
                                disabled={updateMutation.isPending}
                                className="h-8 px-2.5 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Save className="h-3 w-3" />
                                <span>Simpan</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>

                        {/* Sisa Waktu */}
                        <TableCell className="py-3.5">
                          {getRemainingTimeBadge(item)}
                        </TableCell>

                        {/* Switch Kunci Manual */}
                        <TableCell className="text-center py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <Switch
                              checked={item.isLocked}
                              onCheckedChange={(checked) => {
                                updateMutation.mutate({
                                  bulan: item.bulan,
                                  isLocked: checked,
                                })
                              }}
                              disabled={updateMutation.isPending}
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {item.isLocked ? "Ya" : "Tidak"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Status Efektif */}
                        <TableCell className="py-3.5">
                          {item.isEffectiveLocked ? (
                            <Badge className="text-xs bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 gap-1">
                              <Lock className="h-3 w-3" />
                              {item.isLocked ? "Terkunci Manual" : "Tutup (Lewat Waktu)"}
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Terbuka (Input Aktif)
                            </Badge>
                          )}
                        </TableCell>

                        {/* Terakhir Diubah */}
                        <TableCell className="py-3.5 text-xs text-muted-foreground font-mono">
                          <div>{item.updatedById || "Sistem"}</div>
                          <div className="text-[10px] opacity-75">{formatDateTimeDisplay(item.updatedAt)}</div>
                        </TableCell>

                        {/* Aksi Cepat */}
                        <TableCell className="text-right py-3.5 pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.isEffectiveLocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const now = new Date()
                                  let newBatas: string | undefined = undefined
                                  if (new Date(item.batasInput) <= now) {
                                    const ext = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                                    ext.setHours(23, 59, 59, 999)
                                    newBatas = ext.toISOString()
                                  }
                                  updateMutation.mutate({
                                    bulan: item.bulan,
                                    isLocked: false,
                                    batasInput: newBatas,
                                  })
                                }}
                                disabled={updateMutation.isPending}
                                className="h-8 px-2.5 text-xs gap-1 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/40"
                              >
                                <Unlock className="h-3 w-3" />
                                <span>Buka Kunci</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  updateMutation.mutate({
                                    bulan: item.bulan,
                                    isLocked: true,
                                  })
                                }}
                                disabled={updateMutation.isPending}
                                className="h-8 px-2.5 text-xs gap-1 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/40"
                              >
                                <Lock className="h-3 w-3" />
                                <span>Kunci</span>
                              </Button>
                            )}

                            {/* Tombol Cepat Perpanjang +7 Hari */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const current = new Date(item.batasInput)
                                const base = current > new Date() ? current : new Date()
                                const ext = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000)
                                ext.setHours(23, 59, 59, 999)
                                updateMutation.mutate({
                                  bulan: item.bulan,
                                  isLocked: false,
                                  batasInput: ext.toISOString(),
                                })
                              }}
                              disabled={updateMutation.isPending}
                              title="Perpanjang batas waktu 7 hari ke depan dan buka kunci"
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline ml-1">+7 Hari</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog Atur Batas Waktu Massal (Dinamis Penuh) */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <SlidersHorizontal className="h-5 w-5 text-orange-500" />
              <span>Atur Batas Waktu Massal (12 Bulan)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Terapkan tanggal batas waktu secara dinamis ke seluruh bulan (Januari s/d Desember) secara serentak.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={batchTab}
            onValueChange={(value) => {
              if (value === "pola" || value === "seragam") setBatchTab(value)
            }}
            className="pt-2"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="pola" className="text-xs">Pola Tanggal Bulanan</TabsTrigger>
              <TabsTrigger value="seragam" className="text-xs">Tanggal & Jam Seragam</TabsTrigger>
            </TabsList>

            {/* Tab 1: Pola Tanggal Bulanan (Misal Setiap Tanggal X Bulan Berikutnya) */}
            <TabsContent value="pola" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tiap Tanggal (1–31)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={customCutoffDay}
                    onChange={(e) => setCustomCutoffDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Pada bulan berikutnya</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pukul (WITA)</Label>
                  <Input
                    type="time"
                    value={customCutoffTime}
                    onChange={(e) => setCustomCutoffTime(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Format 24 jam</p>
                </div>
              </div>

              {/* Preview Ilustrasi */}
              <div className="rounded-lg border p-3 bg-muted/40 text-xs space-y-1 font-mono text-muted-foreground">
                <div className="font-semibold text-foreground font-sans">Contoh Hasil Penerapan:</div>
                <div>• Realisasi Januari ➔ Batas: {customCutoffDay} Februari {selectedTahun} ({customCutoffTime})</div>
                <div>• Realisasi Oktober ➔ Batas: {customCutoffDay} November {selectedTahun} ({customCutoffTime})</div>
                <div>• Realisasi Desember ➔ Batas: {customCutoffDay} Januari {selectedTahun + 1} ({customCutoffTime})</div>
              </div>
            </TabsContent>

            {/* Tab 2: Tanggal Seragam */}
            <TabsContent value="seragam" className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Batas Waktu Sama untuk Seluruh Bulan</Label>
                <Input
                  type="datetime-local"
                  value={uniformDateTime}
                  onChange={(e) => setUniformDateTime(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Semua 12 bulan akan memiliki tanggal dan jam batas akhir yang sama persis dengan input di atas.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchModalOpen(false)}
              disabled={batchMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleApplyBatchDate}
              disabled={batchMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
            >
              {batchMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Terapkan ke Semua Bulan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function useClientQueries() {
  return useQueryClient()
}
