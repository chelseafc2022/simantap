"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { isExcludedOpd } from "@/lib/utils"
import { SearchableCombobox } from "@/app/(dashboard)/users/components/searchable-combobox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react"

interface PegawaiItem {
  nip: string
  namaLengkap: string
  jabatan: string | null
  instansiId: string | null
  namaOpd: string | null
  unitKerjaId: string | null
  namaUnitKerja: string | null
  hasSimantapAccess: boolean
  simantapRole: string | null
  simantapRoles: string[]
  simantapStatus: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: "Administrator",
  ADMIN_PPK: "Admin PPK (Operator)",
  BENDAHARA: "Bendahara Pengeluaran",
  KEPALA_OPD: "Kepala OPD",
  PIMPINAN_DAERAH: "Pimpinan Daerah",
  MONEV: "Tim MONEV",
}

const SELF_REGISTER_ROLES = [
  {
    value: "ADMIN_PPK",
    label: "Admin PPK (Operator)",
    desc: "Mengelola paket pengadaan, target fisik mingguan, dan laporan progres.",
  },
  {
    value: "BENDAHARA",
    label: "Bendahara Pengeluaran",
    desc: "Menginput realisasi pencairan keuangan dan bukti SPJ/SP2D.",
  },
  {
    value: "KEPALA_OPD",
    label: "Kepala OPD",
    desc: "Memantau kinerja pengadaan dan realisasi seluruh paket di OPD.",
  },
] as const

const formatRoleNames = (roles: string[]) =>
  roles.map((r) => ROLE_LABELS[r] || r).join(", ")

