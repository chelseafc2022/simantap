"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { SearchableCombobox } from "@/components/searchable-combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Loader2,
  Calendar,
  FileText,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Building2,
  Coins,
  Receipt,
  RotateCcw,
  Briefcase,
  Layers,
  ArrowRight,
  ArrowLeft,
  Lock,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"

export interface OpdOption {
  id: string
  kodeOpd: string
  namaOpd: string
  singkatan: string | null
}

export interface TargetBulananItem {
  bulan: number
  targetFisik: number
}

export interface PaketItem {
  id: string
  tahunAnggaran: number
  opdId: string
  subUnitId?: string | null
  kodeRupKontrak?: string | null
  namaPaket: string
  lokasiKegiatan?: string | null
  metodePemilihan?: string | null
  jenisPengadaan?: string | null
  nilaiPagu: number | string
  nilaiKontrak: number | string
  sumberDana?: string | null
  nomorKontrak?: string | null
  tanggalMulai?: string | null
  tanggalSelesai?: string | null
  pemenangRekanan?: string | null
  keterangan?: string | null
  targetBulanan?: TargetBulananItem[]
  opd?: {
    id: string
    namaOpd: string
    singkatan?: string | null
  }
  subUnit?: {
    id: string
    kodeSubUnit?: string | null
    namaSubUnit: string
  } | null
}

interface PaketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: PaketItem | null
  opdList: OpdOption[]
  constants?: {
    metodePemilihan: string[]
    jenisPengadaan: string[]
    sumberDana: string[]
  }
  defaultTab?: "info" | "targets"
}

const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

