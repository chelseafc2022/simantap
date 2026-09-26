"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  ShieldCheck,
  Building2,
  Users,
  Check,
  X,
  Layers,
  Save,
  Loader2,
  Edit3,
  RotateCcw,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export interface MenuItemPermission {
  id: string
  urutan: string
  title: string
  route: string
  readx: number
  addx: number
  updatex: number
  deletex: number
  keterangan?: string
  subItem?: MenuItemPermission[]
}

export interface RoleDetail {
  id: string
  kode: string
  nama: string
  deskripsi?: string
  urutan: number
  aksesUnit: number
  aksesUnitLabel: string
  catatanKewenangan?: string
  menus: MenuItemPermission[]
  totalUsers: number
  users: Array<{
    id: string
    nip: string
    namaLengkap: string
    jabatan: string
    status: string
    opdId?: string
  }>
}

interface RoleMatrixDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: RoleDetail | null
}

export function RoleMatrixDialog({
  open,
  onOpenChange,
  role,
}: RoleMatrixDialogProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>("matriks")
  const [isEditMode, setIsEditMode] = useState<boolean>(true)

  // Form State untuk Edit
  const [editedAksesUnit, setEditedAksesUnit] = useState<number>(1)
  const [editedMenus, setEditedMenus] = useState<MenuItemPermission[]>([])
  const [editedCatatan, setEditedCatatan] = useState<string>("")

  // Sinkronisasi data saat role dibuka
  useEffect(() => {
    if (role) {
      setEditedAksesUnit(role.aksesUnit || 1)
      setEditedMenus(JSON.parse(JSON.stringify(role.menus || [])))
      setEditedCatatan(role.catatanKewenangan || role.deskripsi || "")
    }
  }, [role, open])

  // Mutation untuk Simpan Perubahan Matriks ke Backend
  const saveMatrixMutation = useMutation({
    mutationFn: async () => {
      if (!role) return
      const targetId = role.id || role.kode
      const res = await apiClient.put(`/users/roles/${targetId}/matrix`, {
        aksesUnit: editedAksesUnit,
        menus: editedMenus,
        catatanKewenangan: editedCatatan,
      })
      return res.data
    },
    onSuccess: () => {
      toast.success(`Matriks hak akses peran '${role?.nama}' berhasil disimpan!`, {
        description: "Perubahan telah tersimpan dan diterapkan pada sistem.",
      })
      queryClient.invalidateQueries({ queryKey: ["roles-master"] })
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message || "Gagal menyimpan perubahan matriks hak akses."
      toast.error("Gagal Menyimpan", { description: msg })
    },
  })

  if (!role) return null

  // Helper untuk toggle izin menu
  const togglePermission = (
    menuId: string,
    field: "readx" | "addx" | "updatex" | "deletex",
    isSub = false,
    parentId?: string,
  ) => {
    setEditedMenus((prev) => {
      const clone: MenuItemPermission[] = JSON.parse(JSON.stringify(prev))
      if (!isSub) {
        const item = clone.find((m) => m.id === menuId)
        if (item) {
          const newVal = item[field] === 1 ? 0 : 1
          item[field] = newVal
          // Jika mematikan read pada induk, matikan juga semua aksi lain pada induk dan anak
          if (field === "readx" && newVal === 0) {
            item.addx = 0
            item.updatex = 0
            item.deletex = 0
            if (item.subItem) {
              item.subItem.forEach((sub) => {
                sub.readx = 0
                sub.addx = 0
                sub.updatex = 0
                sub.deletex = 0
              })
            }
          }
        }
      } else if (parentId) {
        const parent = clone.find((m) => m.id === parentId)
        if (parent && parent.subItem) {
          const sub = parent.subItem.find((s) => s.id === menuId)
          if (sub) {
            const newVal = sub[field] === 1 ? 0 : 1
            sub[field] = newVal
            // Jika sub aktif, pastikan induk readx aktif
            if (newVal === 1) {
              parent.readx = 1
            }
          }
        }
      }
      return clone
    })
  }

  // Quick Action: Beri Semua Read
  const handleSetAllRead = () => {
    setEditedMenus((prev) => {
      const clone: MenuItemPermission[] = JSON.parse(JSON.stringify(prev))
      clone.forEach((m) => {
        m.readx = 1
        if (m.subItem) {
          m.subItem.forEach((sub) => {
            sub.readx = 1
          })
        }
      })
      return clone
    })
    toast.info("Seluruh menu diberi izin Baca (Read)")
  }

  // Quick Action: Beri Akses Penuh
  const handleSetFullAccess = () => {
    setEditedMenus((prev) => {
      const clone: MenuItemPermission[] = JSON.parse(JSON.stringify(prev))
      clone.forEach((m) => {
        m.readx = 1
        m.addx = 1
        m.updatex = 1
        m.deletex = 1
        if (m.subItem) {
          m.subItem.forEach((sub) => {
            sub.readx = 1
            sub.addx = 1
            sub.updatex = 1
            sub.deletex = 1
          })
        }
      })
      return clone
    })
    toast.info("Seluruh menu diberi hak Akses Penuh (Read, Add, Edit, Delete)")
  }

  // Quick Action: Kosongkan Akses
  const handleClearAccess = () => {
    setEditedMenus((prev) => {
      const clone: MenuItemPermission[] = JSON.parse(JSON.stringify(prev))
      clone.forEach((m) => {
        m.readx = 0
        m.addx = 0
        m.updatex = 0
        m.deletex = 0
        if (m.subItem) {
          m.subItem.forEach((sub) => {
            sub.readx = 0
            sub.addx = 0
            sub.updatex = 0
            sub.deletex = 0
          })
        }
      })
      return clone
    })
    toast.warning("Seluruh izin akses telah dikosongkan")
  }

  // Reset ke data awal role
  const handleResetToDefault = () => {
    setEditedAksesUnit(role.aksesUnit || 1)
    setEditedMenus(JSON.parse(JSON.stringify(role.menus || [])))
    setEditedCatatan(role.catatanKewenangan || role.deskripsi || "")
    toast.info("Matriks dikembalikan ke konfigurasi awal")
  }

  const getScopeBadge = (scope: number) => {
    switch (scope) {
      case 3:
        return {
          label: "3 — Semua Unit Kerja (Seluruh Pemda)",
          desc: "Akses lintas seluruh Organisasi Perangkat Daerah se-Kabupaten Konawe Selatan",
          className:
            "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
        }
      case 2:
        return {
          label: "2 — 1 Unit Kerja (Tingkat OPD)",
          desc: "Akses dibatasi hanya untuk dokumen dan paket kegiatan pada OPD penugasan",
          className:
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        }
      case 1:
      default:
        return {
          label: "1 — 1 Sub Unit / Paket Kerja",
          desc: "Akses spesifik hanya untuk sub kegiatan atau paket yang diampu pejabat bersangkutan",
          className:
            "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
        }
    }
  }

  const scopeInfo = getScopeBadge(editedAksesUnit)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* MODAL DIPERBESAR: max-w-6xl & w-[95vw] */}
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0 border-border/80 shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="p-6 bg-gradient-to-r from-blue-900/15 via-emerald-900/15 to-transparent border-b border-border/70 relative shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="size-12 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-teal-500 text-white flex items-center justify-center shadow-lg shrink-0">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                    {role.nama}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="font-mono text-xs font-semibold bg-primary/10 text-primary border-primary/30 px-2 py-0.5"
                  >
                    {role.kode}
                  </Badge>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Edit3 className="h-3 w-3" /> Mode Administrator Aktif
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                  {role.deskripsi ||
                    "Kelompok pengguna dan konfigurasi izin operasional resmi SIMANTAP."}
                </DialogDescription>
              </div>
            </div>

            {/* Tombol Simpan Perubahan di Header */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
                disabled={saveMatrixMutation.isPending}
                className="text-xs h-9 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={() => saveMatrixMutation.mutate()}
                disabled={saveMatrixMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-md cursor-pointer"
              >
                {saveMatrixMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                {saveMatrixMutation.isPending ? "Menyimpan..." : "Simpan Perubahan Matriks"}
              </Button>
            </div>
          </div>

          {/* Cakupan Akses Unit & Pengaturan Wilayah Kerja (Sama Seperti di SIDAPEM) */}
          <div className="mt-4 pt-3.5 border-t border-border/60 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs items-center">
            <div className="md:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2.5">
              <span className="font-bold text-foreground whitespace-nowrap flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                *Akses Cakupan Unit:
              </span>
              <Select
                value={String(editedAksesUnit)}
                onValueChange={(val) => setEditedAksesUnit(Number(val))}
              >
                <SelectTrigger className="w-full sm:w-[280px] h-8 text-xs bg-background/90 border-primary/30">
                  <SelectValue placeholder="Pilih cakupan unit..." />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="1">1 — 1 Sub Unit / Paket Kerja</SelectItem>
                  <SelectItem value="2">2 — 1 Unit Kerja (Tingkat OPD)</SelectItem>
                  <SelectItem value="3">3 — Semua Unit Kerja (Seluruh Pemda)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-6 flex items-center justify-between md:justify-end gap-3 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                <span>
                  Total Anggota:{" "}
                  <strong className="text-foreground">{role.totalUsers} Pengguna</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body dengan Tab */}
        <div className="p-6 flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/60 p-1">
              <TabsTrigger value="matriks" className="text-xs font-semibold cursor-pointer">
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Matriks Hak Akses Menu & Aksi (Read, Add, Edit, Delete)
              </TabsTrigger>
              <TabsTrigger value="pengguna" className="text-xs font-semibold cursor-pointer">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Daftar Pengguna Terdaftar ({role.totalUsers})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Matriks Hak Akses Menu */}
            <TabsContent value="matriks" className="space-y-4 m-0">
              {/* Toolbar Aksi Cepat Matriks */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-muted/40 p-3 rounded-xl border border-border/70">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    Klik pada kotak centang warna untuk mengatur hak akses menu untuk kelompok ini:
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSetAllRead}
                    className="text-[11px] h-7 px-2.5 bg-background cursor-pointer"
                  >
                    <CheckSquare className="h-3 w-3 mr-1 text-[#0FA668]" />
                    Pilih Semua Read
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSetFullAccess}
                    className="text-[11px] h-7 px-2.5 bg-background cursor-pointer"
                  >
                    <Check className="h-3 w-3 mr-1 text-primary" />
                    Beri Akses Penuh
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAccess}
                    className="text-[11px] h-7 px-2.5 bg-background text-destructive hover:text-destructive cursor-pointer"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Kosongkan
                  </Button>
                </div>
              </div>

              {/* Tabel Matriks Menu Aplikasi */}
              <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 text-white font-semibold">
                        <th className="py-3 px-3 text-center w-14">Kode</th>
                        <th className="py-3 px-4 text-left">Nama Menu Aplikasi</th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="inline-flex items-center gap-1 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#0FA668] inline-block" />
                            Read
                          </span>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="inline-flex items-center gap-1 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#3695E4] inline-block" />
                            Add
                          </span>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="inline-flex items-center gap-1 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#A67D0F] inline-block" />
                            Edit
                          </span>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="inline-flex items-center gap-1 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#DB4839] inline-block" />
                            Delete
                          </span>
                        </th>
                        <th className="py-3 px-4 text-left">Catatan Wewenang & Batasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {editedMenus.map((menu) => (
                        <>
                          {/* Induk Menu */}
                          <tr
                            key={menu.id}
                            className="bg-muted/40 hover:bg-muted/70 transition-colors font-medium"
                          >
                            <td className="py-3 px-3 text-center font-mono font-bold text-muted-foreground">
                              {menu.urutan}
                            </td>
                            <td className="py-3 px-4 text-foreground font-bold flex items-center gap-2">
                              <span className="text-sm">{menu.title}</span>
                              <span className="text-[10.5px] text-muted-foreground font-mono font-normal">
                                ({menu.route})
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <InteractiveCheckbox
                                checked={menu.readx === 1}
                                color="#0FA668"
                                label="Read"
                                onChange={() => togglePermission(menu.id, "readx")}
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <InteractiveCheckbox
                                checked={menu.addx === 1}
                                color="#3695E4"
                                label="Add"
                                onChange={() => togglePermission(menu.id, "addx")}
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <InteractiveCheckbox
                                checked={menu.updatex === 1}
                                color="#A67D0F"
                                label="Edit"
                                onChange={() => togglePermission(menu.id, "updatex")}
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <InteractiveCheckbox
                                checked={menu.deletex === 1}
                                color="#DB4839"
                                label="Delete"
                                onChange={() => togglePermission(menu.id, "deletex")}
                              />
                            </td>
                            <td className="py-3 px-4 text-[11.5px] text-muted-foreground">
                              {menu.keterangan || "-"}
                            </td>
                          </tr>

                          {/* Sub Item Menu (jika ada) */}
                          {menu.subItem &&
                            menu.subItem.map((sub) => (
                              <tr
                                key={sub.id}
                                className="bg-background hover:bg-muted/30 transition-colors"
                              >
                                <td className="py-2.5 px-3 text-center font-mono text-[11px] text-muted-foreground pl-4">
                                  {sub.urutan}
                                </td>
                                <td className="py-2.5 px-4 text-foreground pl-10 flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground/60">└─</span>
                                  <span className="font-medium">{sub.title}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    ({sub.route})
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <InteractiveCheckbox
                                    checked={sub.readx === 1}
                                    color="#0FA668"
                                    label="Read"
                                    onChange={() =>
                                      togglePermission(sub.id, "readx", true, menu.id)
                                    }
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <InteractiveCheckbox
                                    checked={sub.addx === 1}
                                    color="#3695E4"
                                    label="Add"
                                    onChange={() =>
                                      togglePermission(sub.id, "addx", true, menu.id)
                                    }
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <InteractiveCheckbox
                                    checked={sub.updatex === 1}
                                    color="#A67D0F"
                                    label="Edit"
                                    onChange={() =>
                                      togglePermission(sub.id, "updatex", true, menu.id)
                                    }
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <InteractiveCheckbox
                                    checked={sub.deletex === 1}
                                    color="#DB4839"
                                    label="Delete"
                                    onChange={() =>
                                      togglePermission(sub.id, "deletex", true, menu.id)
                                    }
                                  />
                                </td>
                                <td className="py-2.5 px-4 text-[11px] text-muted-foreground italic">
                                  {sub.keterangan || "Sub-modul kegiatan"}
                                </td>
                              </tr>
                            ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Daftar Akun Pengguna Terdaftar */}
            <TabsContent value="pengguna" className="space-y-4 m-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Menampilkan aparatur sipil negara yang memegang peran{" "}
                  <strong className="text-foreground">{role.nama}</strong>.
                </span>
                <Link
                  href="/users"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs"
                >
                  Kelola Pengguna di Manajemen User
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {role.users && role.users.length > 0 ? (
                <div className="rounded-xl border border-border/80 overflow-hidden shadow-xs">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/70 text-foreground font-semibold border-b border-border/60">
                        <th className="py-2.5 px-3 text-center w-12">No</th>
                        <th className="py-2.5 px-4 text-left">Nama & NIP</th>
                        <th className="py-2.5 px-4 text-left">Jabatan</th>
                        <th className="py-2.5 px-4 text-center w-28">Status Akun</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {role.users.map((u, idx) => (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">
                            {idx + 1}.
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-foreground">
                              {u.namaLengkap}
                            </div>
                            <div className="font-mono text-[10.5px] text-muted-foreground">
                              NIP. {u.nip}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">
                            {u.jabatan}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={
                                u.status === "AKTIF"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                              }
                            >
                              {u.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
                  <Users className="h-9 w-9 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    Belum ada aparatur pada kelompok ini
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gunakan menu Manajemen User untuk menetapkan peran ini kepada pegawai dari SIMPEG.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="mt-3.5 text-xs"
                  >
                    <Link href="/users">
                      Buka Manajemen User
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Modal dengan Action Buttons */}
        <div className="px-6 py-3.5 bg-muted/30 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{role.nama}</span>
            <span>•</span>
            <span>Cakupan: {scopeInfo.label}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Tutup
            </Button>
            <Button
              size="sm"
              onClick={() => saveMatrixMutation.mutate()}
              disabled={saveMatrixMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 shadow-sm cursor-pointer"
            >
              {saveMatrixMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1.5" />
              )}
              {saveMatrixMutation.isPending ? "Menyimpan..." : "Simpan Perubahan Matriks"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Checkbox Interaktif yang Meniru Persis Gaya SIDAPEM
 * (dengan kode warna Read=#0FA668, Add=#3695E4, Edit=#A67D0F, Delete=#DB4839)
 */
function InteractiveCheckbox({
  checked,
  color,
  label,
  onChange,
}: {
  checked: boolean
  color: string
  label: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`inline-flex items-center justify-center size-6 rounded border transition-all cursor-pointer select-none group ${
        checked
          ? "shadow-xs scale-105"
          : "bg-muted/40 text-muted-foreground/30 border-border/60 hover:border-foreground/40"
      }`}
      style={{
        backgroundColor: checked ? `${color}25` : undefined,
        borderColor: checked ? color : undefined,
        color: checked ? color : undefined,
      }}
      title={`Klik untuk ${checked ? "mencabut" : "memberikan"} izin ${label}`}
    >
      {checked ? (
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      ) : (
        <X className="h-3 w-3 stroke-[2] opacity-0 group-hover:opacity-60" />
      )}
    </button>
  )
}
