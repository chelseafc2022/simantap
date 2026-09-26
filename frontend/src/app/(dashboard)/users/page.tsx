"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { apiClient } from "@/lib/api-client"
import { StatCards } from "./components/stat-cards"
import { SetRoleDialog, SIMANTAP_ROLES, TargetPegawai } from "./components/set-role-dialog"
import { RevokeRoleDialog } from "./components/revoke-role-dialog"
import { SearchableCombobox } from "./components/searchable-combobox"
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
  Layers,
  FilterX,
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
  const [selectedInstansi, setSelectedInstansi] = useState("all")
  const [selectedUnitKerja, setSelectedUnitKerja] = useState("all")

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
    queryKey: ["users", pageUsers, debouncedSearch, roleFilter, statusFilter, selectedInstansi, selectedUnitKerja],
    queryFn: async () => {
      const params: any = {
        page: pageUsers,
        limit: 10,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (roleFilter !== "ALL") params.role = roleFilter
      if (statusFilter !== "ALL") params.status = statusFilter
      if (selectedInstansi !== "all") params.instansiId = selectedInstansi
      if (selectedUnitKerja !== "all") params.unitKerjaId = selectedUnitKerja

      const res = await apiClient.get("/users", { params })
      return res.data
    },
  })

  // 2. Fetch List Instansi / Unit Kerja dari SIMPEG
  const { data: instansiResponse } = useQuery({
    queryKey: ["simpeg-instansi"],
    queryFn: async () => {
      const res = await apiClient.get("/users/pegawai/instansi")
      return res.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  // 3. Fetch List Sub Unit Kerja berdasarkan Instansi yang dipilih
  const { data: unitKerjaResponse, isLoading: isLoadingUnitKerja } = useQuery({
    queryKey: ["simpeg-unit-kerja", selectedInstansi],
    queryFn: async () => {
      const params: any = {}
      if (selectedInstansi !== "all") params.instansiId = selectedInstansi
      const res = await apiClient.get("/users/pegawai/unit-kerja", { params })
      return res.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  // 4. Fetch E-Gov & SIMPEG ASN Directory dengan Filter Unit Kerja & Sub Unit Kerja
  const {
    data: directoryResponse,
    isLoading: isLoadingDirectory,
    isFetching: isFetchingDirectory,
    refetch: refetchDirectory,
  } = useQuery({
    queryKey: ["pegawai-directory", pageDirectory, debouncedSearch, selectedInstansi, selectedUnitKerja],
    queryFn: async () => {
      const params: any = {
        page: pageDirectory,
        limit: 10,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (selectedInstansi !== "all") params.instansiId = selectedInstansi
      if (selectedUnitKerja !== "all") params.unitKerjaId = selectedUnitKerja

      const res = await apiClient.get("/users/pegawai/directory", { params })
      return res.data
    },
  })

  const usersList = Array.isArray(usersResponse?.data)
    ? usersResponse.data
    : Array.isArray(usersResponse?.data?.data)
    ? usersResponse.data.data
    : []
  const usersMeta = usersResponse?.meta || usersResponse?.data?.meta || { page: 1, totalPages: 1, total: 0 }

  const directoryList = Array.isArray(directoryResponse?.data)
    ? directoryResponse.data
    : Array.isArray(directoryResponse?.data?.data)
    ? directoryResponse.data.data
    : []
  const directoryMeta = directoryResponse?.meta || directoryResponse?.data?.meta || { page: 1, totalPages: 1, total: 0 }
  const instansiList = instansiResponse || []
  const unitKerjaList = unitKerjaResponse || []

  // Options for SearchableCombobox (typeable filter)
  const instansiOptions = useMemo(() => {
    return instansiList.map((ins: any) => ({
      id: String(ins.id),
      label: ins.instansi,
    }))
  }, [instansiList])

  const unitKerjaOptions = useMemo(() => {
    return unitKerjaList.map((uk: any) => ({
      id: String(uk.id),
      label: uk.unitKerja,
    }))
  }, [unitKerjaList])

  const getRoleBadge = (roleName: string) => {
    const roleConfig = SIMANTAP_ROLES.find((r) => r.value === roleName)
    if (!roleConfig) {
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{roleName}</Badge>
    }
    return (
      <Badge
        variant="outline"
        title={roleConfig.label}
        className={`text-[10px] px-1.5 py-0.5 font-medium whitespace-nowrap shrink-0 ${roleConfig.badgeClass}`}
      >
        {roleConfig.shortLabel || roleConfig.label}
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
            <CardHeader className="p-4 sm:p-5 border-b border-border/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Daftar Akun Pengguna SIMANTAP
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Akun yang telah memiliki penetapan hak akses role di Kabupaten Konawe Selatan
                  </CardDescription>
                </div>

                {(roleFilter !== "ALL" || statusFilter !== "ALL" || selectedInstansi !== "all" || selectedUnitKerja !== "all" || search) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRoleFilter("ALL")
                      setStatusFilter("ALL")
                      setSelectedInstansi("all")
                      setSelectedUnitKerja("all")
                      setSearch("")
                      setPageUsers(1)
                    }}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto"
                    title="Reset Semua Filter"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    Reset Filter
                  </Button>
                )}
              </div>

              {/* Toolbar Filter */}
              <div className="space-y-3 pt-1">
                {/* Baris 1: Filter Pencarian diletakkan di atas */}
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari NIP, nama, atau jabatan..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPageUsers(1)
                    }}
                    className="pl-8 text-xs h-9 bg-background w-full"
                  />
                </div>

                {/* Baris 2: Sejajar 4 filter: Unit Kerja, Sub Unit Kerja, Role, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Filter Unit Kerja (Instansi / OPD) - Searchable & Typeable */}
                  <div className="w-full">
                    <SearchableCombobox
                      value={selectedInstansi}
                      onValueChange={(val) => {
                        setSelectedInstansi(val)
                        setSelectedUnitKerja("all")
                        setPageUsers(1)
                      }}
                      items={instansiOptions}
                      placeholder="Ketik / Pilih Unit Kerja (OPD)..."
                      searchPlaceholder="Ketik nama Unit Kerja / OPD..."
                      emptyText="Unit Kerja tidak ditemukan."
                      allLabel="-- Semua Unit Kerja (OPD) --"
                      icon={<Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    />
                  </div>

                  {/* Filter Sub Unit Kerja - Searchable & Typeable */}
                  <div className="w-full">
                    <SearchableCombobox
                      value={selectedUnitKerja}
                      onValueChange={(val) => {
                        setSelectedUnitKerja(val)
                        setPageUsers(1)
                      }}
                      items={unitKerjaOptions}
                      placeholder={isLoadingUnitKerja ? "Memuat Sub Unit..." : "Ketik / Pilih Sub Unit..."}
                      searchPlaceholder="Ketik nama Sub Unit Kerja..."
                      emptyText="Sub Unit Kerja tidak ditemukan."
                      allLabel="-- Semua Sub Unit Kerja --"
                      icon={<Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                      disabled={isLoadingUnitKerja}
                    />
                  </div>

                  {/* Filter Role */}
                  <div className="w-full">
                    <Select
                      value={roleFilter}
                      onValueChange={(val) => {
                        setRoleFilter(val)
                        setPageUsers(1)
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background w-full">
                        <SelectValue placeholder="Semua Role" />
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
                  </div>

                  {/* Filter Status */}
                  <div className="w-full">
                    <Select
                      value={statusFilter}
                      onValueChange={(val) => {
                        setStatusFilter(val)
                        setPageUsers(1)
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background w-full">
                        <SelectValue placeholder="Semua Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
                        <SelectItem value="AKTIF" className="text-xs">Aktif</SelectItem>
                        <SelectItem value="NON_AKTIF" className="text-xs">Non-Aktif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold min-w-[170px]">Pegawai ASN</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[210px]">Jabatan & OPD</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[150px]">Peran (Role SIMANTAP)</TableHead>
                      <TableHead className="text-xs font-semibold text-center min-w-[85px]">Status</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[120px]">Terakhir Login</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[160px] pr-4">Aksi</TableHead>
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
                          <TableCell className="py-3 align-top min-w-[170px]">
                            <div className="font-semibold text-xs text-foreground leading-snug break-words whitespace-normal line-clamp-2">
                              {user.namaLengkap}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              NIP. {user.nip}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-top min-w-[210px]">
                            <div 
                              className="text-xs text-foreground font-medium line-clamp-2 md:line-clamp-3 leading-relaxed break-words whitespace-normal"
                              title={user.jabatan || "-"}
                            >
                              {user.jabatan || "-"}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-start gap-1 mt-1">
                              <Building2 className="h-3 w-3 shrink-0 text-primary mt-0.5" />
                              <span 
                                className="line-clamp-2 leading-tight break-words whitespace-normal"
                                title={user.opd?.namaOpd || "-"}
                              >
                                {user.opd?.namaOpd || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-top min-w-[150px]">
                            {(user.roles && user.roles.length > 0) || user.role ? (
                              <div className="flex flex-wrap gap-1 items-center">
                                {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map((r: string) => (
                                  <span key={r}>{getRoleBadge(r)}</span>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 font-normal">
                                Belum Diberi Akses
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-center align-top min-w-[85px]">
                            {user.status === "AKTIF" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1 py-0 px-2 font-medium whitespace-nowrap">
                                <CheckCircle2 className="h-3 w-3" /> Aktif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-destructive border-destructive/20 text-[10px] gap-1 py-0 px-2 font-medium whitespace-nowrap">
                                <XCircle className="h-3 w-3" /> Non-Aktif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-xs text-muted-foreground align-top min-w-[120px] whitespace-normal leading-snug">
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
                          <TableCell className="py-3 text-right align-top min-w-[160px] pr-4">
                            <div className="flex items-center justify-end gap-1.5 shrink-0">
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
                                    currentRoles: (user.roles && user.roles.length > 0) ? user.roles : (user.role ? [user.role] : []),
                                  })
                                }
                                className="h-7 px-2 text-xs gap-1 shrink-0 whitespace-nowrap"
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
                                      currentRoles: (user.roles && user.roles.length > 0) ? user.roles : (user.role ? [user.role] : []),
                                    })
                                  }
                                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 whitespace-nowrap"
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
            <CardHeader className="p-4 sm:p-5 border-b border-border/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Pegawai ASN
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Pencarian data seluruh pegawai ASN Pemerintah Kabupaten Konawe Selatan untuk penugasan hak akses
                  </CardDescription>
                </div>

                {/* Tombol Reset Filter jika aktif */}
                {(selectedInstansi !== "all" || selectedUnitKerja !== "all" || search) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedInstansi("all")
                      setSelectedUnitKerja("all")
                      setSearch("")
                      setPageDirectory(1)
                    }}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto"
                    title="Reset Semua Filter"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    Reset Filter
                  </Button>
                )}
              </div>

              {/* Toolbar Filter Tab 2: Pencarian di atas, Unit Kerja & Sub Unit sejajar */}
              <div className="space-y-3 pt-1">
                {/* Baris 1: Pencarian Penuh */}
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari NIP atau nama pegawai..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPageDirectory(1)
                    }}
                    className="pl-8 text-xs h-9 bg-background w-full"
                  />
                </div>

                {/* Baris 2: Sejajar 2 Kolom Unit Kerja & Sub Unit Kerja */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="w-full">
                    <SearchableCombobox
                      value={selectedInstansi}
                      onValueChange={(val) => {
                        setSelectedInstansi(val)
                        setSelectedUnitKerja("all")
                        setPageDirectory(1)
                      }}
                      items={instansiOptions}
                      placeholder="Ketik / Pilih Unit Kerja (OPD)..."
                      searchPlaceholder="Ketik nama Unit Kerja / OPD..."
                      emptyText="Unit Kerja tidak ditemukan."
                      allLabel="-- Semua Unit Kerja (OPD) --"
                      icon={<Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    />
                  </div>

                  <div className="w-full">
                    <SearchableCombobox
                      value={selectedUnitKerja}
                      onValueChange={(val) => {
                        setSelectedUnitKerja(val)
                        setPageDirectory(1)
                      }}
                      items={unitKerjaOptions}
                      placeholder={isLoadingUnitKerja ? "Memuat Sub Unit..." : "Ketik / Pilih Sub Unit..."}
                      searchPlaceholder="Ketik nama Sub Unit Kerja..."
                      emptyText="Sub Unit Kerja tidak ditemukan."
                      allLabel="-- Semua Sub Unit Kerja --"
                      icon={<Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                      disabled={isLoadingUnitKerja}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold min-w-[180px]">Pegawai ASN</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[210px]">Jabatan ASN</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[210px]">OPD / Dinas</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[130px]">Hak Akses SIMANTAP</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[140px] pr-4">Aksi</TableHead>
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
                      directoryList.map((item: any, idx: number) => (
                        <TableRow key={item.egovId || `${item.nip}-${item.username || idx}`} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="py-3 align-top min-w-[180px]">
                            <div className="font-semibold text-xs text-foreground leading-snug break-words whitespace-normal">
                              {item.namaLengkap}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[11px] font-mono text-muted-foreground">
                                NIP. {item.nip}
                              </span>
                              {item.username && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-mono px-1.5 py-0 bg-muted/80 text-foreground border border-border/60"
                                  title={`Akun E-Gov: ${item.username}`}
                                >
                                  @{item.username}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-top min-w-[210px]">
                            <span 
                              className="text-xs text-foreground leading-relaxed line-clamp-2 md:line-clamp-3 break-words whitespace-normal block"
                              title={item.jabatan || "-"}
                            >
                              {item.jabatan || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 align-top min-w-[210px]">
                            <div className="flex items-start gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span 
                                  className="text-xs text-foreground font-medium leading-relaxed line-clamp-2 md:line-clamp-3 break-words whitespace-normal block"
                                  title={item.opd || "-"}
                                >
                                  {item.opd || "-"}
                                </span>
                                {item.unitKerja && item.unitKerja !== item.opd && (
                                  <span 
                                    className="text-[11px] text-muted-foreground leading-snug line-clamp-2 break-words whitespace-normal block mt-0.5"
                                    title={item.unitKerja}
                                  >
                                    {item.unitKerja}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-top min-w-[130px]">
                            {item.hasSimantapAccess ? (
                              <div className="flex flex-wrap gap-1 items-center">
                                {((item.simantapRoles && item.simantapRoles.length > 0)
                                  ? item.simantapRoles
                                  : (item.simantapRole ? [item.simantapRole] : [])
                                ).map((r: string) => (
                                  <span key={r}>{getRoleBadge(r)}</span>
                                ))}
                              </div>
                            ) : item.simantapStatus === "NON_AKTIF" ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1 opacity-80">
                                  {((item.simantapRoles && item.simantapRoles.length > 0)
                                    ? item.simantapRoles
                                    : (item.simantapRole ? [item.simantapRole] : [])
                                  ).map((r: string) => (
                                    <span key={r}>{getRoleBadge(r)}</span>
                                  ))}
                                </div>
                                <Badge variant="outline" className="text-destructive border-destructive/20 text-[9px] py-0 font-normal whitespace-nowrap">
                                  Akses Dicabut
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 font-normal whitespace-nowrap">
                                Belum Diberi Akses
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-right align-top min-w-[140px] pr-4">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleOpenSetRole({
                                  nip: item.nip,
                                  namaLengkap: item.namaLengkap,
                                  jabatan: item.jabatan,
                                  opd: item.opd,
                                  currentRole: item.simantapRole,
                                  currentRoles: (item.simantapRoles && item.simantapRoles.length > 0) ? item.simantapRoles : (item.simantapRole ? [item.simantapRole] : []),
                                  username: item.username,
                                })
                              }
                              className="h-7 px-2.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0 whitespace-nowrap"
                            >
                              <UserPlus className="h-3 w-3 shrink-0" />
                              <span>{item.hasSimantapAccess || item.simantapStatus === "NON_AKTIF" ? "Ubah Role" : "Tetapkan Role"}</span>
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
