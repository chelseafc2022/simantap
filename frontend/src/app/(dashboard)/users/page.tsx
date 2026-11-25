"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDebounce } from "use-debounce"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { StatCards } from "./components/stat-cards"
import { MONALISA_ROLES, SetRoleDialog, TargetPegawai } from "./components/set-role-dialog"
import { RevokeRoleDialog } from "./components/revoke-role-dialog"
import { SelfRegisterQrDialog } from "./components/self-register-qr-dialog"
import { SearchableCombobox } from "./components/searchable-combobox"
import { isExcludedOpd } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  QrCode,
  Clock,
} from "lucide-react"

export default function UsersManagementPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading: isAuthLoading } = useAuth()
  const userRoles: string[] = [
    ...(user?.role ? [user.role] : []),
    ...(user?.roles || []),
    ...(user?.userRoles?.map((ur: any) => ur.role?.kode || ur.role) || []),
  ]
  const isAdministrator = userRoles.includes("ADMINISTRATOR")

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>("monalisa_users")
  const [usersViewMode, setUsersViewMode] = useState<"list" | "opd_recap">("list")
  const [opdRecapFilter, setOpdRecapFilter] = useState<"ALL" | "INCOMPLETE" | "NO_ADMIN" | "NO_BENDAHARA" | "COMPLETE" | "EMPTY">("ALL")
  const [opdRecapSearch, setOpdRecapSearch] = useState("")

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
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [targetPegawai, setTargetPegawai] = useState<TargetPegawai | null>(null)

  // 1. Fetch MONALISA KONSEL local users
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
    enabled: isAdministrator,
    placeholderData: keepPreviousData,
  })

  // 2. Fetch List Instansi / Unit Kerja dari SIMPEG
  const { data: instansiResponse } = useQuery({
    queryKey: ["simpeg-instansi"],
    queryFn: async () => {
      const res = await apiClient.get("/users/pegawai/instansi")
      return res.data?.data || []
    },
    enabled: isAdministrator,
    staleTime: 10 * 60 * 1000,
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
    enabled: isAdministrator,
    staleTime: 10 * 60 * 1000,
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
    enabled: isAdministrator,
    placeholderData: keepPreviousData,
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

  const {
    data: opdRecapResponse,
    isLoading: isLoadingOpdRecap,
    refetch: refetchOpdRecap,
  } = useQuery<{
    summary: {
      totalOpd: number
      lengkap: number
      belumLengkap: number
      withAdminPpk: number
      withoutAdminPpk: number
      withBendahara: number
      withoutBendahara: number
      emptyOpd: number
    }
    data: Array<{
      opdId: string
      namaOpd: string
      hasAdminPpk: boolean
      adminPpkCount: number
      hasBendahara: boolean
      bendaharaCount: number
      isComplete: boolean
      totalUsers: number
      roleCounts: Record<string, number>
      users: Array<{
        id: string
        nip: string
        namaLengkap: string
        roles: string[]
      }>
    }>
  }>({
    queryKey: ["users-opd-recap"],
    queryFn: async () => {
      const res = await apiClient.get("/users/opd-recap")
      return {
        summary: res.data?.summary || {
          totalOpd: 0,
          lengkap: 0,
          belumLengkap: 0,
          withAdminPpk: 0,
          withoutAdminPpk: 0,
          withBendahara: 0,
          withoutBendahara: 0,
          emptyOpd: 0,
        },
        data: Array.isArray(res.data?.data) ? res.data.data : [],
      }
    },
    enabled: isAdministrator,
  })

  const filteredOpdRecap = useMemo(() => {
    const rows = opdRecapResponse?.data || []
    const q = opdRecapSearch.trim().toLowerCase()
    return rows.filter((item) => {
      if (q && !item.namaOpd.toLowerCase().includes(q)) return false
      if (opdRecapFilter === "INCOMPLETE") return !item.isComplete
      if (opdRecapFilter === "NO_ADMIN") return !item.hasAdminPpk
      if (opdRecapFilter === "NO_BENDAHARA") return !item.hasBendahara
      if (opdRecapFilter === "COMPLETE") return item.isComplete
      if (opdRecapFilter === "EMPTY") return item.totalUsers === 0
      return true
    })
  }, [opdRecapResponse, opdRecapFilter, opdRecapSearch])

  const {
    data: pendingRequests = [],
    isLoading: isLoadingPending,
    isFetching: isFetchingPending,
    refetch: refetchPending,
  } = useQuery<
    Array<{
      id: string
      nip: string
      namaLengkap: string
      jabatan: string | null
      namaOpd: string
      namaUnitKerja: string | null
      requestedRoles: string[]
      createdAt: string
    }>
  >({
    queryKey: ["self-register-requests"],
    queryFn: async () => {
      const res = await apiClient.get("/users/self-register-requests")
      return res.data?.data || []
    },
    enabled: isAdministrator,
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/users/self-register-requests/${id}/approve`, {})
    },
    onSuccess: () => {
      toast.success("Registrasi disetujui dan role pegawai telah diaktifkan.")
      queryClient.invalidateQueries({ queryKey: ["self-register-requests"] })
      queryClient.invalidateQueries({ queryKey: ["monalisa-users"] })
      queryClient.invalidateQueries({ queryKey: ["egov-directory"] })
      queryClient.invalidateQueries({ queryKey: ["users-opd-recap"] })
    },
    onError: () => {
      toast.error("Gagal menyetujui pengajuan registrasi.")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/users/self-register-requests/${id}/reject`, {})
    },
    onSuccess: () => {
      toast.success("Pengajuan registrasi ditolak.")
      queryClient.invalidateQueries({ queryKey: ["self-register-requests"] })
      queryClient.invalidateQueries({ queryKey: ["egov-directory"] })
    },
    onError: () => {
      toast.error("Gagal menolak pengajuan registrasi.")
    },
  })

  // Options for SearchableCombobox (typeable filter)
  const instansiOptions = useMemo(() => {
    return instansiList
      .filter((ins: any) => !isExcludedOpd(ins.id) && !isExcludedOpd(ins.instansi))
      .map((ins: any) => ({
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

  const getRoleBadge = (roleName: string, ppkOpdName?: string | null) => {
    const roleConfig = MONALISA_ROLES.find((r) => r.value === roleName)
    if (!roleConfig) {
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{roleName}</Badge>
    }
    const displayLabel =
      roleName === "ADMIN_PPK" && ppkOpdName
        ? `Admin PPK - ${ppkOpdName}`
        : roleConfig.shortLabel || roleConfig.label
    return (
      <Badge
        variant="outline"
        title={displayLabel}
        className={`text-[10px] px-1.5 py-0.5 font-medium max-w-[185px] truncate ${roleConfig.badgeClass}`}
      >
        <span className="truncate">{displayLabel}</span>
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

  if (isAuthLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
            Halaman Manajemen Akun & Hak Akses Pengguna hanya dapat diakses oleh pengguna dengan peran <strong className="text-foreground">Administrator Utama</strong>. Akun Anda saat ini tidak memiliki kewenangan untuk mengakses menu ini.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard")} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          Kembali ke Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="min-w-0 px-3 sm:px-4 lg:px-6 space-y-6">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Manajemen Akun & Hak Akses
          </h1>
        </div>
      </div>

      {/* Top Stat Cards */}
      <StatCards
        totalPegawai={directoryMeta.total}
        totalActiveUsers={usersMeta.total}
        totalOpd={38}
        isLoading={isLoadingUsers && isLoadingDirectory}
      />

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearch("") }} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
        {/* TabsList scrollable di mobile */}
        <div className="overflow-x-auto pb-0.5 -mx-1 px-1">
          <TabsList className="bg-muted/60 p-1 flex w-max min-w-full sm:w-auto sm:min-w-0">
            <TabsTrigger value="monalisa_users" className="gap-1.5 text-xs whitespace-nowrap">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Pengguna Aktif</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {usersMeta.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="egov_directory" className="gap-1.5 text-xs whitespace-nowrap">
              <Database className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>Direktori ASN</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {directoryMeta.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending_requests" className="gap-1.5 text-xs whitespace-nowrap">
              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Menunggu Konfirmasi</span>
              <Badge
                variant={pendingRequests.length > 0 ? "default" : "secondary"}
                className={`text-[10px] px-1.5 py-0 ml-1 ${
                  pendingRequests.length > 0 ? "bg-amber-600 text-white" : ""
                }`}
              >
                {pendingRequests.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQrDialogOpen(true)}
            className="text-xs h-8 gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>QR Registrasi Mandiri</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "monalisa_users") {
                refetchUsers()
                refetchOpdRecap()
              } else if (activeTab === "pending_requests") refetchPending()
              else refetchDirectory()
            }}
            disabled={isFetchingUsers || isFetchingDirectory || isFetchingPending}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingUsers || isFetchingDirectory || isFetchingPending ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </Button>
        </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PENGGUNA AKTIF MONALISA KONSEL                     */}
        {/* ========================================================= */}
        <TabsContent value="monalisa_users" className="space-y-4 m-0">
          {/* Sub-switch: Daftar Pengguna vs Rekap per OPD */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setUsersViewMode("list")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  usersViewMode === "list"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UsersIcon className="h-3.5 w-3.5" />
                <span>Daftar Pengguna</span>
              </button>
              <button
                type="button"
                onClick={() => setUsersViewMode("opd_recap")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  usersViewMode === "opd_recap"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Rekap per OPD</span>
                {(opdRecapResponse?.summary?.belumLengkap ?? 0) > 0 && (
                  <Badge className="ml-0.5 bg-amber-600 text-white text-[10px] px-1.5 py-0">
                    {opdRecapResponse?.summary?.belumLengkap} Belum Lengkap
                  </Badge>
                )}
              </button>
            </div>
          </div>

          {usersViewMode === "opd_recap" ? (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="p-4 sm:p-5 border-b border-border/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Rekap Kesiapan Admin PPK &amp; Bendahara per OPD
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Menampilkan seluruh OPD beserta status ketersediaan Admin PPK, Bendahara, dan role lain yang sudah terdaftar.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <Badge variant="outline">
                      Total OPD: {opdRecapResponse?.summary?.totalOpd ?? 0}
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                      Lengkap (PPK &amp; Bendahara): {opdRecapResponse?.summary?.lengkap ?? 0}
                    </Badge>
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                      Belum Ada Admin PPK: {opdRecapResponse?.summary?.withoutAdminPpk ?? 0}
                    </Badge>
                    <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
                      Belum Ada Bendahara: {opdRecapResponse?.summary?.withoutBendahara ?? 0}
                    </Badge>
                    <Badge variant="secondary">
                      Belum Ada User: {opdRecapResponse?.summary?.emptyOpd ?? 0}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama OPD..."
                      value={opdRecapSearch}
                      onChange={(e) => setOpdRecapSearch(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { key: "ALL", label: "Semua OPD" },
                        { key: "INCOMPLETE", label: "Belum Lengkap" },
                        { key: "NO_ADMIN", label: "Belum Ada PPK" },
                        { key: "NO_BENDAHARA", label: "Belum Ada Bendahara" },
                        { key: "COMPLETE", label: "Lengkap" },
                        { key: "EMPTY", label: "Belum Ada User" },
                      ] as const
                    ).map((f) => (
                      <Button
                        key={f.key}
                        type="button"
                        size="sm"
                        variant={opdRecapFilter === f.key ? "default" : "outline"}
                        onClick={() => setOpdRecapFilter(f.key)}
                        className={`h-9 text-xs ${
                          opdRecapFilter === f.key ? "bg-emerald-600 hover:bg-emerald-700" : ""
                        }`}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingOpdRecap ? (
                  <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat rekap OPD...</span>
                  </div>
                ) : filteredOpdRecap.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Tidak ada OPD yang cocok dengan filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-12 text-center text-xs">No</TableHead>
                          <TableHead className="text-xs min-w-[230px]">Unit Kerja (OPD)</TableHead>
                          <TableHead className="text-xs min-w-[210px]">Status Admin PPK &amp; Bendahara</TableHead>
                          <TableHead className="text-xs min-w-[280px]">Pengguna &amp; Role yang Sudah Ada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOpdRecap.map((opd, idx) => (
                          <TableRow key={opd.opdId}>
                            <TableCell className="text-center font-mono text-xs text-muted-foreground align-top py-3">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-foreground align-top py-3">
                              {opd.namaOpd}
                            </TableCell>
                            <TableCell className="align-top py-3">
                              <div className="flex flex-col items-start gap-1">
                                {opd.hasAdminPpk ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Ada Admin PPK ({opd.adminPpkCount})</span>
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-[11px] gap-1">
                                    <ShieldAlert className="h-3 w-3" />
                                    <span>Belum Ada Admin PPK</span>
                                  </Badge>
                                )}
                                {opd.hasBendahara ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Ada Bendahara ({opd.bendaharaCount})</span>
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[11px] gap-1">
                                    <ShieldAlert className="h-3 w-3" />
                                    <span>Belum Ada Bendahara</span>
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-3">
                              {opd.users.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">
                                  Belum ada pengguna terdaftar
                                </span>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(opd.roleCounts).map(([roleCode, cnt]) => (
                                      <span key={roleCode} className="inline-flex items-center gap-1">
                                        {getRoleBadge(roleCode)}
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                          ({cnt})
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                                    {opd.users.map((u) => (
                                      <div key={u.id} className="truncate">
                                        • <span className="text-foreground font-medium">{u.namaLengkap}</span>{" "}
                                        <span className="font-mono text-[10px]">
                                          ({u.roles.map((r) => MONALISA_ROLES.find((m) => m.value === r)?.shortLabel || r).join(", ")})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-border/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Daftar Pengguna
                  </CardTitle>
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
                        {MONALISA_ROLES.map((r) => (
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
              {/* Mobile View: Tampilan Kartu Pengguna (< md) */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-neutral-700">
                {isLoadingUsers ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs">Memuat data pengguna...</span>
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <UsersIcon className="h-8 w-8 stroke-1" />
                    <span className="text-sm font-medium">Tidak ada data pengguna</span>
                    <span className="text-xs text-muted-foreground max-w-sm">
                      {debouncedSearch
                        ? `Tidak ditemukan pengguna dengan kata kunci "${debouncedSearch}"`
                        : "Belum ada pengguna lokal yang terdaftar. Buka tab Direktori ASN untuk menetapkan role."}
                    </span>
                  </div>
                ) : (
                  usersList.map((user: any) => (
                    <div key={user.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                      {/* Header: Nama Lengkap & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm text-foreground leading-snug">
                            {user.namaLengkap}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[11px] font-mono text-muted-foreground">
                              NIP. {user.nip}
                            </span>
                            {user.username && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono px-1.5 py-0 bg-muted/80 text-foreground border border-border/60"
                                title={`Akun E-Gov: ${user.username}`}
                              >
                                @{user.username}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          {user.status === "AKTIF" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1 py-0 px-2 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive/20 text-[10px] gap-1 py-0 px-2 font-medium">
                              <XCircle className="h-3 w-3" /> Non-Aktif
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Jabatan & Sub Unit */}
                      <div className="space-y-1 text-xs">
                        <div className="text-foreground font-medium">
                          {user.jabatan || "-"}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-md">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">
                            {user.subUnit?.namaSubUnit || user.opd?.namaOpd || "-"}
                          </span>
                        </div>
                      </div>

                      {/* Peran MONALISA KONSEL */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Peran MONALISA KONSEL:</span>
                        <div>
                          {(user.roles && user.roles.length > 0) || user.role ? (
                            <div className="flex flex-wrap gap-1 items-center">
                              {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map((r: string) => (
                                <span key={r}>{getRoleBadge(r, user.accessScopes?.find((scope: any) => scope.role === "ADMIN_PPK")?.opd?.namaOpd)}</span>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 font-normal">
                              Belum Diberi Akses
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Terakhir Login & Tombol Aksi */}
                      <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200 dark:border-neutral-700 text-xs">
                        <span className="text-[11px] text-muted-foreground">
                          {user.lastLoginAt
                            ? `Login: ${new Date(user.lastLoginAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}`
                            : "Belum pernah login"}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleOpenSetRole({
                                nip: user.nip,
                                namaLengkap: user.namaLengkap,
                                username: user.username,
                                jabatan: user.jabatan,
                                opd: user.opd?.namaOpd,
                                opdId: user.accessScopes?.find((scope: any) => scope.role === "ADMIN_PPK")?.opdId || user.opdId,
                                subUnitId: user.accessScopes?.some((scope: any) => scope.role === "ADMIN_PPK")
                                  ? user.accessScopes.find((scope: any) => scope.role === "ADMIN_PPK")?.subUnitId
                                  : user.subUnitId,
                                ppkOpdName: user.accessScopes?.find((scope: any) => scope.role === "ADMIN_PPK")?.opd?.namaOpd,
                                currentRole: user.role,
                                currentRoles: (user.roles && user.roles.length > 0) ? user.roles : (user.role ? [user.role] : []),
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
                                  currentRoles: (user.roles && user.roles.length > 0) ? user.roles : (user.role ? [user.role] : []),
                                })
                              }
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <UserX className="h-3 w-3" />
                              Cabut
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop & Tablet View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader className="bg-gray-50/90 dark:bg-neutral-800/80">
                    <TableRow className="hover:bg-transparent border-b border-gray-200 dark:border-neutral-700">
                      <TableHead className="text-xs font-semibold min-w-[170px] border-r border-b border-gray-200 dark:border-neutral-700">Pegawai ASN</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[210px] border-r border-b border-gray-200 dark:border-neutral-700">Jabatan & Sub Unit</TableHead>
                      <TableHead className="text-xs font-semibold w-[195px] max-w-[200px] border-r border-b border-gray-200 dark:border-neutral-700">Peran (Role)</TableHead>
                      <TableHead className="text-xs font-semibold text-center min-w-[85px] border-r border-b border-gray-200 dark:border-neutral-700">Status</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[120px] border-r border-b border-gray-200 dark:border-neutral-700">Terakhir Login</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[160px] pr-4 border-b border-gray-200 dark:border-neutral-700">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUsers ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center border-b border-gray-200 dark:border-neutral-700">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs">Memuat data pengguna...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : usersList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center border-b border-gray-200 dark:border-neutral-700">
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
                        <TableRow key={user.id} className="hover:bg-muted/40 transition-colors border-b border-gray-200 dark:border-neutral-700">
                          <TableCell className="py-3 align-top min-w-[170px] border-r border-b border-gray-200 dark:border-neutral-700">
                            <div className="font-semibold text-xs text-foreground leading-snug break-words whitespace-normal line-clamp-2">
                              {user.namaLengkap}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[11px] font-mono text-muted-foreground">
                                NIP. {user.nip}
                              </span>
                              {user.username && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-mono px-1.5 py-0 bg-muted/80 text-foreground border border-border/60"
                                  title={`Akun E-Gov: ${user.username}`}
                                >
                                  @{user.username}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-top min-w-[210px] border-r border-b border-gray-200 dark:border-neutral-700">
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
                                title={user.subUnit?.namaSubUnit || user.opd?.namaOpd || "-"}
                              >
                                {user.subUnit?.namaSubUnit || user.opd?.namaOpd || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-top w-[195px] max-w-[200px] border-r border-b border-gray-200 dark:border-neutral-700">
                            {(user.roles && user.roles.length > 0) || user.role ? (
                              <div className="flex flex-wrap gap-1 items-center">
                                {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map((r: string) => (
                                  <span key={r}>{getRoleBadge(r, user.accessScopes?.find((scope: any) => scope.role === "ADMIN_PPK")?.opd?.namaOpd)}</span>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 font-normal">
                                Belum Diberi Akses
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-center align-top min-w-[85px] border-r border-b border-gray-200 dark:border-neutral-700">
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
                          <TableCell className="py-3 text-xs text-muted-foreground align-top min-w-[120px] whitespace-normal leading-snug border-r border-b border-gray-200 dark:border-neutral-700">
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
                          <TableCell className="py-3 text-right align-top min-w-[160px] pr-4 border-b border-gray-200 dark:border-neutral-700">
                            <div className="flex items-center justify-end gap-1.5 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenSetRole({
                                    nip: user.nip,
                                    namaLengkap: user.namaLengkap,
                                    username: user.username,
                                    jabatan: user.jabatan,
                                    opd: user.opd?.namaOpd,
                                    opdId: user.accessScopes?.find((scope: any) => scope.role === "ADMIN_PPK")?.opdId || user.opdId,
                                    subUnitId: user.accessScopes?.some((scope: any) => scope.role === "ADMIN_PPK")
                                      ? user.accessScopes.find((scope: any) => scope.role === "ADMIN_PPK")?.subUnitId
                                      : user.subUnitId,
                                    ppkOpdName: user.accessScopes?.find((scope: any) => scope.role === "ADMIN_PPK")?.opd?.namaOpd,
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
          )}
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
              {/* Mobile View: Tampilan Kartu Direktori ASN (< md) */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-neutral-700">
                {isLoadingDirectory ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-xs">Menghubungkan ke server E-Gov & SIMPEG...</span>
                  </div>
                ) : directoryList.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Database className="h-8 w-8 stroke-1" />
                    <span className="text-sm font-medium">Tidak ada data pegawai</span>
                    <span className="text-xs text-muted-foreground">
                      {debouncedSearch
                        ? `Tidak ditemukan data ASN dengan kata kunci "${debouncedSearch}"`
                        : "Server E-Gov tidak mengembalikan data."}
                    </span>
                  </div>
                ) : (
                  directoryList.map((item: any, idx: number) => (
                    <div key={item.egovId || `${item.nip}-${item.username || idx}`} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                      {/* Header: Nama Lengkap & Username & Status Akses */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm text-foreground leading-snug">
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
                              >
                                @{item.username}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          {item.hasSimantapAccess ? (
                            <div className="flex flex-wrap gap-1">
                              {((item.simantapRoles && item.simantapRoles.length > 0)
                                ? item.simantapRoles
                                : (item.simantapRole ? [item.simantapRole] : [])
                              ).map((r: string) => (
                                <span key={r}>{getRoleBadge(r, item.simantapPpkOpdName)}</span>
                              ))}
                            </div>
                          ) : item.simantapStatus === "NON_AKTIF" ? (
                            <Badge variant="outline" className="text-destructive border-destructive/20 text-[9px] py-0 font-normal">
                              Akses Dicabut
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 font-normal">
                              Belum Ada Akses
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Jabatan & Unit Kerja */}
                      <div className="space-y-1 text-xs">
                        <div className="text-foreground font-medium">
                          {item.jabatan || "-"}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-md">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">
                            {item.unitKerja || item.opd || "-"}
                          </span>
                        </div>
                      </div>

                      {/* Tombol Aksi */}
                      <div className="pt-2 border-t border-dashed border-gray-200 dark:border-neutral-700">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleOpenSetRole({
                              nip: item.nip,
                              namaLengkap: item.namaLengkap,
                              jabatan: item.jabatan,
                              opd: item.opd,
                              opdId: item.simantapPpkOpdId || item.instansiId,
                              subUnitId: item.simantapPpkOpdId ? item.simantapPpkSubUnitId : item.unitKerjaId,
                              ppkOpdName: item.simantapPpkOpdName,
                              currentRole: item.simantapRole,
                              currentRoles: (item.simantapRoles && item.simantapRoles.length > 0) ? item.simantapRoles : (item.simantapRole ? [item.simantapRole] : []),
                              username: item.username,
                            })
                          }
                          className="w-full h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium justify-center"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {item.hasSimantapAccess ? "Ubah Peran / Akses MONALISA KONSEL" : "Tetapkan Akses MONALISA KONSEL"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop & Tablet View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader className="bg-gray-50/90 dark:bg-neutral-800/80">
                    <TableRow className="hover:bg-transparent border-b border-gray-200 dark:border-neutral-700">
                      <TableHead className="text-xs font-semibold min-w-[180px] border-r border-b border-gray-200 dark:border-neutral-700">Pegawai ASN</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[210px] border-r border-b border-gray-200 dark:border-neutral-700">Jabatan ASN</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[210px] border-r border-b border-gray-200 dark:border-neutral-700">Sub Unit Kerja</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[130px] border-r border-b border-gray-200 dark:border-neutral-700">Hak Akses MONALISA KONSEL</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[140px] pr-4 border-b border-gray-200 dark:border-neutral-700">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDirectory ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center border-b border-gray-200 dark:border-neutral-700">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-xs">Menghubungkan ke server E-Gov & SIMPEG...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : directoryList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center border-b border-gray-200 dark:border-neutral-700">
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
                        <TableRow key={item.egovId || `${item.nip}-${item.username || idx}`} className="hover:bg-muted/40 transition-colors border-b border-gray-200 dark:border-neutral-700">
                          <TableCell className="py-3 align-top min-w-[180px] border-r border-b border-gray-200 dark:border-neutral-700">
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
                          <TableCell className="py-3 align-top min-w-[210px] border-r border-b border-gray-200 dark:border-neutral-700">
                            <span 
                              className="text-xs text-foreground leading-relaxed line-clamp-2 md:line-clamp-3 break-words whitespace-normal block"
                              title={item.jabatan || "-"}
                            >
                              {item.jabatan || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 align-top min-w-[210px] border-r border-b border-gray-200 dark:border-neutral-700">
                            <div className="flex items-start gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span 
                                  className="text-xs text-foreground font-medium leading-relaxed line-clamp-2 md:line-clamp-3 break-words whitespace-normal block"
                                  title={item.unitKerja || item.opd || "-"}
                                >
                                  {item.unitKerja || item.opd || "-"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-top min-w-[130px] border-r border-b border-gray-200 dark:border-neutral-700">
                            {item.hasSimantapAccess ? (
                              <div className="flex flex-wrap gap-1 items-center">
                                {((item.simantapRoles && item.simantapRoles.length > 0)
                                  ? item.simantapRoles
                                  : (item.simantapRole ? [item.simantapRole] : [])
                                ).map((r: string) => (
                                  <span key={r}>{getRoleBadge(r, item.simantapPpkOpdName)}</span>
                                ))}
                              </div>
                            ) : item.simantapStatus === "NON_AKTIF" ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1 opacity-80">
                                  {((item.simantapRoles && item.simantapRoles.length > 0)
                                    ? item.simantapRoles
                                    : (item.simantapRole ? [item.simantapRole] : [])
                                  ).map((r: string) => (
                                    <span key={r}>{getRoleBadge(r, item.simantapPpkOpdName)}</span>
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
                          <TableCell className="py-3 text-right align-top min-w-[140px] pr-4 border-b border-gray-200 dark:border-neutral-700">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleOpenSetRole({
                                  nip: item.nip,
                                  namaLengkap: item.namaLengkap,
                                  jabatan: item.jabatan,
                                  opd: item.opd,
                                  opdId: item.simantapPpkOpdId || item.instansiId,
                                  subUnitId: item.simantapPpkOpdId ? item.simantapPpkSubUnitId : item.unitKerjaId,
                                  ppkOpdName: item.simantapPpkOpdName,
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

        {/* ========================================================= */}
        {/* TAB 3: MENUNGGU KONFIRMASI REGISTRASI MANDIRI             */}
        {/* ========================================================= */}
        <TabsContent value="pending_requests" className="space-y-4 m-0">
          <Card className="shadow-xs border-gray-200 dark:border-neutral-700">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Pengajuan Registrasi Mandiri (QR / Tautan)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingPending ? (
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memuat pengajuan registrasi...</span>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Tidak ada pengajuan registrasi yang menunggu konfirmasi.
                </div>
              ) : (
                <div className="divide-y">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/30"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-sm text-foreground">
                          {req.namaLengkap}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          NIP: {req.nip}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {req.namaUnitKerja ? `${req.namaUnitKerja} · ` : ""}
                          {req.namaOpd}
                          {req.jabatan ? ` · ${req.jabatan}` : ""}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-muted-foreground">Role diajukan:</span>
                          {req.requestedRoles.map((r) => (
                            <span key={r}>{getRoleBadge(r)}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={rejectMutation.isPending || approveMutation.isPending}
                          onClick={() => rejectMutation.mutate(req.id)}
                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30 gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Tolak</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          onClick={() => approveMutation.mutate(req.id)}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Setujui Role</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      {/* QR Self Registration Modal */}
      <SelfRegisterQrDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
      />
    </div>
  )
}
