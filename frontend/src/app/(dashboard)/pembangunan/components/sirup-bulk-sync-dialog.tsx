"use client"

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Database,
  Loader2,
  CheckCircle2,
  Building2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Globe2,
  Layers,
} from "lucide-react"
import { toast } from "sonner"

interface SatkerOption {
  id: string
  subUnitId: string | null
  nama: string
  satkerCode: string
  opdId: string
  parentOpdNama?: string
}

interface SirupBulkSyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opdId: string
  opdNama: string
  tahunAnggaran: number
  isSuperRole?: boolean
  opdList?: Array<{ id: string; namaOpd: string; singkatan?: string | null }>
}

export function SirupBulkSyncDialog({
  open,
  onOpenChange,
  opdId,
  opdNama,
  tahunAnggaran,
  isSuperRole = false,
  opdList = [],
}: SirupBulkSyncDialogProps) {
  const queryClient = useQueryClient()
  const [onlyPembangunan, setOnlyPembangunan] = useState(true)

  // Mode cakupan: "ALL" (Semua OPD) atau "SINGLE" (Satu Sub Unit tertentu)
  const [syncScope, setSyncScope] = useState<"ALL" | "SINGLE">("SINGLE")
  const [selectedTargetUnit, setSelectedTargetUnit] = useState<string>("")

  // Fetch daftar satuan kerja dari tabel read-only konsel_setara.rup_satker
  const { data: satkerList = [], isLoading: isLoadingSatkerList } = useQuery<SatkerOption[]>({
    queryKey: ["sirup-satker-options"],
    queryFn: async () => {
      const res = await apiClient.get("/sirup/satker-options")
      return res.data?.data || []
    },
    staleTime: 10 * 60 * 1000,
    enabled: open,
  })

  // Inisialisasi scope saat dialog dibuka
  useEffect(() => {
    if (open) {
      if (isSuperRole) {
        if (opdId && opdId !== "ALL") {
          setSyncScope("SINGLE")
          setSelectedTargetUnit(opdId)
        } else {
          setSyncScope("ALL")
          if (satkerList.length > 0) {
            setSelectedTargetUnit(satkerList[0]?.id || "")
          }
        }
      } else {
        setSyncScope("SINGLE")
        setSelectedTargetUnit(opdId)
      }
    }
  }, [open, isSuperRole, opdId, satkerList])

  // Menentukan target ID yang dikirim ke backend
  const effectiveTargetId = isSuperRole
    ? syncScope === "ALL"
      ? "ALL"
      : selectedTargetUnit || satkerList[0]?.id || opdId || "ALL"
    : opdId

  // Label nama sub unit / satker terpilih
  const currentSatker = satkerList.find(
    (s) => s.id === selectedTargetUnit || s.satkerCode === selectedTargetUnit
  )
  const displayTargetNama = isSuperRole
    ? syncScope === "ALL"
      ? "SEMUA OPD SE-KABUPATEN"
      : currentSatker?.nama || opdNama || "Sub Unit Terpilih"
    : opdNama || "Sub Unit Anda"

  // Ambil pratinjau paket dari konsel_setara.rup_paket
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["sirup-preview-opd", tahunAnggaran, effectiveTargetId],
    queryFn: async () => {
      if (!effectiveTargetId) return null
      const res = await apiClient.get("/sirup/preview-opd", {
        params: { tahun: tahunAnggaran, opdId: effectiveTargetId },
      })
      return res.data?.data
    },
    enabled: open && !!effectiveTargetId,
    staleTime: 5 * 60 * 1000,
  })

  // Mutasi eksekusi sinkronisasi
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/sirup/sync-opd", {
        tahun: tahunAnggaran,
        opdId: effectiveTargetId,
        onlyPembangunan,
      })
      return res.data?.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["paket-pembangunan"] })
      queryClient.invalidateQueries({ queryKey: ["pembangunan-summary"] })
      toast.success("Sinkronisasi RUP Berhasil!", {
        description:
          data?.message ||
          `${data?.totalSynced || 0} paket berhasil dimasukkan ke database MONALISA.`,
      })
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error("Gagal melakukan sinkronisasi", {
        description:
          err.response?.data?.message ||
          err.message ||
          "Terjadi kesalahan saat membaca tabel RUP Konsel Setara.",
      })
    },
  })

  const candidateCount = onlyPembangunan
    ? previewData?.pembangunanCount ?? 0
    : previewData?.total ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 border-b bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Sinkronisasi Paket RUP Konsel Setara
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Tarik otomatis seluruh paket pengadaan ke database MONALISA
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Pilihan Cakupan Khusus Administrator / Super Role */}
          {isSuperRole && (
            <div className="space-y-2 p-3 rounded-lg border border-amber-200/80 bg-amber-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Hak Istimewa Administrator:
                </span>
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 font-semibold"
                >
                  Super Access
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSyncScope("ALL")}
                  className={`flex flex-col items-start p-2.5 rounded-md border text-left transition-all ${
                    syncScope === "ALL"
                      ? "border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-500/30"
                      : "border-muted-foreground/20 bg-background hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                    <Globe2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Semua Sub Unit (Total)</span>
                  </div>
                  <span className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">
                    Sinkronkan seluruh satker yang tersedia
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncScope("SINGLE")}
                  className={`flex flex-col items-start p-2.5 rounded-md border text-left transition-all ${
                    syncScope === "SINGLE"
                      ? "border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-500/30"
                      : "border-muted-foreground/20 bg-background hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                    <span>Sub Unit Kerja Tertentu</span>
                  </div>
                  <span className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">
                    Pilih Bagian Setda, Dinas, atau Puskesmas
                  </span>
                </button>
              </div>

              {syncScope === "SINGLE" && (
                <div className="pt-2 space-y-1">
                  <label className="text-[11px] font-medium text-amber-900 flex items-center justify-between">
                    <span>Pilih Sub Unit Kerja yang ingin disinkronkan:</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({satkerList.length} Satker Terdaftar)
                    </span>
                  </label>
                  <Select
                    value={selectedTargetUnit || (satkerList[0]?.id ?? "")}
                    onValueChange={(val) => setSelectedTargetUnit(val)}
                  >
                    <SelectTrigger className="w-full h-9 text-xs bg-background">
                      <SelectValue placeholder="Pilih Sub Unit Kerja..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {satkerList.map((satker) => (
                        <SelectItem
                          key={satker.id}
                          value={satker.id}
                          className="text-xs py-2 cursor-pointer"
                        >
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-foreground">
                              {satker.nama}
                            </span>
                            {satker.parentOpdNama &&
                              satker.parentOpdNama.toUpperCase() !==
                                satker.nama.toUpperCase() && (
                                <span className="text-[10px] text-muted-foreground">
                                  Induk: {satker.parentOpdNama}
                                </span>
                              )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Info Target & Tahun */}
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground shrink-0">
                Target Sub Unit:
              </span>
              <Badge
                variant="outline"
                className="font-semibold text-foreground truncate max-w-[280px]"
                title={displayTargetNama}
              >
                {syncScope === "ALL" && isSuperRole ? (
                  <Globe2 className="h-3 w-3 mr-1 text-blue-600 shrink-0" />
                ) : (
                  <Layers className="h-3 w-3 mr-1 text-emerald-600 shrink-0" />
                )}
                <span className="truncate">{displayTargetNama}</span>
              </Badge>
            </div>
            {currentSatker?.parentOpdNama &&
              currentSatker.parentOpdNama.toUpperCase() !==
                currentSatker.nama.toUpperCase() && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span>Unit Kerja Induk:</span>
                  <span className="font-medium text-foreground">
                    {currentSatker.parentOpdNama}
                  </span>
                </div>
              )}
            <div className="flex items-center justify-between pt-1 border-t text-xs">
              <span className="text-muted-foreground">Tahun Anggaran:</span>
              <span className="font-semibold text-foreground">
                T.A. {tahunAnggaran}
              </span>
            </div>
          </div>

          {/* Status penemuan paket di sumber RUP Konsel Setara */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3.5 space-y-2 text-blue-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Status Data RUP Konsel Setara:</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchPreview()}
                disabled={isLoadingPreview}
                className="h-6 px-1.5 text-[11px] text-blue-700 hover:bg-blue-100"
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    isLoadingPreview ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>

            {isLoadingPreview ? (
              <div className="flex items-center gap-2 py-2 text-xs text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memeriksa tabel RUP Konsel Setara...</span>
              </div>
            ) : previewData ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Total Terdata di Tabel RUP:</span>
                  <span className="font-bold">
                    {previewData.total.toLocaleString("id-ID")} Paket
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-800">
                  <span>Paket Pembangunan & Belanja Modal:</span>
                  <span className="font-bold">
                    {previewData.pembangunanCount.toLocaleString("id-ID")} Paket
                  </span>
                </div>
                {previewData.satkerCode && previewData.satkerCode !== "-" && (
                  <div className="text-[10.5px] text-blue-700/80 pt-0.5 border-t border-blue-200/50">
                    Kode Satker SIPD: <code>{previewData.satkerCode}</code>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tidak ada data paket ditemukan untuk kriteria ini.
              </p>
            )}
          </div>

          {/* Opsi Filter Cerdas */}
          <div className="flex items-start space-x-2.5 pt-1">
            <Checkbox
              id="onlyPembangunan"
              checked={onlyPembangunan}
              onCheckedChange={(checked) => setOnlyPembangunan(!!checked)}
              className="mt-0.5"
            />
            <div className="grid gap-0.5 leading-none">
              <label
                htmlFor="onlyPembangunan"
                className="text-xs font-medium cursor-pointer text-foreground"
              >
                Hanya Impor Paket Pembangunan & Belanja Modal
              </label>
              <p className="text-[11px] text-muted-foreground">
                Mengabaikan belanja operasional rutin non-pembangunan (seperti ATK,
                kertas, tagihan listrik).
              </p>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-md border">
            💡 <strong>Keterangan:</strong> Sistem akan memasukkan nama paket,
            pagu anggaran, metode, jenis pengadaan, dan nomor RUP. Operator Sub
            Unit tinggal melengkapi nomor kontrak dan target fisik mingguan.
            Rekap bulanannya dihitung otomatis untuk dashboard dan TEPRA.
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={syncMutation.isPending}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={
              syncMutation.isPending ||
              isLoadingPreview ||
              (!isLoadingPreview && candidateCount === 0)
            }
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs shadow-xs"
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Menyinkronkan Data...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  Sinkronkan{" "}
                  {candidateCount > 0
                    ? `${candidateCount.toLocaleString("id-ID")} Paket`
                    : ""}{" "}
                  Sekarang
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