export function PaketFormDialog({
  open,
  onOpenChange,
  initialData,
  opdList,
  constants,
  defaultTab,
}: PaketFormDialogProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userRoles: string[] =
    user?.roles && user.roles.length > 0
      ? user.roles
      : user?.role
      ? [user.role]
      : []
  const hasRole = (role: string) => userRoles.includes(role)
  const isSuperRole = userRoles.length === 0 || userRoles.some((r) => ["ADMINISTRATOR", "PIMPINAN_DAERAH", "MONEV"].includes(r))
  const isKepalaOpd = hasRole("KEPALA_OPD")
  const isPerencana = hasRole("ADMIN_PERENCANAAN")
  const isSirup = hasRole("ADMIN_SIRUP")

  const canEditInfo = isSuperRole || isSirup
  const canEditTarget = isSuperRole || isPerencana
  const userOpdId = user?.opd?.id
  const userOpdNama = user?.opd?.namaOpd || user?.opd?.singkatan
  const userSubUnitId = user?.subUnit?.id
  const userSubUnitNama = user?.subUnit?.namaSubUnit
  const isEdit = !!initialData

  const canSelectOpd = isSuperRole || !userOpdId
  const canSelectSubUnit = isSuperRole || isKepalaOpd || !userSubUnitId

  // Active form tab
  const [activeTab, setActiveTab] = useState<string>("info")

  // Form states
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026)
  const [opdId, setOpdId] = useState<string>("")
  const [subUnitId, setSubUnitId] = useState<string>("")
  const [namaPaket, setNamaPaket] = useState<string>("")
  const [kodeRupKontrak, setKodeRupKontrak] = useState<string>("")
  const [lokasiKegiatan, setLokasiKegiatan] = useState<string>("")
  const [metodePemilihan, setMetodePemilihan] = useState<string>("")
  const [jenisPengadaan, setJenisPengadaan] = useState<string>("")
  const [sumberDana, setSumberDana] = useState<string>("")
  const [nomorKontrak, setNomorKontrak] = useState<string>("")
  const [nilaiPagu, setNilaiPagu] = useState<string>("")
  const [nilaiKontrak, setNilaiKontrak] = useState<string>("")
  const [tanggalMulai, setTanggalMulai] = useState<string>("")
  const [tanggalSelesai, setTanggalSelesai] = useState<string>("")
  const [pemenangRekanan, setPemenangRekanan] = useState<string>("")
  const [keterangan, setKeterangan] = useState<string>("")

  // Fetch Sub Unit Kerja based on selected OPD
  const { data: subUnitsResponse, isLoading: isLoadingSubUnits } = useQuery({
    queryKey: ["sub-units", opdId],
    queryFn: async () => {
      if (!opdId) return []
      const res = await apiClient.get("/pembangunan/sub-units", { params: { opdId } })
      return res.data?.data || []
    },
    enabled: !!opdId,
    staleTime: 5 * 60 * 1000,
  })

  // Combobox options
  const opdOptions = useMemo(() => {
    const list = Array.isArray(opdList) ? opdList : []
    return list.map((opd) => ({
      id: opd.id,
      label: opd.namaOpd + (opd.singkatan ? ` (${opd.singkatan})` : ""),
    }))
  }, [opdList])

  const subUnitOptions = useMemo(() => {
    const list = Array.isArray(subUnitsResponse) ? subUnitsResponse : []
    return list.map((su: any) => ({
      id: su.id,
      label: su.namaSubUnit,
    }))
  }, [subUnitsResponse])

  // Targets state: array of 12 numbers (index 0 = bulan 1)
  const [targets, setTargets] = useState<number[]>(Array(12).fill(0))

  // Populate data when dialog opens
  useEffect(() => {
    if (initialData) {
      setTahunAnggaran(initialData.tahunAnggaran || 2026)
      setOpdId(initialData.opdId || "")
      setSubUnitId(initialData.subUnitId || (!canSelectSubUnit && userSubUnitId ? userSubUnitId : ""))
      setNamaPaket(initialData.namaPaket || "")
      setKodeRupKontrak(initialData.kodeRupKontrak || "")
      setLokasiKegiatan(initialData.lokasiKegiatan || "")
      setMetodePemilihan(initialData.metodePemilihan || "")
      setJenisPengadaan(initialData.jenisPengadaan || "")
      setSumberDana(initialData.sumberDana || "")
      setNomorKontrak(initialData.nomorKontrak || "")
      setNilaiPagu(initialData.nilaiPagu ? String(initialData.nilaiPagu) : "")
      setNilaiKontrak(initialData.nilaiKontrak ? String(initialData.nilaiKontrak) : "")
      setTanggalMulai(initialData.tanggalMulai ? initialData.tanggalMulai.substring(0, 10) : "")
      setTanggalSelesai(initialData.tanggalSelesai ? initialData.tanggalSelesai.substring(0, 10) : "")
      setPemenangRekanan(initialData.pemenangRekanan || "")
      setKeterangan(initialData.keterangan || "")

      const newTargets = Array(12).fill(0)
      if (initialData.targetBulanan && initialData.targetBulanan.length > 0) {
        initialData.targetBulanan.forEach((t) => {
          if (t.bulan >= 1 && t.bulan <= 12) {
            newTargets[t.bulan - 1] = t.targetFisik
          }
        })
      }
      setTargets(newTargets)
    } else {
      // Reset form
      setTahunAnggaran(2026)
      const defaultOpd = !isSuperRole && userOpdId ? userOpdId : (opdList[0]?.id || "")
      setOpdId(defaultOpd)
      setSubUnitId(!canSelectSubUnit && userSubUnitId ? userSubUnitId : "")
      setNamaPaket("")
      setKodeRupKontrak("")
      setLokasiKegiatan("")
      setMetodePemilihan(constants?.metodePemilihan?.[0] || "Tender")
      setJenisPengadaan(constants?.jenisPengadaan?.[0] || "Pekerjaan Konstruksi")
      setSumberDana(constants?.sumberDana?.[0] || "DAU (Dana Alokasi Umum)")
      setNomorKontrak("")
      setNilaiPagu("")
      setNilaiKontrak("")
      setTanggalMulai("")
      setTanggalSelesai("")
      setPemenangRekanan("")
      setKeterangan("")
      setTargets(Array(12).fill(0))
    }
    if (defaultTab) {
      setActiveTab(defaultTab)
    } else if (isPerencana) {
      setActiveTab("targets")
    } else {
      setActiveTab("info")
    }
  }, [initialData, open, defaultTab, isPerencana, isSuperRole, canSelectSubUnit, userOpdId, userSubUnitId, opdList, constants])

  // Calculated values
  const paguNum = parseFloat(nilaiPagu) || 0
  const kontrakNum = parseFloat(nilaiKontrak) || 0
  const selisihEfisiensi = paguNum > kontrakNum ? paguNum - kontrakNum : 0
  const persenEfisiensi = paguNum > 0 ? ((selisihEfisiensi / paguNum) * 100).toFixed(2) : "0.00"

  const durasiKontrak = useMemo(() => {
    if (!tanggalMulai || !tanggalSelesai) return null
    const start = new Date(tanggalMulai)
    const end = new Date(tanggalSelesai)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    const diffMonths = ((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth()) + 1
    return { days: diffDays, months: diffMonths }
  }, [tanggalMulai, tanggalSelesai])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleTargetChange = (bulanIndex: number, value: string) => {
    const val = parseFloat(value) || 0
    const clamped = Math.max(0, Math.min(100, val))
    const updated = [...targets]
    updated[bulanIndex] = clamped
    setTargets(updated)
  }

  // Auto distribute target between start and end month
  const autoDistributeTargets = () => {
    let startMonth = 1
    let endMonth = 12

    if (tanggalMulai) {
      startMonth = new Date(tanggalMulai).getMonth() + 1
    }
    if (tanggalSelesai) {
      endMonth = new Date(tanggalSelesai).getMonth() + 1
    }

    if (startMonth > endMonth) {
      endMonth = 12
    }

    const duration = endMonth - startMonth + 1
    const updated = Array(12).fill(0)

    for (let i = 0; i < 12; i++) {
      const monthNum = i + 1
      if (monthNum < startMonth) {
        updated[i] = 0
      } else if (monthNum >= endMonth) {
        updated[i] = 100
      } else {
        const step = (monthNum - startMonth + 1) / duration
        updated[i] = parseFloat((step * 100).toFixed(2))
      }
    }

    setTargets(updated)
    toast.success(`Target berhasil dihitung proporsional dari Bulan ${startMonth} ke ${endMonth}`)
  }

  // Reset targets to 0
  const resetTargets = () => {
    setTargets(Array(12).fill(0))
    toast.info("Target bulanan direset ke 0%")
  }

  // Mutation Save
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!namaPaket.trim()) {
        throw new Error("Nama paket pembangunan wajib diisi")
      }
      if (!opdId) {
        throw new Error("OPD penanggung jawab wajib dipilih")
      }

      const targetBulananPayload = targets.map((val, idx) => ({
        bulan: idx + 1,
        targetFisik: val,
      }))

      const payload = {
        tahunAnggaran,
        opdId,
        subUnitId: !canSelectSubUnit && userSubUnitId ? userSubUnitId : (subUnitId || undefined),
        namaPaket: namaPaket.trim(),
        kodeRupKontrak: kodeRupKontrak.trim() || undefined,
        lokasiKegiatan: lokasiKegiatan.trim() || undefined,
        metodePemilihan: metodePemilihan || undefined,
        jenisPengadaan: jenisPengadaan || undefined,
        sumberDana: sumberDana || undefined,
        nomorKontrak: nomorKontrak.trim() || undefined,
        nilaiPagu: parseFloat(nilaiPagu) || 0,
        nilaiKontrak: parseFloat(nilaiKontrak) || 0,
        tanggalMulai: tanggalMulai || undefined,
        tanggalSelesai: tanggalSelesai || undefined,
        pemenangRekanan: pemenangRekanan.trim() || undefined,
        keterangan: keterangan.trim() || undefined,
        targetBulanan: targetBulananPayload,
      }

      if (isEdit && initialData) {
        return apiClient.put(`/pembangunan/${initialData.id}`, payload)
      } else {
        return apiClient.post("/pembangunan", payload)
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? "Paket pembangunan berhasil diperbarui"
          : "Paket pembangunan baru berhasil ditambahkan",
      )
      queryClient.invalidateQueries({ queryKey: ["paket-pembangunan"] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Gagal menyimpan data paket"
      toast.error(msg)
    },
  })

  const finalTarget = targets[11]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border/80">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-card via-card to-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                  {isEdit ? "Ubah Data Paket Pembangunan" : "Tambah Paket Pembangunan Baru"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm mt-0.5 text-muted-foreground">
                  {isEdit
                    ? "Perbarui rincian teknis pengadaan dan kalibrasi kurva target fisik bulanan (B01–B12)"
                    : "Formulir standar 16 atribut pengadaan dan kurva kumulatif rencana fisik Pemkab Konawe Selatan"}
                </DialogDescription>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-muted/50">
                TA {tahunAnggaran}
              </Badge>
              {opdId && (
                <Badge variant="secondary" className="text-xs px-2.5 py-1 truncate max-w-[200px]">
                  {opdList.find((o) => o.id === opdId)?.singkatan || "OPD Terpilih"}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation Bar */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-2.5 border-b bg-muted/20 shrink-0">
            <TabsList className="grid w-full sm:w-[480px] grid-cols-2">
              <TabsTrigger value="info" className="gap-2 text-xs sm:text-sm font-medium">
                <FileText className="h-4 w-4" />
                1. Rincian Kontrak & PBJ
              </TabsTrigger>
              <TabsTrigger value="targets" className="gap-2 text-xs sm:text-sm font-medium">
                <Calendar className="h-4 w-4" />
                2. Target Fisik (12 Bulan)
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: IDENTITAS & KONTRAK */}
          <TabsContent value="info" className="flex-1 overflow-y-auto p-6 space-y-6 m-0">
            {/* Informasi wewenang Admin SiRUP */}
            {!canEditInfo && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200 text-xs">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Kewenangan Khusus Admin SiRUP:</span>
                  <p className="mt-0.5 text-muted-foreground">
                    Rincian kontrak, pagu, dan mekanisme pengadaan diinput oleh <strong>Admin SiRUP</strong> (Mode Hanya Baca untuk Admin Perencanaan). Akun Anda bertugas menetapkan <strong>Target Fisik Bulanan (Tab 2)</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 1: Identitas Paket & OPD */}
            <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2.5">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span>1. Identitas Paket & OPD Penanggung Jawab</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                {/* Tahun Anggaran */}
                <div className="lg:col-span-2 space-y-1.5">
                  <Label htmlFor="tahunAnggaran" className="text-xs font-medium">
                    Tahun Anggaran
                  </Label>
                  <Input
                    id="tahunAnggaran"
                    type="number"
                    value={tahunAnggaran}
                    onChange={(e) => setTahunAnggaran(parseInt(e.target.value) || 2026)}
                    className="font-mono text-xs h-9"
                  />
                </div>

                {/* Unit Kerja (OPD) - SearchableCombobox */}
                <div className="lg:col-span-5 space-y-1.5">
                  <Label className="text-xs font-medium">
                    Unit Kerja (OPD / SKPD) <span className="text-red-500">*</span>
                  </Label>
                  {canSelectOpd ? (
                    <SearchableCombobox
                      value={opdId}
                      onValueChange={(val) => {
                        setOpdId(val)
                        if (canSelectSubUnit) {
                          setSubUnitId("")
                        }
                      }}
                      items={opdOptions}
                      placeholder="Ketik / Pilih Unit Kerja (OPD)..."
                      searchPlaceholder="Ketik nama Unit Kerja / OPD..."
                      emptyText="Unit Kerja tidak ditemukan."
                      icon={<Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    />
                  ) : (
                    <div className="flex items-center justify-between h-9 px-2.5 rounded-md border bg-muted/40 text-xs font-medium">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{userOpdNama || "OPD Anda"}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        Terkunci Sesuai Akun
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Sub Unit Kerja */}
                <div className="lg:col-span-5 space-y-1.5">
                  <Label className="text-xs font-medium">
                    Sub Unit Kerja (Bidang / Bagian)
                  </Label>
                  {canSelectSubUnit ? (
                    <SearchableCombobox
                      value={subUnitId}
                      onValueChange={setSubUnitId}
                      items={subUnitOptions}
                      placeholder={isLoadingSubUnits ? "Memuat Sub Unit..." : "Ketik / Pilih Sub Unit Kerja..."}
                      searchPlaceholder="Ketik nama Sub Unit Kerja..."
                      emptyText="Sub Unit Kerja tidak ditemukan."
                      icon={<Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                      disabled={isLoadingSubUnits || !opdId}
                    />
                  ) : (
                    <div className="flex items-center justify-between h-9 px-2.5 rounded-md border bg-muted/40 text-xs font-medium">
                      <div className="flex items-center gap-1.5 truncate">
                        <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{userSubUnitNama || "Sub Unit Anda"}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        Terkunci Sesuai Akun
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Nama Paket */}
                <div className="sm:col-span-2 lg:col-span-8 space-y-1.5">
                  <Label htmlFor="namaPaket" className="text-xs font-semibold text-foreground">
                    Nama Paket Pekerjaan / Pembangunan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="namaPaket"
                    placeholder="Contoh: Peningkatan Jalan Ruas Punggaluku - Andoolo"
                    value={namaPaket}
                    onChange={(e) => setNamaPaket(e.target.value)}
                    className="text-sm font-medium"
                  />
                </div>

                {/* Lokasi Kegiatan */}
                <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                  <Label htmlFor="lokasiKegiatan" className="text-xs font-medium">
                    Lokasi Pekerjaan
                  </Label>
                  <Input
                    id="lokasiKegiatan"
                    placeholder="Contoh: Kec. Andoolo / Kec. Palangga"
                    value={lokasiKegiatan}
                    onChange={(e) => setLokasiKegiatan(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Pengadaan & Sumber Dana */}
            <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2.5">
                <Receipt className="h-4 w-4 text-blue-600" />
                <span>2. Mekanisme PBJ & Sumber Dana</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Kode RUP */}
                <div className="space-y-1.5">
                  <Label htmlFor="kodeRupKontrak" className="text-xs font-medium">
                    Kode RUP / ID Kontrak SiRUP
                  </Label>
                  <Input
                    id="kodeRupKontrak"
                    placeholder="Contoh: RUP-492819"
                    value={kodeRupKontrak}
                    onChange={(e) => setKodeRupKontrak(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Nomor Kontrak */}
                <div className="space-y-1.5">
                  <Label htmlFor="nomorKontrak" className="text-xs font-medium">
                    Nomor Kontrak / SPK
                  </Label>
                  <Input
                    id="nomorKontrak"
                    placeholder="Contoh: 602/01/SPK/DPUPR/2026"
                    value={nomorKontrak}
                    onChange={(e) => setNomorKontrak(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Metode Pemilihan */}
                <div className="space-y-1.5">
                  <Label htmlFor="metodePemilihan" className="text-xs font-medium">
                    Metode Pemilihan Pengadaan
                  </Label>
                  <Select value={metodePemilihan} onValueChange={setMetodePemilihan}>
                    <SelectTrigger id="metodePemilihan" className="text-sm">
                      <SelectValue placeholder="Pilih metode..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(constants?.metodePemilihan || [
                        "E-Purchasing",
                        "Pengadaan Langsung",
                        "Tender",
                        "Tender Cepat",
                        "Seleksi",
                        "Swakelola Tipe I",
                        "Penunjukan Langsung",
                      ]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Jenis Pengadaan */}
                <div className="space-y-1.5">
                  <Label htmlFor="jenisPengadaan" className="text-xs font-medium">
                    Jenis Pengadaan
                  </Label>
                  <Select value={jenisPengadaan} onValueChange={setJenisPengadaan}>
                    <SelectTrigger id="jenisPengadaan" className="text-sm">
                      <SelectValue placeholder="Pilih jenis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(constants?.jenisPengadaan || [
                        "Pekerjaan Konstruksi",
                        "Pengadaan Barang",
                        "Jasa Konsultansi",
                        "Jasa Lainnya",
                      ]).map((j) => (
                        <SelectItem key={j} value={j}>
                          {j}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sumber Dana */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="sumberDana" className="text-xs font-medium">
                    Sumber Dana
                  </Label>
                  <Select value={sumberDana} onValueChange={setSumberDana}>
                    <SelectTrigger id="sumberDana" className="text-sm">
                      <SelectValue placeholder="Pilih sumber dana..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(constants?.sumberDana || [
                        "DAU (Dana Alokasi Umum)",
                        "DAK Fisik",
                        "DAK Non Fisik",
                        "DBH (Dana Bagi Hasil)",
                        "PAD (Pendapatan Asli Daerah)",
                        "DID (Dana Insentif Daerah)",
                        "Bantuan Keuangan Provinsi",
                        "Pinjaman Daerah",
                      ]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rekanan / Pelaksana Pemenang */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="pemenangRekanan" className="text-xs font-medium">
                    Penyedia Jasa / Rekanan Pemenang
                  </Label>
                  <Input
                    id="pemenangRekanan"
                    placeholder="Contoh: PT. Konawe Perkasa Mandiri"
                    value={pemenangRekanan}
                    onChange={(e) => setPemenangRekanan(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Nilai Pagu & Kontrak */}
            <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2.5">
                <Coins className="h-4 w-4 text-amber-600" />
                <span>3. Nilai Anggaran & Efisiensi Kontrak</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Nilai Pagu */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="nilaiPagu" className="text-xs font-medium">
                      Nilai Pagu Anggaran (Rp) <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Input
                    id="nilaiPagu"
                    type="number"
                    placeholder="0"
                    value={nilaiPagu}
                    onChange={(e) => setNilaiPagu(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    {formatRupiah(paguNum)}
                  </div>
                </div>

                {/* Nilai Kontrak */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="nilaiKontrak" className="text-xs font-medium">
                      Nilai Kontrak Terikat (Rp) <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Input
                    id="nilaiKontrak"
                    type="number"
                    placeholder="0"
                    value={nilaiKontrak}
                    onChange={(e) => setNilaiKontrak(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium truncate">
                    {formatRupiah(kontrakNum)}
                  </div>
                </div>

                {/* Live Efisiensi Box */}
                <div className="flex flex-col justify-center rounded-lg border bg-muted/40 p-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Efisiensi PBJ / Penghematan
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {persenEfisiensi}%
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate" title={formatRupiah(selisihEfisiensi)}>
                      ({formatRupiah(selisihEfisiensi)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: Jadwal & Keterangan */}
            <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2.5">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>4. Waktu Pelaksanaan & Catatan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                {/* Tanggal Mulai */}
                <div className="lg:col-span-3 space-y-1.5">
                  <Label htmlFor="tanggalMulai" className="text-xs font-medium">
                    Tanggal Mulai Pelaksanaan
                  </Label>
                  <Input
                    id="tanggalMulai"
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* Tanggal Selesai */}
                <div className="lg:col-span-3 space-y-1.5">
                  <Label htmlFor="tanggalSelesai" className="text-xs font-medium">
                    Tanggal Selesai Pelaksanaan
                  </Label>
                  <Input
                    id="tanggalSelesai"
                    type="date"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* Durasi Kontrak Indicator */}
                <div className="lg:col-span-6 flex flex-col justify-center rounded-lg border bg-muted/40 px-3 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">
                    Masa Kontrak / Durasi
                  </span>
                  <div className="text-xs font-medium text-foreground mt-0.5">
                    {durasiKontrak ? (
                      <span className="text-foreground">
                        {durasiKontrak.days} Hari Kalender (~{durasiKontrak.months} Bulan Kerja)
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Tentukan tanggal mulai dan selesai
                      </span>
                    )}
                  </div>
                </div>

                {/* Keterangan */}
                <div className="sm:col-span-2 lg:col-span-12 space-y-1.5">
                  <Label htmlFor="keterangan" className="text-xs font-medium">
                    Keterangan Tambahan / Catatan Teknis
                  </Label>
                  <Textarea
                    id="keterangan"
                    placeholder="Catatan tahapan pelelangan, kondisi lapangan, atau informasi spesifik..."
                    rows={2}
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: TARGET FISIK BULANAN */}
          <TabsContent value="targets" className="flex-1 overflow-y-auto p-6 space-y-5 m-0">
            {/* Banner kewenangan Admin Perencanaan */}
            {!canEditTarget && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-900 dark:text-amber-100">Kewenangan Khusus Admin Perencanaan:</span>
                  <p className="mt-0.5 text-muted-foreground">
                    Penetapan target fisik bulanan (kurva rencana B01–B12) dilakukan oleh <strong>Admin Perencanaan</strong> setelah paket pengadaan dibuat oleh Admin SiRUP. Target bulanan paket ini saat ini diinisialisasi 0% (Mode Pratinjau untuk Admin SiRUP).
                  </p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-emerald-500/10 via-card to-card p-4">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Rencana Fisik Kumulatif (%) Bulan 1 s.d. 12
                </div>
                <p className="text-xs text-muted-foreground">
                  Persentase kemajuan fisik kumulatif pekerjaan untuk setiap bulan berjalan (rentang 0.00% – 100.00%).
                </p>
              </div>

              {canEditTarget && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetTargets}
                    className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset ke 0%
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={autoDistributeTargets}
                    className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Hitung Otomatis Berdasarkan Tanggal Kontrak
                  </Button>
                </div>
              )}
            </div>

            {/* Grid 12 Bulan (Spacious 6 columns on large screen, 3 on tablet, 2 on mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {BULAN_NAMES.map((namaBulan, idx) => {
                const val = targets[idx]
                return (
                  <div
                    key={namaBulan}
                    className="flex flex-col gap-2 p-3.5 rounded-xl border bg-card transition-all hover:border-emerald-500/40 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        B{String(idx + 1).padStart(2, "0")}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                        {namaBulan.substring(0, 3)}
                      </Badge>
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        disabled={!canEditTarget}
                        className={`text-right font-mono pr-7 text-sm font-semibold h-9 ${
                          !canEditTarget ? "bg-muted/40 cursor-not-allowed opacity-80" : ""
                        }`}
                        value={val}
                        onChange={(e) => handleTargetChange(idx, e.target.value)}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                        %
                      </span>
                    </div>

                    {/* Progress bar visual indicator */}
                    <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Target Validation Notice */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-card/60">
              <div className="flex items-center gap-2.5">
                {finalTarget === 100 ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground">
                    Target Akhir Tahun (B12):{" "}
                    <span className={finalTarget === 100 ? "text-emerald-600" : "text-amber-600"}>
                      {finalTarget}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {finalTarget === 100
                      ? "Target fisik telah lengkap mencapai 100.00% pada akhir tahun anggaran."
                      : "Disarankan target fisik mencapai 100.00% pada bulan penyelesaian kontrak."}
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className={`font-mono text-xs px-2.5 py-1 ${
                  finalTarget === 100
                    ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                    : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                }`}
              >
                {finalTarget === 100 ? "Valid 100%" : "Perlu Penyesuaian"}
              </Badge>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Footer */}
        <DialogFooter className="p-4 sm:p-6 border-t bg-muted/20 shrink-0 flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {activeTab === "info" ? "Tab 1: Rincian PBJ & Kontrak" : "Tab 2: Target Fisik Bulanan (B01–B12)"}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Batal
            </Button>

            {activeTab === "info" ? (
              <>
                {/* Admin SiRUP bisa langsung simpan di Tab 1 tanpa harus isi target */}
                {isSirup && (
                  <Button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {isEdit ? "Simpan Perubahan Pengadaan" : "Simpan Paket Pembangunan"}
                      </>
                    )}
                  </Button>
                )}

                <Button
                  type="button"
                  variant={isSirup ? "outline" : "default"}
                  onClick={() => setActiveTab("targets")}
                  className="gap-1.5"
                >
                  <span>{isSirup ? "Pratinjau Target Fisik" : "Target Fisik (12 Bulan)"}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("info")}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Kembali ke PBJ</span>
                </Button>

                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {isPerencana
                        ? "Simpan Penetapan Target Fisik"
                        : isSirup
                        ? "Simpan Paket (Target Diisi Admin Perencanaan)"
                        : isEdit
                        ? "Simpan Perubahan"
                        : "Simpan Paket Pembangunan"}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
