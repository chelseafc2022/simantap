"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  AlertTriangle,
  Loader2,
  Trash2,
  RotateCcw,
  Building2,
  Globe2,
} from "lucide-react"
import { toast } from "sonner"

export interface OpdItem {
  id: string
  namaOpd: string
  alias?: string
}

interface ResetPaketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tahunAnggaran: number
  selectedOpd: string
  selectedOpdNama?: string
  opdList?: OpdItem[]
}

export function ResetPaketDialog({
  open,
  onOpenChange,
  tahunAnggaran,
  selectedOpd,
  selectedOpdNama,
  opdList,
}: ResetPaketDialogProps) {
  const queryClient = useQueryClient()

  // Fallback fetch OPD list if not provided
  const { data: fetchedOpds } = useQuery({
    queryKey: ["opd-options"],
    queryFn: async () => {
      const res = await apiClient.get("/pembangunan/opd-options")
      return res.data?.data as OpdItem[]
    },
    enabled: (!opdList || opdList.length === 0) && open,
    staleTime: 10 * 60 * 1000,
  })

  const availableOpds: OpdItem[] = (
    opdList && opdList.length > 0 ? opdList : fetchedOpds || []
  ).filter((o: OpdItem) => o.id !== "ALL" && o.id !== "all")

  const [resetScope, setResetScope] = useState<"ALL" | "SINGLE">("ALL")
  const [targetOpdId, setTargetOpdId] = useState<string>("")
  const [confirmationInput, setConfirmationInput] = useState("")

  // Sync state saat dialog terbuka atau selectedOpd berubah
  useEffect(() => {
    if (open) {
      if (selectedOpd && selectedOpd !== "ALL" && selectedOpd !== "all") {
        setResetScope("SINGLE")
        setTargetOpdId(selectedOpd)
      } else {
        setResetScope("ALL")
        if (availableOpds.length > 0 && !targetOpdId) {
          setTargetOpdId(availableOpds[0].id)
        }
      }
      setConfirmationInput("")
    }
  }, [open, selectedOpd, availableOpds.length])

  // Pastikan targetOpdId ada default jika user beralih ke SINGLE
  const handleSelectSingle = () => {
    setResetScope("SINGLE")
    if (!targetOpdId && availableOpds.length > 0) {
      setTargetOpdId(selectedOpd && selectedOpd !== "ALL" ? selectedOpd : availableOpds[0].id)
    }
  }

  const effectiveOpdId = resetScope === "ALL" ? "ALL" : targetOpdId
  const chosenOpdObj = availableOpds.find((o: OpdItem) => o.id === targetOpdId)
  const chosenOpdNama = chosenOpdObj?.namaOpd || selectedOpdNama || "OPD Terpilih"

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/sirup/reset-paket", {
        tahun: tahunAnggaran,
        opdId: effectiveOpdId,
      })
      return res.data?.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["paket-pembangunan"] })
      queryClient.invalidateQueries({ queryKey: ["pembangunan-summary"] })
      queryClient.invalidateQueries({ queryKey: ["sirup-preview-opd"] })
      queryClient.invalidateQueries({ queryKey: ["rekap-realisasi"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-rekap-opd"] })
      toast.success("Data Paket Berhasil Dikosongkan!", {
        description:
          data?.message ||
          (resetScope === "ALL"
            ? `Seluruh paket tahun ${tahunAnggaran} se-Kabupaten berhasil dikosongkan.`
            : `Paket milik ${chosenOpdNama} tahun ${tahunAnggaran} berhasil dikosongkan.`),
      })
      setConfirmationInput("")
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error("Gagal mengosongkan paket", {
        description:
          err.response?.data?.message ||
          err.message ||
          "Terjadi kesalahan saat memproses reset data.",
      })
    },
  })

  const isConfirmed = confirmationInput.trim().toUpperCase() === "RESET"
  const canSubmit = isConfirmed && (resetScope === "ALL" || (resetScope === "SINGLE" && !!targetOpdId))

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) setConfirmationInput("")
        onOpenChange(val)
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-rose-200">
        <DialogHeader className="p-5 border-b bg-rose-50/60 text-rose-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-rose-900">
                Kosongkan / Reset Paket ({tahunAnggaran})
              </DialogTitle>
              <DialogDescription className="text-xs text-rose-700/80 mt-0.5">
                Kembalikan jumlah data paket MONALISA menjadi 0 paket
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Pilihan Cakupan Reset */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Pilih Target yang Ingin Dikosongkan:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResetScope("ALL")}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  resetScope === "ALL"
                    ? "border-rose-600 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/30 font-medium"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <Globe2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>Semua OPD</span>
                </div>
                <span className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">
                  Kosongkan total paket se-Kabupaten T.A. {tahunAnggaran}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSelectSingle}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  resetScope === "SINGLE"
                    ? "border-rose-600 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/30 font-medium"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>Hanya OPD Terpilih</span>
                </div>
                <span className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight truncate max-w-full">
                  {targetOpdId && chosenOpdObj
                    ? chosenOpdObj.namaOpd
                    : "Pilih OPD spesifik"}
                </span>
              </button>
            </div>
          </div>

          {/* Dropdown Pemilihan OPD jika cakupan SINGLE */}
          {resetScope === "SINGLE" && (
            <div className="space-y-1.5 p-3 rounded-lg border border-rose-200/80 bg-rose-50/40 animate-in fade-in-50 duration-150">
              <label className="text-xs font-semibold text-rose-950 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-rose-600" />
                Pilih OPD yang Ingin Dikosongkan:
              </label>
              <Select
                value={targetOpdId}
                onValueChange={(val: string) => setTargetOpdId(val)}
              >
                <SelectTrigger className="w-full bg-background text-xs h-9 border-rose-200">
                  <SelectValue placeholder="Pilih salah satu OPD..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 text-xs">
                  {availableOpds.map((opd: OpdItem) => (
                    <SelectItem key={opd.id} value={opd.id} className="text-xs">
                      {opd.namaOpd}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10.5px] text-rose-700/80 leading-tight">
                Hanya paket milik OPD ini yang akan dihapus. Paket OPD lainnya tetap aman.
              </p>
            </div>
          )}

          {/* Kotak Peringatan */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-300 bg-amber-50/70 text-amber-900 text-xs leading-relaxed">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Perhatian:</strong>{" "}
              {resetScope === "ALL" ? (
                <>
                  Tindakan ini akan menghapus <strong>SELURUH paket pembangunan se-Kabupaten</strong> beserta target fisik bulanan (Kurva-S) pada tahun {tahunAnggaran}.
                </>
              ) : (
                <>
                  Tindakan ini akan menghapus seluruh paket milik{" "}
                  <strong className="text-rose-900">{chosenOpdNama}</strong> pada tahun {tahunAnggaran}. Paket OPD lain tidak akan terpengaruh.
                </>
              )}
              <span className="block mt-1 text-[11px] text-amber-800/90">
                Anda dapat melakukan sinkronisasi ulang kapan saja dari tabel RUP Konsel Setara.
              </span>
            </div>
          </div>

          {/* Konfirmasi Teks Pengaman */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-foreground">
              Ketik kata <strong className="text-rose-600 font-mono">RESET</strong> untuk konfirmasi:
            </label>
            <Input
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Ketik RESET disini..."
              className="font-mono text-xs uppercase"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setConfirmationInput("")
              onOpenChange(false)
            }}
            disabled={resetMutation.isPending}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => resetMutation.mutate()}
            disabled={!canSubmit || resetMutation.isPending}
            className="gap-1.5 text-xs shadow-xs"
          >
            {resetMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Mengosongkan Paket...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>
                  {resetScope === "ALL"
                    ? "Ya, Kosongkan Semua OPD (Jadikan 0)"
                    : "Ya, Kosongkan Paket OPD Ini"}
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
