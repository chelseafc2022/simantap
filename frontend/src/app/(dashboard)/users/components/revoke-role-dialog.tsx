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
import { TargetPegawai } from "./set-role-dialog"

interface RevokeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: TargetPegawai | null
}

export function RevokeRoleDialog({ open, onOpenChange, target }: RevokeRoleDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return
      const res = await apiClient.post("/users/revoke-role", {
        nip: target.nip,
      })
      return res.data
    },
    onSuccess: (data) => {
      toast.success(
        data?.message || `Hak akses untuk ${target?.namaLengkap} berhasil dinonaktifkan`
      )
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["pegawai-directory"] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Gagal mencabut hak akses"
      toast.error(msg)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-lg">
            <AlertTriangle className="h-5 w-5" />
            Cabut Hak Akses SIMANTAP
          </DialogTitle>
          <DialogDescription>
            Tindakan ini akan menonaktifkan status akun pegawai dan membatalkan seluruh sesi login aktif.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1 text-xs text-foreground">
            <div>
              <span className="font-semibold block">{target.namaLengkap}</span>
              <span className="text-muted-foreground font-mono">NIP: {target.nip}</span>
            </div>
            {target.currentRole && (
              <div className="text-muted-foreground mt-1">
                Peran Akses Saat Ini: <span className="font-medium text-destructive">{target.currentRole}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !target}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Cabut Akses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
