"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Users,
  Building2,
  Layers,
  Eye,
  Edit3,
  RefreshCw,
  Loader2,
  CheckCircle2,
  UserCheck,
  Globe,
  Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RoleMatrixDialog,
  RoleDetail,
} from "./components/role-matrix-dialog"

export default function KelompokUserPage() {
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useAuth()

  // Ambil peran user saat ini untuk proteksi RBAC
  const userRoles: string[] = [
    ...(user?.role ? [user.role] : []),
    ...(user?.roles || []),
    ...(user?.userRoles?.map((ur: any) => ur.role?.kode || ur.role) || []),
  ]
  const isAdministrator = userRoles.includes("ADMINISTRATOR")

  // State pencarian dan filter
  const [search, setSearch] = useState("")
  const [selectedScope, setSelectedScope] = useState<string>("ALL")
  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Query master roles dari backend
  const {
    data: rolesData,
    isLoading: isRolesLoading,
    refetch,
    isRefetching,
  } = useQuery<RoleDetail[]>({
    queryKey: ["roles-master"],
    queryFn: async () => {
      const res = await apiClient.get("/users/roles/master")
      if (Array.isArray(res.data?.data)) return res.data.data
      if (Array.isArray(res.data)) return res.data
      return []
    },
    enabled: isAdministrator,
  })

  const rolesList: RoleDetail[] = useMemo(() => {
    if (Array.isArray(rolesData)) return rolesData
    return []
  }, [rolesData])

  // Filter roles berdasarkan search & scope
  const filteredRoles = useMemo(() => {
    return rolesList.filter((r) => {
      const matchSearch =
        search === "" ||
        r.nama.toLowerCase().includes(search.toLowerCase()) ||
        r.kode.toLowerCase().includes(search.toLowerCase()) ||
        (r.deskripsi && r.deskripsi.toLowerCase().includes(search.toLowerCase()))

      const matchScope =
        selectedScope === "ALL" || String(r.aksesUnit) === selectedScope

      return matchSearch && matchScope
    })
  }, [rolesList, search, selectedScope])

  // Statistik Ringkas
  const stats = useMemo(() => {
    return {
      total: rolesList.length,
      pemda: rolesList.filter((r) => r.aksesUnit === 3).length,
      opd: rolesList.filter((r) => r.aksesUnit === 2).length,
      subUnit: rolesList.filter((r) => r.aksesUnit === 1).length,
      totalUsers: rolesList.reduce((acc, r) => acc + (r.totalUsers || 0), 0),
    }
  }, [rolesList])

  const handleOpenDetail = (role: RoleDetail) => {
    setSelectedRole(role)
    setModalOpen(true)
  }

  // Tampilan saat auth masih memuat
  if (isAuthLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Tampilan jika BUKAN Administrator
  if (!isAdministrator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive border border-destructive/20 shadow-inner">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Akses Terbatas: Hanya Administrator
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Halaman Konfigurasi Kelompok Pengguna & Matriks Hak Akses hanya dapat diakses oleh akun dengan peran{" "}
            <strong className="text-foreground">Administrator Utama</strong>. Akun Anda saat ini tidak memiliki kewenangan ini.
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard")}
          className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Kembali ke Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6 space-y-6">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1">
            <span>Sistem & Pengguna</span>
            <span>/</span>
            <span className="text-primary font-semibold">Kelompok Pengguna</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            Kelompok Pengguna & Matriks Hak Akses
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Struktur peran (Role-Based Access Control / RBAC), cakupan unit kerja, dan matriks hak akses menu resmi SIMANTAP Kabupaten Konawe Selatan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs h-9 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`}
            />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              Total Kelompok
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-foreground">
              {stats.total}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              8 Kelompok Peran Resmi
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              Seluruh Pemda
              <Globe className="h-3.5 w-3.5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.pemda}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Akses Unit: Semua OPD
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              Tingkat OPD
              <Building2 className="h-3.5 w-3.5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.opd}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Akses Unit: 1 OPD
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              Sub Unit / PPK
              <Briefcase className="h-3.5 w-3.5 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {stats.subUnit}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Akses Unit: 1 Sub Unit
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur col-span-2 lg:col-span-1">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              Akun Terdaftar
              <UserCheck className="h-3.5 w-3.5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.totalUsers}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pegawai Terhubung
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar (Sama seperti gaya SIDAPEM) */}
      <Card className="border-border/80 shadow-xs bg-card/50">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Cari nama kelompok, kode role, atau wewenang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-background/80"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedScope} onValueChange={setSelectedScope}>
                <SelectTrigger className="w-[200px] text-xs h-9 bg-background/80">
                  <SelectValue placeholder="Semua Cakupan Unit" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Semua Cakupan Unit</SelectItem>
                  <SelectItem value="3">3 — Semua Unit Kerja</SelectItem>
                  <SelectItem value="2">2 — 1 Unit Kerja (OPD)</SelectItem>
                  <SelectItem value="1">1 — 1 Sub Unit Kerja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table: Master Kelompok User (Format Terinspirasi SIDAPEM klpUsers.vue) */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-blue-900/10 via-emerald-900/10 to-transparent border-b border-border/70 text-foreground font-semibold">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-4 text-left">Nama Kelompok & Wewenang</th>
                <th className="py-3 px-4 text-left w-56">Cakupan Akses Unit</th>
                <th className="py-3 px-4 text-center w-36">Akun Terdaftar</th>
                <th className="py-3 px-4 text-center w-48">Ringkasan Akses</th>
                <th className="py-3 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isRolesLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Memuat data master kelompok pengguna...
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    Tidak ada kelompok pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role, idx) => {
                  const scopeBadge =
                    role.aksesUnit === 3
                      ? {
                          label: "3 — Semua Unit Kerja",
                          class:
                            "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
                        }
                      : role.aksesUnit === 2
                      ? {
                          label: "2 — 1 Unit Kerja (OPD)",
                          class:
                            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                        }
                      : {
                          label: "1 — 1 Sub Unit Kerja",
                          class:
                            "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
                        }

                  return (
                    <tr
                      key={role.id || role.kode}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3 px-3 text-center text-muted-foreground font-mono">
                        {idx + 1}.
                      </td>

                      {/* Nama Kelompok */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {role.nama}
                          </span>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] px-1.5 py-0 font-semibold bg-muted/60"
                          >
                            {role.kode}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 max-w-xl">
                          {role.deskripsi || role.catatanKewenangan || "-"}
                        </p>
                      </td>

                      {/* Cakupan Akses Unit */}
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium px-2 py-0.5 ${scopeBadge.class}`}
                        >
                          <Building2 className="h-3 w-3 mr-1 inline" />
                          {scopeBadge.label}
                        </Badge>
                      </td>

                      {/* Akun Terdaftar */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-foreground font-semibold text-xs border border-border/50">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span>{role.totalUsers || 0} Pengguna</span>
                        </div>
                      </td>

                      {/* Ringkasan Akses */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                            style={{
                              backgroundColor: "#0FA66818",
                              color: "#0FA668",
                              borderColor: "#0FA66840",
                            }}
                            title="Memiliki Hak Baca (Read)"
                          >
                            Read
                          </span>
                          {role.menus?.some((m) => m.addx === 1) && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                              style={{
                                backgroundColor: "#3695E418",
                                color: "#3695E4",
                                borderColor: "#3695E440",
                              }}
                              title="Memiliki Hak Tambah (Add)"
                            >
                              Add
                            </span>
                          )}
                          {role.menus?.some((m) => m.updatex === 1) && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                              style={{
                                backgroundColor: "#A67D0F18",
                                color: "#A67D0F",
                                borderColor: "#A67D0F40",
                              }}
                              title="Memiliki Hak Ubah (Edit)"
                            >
                              Edit
                            </span>
                          )}
                          {role.menus?.some((m) => m.deletex === 1) && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                              style={{
                                backgroundColor: "#DB483918",
                                color: "#DB4839",
                                borderColor: "#DB483940",
                              }}
                              title="Memiliki Hak Hapus (Delete)"
                            >
                              Del
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tombol Aksi */}
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetail(role)}
                          className="h-8 px-2.5 text-xs font-semibold bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                          Matriks & Hak Akses
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Matriks Hak Akses (Dialog Format SIDAPEM) */}
      <RoleMatrixDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        role={selectedRole}
      />
    </div>
  )
}
