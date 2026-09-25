"use client"

import { useState, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ShieldCheck, UserCheck, AlertCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"

export const SIMANTAP_ROLES = [
  {
    value: "ADMINISTRATOR",
    label: "Administrator Utama",
    shortLabel: "Administrator",
    desc: "Akses penuh sistem, kelola seluruh pengguna, konfigurasi modul.",
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  {
    value: "ADMIN_SIRUP",
    label: "Admin SiRUP (Data Awal)",
    shortLabel: "Admin SiRUP",
    desc: "Memasukkan data paket awal pembangunan & integrasi SiRUP LKPP.",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    value: "ADMIN_PERENCANAAN",
    label: "Admin Perencanaan",
    shortLabel: "Admin Perencanaan",
    desc: "Menyusun target capaian bulanan dan kurva perencanaan kegiatan.",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    value: "ADMIN_PPK",
    label: "Admin PPK",
    shortLabel: "Admin PPK",
    desc: "Menentukan besaran progres dan realisasi fisik kegiatan di lapangan.",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    value: "BENDAHARA",
    label: "Bendahara (Admin Realisasi)",
    shortLabel: "Bendahara",
    desc: "Menginput realisasi keuangan paket pembangunan berbasis SP2D/Kas.",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    value: "KEPALA_OPD",
    label: "Kepala OPD",
    shortLabel: "Kepala OPD",
    desc: "Telaah hasil, verifikasi berkala laporan capaian, dan approval.",
    badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  {
    value: "PIMPINAN_DAERAH",
    label: "Pimpinan Daerah (Bupati/Wabup/Sekda)",
    shortLabel: "Pimpinan Daerah",
    desc: "Executive view monitoring menyeluruh realisasi pembangunan daerah.",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
]

export interface TargetPegawai {
  nip: string
  namaLengkap: string
  jabatan?: string
  opd?: string
  currentRole?: string
  currentRoles?: string[]
  username?: string
}

interface SetRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: TargetPegawai | null
}

export function SetRoleDialog({ open, onOpenChange, target }: SetRoleDialogProps) {
  const queryClient = useQueryClient()
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [showConfirmReset, setShowConfirmReset] = useState(false)

  useEffect(() => {
    setShowConfirmReset(false)
    if (target?.currentRoles && target.currentRoles.length > 0) {
      setSelectedRoles(target.currentRoles)
    } else if (target?.currentRole) {
      setSelectedRoles([target.currentRole])
    } else {
      setSelectedRoles([])
    }
  }, [target, open])

  const toggleRole = (roleValue: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleValue)) {
        return prev.filter((r) => r !== roleValue)
      } else {
        return [...prev, roleValue]
      }
    })
  }

  // Mutation untuk simpan/ubah role
  const mutation = useMutation({
    mutationFn: async () => {
      if (!target || selectedRoles.length === 0) return
      const res = await apiClient.post("/users/set-role", {
        nip: target.nip,
        roles: selectedRoles,
        role: selectedRoles[0],
      })
      return res.data
    },
    onSuccess: (data) => {
      toast.success(
        data?.message || `Hak akses berhasil ditetapkan untuk ${target?.namaLengkap}`
      )
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["pegawai-directory"] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Gagal menetapkan role"
      toast.error(msg)
    },
  })

  // Mutation untuk kembalikan ke default (Belum Diberi Akses & bersihkan data)
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!target) return
      const res = await apiClient.post("/users/reset-to-default", {
        nip: target.nip,
      })
      return res.data
    },
    onSuccess: (data) => {
      toast.success(
        data?.message || `Peran ${target?.namaLengkap} telah dikembalikan ke default (Belum Diberi Akses)`
      )
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["pegawai-directory"] })
      setShowConfirmReset(false)
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Gagal mengembalikan ke default"
      toast.error(msg)
    },
  })

  const hasExistingRoles =
    (target?.currentRoles && target.currentRoles.length > 0) || !!target?.currentRole

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            Penetapan / Ubah Hak Akses Role
          </DialogTitle>
          <DialogDescription>
            Tetapkan peran akun SIMANTAP untuk pegawai ASN. Pegawai dapat memiliki lebih dari 1 peran sekaligus.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Pegawai Info Box */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-semibold text-foreground text-sm block">
                    {target.namaLengkap}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-muted-foreground font-mono">
                      NIP: {target.nip}
                    </span>
                    {target.username && (
                      <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                        @{target.username}
                      </Badge>
                    )}
                  </div>
                </div>
                {target.currentRoles && target.currentRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                    {target.currentRoles.map((r) => {
                      const c = SIMANTAP_ROLES.find((item) => item.value === r)
                      return (
                        <Badge key={r} variant="outline" className={`text-[10px] ${c?.badgeClass || ""}`}>
                          {c?.label || r}
                        </Badge>
                      )
                    })}
                  </div>
                ) : target.currentRole ? (
                  <Badge variant="outline" className="text-[10px]">
                    {target.currentRole}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                    Belum Diberi Akses
                  </Badge>
                )}
              </div>
              {target.jabatan && (
                <div className="text-muted-foreground">
                  Jabatan: <span className="text-foreground">{target.jabatan}</span>
                </div>
              )}
              {target.opd && (
                <div className="text-muted-foreground">
                  OPD / Unit Kerja: <span className="text-foreground">{target.opd}</span>
                </div>
              )}
            </div>

            {/* Role Header & Selection Counter */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground">
                  Pilih Peran Hak Akses (Multi-Role)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Centang satu atau beberapa peran yang diberikan kepada pegawai ini
                </p>
              </div>
              <Badge variant="secondary" className="text-[11px] font-semibold">
                {selectedRoles.length} Dipilih
              </Badge>
            </div>

            {/* Role List with Checkboxes */}
            <div className="space-y-2">
              {SIMANTAP_ROLES.map((role) => {
                const isChecked = selectedRoles.includes(role.value)
                return (
                  <div
                    key={role.value}
                    onClick={() => toggleRole(role.value)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                      isChecked
                        ? "border-emerald-500/60 bg-emerald-500/5 shadow-xs"
                        : "border-border/60 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleRole(role.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${isChecked ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"}`}>
                          {role.label}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 font-medium ${role.badgeClass}`}
                        >
                          {role.value}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {role.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Opsi Kembalikan ke Default (Belum Diberi Akses) */}
            {hasExistingRoles && (
              <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-3 space-y-2 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                      <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                      <span>Kembalikan ke Default (Belum Diberi Akses)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Menghapus data akun dari SIMANTAP agar kembali bersih dan dikembalikan ke Direktori ASN.
                    </p>
                  </div>

                  {!showConfirmReset ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConfirmReset(true)}
                      disabled={mutation.isPending || resetMutation.isPending}
                      className="text-xs h-7 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 shrink-0 gap-1 self-start sm:self-auto"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Kembalikan ke Default
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConfirmReset(false)}
                        className="text-xs h-7 px-2"
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => resetMutation.mutate()}
                        disabled={resetMutation.isPending}
                        className="text-xs h-7 px-2.5 gap-1 font-medium bg-red-600 hover:bg-red-700"
                      >
                        {resetMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                        Ya, Bersihkan Data
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Validation Notice */}
            {selectedRoles.length === 0 && !hasExistingRoles && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Pilih minimal 1 peran hak akses untuk mendaftarkan pegawai ke sistem.</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 shrink-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending || resetMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || resetMutation.isPending || !target || selectedRoles.length === 0}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Simpan Hak Akses ({selectedRoles.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