export default function SelfRegisterPage() {
  const [instansiId, setInstansiId] = useState<string>("all")
  const [unitKerjaId, setUnitKerjaId] = useState<string>("all")
  const [searchNama, setSearchNama] = useState<string>("")
  const [debouncedSearch] = useDebounce(searchNama, 400)
  const [selectedPegawai, setSelectedPegawai] = useState<PegawaiItem | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["ADMIN_PPK"])
  const [registeredResult, setRegisteredResult] = useState<{
    pegawai: PegawaiItem
    roles: string[]
  } | null>(null)

  const { data: instansiRaw = [] } = useQuery<Array<{ id: string; instansi: string }>>({
    queryKey: ["self-reg-instansi"],
    queryFn: async () => {
      const res = await apiClient.get("/users/self-register/instansi")
      return res.data?.data || []
    },
    staleTime: 10 * 60 * 1000,
  })

  const instansiItems = useMemo(
    () =>
      instansiRaw
        .filter((item) => !isExcludedOpd(item.id) && !isExcludedOpd(item.instansi))
        .map((item) => ({ id: item.id, label: item.instansi })),
    [instansiRaw],
  )

  const { data: unitKerjaRaw = [], isLoading: isLoadingSubUnit } = useQuery<
    Array<{ id: string; unitKerja: string }>
  >({
    queryKey: ["self-reg-unit-kerja", instansiId],
    queryFn: async () => {
      if (!instansiId || instansiId === "all") return []
      const res = await apiClient.get("/users/self-register/unit-kerja", {
        params: { instansiId },
      })
      return res.data?.data || []
    },
    enabled: Boolean(instansiId && instansiId !== "all"),
    staleTime: 10 * 60 * 1000,
  })

  const unitKerjaItems = useMemo(
    () => unitKerjaRaw.map((u) => ({ id: u.id, label: u.unitKerja })),
    [unitKerjaRaw],
  )

  const canSearchPegawai =
    (instansiId !== "all" || debouncedSearch.trim().length >= 2)

  const { data: pegawaiList = [], isFetching: isSearchingPegawai } = useQuery<PegawaiItem[]>({
    queryKey: ["self-reg-pegawai", instansiId, unitKerjaId, debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get("/users/self-register/pegawai", {
        params: {
          instansiId: instansiId !== "all" ? instansiId : undefined,
          unitKerjaId: unitKerjaId !== "all" ? unitKerjaId : undefined,
          search: debouncedSearch.trim() || undefined,
          limit: 20,
        },
      })
      return res.data?.data || []
    },
    enabled: canSearchPegawai,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPegawai) throw new Error("Pilih pegawai terlebih dahulu")
      if (selectedRoles.length === 0) throw new Error("Pilih minimal 1 role")
      const res = await apiClient.post("/users/self-register", {
        nip: selectedPegawai.nip,
        roles: selectedRoles,
      })
      return res.data
    },
    onSuccess: () => {
      if (selectedPegawai) {
        setRegisteredResult({ pegawai: selectedPegawai, roles: selectedRoles })
      }
      toast.success("Registrasi role berhasil!", {
        description: "Silakan login ke MONALISA KONSEL menggunakan akun E-Gov/SIMPEG Anda.",
      })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Gagal melakukan registrasi"
      toast.error("Registrasi tidak dapat diproses", { description: msg })
    },
  })

  const toggleRole = (roleValue: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleValue)
        ? prev.filter((r) => r !== roleValue)
        : [...prev, roleValue],
    )
  }

  const alreadyHasRole = Boolean(
    selectedPegawai &&
      ((selectedPegawai.simantapRoles && selectedPegawai.simantapRoles.length > 0) ||
        selectedPegawai.hasSimantapAccess),
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-background to-background dark:from-emerald-950/20 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Registrasi Mandiri Akun OPD
          </h1>
          <p className="text-sm text-muted-foreground">
            MONALISA KONSEL · Pilih Unit Kerja, cari nama Anda, dan tetapkan role akses secara mandiri.
          </p>
        </div>

        {registeredResult ? (
          <Card className="border-emerald-200 dark:border-emerald-800 shadow-sm">
            <CardContent className="p-6 space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Registrasi Role Berhasil
                </h2>
                <p className="text-sm text-muted-foreground">
                  Akun Anda sudah aktif di MONALISA KONSEL.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-left text-xs space-y-1.5">
                <div>
                  <span className="text-muted-foreground">Nama: </span>
                  <span className="font-semibold">{registeredResult.pegawai.namaLengkap}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">NIP: </span>
                  <span className="font-mono">{registeredResult.pegawai.nip}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Unit Kerja: </span>
                  <span>{registeredResult.pegawai.namaOpd || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Role Aktif: </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatRoleNames(registeredResult.roles)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRegisteredResult(null)
                    setSelectedPegawai(null)
                    setSearchNama("")
                  }}
                >
                  Daftarkan Pegawai Lain
                </Button>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                  <Link href="/login/">
                    <span>Masuk ke MONALISA</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Formulir Penetapan Role ASN</CardTitle>
              <CardDescription>
                Data pegawai diambil langsung dari direktori SIMPEG Kabupaten Konawe Selatan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* 1. Unit Kerja & Sub Unit Kerja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">1. Unit Kerja (OPD)</Label>
                  <SearchableCombobox
                    value={instansiId}
                    onValueChange={(val) => {
                      setInstansiId(val)
                      setUnitKerjaId("all")
                      setSelectedPegawai(null)
                    }}
                    items={instansiItems}
                    placeholder="Pilih Unit Kerja (OPD)..."
                    searchPlaceholder="Cari nama OPD..."
                    allLabel="-- Semua Unit Kerja (OPD) --"
                    icon={<Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">2. Sub Unit Kerja (Opsional)</Label>
                  <SearchableCombobox
                    value={unitKerjaId}
                    onValueChange={(val) => {
                      setUnitKerjaId(val)
                      setSelectedPegawai(null)
                    }}
                    items={unitKerjaItems}
                    disabled={instansiId === "all" || isLoadingSubUnit}
                    placeholder={
                      instansiId === "all"
                        ? "Pilih OPD terlebih dahulu"
                        : isLoadingSubUnit
                          ? "Memuat sub unit..."
                          : "Pilih Sub Unit Kerja..."
                    }
                    searchPlaceholder="Cari sub unit..."
                    allLabel="-- Semua Sub Unit Kerja --"
                    icon={<Layers className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
                  />
                </div>
              </div>

              {/* 2. Cari Nama Pegawai (Debounced) */}
              <div className="space-y-2">
                <Label htmlFor="cari-pegawai" className="text-xs font-medium">
                  3. Cari &amp; Pilih Nama Pegawai
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cari-pegawai"
                    placeholder="Ketik nama atau NIP pegawai (pencarian otomatis)..."
                    value={searchNama}
                    onChange={(e) => {
                      setSearchNama(e.target.value)
                      setSelectedPegawai(null)
                    }}
                    className="pl-9"
                  />
                  {isSearchingPegawai && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-emerald-600" />
                  )}
                </div>

                {!canSearchPegawai ? (
                  <p className="text-xs text-muted-foreground">
                    Pilih Unit Kerja (OPD) atau ketik minimal 2 huruf nama/NIP untuk menampilkan daftar pegawai.
                  </p>
                ) : pegawaiList.length === 0 && !isSearchingPegawai ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Pegawai tidak ditemukan. Coba ubah kata kunci atau periksa Unit Kerja yang dipilih.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                    {pegawaiList.map((p) => {
                      const isSelected = selectedPegawai?.nip === p.nip
                      const hasRole =
                        (p.simantapRoles && p.simantapRoles.length > 0) ||
                        p.hasSimantapAccess
                      return (
                        <button
                          key={p.nip}
                          type="button"
                          onClick={() => setSelectedPegawai(p)}
                          className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-emerald-50 dark:bg-emerald-950/40"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-sm font-medium text-foreground truncate">
                              {p.namaLengkap}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              NIP: {p.nip}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {p.namaUnitKerja || p.namaOpd || "-"}
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {hasRole ? (
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]"
                              >
                                Sudah Ada Role: {formatRoleNames(p.simantapRoles)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Belum Terdaftar
                              </Badge>
                            )}
                            {isSelected && (
                              <span className="text-[10px] font-semibold text-emerald-600">
                                Dipilih
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Informasi Pegawai Terpilih */}
              {selectedPegawai && (
                <div className="space-y-4 pt-1 border-t">
                  <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2.5">
                    <UserCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="text-xs space-y-0.5 min-w-0">
                      <div className="font-semibold text-foreground">
                        {selectedPegawai.namaLengkap}
                      </div>
                      <div className="font-mono text-muted-foreground">
                        NIP: {selectedPegawai.nip} · {selectedPegawai.namaOpd || "-"}
                      </div>
                    </div>
                  </div>

                  {alreadyHasRole ? (
                    <div
                      role="alert"
                      className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-start gap-3"
                    >
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1 text-amber-900 dark:text-amber-200">
                        <div className="font-semibold text-sm">
                          Pegawai Sudah Terdaftar di MONALISA
                        </div>
                        <p>
                          Pegawai ini sudah memiliki role:{" "}
                          <strong>{formatRoleNames(selectedPegawai.simantapRoles)}</strong>{" "}
                          (Status: {selectedPegawai.simantapStatus}).
                        </p>
                        <p className="text-amber-700 dark:text-amber-300">
                          Silakan langsung login menggunakan akun E-Gov/SIMPEG Anda, atau hubungi Administrator jika memerlukan perubahan role.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">4. Pilih Role Akses</Label>
                        <div className="space-y-2">
                          {SELF_REGISTER_ROLES.map((r) => {
                            const checked = selectedRoles.includes(r.value)
                            return (
                              <label
                                key={r.value}
                                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                  checked
                                    ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30"
                                    : "hover:bg-muted/40"
                                }`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleRole(r.value)}
                                  className="mt-0.5"
                                />
                                <div className="space-y-0.5">
                                  <div className="text-sm font-medium text-foreground">
                                    {r.label}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {r.desc}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      <Button
                        type="button"
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        disabled={selectedRoles.length === 0 || submitMutation.isPending}
                        onClick={() => submitMutation.mutate()}
                      >
                        {submitMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Menyimpan Registrasi...</span>
                          </>
                        ) : (
                          <span>Daftarkan Role Saya</span>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
