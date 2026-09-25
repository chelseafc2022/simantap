"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { apiClient } from "@/lib/api-client"
import { StatCards } from "./components/stat-cards"
import { SetRoleDialog, SIMANTAP_ROLES, TargetPegawai } from "./components/set-role-dialog"
import { RevokeRoleDialog } from "./components/revoke-role-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Building2,
  RefreshCw,
  Edit3,
  UserX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Database,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react"

export default function UsersManagementPage() {
  // Active Tab
  const [activeTab, setActiveTab] = useState<string>("simantap_users")

  // Search & Filter state
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 400)
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")

  // Pagination states
  const [pageUsers, setPageUsers] = useState(1)
  const [pageDirectory, setPageDirectory] = useState(1)

  // Dialog states
  const [setRoleOpen, setSetRoleOpen] = useState(false)
  const [revokeRoleOpen, setRevokeRoleOpen] = useState(false)
  const [targetPegawai, setTargetPegawai] = useState<TargetPegawai | null>(null)

  // 1. Fetch SIMANTAP local users
  const {
    data: usersResponse,
    isLoading: isLoadingUsers,
    isFetching: isFetchingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users", pageUsers, debouncedSearch, roleFilter, statusFilter],
    queryFn: async () => {
      const params: any = {
        page: pageUsers,
        limit: 10,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (roleFilter !== "ALL") params.role = roleFilter
      if (statusFilter !== "ALL") params.status = statusFilter

      const res = await apiClient.get("/users", { params })
      return res.data
    },
  })

  // 2. Fetch E-Gov & SIMPEG ASN Directory
  const {
    data: directoryResponse,
    isLoading: isLoadingDirectory,
    isFetching: isFetchingDirectory,
    refetch: refetchDirectory,
  } = useQuery({
    queryKey: ["pegawai-directory", pageDirectory, debouncedSearch],
    queryFn: async () => {
      const params: any = {
        page: pageDirectory,
        limit: 10,
      }
      if (debouncedSearch) params.search = debouncedSearch

      const res = await apiClient.get("/users/pegawai/directory", { params })
      return res.data
    },
  })

  const usersList = usersResponse?.data || []
  const usersMeta = usersResponse?.meta || { page: 1, totalPages: 1, total: 0 }

  const directoryList = directoryResponse?.data || []
  const directoryMeta = directoryResponse?.meta || { page: 1, totalPages: 1, total: 0 }

  const getRoleBadge = (roleName: string) => {
    const roleConfig = SIMANTAP_ROLES.find((r) => r.value === roleName)
    if (!roleConfig) {
      return <Badge variant="outline" className="text-xs">{roleName}</Badge>
    }
    return (
      <Badge variant="outline" className={`text-[11px] px-2 py-0.5 font-medium ${roleConfig.badgeClass}`}>
        {roleConfig.label}
      </Badge>
    )
  }

  const handleOpenSetRole = (pegawai: TargetPegawai) => {
    setTargetPegawai(pegawai)
    setSetRoleOpen(true)
  }

  const handleOpenRevokeRole = (pegawai: TargetPegawai) => {
    setTargetPegawai(pegawai)
    setRevokeRoleOpen(true)
  }

  return (
    <div className="px-4 lg:px-6 space-y-6">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Manajemen Akun & Hak Akses
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pengelolaan pengguna dan penetapan 7 Peran RBAC SIMANTAP terintegrasi server E-Gov & SIMPEG Konawe Selatan.
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <StatCards
        totalPegawai={directoryMeta.total}
        totalSimantapUsers={usersMeta.total}
        totalActiveUsers={usersMeta.total}
        totalOpd={38}
        isLoading={isLoadingUsers && isLoadingDirectory}
      />

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearch("") }} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="simantap_users" className="gap-2 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Pengguna Aktif SIMANTAP</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {usersMeta.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="egov_directory" className="gap-2 text-xs">
              <Database className="h-3.5 w-3.5 text-blue-600" />
              <span>Direktori ASN Server E-Gov & SIMPEG</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {directoryMeta.total}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "simantap_users") refetchUsers()
              else refetchDirectory()
            }}
            disabled={isFetchingUsers || isFetchingDirectory}
            className="text-xs h-8 gap-1.5 self-end sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingUsers || isFetchingDirectory ? "animate-spin" : ""}`} />
            Segarkan Data
          </Button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PENGGUNA AKTIF SIMANTAP                            */}
        {/* ========================================================= */}
        <TabsContent value="simantap_users" className="space-y-4 m-0">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Daftar Akun Pengguna SIMANTAP
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Akun yang telah memiliki penetapan hak akses role di Kabupaten Konawe Selatan
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari NIP, nama, atau jabatan..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPageUsers(1)
                      }}
                      className="pl-8 text-xs h-9 bg-background"
                    />
                  </div>

                  <Select
                    value={roleFilter}
                    onValueChange={(val) => {
                      setRoleFilter(val)
                      setPageUsers(1)
                    }}
                  >
                    <SelectTrigger className="h-9 w-40 text-xs">
                      <SelectValue placeholder="Filter Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">Semua Role</SelectItem>
                      {SIMANTAP_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value} className="text-xs">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(val) => {
                      setStatusFilter(val)
                      setPageUsers(1)
                    }}
                  >
                    <SelectTrigger className="h-9 w-32 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
                      <SelectItem value="AKTIF" className="text-xs">Aktif</SelectItem>
                      <SelectItem value="NON_AKTIF" className="text-xs">Non-Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Pegawai ASN</TableHead>
                      <TableHead className="text-xs font-semibold">Jabatan & OPD</TableHead>
                      <TableHead className="text-xs font-semibold">Peran (Role SIMANTAP)</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Terakhir Login</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUsers ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs">Memuat data pengguna...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : usersList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <UsersIcon className="h-8 w-8 stroke-1" />
                            <span className="text-sm font-medium">Tidak ada data pengguna</span>
                            <span className="text-xs text-muted-foreground max-w-sm">
                              {debouncedSearch
                                ? `Tidak ditemukan pengguna dengan kata kunci "${debouncedSearch}"`
                                : "Belum ada pengguna lokal yang terdaftar. Buka tab Direktori ASN untuk menetapkan role."}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersList.map((user: any) => (
                        <TableRow key={user.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="py-3">
                            <div className="font-semibold text-xs text-foreground">
                              {user.namaLengkap}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              NIP. {user.nip}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-xs text-foreground truncate max-w-xs">
                              {user.jabatan || "-"}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3 shrink-0 text-primary" />
                              <span className="truncate max-w-xs">{user.opd?.namaOpd || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            {getRoleBadge(user.role)}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            {user.status === "AKTIF" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1 py-0">
                                <CheckCircle2 className="h-3 w-3" /> Aktif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-destructive border-destructive/20 text-[10px] gap-1 py-0">
                                <XCircle className="h-3 w-3" /> Non-Aktif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-xs text-muted-foreground">
                            {user.lastLoginAt
                              ? new Date(user.lastLoginAt).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Belum pernah login"}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenSetRole({
                                    nip: user.nip,
                                    namaLengkap: user.namaLengkap,
                                    jabatan: user.jabatan,
                                    opd: user.opd?.namaOpd,
                                    currentRole: user.role,
                                  })
                                }
                                className="h-7 px-2 text-xs gap-1"
                              >
                                <Edit3 className="h-3 w-3" />
                                Ubah Role
                              </Button>
                              {user.status === "AKTIF" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenRevokeRole({
                                      nip: user.nip,
                                      namaLengkap: user.namaLengkap,
                                      currentRole: user.role,
                                    })
                                  }
                                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <UserX className="h-3 w-3" />
                                  Cabut
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                <div>
                  Total {usersMeta.total} pengguna terdaftar
                </div>
                <div className="flex items-center gap-2">
                  <span>Halaman {usersMeta.page} dari {usersMeta.totalPages}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPageUsers((p) => Math.max(1, p - 1))}
                      disabled={usersMeta.page <= 1 || isLoadingUsers}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPageUsers((p) => Math.min(usersMeta.totalPages, p + 1))}
                      disabled={usersMeta.page >= usersMeta.totalPages || isLoadingUsers}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 2: DIREKTORI ASN E-GOV & SIMPEG                       */}
        {/* ========================================================= */}
        <TabsContent value="egov_directory" className="space-y-4 m-0">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    Direktori Pegawai ASN (Server E-Gov & SIMPEG Konsel)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pencarian data seluruh pegawai ASN Pemerintah Kabupaten Konawe Selatan untuk penugasan hak akses
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari NIP, nama pegawai, atau OPD..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPageDirectory(1)
                    }}
                    className="pl-8 text-xs h-9 bg-background"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Pegawai ASN</TableHead>
                      <TableHead className="text-xs font-semibold">Jabatan ASN</TableHead>
                      <TableHead className="text-xs font-semibold">OPD / Dinas</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Hak Akses SIMANTAP</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDirectory ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-xs">Menghubungkan ke server E-Gov & SIMPEG...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : directoryList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Database className="h-8 w-8 stroke-1" />
                            <span className="text-sm font-medium">Tidak ada data pegawai</span>
                            <span className="text-xs text-muted-foreground">
                              {debouncedSearch
                                ? `Tidak ditemukan data ASN dengan kata kunci "${debouncedSearch}"`
                                : "Server E-Gov tidak mengembalikan data."}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      directoryList.map((item: any) => (
                        <TableRow key={item.nip} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="py-3">
                            <div className="font-semibold text-xs text-foreground">
                              {item.namaLengkap}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              NIP. {item.nip}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-xs text-foreground max-w-xs truncate">
                            {item.jabatan || "-"}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-xs text-foreground flex items-center gap-1.5">
                              <Building2 className="h-3 w-3 text-primary shrink-0" />
                              <span className="truncate max-w-xs">{item.opd || "-"}</span>
                            </div>
                            {item.unitKerja && item.unitKerja !== item.opd && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-xs mt-0.5 pl-4">
                                {item.unitKerja}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            {item.hasSimantapAccess ? (
                              getRoleBadge(item.simantapRole)
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 font-normal">
                                Belum Diberi Akses
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleOpenSetRole({
                                  nip: item.nip,
                                  namaLengkap: item.namaLengkap,
                                  jabatan: item.jabatan,
                                  opd: item.opd,
                                  currentRole: item.simantapRole,
                                })
                              }
                              className="h-7 px-2.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              <UserPlus className="h-3 w-3" />
                              {item.hasSimantapAccess ? "Ubah Role" : "Tetapkan Role"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                <div>
                  Menampilkan {directoryList.length} dari {directoryMeta.total} data ASN
                </div>
                <div className="flex items-center gap-2">
                  <span>Halaman {directoryMeta.page} dari {directoryMeta.totalPages}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPageDirectory((p) => Math.max(1, p - 1))}
                      disabled={directoryMeta.page <= 1 || isLoadingDirectory}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPageDirectory((p) => Math.min(directoryMeta.totalPages, p + 1))}
                      disabled={directoryMeta.page >= directoryMeta.totalPages || isLoadingDirectory}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Set Role Modal */}
      <SetRoleDialog
        open={setRoleOpen}
        onOpenChange={setSetRoleOpen}
        target={targetPegawai}
      />

      {/* Revoke Role Modal */}
      <RevokeRoleDialog
        open={revokeRoleOpen}
        onOpenChange={setRevokeRoleOpen}
        target={targetPegawai}
      />
    </div>
  )
}
