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
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, ShieldCheck, UserCheck } from "lucide-react"
import { toast } from "sonner"

export const SIMANTAP_ROLES = [
  {
    value: "ADMINISTRATOR",
    label: "Administrator Utama",
    desc: "Akses penuh sistem, kelola seluruh pengguna, konfigurasi modul.",
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  {
    value: "ADMIN_SIRUP",
    label: "Admin SiRUP (Data Awal)",
    desc: "Memasukkan data paket awal pembangunan & integrasi SiRUP LKPP.",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    value: "ADMIN_PERENCANAAN",
    label: "Admin Perencanaan",
    desc: "Menyusun target capaian bulanan dan kurva perencanaan kegiatan.",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    value: "ADMIN_PPK",
    label: "Admin PPK",
    desc: "Menentukan besaran progres dan realisasi fisik kegiatan di lapangan.",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    value: "BENDAHARA",
    label: "Bendahara (Admin Realisasi)",
    desc: "Menginput realisasi keuangan paket pembangunan berbasis SP2D/Kas.",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    value: "KEPALA_OPD",
    label: "Kepala OPD",
    desc: "Telaah hasil, verifikasi berkala laporan capaian, dan approval.",
    badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  {
    value: "PIMPINAN_DAERAH",
    label: "Pimpinan Daerah (Bupati/Wabup/Sekda)",
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
}

interface SetRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: TargetPegawai | null
}

export function SetRoleDialog({ open, onOpenChange, target }: SetRoleDialogProps) {
  const queryClient = useQueryClient()
  const [selectedRole, setSelectedRole] = useState<string>("ADMIN_SIRUP")

  useEffect(() => {
    if (target?.currentRole) {
      setSelectedRole(target.currentRole)
    } else {
      setSelectedRole("ADMIN_SIRUP")
    }
  }, [target])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return
      const res = await apiClient.post("/users/set-role", {
        nip: target.nip,
        role: selectedRole,
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

  const currentRoleInfo = SIMANTAP_ROLES.find((r) => r.value === selectedRole)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            Penetapan Hak Akses Role
          </DialogTitle>
          <DialogDescription>
            Tetapkan peran akun SIMANTAP untuk pegawai ASN Pemerintah Kabupaten Konawe Selatan.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-4 py-2">
            {/* Pegawai Info Box */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-foreground text-sm block">
                    {target.namaLengkap}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    NIP: {target.nip}
                  </span>
                </div>
                {target.currentRole && (
                  <Badge variant="outline" className="text-[10px]">
                    Role Saat Ini: {target.currentRole}
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

            {/* Role Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Pilih Peran Hak Akses (7 Role SIMANTAP)
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Pilih Role Pengguna" />
                </SelectTrigger>
                <SelectContent>
                  {SIMANTAP_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-xs py-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{r.label}</span>
                        <span className="text-[10px] text-muted-foreground">{r.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Preview Card */}
            {currentRoleInfo && (
              <div className="rounded-lg border border-border/70 p-3 bg-card space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-foreground">
                    {currentRoleInfo.label}
                  </span>
                  <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${currentRoleInfo.badgeClass}`}>
                    Terpilih
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {currentRoleInfo.desc}
                </p>
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
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !target}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Simpan Hak Akses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
