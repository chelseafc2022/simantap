"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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

interface ResetPaketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tahunAnggaran: number
  selectedOpd: string
  selectedOpdNama?: string
}

export function ResetPaketDialog({
  open,
  onOpenChange,
  tahunAnggaran,
  selectedOpd,
  selectedOpdNama,
}: ResetPaketDialogProps) {
  const queryClient = useQueryClient()
  const [resetScope, setResetScope] = useState<"ALL" | "SINGLE">(
    selectedOpd && selectedOpd !== "ALL" ? "SINGLE" : "ALL"
  )
  const [confirmationInput, setConfirmationInput] = useState("")

  const effectiveOpdId = resetScope === "ALL" ? "ALL" : selectedOpd

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
      toast.success("Data Paket Berhasil Dikosongkan!", {
        description:
          data?.message ||
          `Data paket tahun ${tahunAnggaran} kini telah kembali bersih menjadi 0.`,
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
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                  resetScope === "ALL"
                    ? "border-rose-600 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/30"
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
                onClick={() => setResetScope("SINGLE")}
                disabled={!selectedOpd || selectedOpd === "ALL"}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                  !selectedOpd || selectedOpd === "ALL"
                    ? "opacity-50 cursor-not-allowed border-border"
                    : resetScope === "SINGLE"
                    ? "border-rose-600 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/30"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>Hanya OPD Terpilih</span>
                </div>
                <span className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight truncate max-w-full">
                  {selectedOpdNama && selectedOpd !== "ALL"
                    ? selectedOpdNama
                    : "Pilih OPD di filter dulu"}
                </span>
              </button>
            </div>
          </div>

          {/* Kotak Peringatan */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-300 bg-amber-50/70 text-amber-900 text-xs leading-relaxed">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Perhatian:</strong> Tindakan ini akan menghapus paket pembangunan beserta target fisik bulanan (Kurva-S) pada tahun {tahunAnggaran}. Anda dapat melakukan sinkronisasi ulang kapan saja dari SiRUP LKPP.
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
            disabled={!isConfirmed || resetMutation.isPending}
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
                <span>Ya, Kosongkan Data (Jadikan 0)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
