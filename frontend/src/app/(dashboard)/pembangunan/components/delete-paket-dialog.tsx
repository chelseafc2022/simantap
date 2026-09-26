"use client"

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
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PaketItem } from "./paket-form-dialog"

interface DeletePaketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paket: PaketItem | null
}

export function DeletePaketDialog({
  open,
  onOpenChange,
  paket,
}: DeletePaketDialogProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!paket) return
      return apiClient.delete(`/pembangunan/${paket.id}`)
    },
    onSuccess: () => {
      toast.success(`Paket '${paket?.namaPaket}' berhasil dihapus`)
      queryClient.invalidateQueries({ queryKey: ["paket-pembangunan"] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Gagal menghapus paket"
      toast.error(msg)
    },
  })

  if (!paket) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Hapus Paket Pembangunan</DialogTitle>
              <DialogDescription>Konfirmasi penghapusan data</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 text-sm text-foreground space-y-2">
          <p>
            Apakah Anda yakin ingin menghapus paket pembangunan:
          </p>
          <div className="rounded-lg border bg-muted/40 p-3 font-medium text-xs space-y-1">
            <div className="text-foreground font-semibold">{paket.namaPaket}</div>
            <div className="text-muted-foreground">{paket.opd?.namaOpd}</div>
            {paket.nomorKontrak && (
              <div className="text-muted-foreground font-mono">No: {paket.nomorKontrak}</div>
            )}
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            ⚠️ Perhatian: Seluruh target fisik bulanan (B01–B12) dan riwayat realisasi fisik serta keuangan yang telah diinput untuk paket ini akan ikut terhapus permanen.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              "Hapus Paket"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
