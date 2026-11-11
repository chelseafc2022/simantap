"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { SearchableCombobox } from "@/components/searchable-combobox"
import { isExcludedOpd } from "@/lib/utils"
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
  Search,
  DownloadCloud,
  SlidersHorizontal,
  Info,
  Boxes,
  Plus,
  Trash2,
  Edit,
} from "lucide-react"
import { toast } from "sonner"
import { SirupSearchDialog, SirupItem } from "./sirup-search-dialog"
import { formatContractDate, generateContractWeeks } from "@/lib/contract-weeks"

export interface OpdOption {
  id: string
  kodeOpd: string
  namaOpd: string
  singkatan: string | null
}

interface SubUnitOption {
  id: string
  namaSubUnit: string
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const value = error as { message?: string; response?: { data?: { message?: string } } }
  return value.response?.data?.message || value.message || fallback
}

export interface TargetBulananItem {
  bulan: number
  targetFisik: number
}

export interface TargetMingguanItem {
  bulan: number
  mingguKe: number
  tanggalMulai: string
  tanggalSelesai: string
  uraianKegiatan?: string | null
  targetFisik: number
}

export interface SubPaketItem {
  id: string
  namaSubPaket: string
  pagu: number
  nilaiKontrak?: number
  nomorKontrak?: string
  tanggalMulai?: string
  tanggalSelesai?: string
  rekanan?: string
  sumberDana?: string
  keterangan?: string
}

export interface PaketItem {
  id: string
  tahunAnggaran: number
  opdId: string
  subUnitId?: string | null
  kodeRupKontrak?: string | null
  subKegiatan?: string | null
  isGelondongan?: boolean
  subPaket?: SubPaketItem[] | any[]
  namaPaket: string
  lokasiKegiatan?: string | null
  metodePemilihan?: string | null
  jenisPengadaan?: string | null
  kelompokPaket?: string
  polaMonitoring?: string
  nilaiPagu: number | string
  nilaiKontrak: number | string
  sumberDana?: string | null
  nomorKontrak?: string | null
  tanggalMulai?: string | null
  tanggalSelesai?: string | null
  pemenangRekanan?: string | null
  keterangan?: string | null
  targetBulanan?: TargetBulananItem[]
  targetMingguan?: TargetMingguanItem[]
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

const buildWeeklyTargetState = (
  periods: ReturnType<typeof generateContractWeeks>,
  savedWeekly: TargetMingguanItem[] = [],
  savedMonthly: TargetBulananItem[] = []
): TargetMingguanItem[] => {
  const hasWeeklyProgress = savedWeekly.some((item) => Number(item.targetFisik) > 0)

  return periods.map((period) => {
    const saved = hasWeeklyProgress
      ? savedWeekly.find(
          (item) => item.bulan === period.bulan && item.mingguKe === period.mingguKe
        )
      : undefined
    if (saved) {
      return {
        ...period,
        targetFisik: Number(saved.targetFisik) || 0,
        uraianKegiatan: saved.uraianKegiatan || "",
      }
    }

    const monthWeeks = periods.filter((item) => item.bulan === period.bulan)
    const weekIndex = monthWeeks.findIndex((item) => item.mingguKe === period.mingguKe)
    const currentMonthTarget = Number(
      savedMonthly.find((item) => item.bulan === period.bulan)?.targetFisik
      ?? savedMonthly.filter((item) => item.bulan < period.bulan).at(-1)?.targetFisik
      ?? 0
    )
    const previousMonthTarget = Number(
      savedMonthly.filter((item) => item.bulan < period.bulan).at(-1)?.targetFisik ?? 0
    )
    const interpolated = previousMonthTarget
      + ((currentMonthTarget - previousMonthTarget) * (weekIndex + 1)) / monthWeeks.length

    return {
      ...period,
      targetFisik: parseFloat(interpolated.toFixed(2)),
      uraianKegiatan: "",
    }
  })
}

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
  const isPpk = hasRole("ADMIN_PPK")

  const canEditInfo = isSuperRole || isPpk
  const canEditTarget = isSuperRole || isPpk
  const userOpdId = user?.opd?.id
  const userOpdNama = user?.opd?.namaOpd || user?.opd?.singkatan
  const userSubUnitId = user?.subUnit?.id
  const userSubUnitNama = user?.subUnit?.namaSubUnit
  const isEdit = !!initialData

  const canSelectOpd = isSuperRole || !userOpdId
  const canSelectSubUnit = isSuperRole || isKepalaOpd || !userSubUnitId

  // Active form tab
  const [polaMonitoring, setPolaMonitoring] = useState("FISIK_KEUANGAN")
  const isKeuangan = polaMonitoring === "KEUANGAN"
  const [activeTab, setActiveTab] = useState<string>("info")

  // Form states
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026)
  const [opdId, setOpdId] = useState<string>("")
  const [subUnitId, setSubUnitId] = useState<string>("")
  const [subKegiatan, setSubKegiatan] = useState<string>("")
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

  // State untuk Paket Gelondongan & Sub-Paket
  const [isGelondongan, setIsGelondongan] = useState<boolean>(false)
  const [subPaketList, setSubPaketList] = useState<SubPaketItem[]>([])
  const [subPaketDialogOpen, setSubPaketDialogOpen] = useState<boolean>(false)
  const [subPaketEditingIndex, setSubPaketEditingIndex] = useState<number | null>(null)
  const [subPaketForm, setSubPaketForm] = useState<SubPaketItem>({
    id: "",
    namaSubPaket: "",
    pagu: 0,
    nilaiKontrak: 0,
    nomorKontrak: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    rekanan: "",
    sumberDana: "",
    keterangan: "",
  })

  // State untuk Integrasi SiRUP LKPP
  const [sirupDialogOpen, setSirupDialogOpen] = useState(false)
  const [isFetchingSirup, setIsFetchingSirup] = useState(false)

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
    return list
      .filter((opd) => !isExcludedOpd(opd.id) && !isExcludedOpd(opd.namaOpd))
      .map((opd) => ({
        id: opd.id,
        label: opd.namaOpd + (opd.singkatan ? ` (${opd.singkatan})` : ""),
      }))
  }, [opdList])

  const subUnitOptions = useMemo(() => {
    const list = Array.isArray(subUnitsResponse) ? subUnitsResponse : []
    return (list as SubUnitOption[]).map((su) => ({
      id: su.id,
      label: su.namaSubUnit,
    }))
  }, [subUnitsResponse])

  const sumberDanaOptions = useMemo(() => {
    const defaults = [
      "APBD",
      "APBN",
      "BLUD",
      "DAU (Dana Alokasi Umum)",
      "DAK Fisik",
      "DAK Non Fisik",
      "DBH (Dana Bagi Hasil)",
      "PAD (Pendapatan Asli Daerah)",
      "DID (Dana Insentif Daerah)",
      "Bantuan Keuangan Provinsi",
      "Pinjaman Daerah",
    ]
    return Array.from(
      new Set([...(constants?.sumberDana || defaults), ...(sumberDana ? [sumberDana] : [])])
    )
  }, [constants?.sumberDana, sumberDana])

  const [weeklyTargets, setWeeklyTargets] = useState<TargetMingguanItem[]>([])

  // Populate data when dialog opens
  useEffect(() => {
    if (initialData) {
      // Form lokal diselaraskan ketika paket yang dibuka berubah.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTahunAnggaran(initialData.tahunAnggaran || 2026)
      setOpdId(initialData.opdId || "")
      setSubUnitId(initialData.subUnitId || (!canSelectSubUnit && userSubUnitId ? userSubUnitId : ""))
      setPolaMonitoring(initialData.polaMonitoring || "FISIK_KEUANGAN")
      setSubKegiatan((initialData as any).subKegiatan || "")
      setIsGelondongan(Boolean((initialData as any).isGelondongan))
      setSubPaketList(Array.isArray((initialData as any).subPaket) ? (initialData as any).subPaket : [])
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

      const periods = generateContractWeeks(initialData.tanggalMulai, initialData.tanggalSelesai)
      setWeeklyTargets(buildWeeklyTargetState(
        periods,
        initialData.targetMingguan,
        initialData.targetBulanan
      ))
    } else {
      setPolaMonitoring("FISIK_KEUANGAN")
      // Reset form
      setTahunAnggaran(2026)
      const defaultOpd = !isSuperRole && userOpdId ? userOpdId : (opdList[0]?.id || "")
      setOpdId(defaultOpd)
      setSubUnitId(!canSelectSubUnit && userSubUnitId ? userSubUnitId : "")
      setSubKegiatan("")
      setIsGelondongan(false)
      setSubPaketList([])
      setNamaPaket("")
      setKodeRupKontrak("")
      setLokasiKegiatan("")
      setMetodePemilihan(constants?.metodePemilihan?.[0] || "Tender")
      setJenisPengadaan(constants?.jenisPengadaan?.[0] || "Pekerjaan Konstruksi")
      setSumberDana(constants?.sumberDana?.[0] || "APBD")
      setNomorKontrak("")
      setNilaiPagu("")
      setNilaiKontrak("")
      setTanggalMulai("")
      setTanggalSelesai("")
      setPemenangRekanan("")
      setKeterangan("")
      setWeeklyTargets([])
    }
    if (initialData?.polaMonitoring === "KEUANGAN") {
      setActiveTab("info")
    } else if (defaultTab) {
      setActiveTab(defaultTab)
    } else {
      setActiveTab("info")
    }
  }, [initialData, open, defaultTab, isSuperRole, canSelectSubUnit, userOpdId, userSubUnitId, opdList, constants])

  const reconcileWeeklyPeriods = (start: string, end: string) => {
    const periods = generateContractWeeks(start, end)
    setWeeklyTargets((current) => periods.map((period) => {
      const existing = current.find(
        (item) => item.bulan === period.bulan && item.mingguKe === period.mingguKe
      )
      return {
        ...period,
        targetFisik: existing?.targetFisik ?? 0,
        uraianKegiatan: existing?.uraianKegiatan || "",
      }
    }))
  }

  // Calculated values
  const paguNum = parseFloat(nilaiPagu) || 0
  const kontrakNum = parseFloat(nilaiKontrak) || 0
  const selisihEfisiensi = paguNum > kontrakNum ? paguNum - kontrakNum : 0
  const persenEfisiensi = paguNum > 0 ? ((selisihEfisiensi / paguNum) * 100).toFixed(2) : "0.00"

  const totalSubPaketPagu = useMemo(() => {
    return subPaketList.reduce((acc, item) => acc + (Number(item.pagu) || 0), 0)
  }, [subPaketList])

  const totalSubPaketKontrak = useMemo(() => {
    return subPaketList.reduce((acc, item) => acc + (Number(item.nilaiKontrak) || Number(item.pagu) || 0), 0)
  }, [subPaketList])

  const handleOpenAddSubPaket = () => {
    setSubPaketEditingIndex(null)
    setSubPaketForm({
      id: "sp-" + Date.now(),
      namaSubPaket: "",
      pagu: 0,
      nilaiKontrak: 0,
      nomorKontrak: "",
      tanggalMulai: tanggalMulai || "",
      tanggalSelesai: tanggalSelesai || "",
      rekanan: "",
      sumberDana: sumberDana || "",
      keterangan: "",
    })
    setSubPaketDialogOpen(true)
  }

  const handleOpenEditSubPaket = (index: number) => {
    setSubPaketEditingIndex(index)
    setSubPaketForm({ ...subPaketList[index] })
    setSubPaketDialogOpen(true)
  }

  const handleDeleteSubPaket = (index: number) => {
    const updated = subPaketList.filter((_, i) => i !== index)
    setSubPaketList(updated)
  }

  const handleSaveSubPaket = () => {
    if (!subPaketForm.namaSubPaket.trim()) {
      toast.error("Nama sub paket wajib diisi")
      return
    }
    const paguValue = Number(subPaketForm.pagu) || 0
    const kontrakValue = Number(subPaketForm.nilaiKontrak) || paguValue

    if (subPaketEditingIndex !== null) {
      const updated = [...subPaketList]
      updated[subPaketEditingIndex] = {
        ...subPaketForm,
        namaSubPaket: subPaketForm.namaSubPaket.trim(),
        pagu: paguValue,
        nilaiKontrak: kontrakValue,
      }
      setSubPaketList(updated)
    } else {
      setSubPaketList([
        ...subPaketList,
        {
          ...subPaketForm,
          id: subPaketForm.id || "sp-" + Date.now(),
          namaSubPaket: subPaketForm.namaSubPaket.trim(),
          pagu: paguValue,
          nilaiKontrak: kontrakValue,
        },
      ])
    }
    setSubPaketDialogOpen(false)
  }

  const isKontrakActive = kontrakNum > 0
  const kontrakMissingFields = useMemo(() => {
    if (!isKontrakActive) return []
    const missing: string[] = []
    if (!lokasiKegiatan.trim()) missing.push("Lokasi Pekerjaan")
    if (!nomorKontrak.trim()) missing.push("Nomor Kontrak / SPK")
    if (!pemenangRekanan.trim()) missing.push("Penyedia Jasa / Rekanan Pemenang")
    if (!tanggalMulai) missing.push("Tanggal Mulai Pelaksanaan")
    if (!tanggalSelesai) missing.push("Tanggal Selesai Pelaksanaan")
    return missing
  }, [isKontrakActive, lokasiKegiatan, nomorKontrak, pemenangRekanan, tanggalMulai, tanggalSelesai])

  const isKontrakComplete = kontrakMissingFields.length === 0

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

  const validateKontrakBeforeNext = (): boolean => {
    if (!isKontrakActive || !pemenangRekanan.trim() || !tanggalMulai || !tanggalSelesai) {
      toast.error("Lengkapi nilai kontrak, penyedia, dan masa kontrak sebelum mengisi target mingguan")
      return false
    }
    if (!namaPaket.trim()) {
      toast.error("Nama paket pekerjaan wajib diisi")
      return false
    }
    if (!opdId) {
      toast.error("Unit Kerja (OPD) wajib dipilih")
      return false
    }
    if (isKontrakActive && !isKontrakComplete) {
      toast.error("Data kontrak belum lengkap!", {
        description: `Karena nilai kontrak telah diisi (${formatRupiah(kontrakNum)}), mohon lengkapi: ${kontrakMissingFields.join(", ")} sebelum lanjut mengisi Target Fisik atau Realisasi.`,
      })
      return false
    }
    if (tanggalMulai && tanggalSelesai && new Date(tanggalSelesai) < new Date(tanggalMulai)) {
      toast.error("Tanggal selesai pelaksanaan tidak boleh lebih awal dari tanggal mulai")
      return false
    }
    return true
  }

  // Terapkan data hasil penarikan SiRUP LKPP ke state form
  const applySirupData = (item: SirupItem) => {
    setKodeRupKontrak(item.kodeRup)
    const itemTahun = Number(item.tahun)
    if (Number.isInteger(itemTahun) && itemTahun > 0) setTahunAnggaran(itemTahun)
    if (item.namaPaket) setNamaPaket(item.namaPaket)
    if (Number.isFinite(Number(item.pagu))) setNilaiPagu(String(item.pagu))
    if (item.lokasi && !lokasiKegiatan) setLokasiKegiatan(item.lokasi)
    if (item.metode) setMetodePemilihan(item.metode)
    if (item.jenisPengadaan) setJenisPengadaan(item.jenisPengadaan)
    if (item.sumberDana) setSumberDana(item.sumberDana)

    // Auto-match OPD jika pengguna memiliki hak memilih OPD
    if (canSelectOpd && item.satker) {
      const satkerLower = item.satker.toLowerCase()
      const matchedOpd = opdList.find(
        (o) =>
          satkerLower.includes(o.namaOpd.toLowerCase()) ||
          o.namaOpd.toLowerCase().includes(satkerLower) ||
          (o.singkatan && satkerLower.includes(o.singkatan.toLowerCase()))
      )
      if (matchedOpd) {
        setOpdId(matchedOpd.id)
      }
    }

    toast.success("Berhasil menarik data paket dari SiRUP LKPP!", {
      description: `${item.namaPaket.substring(0, 50)}... (Pagu: ${formatRupiah(item.pagu)})`,
    })
  }

  // Tarik data spesifik menggunakan Kode RUP yang dimasukkan
  const handleFetchSirupByKode = async () => {
    const kode = kodeRupKontrak.trim()
    if (!kode) {
      toast.error("Masukkan Kode RUP terlebih dahulu")
      return
    }

    setIsFetchingSirup(true)
    try {
      const res = await apiClient.get(`/sirup/paket/${encodeURIComponent(kode)}`, {
        params: { tahun: tahunAnggaran },
      })
      const payload = res.data?.data
      if (payload?.data) {
        applySirupData(payload.data)
      } else {
        toast.error("Paket RUP tidak ditemukan di server LKPP", {
          description: "Pastikan kode RUP sudah terdaftar pada T.A. yang dipilih.",
        })
      }
    } catch (err: unknown) {
      toast.error("Gagal menarik data dari SiRUP", {
        description: getErrorMessage(err, "Periksa koneksi internet."),
      })
    } finally {
      setIsFetchingSirup(false)
    }
  }

  const handleTargetChange = (bulan: number, mingguKe: number, value: string) => {
    const val = parseFloat(value) || 0
    const clamped = Math.max(0, Math.min(100, val))
    setWeeklyTargets((current) => current.map((item) =>
      item.bulan === bulan && item.mingguKe === mingguKe
        ? { ...item, targetFisik: clamped }
        : item
    ))
  }

  const handleUraianChange = (bulan: number, mingguKe: number, value: string) => {
    setWeeklyTargets((current) => current.map((item) =>
      item.bulan === bulan && item.mingguKe === mingguKe
        ? { ...item, uraianKegiatan: value }
        : item
    ))
  }

  // Distribusi kumulatif secara proporsional untuk seluruh minggu masa kontrak.
  const autoDistributeTargets = () => {
    if (weeklyTargets.length === 0) {
      toast.error("Lengkapi tanggal mulai dan selesai kontrak terlebih dahulu")
      return
    }
    setWeeklyTargets((current) => current.map((item, index) => ({
      ...item,
      targetFisik: parseFloat((((index + 1) / current.length) * 100).toFixed(2)),
    })))
    toast.success(`Target berhasil dibagi proporsional ke ${weeklyTargets.length} minggu kontrak`)
  }

  // Reset targets to 0
  const resetTargets = () => {
    setWeeklyTargets((current) => current.map((item) => ({ ...item, targetFisik: 0 })))
    toast.info("Target mingguan direset ke 0%")
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
      if (isKontrakActive && !isKontrakComplete) {
        throw new Error(
          `Nilai kontrak terisi (${formatRupiah(kontrakNum)}). Wajib melengkapi data kontrak: ${kontrakMissingFields.join(", ")} sebelum menyimpan.`
        )
      }
      if (tanggalMulai && tanggalSelesai && new Date(tanggalSelesai) < new Date(tanggalMulai)) {
        throw new Error("Tanggal selesai pelaksanaan tidak boleh lebih awal dari tanggal mulai")
      }
      if (canEditTarget && !isKeuangan) {
        for (let index = 1; index < weeklyTargets.length; index += 1) {
          if (weeklyTargets[index].targetFisik < weeklyTargets[index - 1].targetFisik) {
            throw new Error(
              `Target kumulatif B${String(weeklyTargets[index].bulan).padStart(2, "0")} Minggu ${weeklyTargets[index].mingguKe} tidak boleh lebih kecil dari minggu sebelumnya.`
            )
          }
        }
      }

      const targetBulananPayload = Array.from({ length: 12 }, (_, idx) => {
        const bulan = idx + 1
        const rows = weeklyTargets.filter((item) => item.bulan === bulan)
        const last = rows.at(-1)
        const previous = weeklyTargets.filter((item) => item.bulan < bulan).at(-1)
        return { bulan, targetFisik: last?.targetFisik ?? previous?.targetFisik ?? 0 }
      })

      const payload = {
        polaMonitoring,
        tahunAnggaran,
        opdId,
        subUnitId: !canSelectSubUnit && userSubUnitId ? userSubUnitId : (subUnitId || undefined),
        subKegiatan: subKegiatan.trim() || undefined,
        isGelondongan,
        subPaket: isGelondongan ? subPaketList : [],
        namaPaket: namaPaket.trim(),
        kodeRupKontrak: kodeRupKontrak.trim() || undefined,
        lokasiKegiatan: lokasiKegiatan.trim() || undefined,
        metodePemilihan: metodePemilihan || undefined,
        jenisPengadaan: jenisPengadaan || undefined,
        sumberDana: sumberDana || undefined,
        nomorKontrak: nomorKontrak.trim() || undefined,
        nilaiPagu: parseFloat(nilaiPagu) || 0,
        nilaiKontrak:
          isGelondongan && subPaketList.length > 0 && (!nilaiKontrak || parseFloat(nilaiKontrak) === 0)
            ? totalSubPaketKontrak
            : (parseFloat(nilaiKontrak) || 0),
        tanggalMulai: tanggalMulai || undefined,
        tanggalSelesai: tanggalSelesai || undefined,
        pemenangRekanan: pemenangRekanan.trim() || undefined,
        keterangan: keterangan.trim() || undefined,
        targetBulanan: isKeuangan ? [] : targetBulananPayload,
        targetMingguan: isKeuangan ? [] : weeklyTargets.map((item) => ({
          ...item,
          uraianKegiatan: item.uraianKegiatan?.trim() || undefined,
        })),
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-paket"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-rekap-opd"] })
      queryClient.invalidateQueries({ queryKey: ["rekap-realisasi"] })
      queryClient.invalidateQueries({ queryKey: ["laporan-rfk"] })
      queryClient.invalidateQueries({ queryKey: ["laporan-matriks-12"] })
      queryClient.invalidateQueries({ queryKey: ["laporan-rekap-opd"] })
      onOpenChange(false)
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Gagal menyimpan data paket")),
  })

  const finalTarget = weeklyTargets.at(-1)?.targetFisik || 0

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
                    ? "Perbarui rincian teknis pengadaan dan kalibrasi target fisik mingguan masa kontrak"
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
        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            if (tab === "targets" && !validateKontrakBeforeNext()) {
              return
            }
            setActiveTab(tab)
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-6 py-2.5 border-b bg-muted/20 shrink-0">
            <TabsList className={`grid w-full ${isKeuangan ? "sm:w-[240px] grid-cols-1" : "sm:w-[480px] grid-cols-2"}`}>
              <TabsTrigger value="info" className="gap-2 text-xs sm:text-sm font-medium">
                <FileText className="h-4 w-4" />
                {isKeuangan ? "Data Anggaran" : "1. Rincian Kontrak & PBJ"}
              </TabsTrigger>
              {!isKeuangan && <TabsTrigger value="targets" className="gap-2 text-xs sm:text-sm font-medium">
                <Calendar className="h-4 w-4" />
                2. Target Fisik Mingguan
              </TabsTrigger>}
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
                    Rincian kontrak, pagu, dan mekanisme pengadaan diinput oleh <strong>Admin SiRUP</strong> (Mode Hanya Baca untuk Admin Perencanaan). Akun Anda bertugas menetapkan <strong>Target Fisik Mingguan (Tab 2)</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* BOX: Pola Monitoring */}
            <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2.5">
                <SlidersHorizontal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Pola Monitoring</span>
              </div>

              <div className="max-w-md">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <Label htmlFor="polaMonitoring" className="text-xs font-medium">
                      Pola Monitoring <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Select value={polaMonitoring} onValueChange={setPolaMonitoring} disabled={!canEditInfo}>
                    <SelectTrigger id="polaMonitoring" className="text-sm h-9">
                      <SelectValue placeholder="Pilih pola monitoring..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FISIK_KEUANGAN">Fisik</SelectItem>
                      <SelectItem value="KEUANGAN">Keuangan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2 border border-border/40">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <span>
                    {isKeuangan
                      ? "Pola Keuangan: Cukup lengkapi data dasar paket, pagu, dan sumber dana. Tidak perlu mengisi target fisik mingguan. Realisasi keuangan diinput kumulatif bulanan pada menu Realisasi."
                      : "Pola Fisik: Lengkapi data kontrak dan target fisik mingguan pada Tab 2. Realisasi fisik dan keuangan diinput pada menu Realisasi."}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 1: Identitas Paket & OPD Penanggung Jawab */}
            <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2.5">
                <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>1. Identitas Paket & OPD Penanggung Jawab</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Tahun Anggaran */}
                <div className="sm:col-span-3 lg:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <Label htmlFor="tahunAnggaran" className="text-xs font-medium">
                      Tahun Anggaran <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Input
                    id="tahunAnggaran"
                    type="number"
                    value={tahunAnggaran}
                    onChange={(e) => setTahunAnggaran(parseInt(e.target.value) || 2026)}
                    disabled={!canEditInfo}
                    className="font-mono text-sm h-9"
                  />
                </div>

                {/* Unit Kerja (OPD) */}
                <div className="sm:col-span-9 lg:col-span-5 space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <Label className="text-xs font-medium">
                      Unit Kerja (OPD / SKPD) <span className="text-red-500">*</span>
                    </Label>
                  </div>
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
                      disabled={!canEditInfo}
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
                <div className="sm:col-span-12 lg:col-span-5 space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <Label className="text-xs font-medium">
                      Sub Unit Kerja (Bidang / Bagian)
                    </Label>
                  </div>
                  {canSelectSubUnit ? (
                    <SearchableCombobox
                      value={subUnitId}
                      onValueChange={setSubUnitId}
                      items={subUnitOptions}
                      placeholder={isLoadingSubUnits ? "Memuat Sub Unit..." : "Ketik / Pilih Sub Unit Kerja..."}
                      searchPlaceholder="Ketik nama Sub Unit Kerja..."
                      emptyText="Sub Unit Kerja tidak ditemukan."
                      icon={<Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                      disabled={isLoadingSubUnits || !opdId || !canEditInfo}
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
                <div className="sm:col-span-12 lg:col-span-8 space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <Label htmlFor="namaPaket" className="text-xs font-semibold text-foreground">
                      Nama Paket Pekerjaan / Pembangunan <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Input
                    id="namaPaket"
                    placeholder="Contoh: Pengadaan Obat dan BMHP (DAU Bidang Kesehatan)"
                    value={namaPaket}
                    onChange={(e) => setNamaPaket(e.target.value)}
                    disabled={!canEditInfo}
                    className="text-sm font-medium h-9"
                  />
                </div>

                {/* Lokasi Kegiatan */}
                <div className="sm:col-span-12 lg:col-span-4 space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <Label htmlFor="lokasiKegiatan" className="text-xs font-medium">
                      Lokasi Pekerjaan {isKontrakActive && <span className="text-red-500 font-bold">*</span>}
                    </Label>
                  </div>
                  <Input
                    id="lokasiKegiatan"
                    placeholder="Contoh: Kec. Andoolo / Kec. Palangga"
                    value={lokasiKegiatan}
                    onChange={(e) => setLokasiKegiatan(e.target.value)}
                    disabled={!canEditInfo}
                    className="text-sm h-9"
                  />
                </div>

                {/* Tombol & Pola Paket Gelondongan (Di bawah Nama Paket) */}
                <div className="sm:col-span-12 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/80 bg-muted/20">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-foreground">Paket Gelondongan / Pagu DPA Gabungan</span>
                        {isGelondongan && (
                          <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0 h-4.5">
                            {subPaketList.length} Sub Paket Terdaftar
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Aktifkan jika 1 paket induk ini memayungi beberapa sub-paket (masing-masing punya rekanan, nomor kontrak & pagu tersendiri).
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant={isGelondongan ? "default" : "outline"}
                      size="sm"
                      disabled={!canEditInfo}
                      onClick={() => {
                        setIsGelondongan(!isGelondongan)
                      }}
                      className={`h-8 text-xs font-medium gap-1.5 shrink-0 ${
                        isGelondongan
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Boxes className="h-3.5 w-3.5" />
                      {isGelondongan ? "Gelondongan Aktif (Klik untuk Tutup)" : "+ Paket Gelondongan"}
                    </Button>
                  </div>

                  {/* Sub Paket Builder ketika Gelondongan Aktif */}
                  {isGelondongan && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
                      {/* Plafon Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <h4 className="text-sm font-semibold text-foreground">Rincian Sub Paket (Pecahan Pagu Gelondongan)</h4>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Pagu Induk terkunci sebagai dasar perhitungan makro (tidak menduplikasi anggaran daerah).
                          </p>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={handleOpenAddSubPaket}
                          disabled={!canEditInfo}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 shadow-xs shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Tambah Sub Paket Baru
                        </Button>
                      </div>

                      {/* Ringkasan Alokasi Pagu */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="rounded-lg border bg-background/80 p-2.5 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Pagu Induk Gelondongan (DPA)</span>
                          <div className="text-sm font-bold font-mono text-foreground">{formatRupiah(paguNum)}</div>
                          <span className="text-[10px] text-emerald-600 font-medium">Terkunci sebagai Plafon</span>
                        </div>
                        <div className="rounded-lg border bg-background/80 p-2.5 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Total Alokasi Sub Paket ({subPaketList.length})</span>
                          <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{formatRupiah(totalSubPaketPagu)}</div>
                          <span className="text-[10px] text-muted-foreground">Akumulasi Kontrak: {formatRupiah(totalSubPaketKontrak)}</span>
                        </div>
                        <div className={`rounded-lg border p-2.5 space-y-0.5 ${
                          paguNum - totalSubPaketPagu < 0
                            ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
                            : "bg-background/80"
                        }`}>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Sisa Pagu Induk Bebas</span>
                          <div className="text-sm font-bold font-mono">
                            {formatRupiah(paguNum - totalSubPaketPagu)}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {paguNum - totalSubPaketPagu < 0 ? "Melebihi pagu induk!" : "Sisa anggaran belum teralokasi"}
                          </span>
                        </div>
                      </div>

                      {/* Tabel Sub Paket */}
                      {subPaketList.length === 0 ? (
                        <div className="text-center py-6 border border-dashed rounded-lg bg-background/50 text-muted-foreground space-y-2">
                          <Boxes className="h-8 w-8 mx-auto opacity-40 text-emerald-600" />
                          <p className="text-xs">Belum ada rincian sub-paket.</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpenAddSubPaket}
                            disabled={!canEditInfo}
                            className="text-xs h-7.5 gap-1.5"
                          >
                            <Plus className="h-3 w-3" />
                            Tambahkan Sub Paket Pertama
                          </Button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border bg-background shadow-2xs">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 border-b text-muted-foreground font-medium text-left">
                              <tr>
                                <th className="py-2 px-3 w-10 text-center">No</th>
                                <th className="py-2 px-3">Nama Sub Paket</th>
                                <th className="py-2 px-3">Pagu (Rp)</th>
                                <th className="py-2 px-3">No. Kontrak / SPK</th>
                                <th className="py-2 px-3">Masa Kontrak</th>
                                <th className="py-2 px-3">Rekanan / Penyedia</th>
                                <th className="py-2 px-3">Sumber Dana</th>
                                <th className="py-2 px-3 text-center w-20">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {subPaketList.map((sp, idx) => (
                                <tr key={sp.id || idx} className="hover:bg-muted/30 transition-colors">
                                  <td className="py-2 px-3 text-center text-muted-foreground font-mono">{idx + 1}</td>
                                  <td className="py-2 px-3 font-medium text-foreground">
                                    <div>{sp.namaSubPaket}</div>
                                    {sp.keterangan && (
                                      <div className="text-[10px] text-muted-foreground">{sp.keterangan}</div>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono font-semibold text-foreground whitespace-nowrap">
                                    {formatRupiah(Number(sp.pagu) || 0)}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                                    {sp.nomorKontrak || "-"}
                                  </td>
                                  <td className="py-2 px-3 text-[11px] whitespace-nowrap text-muted-foreground">
                                    {sp.tanggalMulai ? formatContractDate(sp.tanggalMulai) : "-"} s/d {sp.tanggalSelesai ? formatContractDate(sp.tanggalSelesai) : "-"}
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                                    {sp.rekanan || "-"}
                                  </td>
                                  <td className="py-2 px-3 text-[11px] whitespace-nowrap">
                                    {sp.sumberDana ? (
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                                        {sp.sumberDana}
                                      </Badge>
                                    ) : "-"}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenEditSubPaket(idx)}
                                        disabled={!canEditInfo}
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                        title="Edit Sub Paket"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteSubPaket(idx)}
                                        disabled={!canEditInfo}
                                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                        title="Hapus Sub Paket"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEKSI KHUSUS KEUANGAN: Data Anggaran */}
            {isKeuangan && (
              <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>2. Data Anggaran</span>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-normal">
                    Pola Keuangan
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                  {/* Nilai Pagu */}
                  <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                    <div className="flex items-center justify-between h-5">
                      <Label htmlFor="nilaiPaguKeuangan" className="text-xs font-medium">
                        Nilai Pagu Anggaran (Rp) <span className="text-red-500">*</span>
                      </Label>
                    </div>
                    <Input
                      id="nilaiPaguKeuangan"
                      type="number"
                      min={0}
                      value={nilaiPagu}
                      onChange={(e) => setNilaiPagu(e.target.value)}
                      disabled={!canEditInfo}
                      className="font-mono text-sm h-9"
                      placeholder="0"
                    />
                    <div className="text-[11px] text-muted-foreground font-mono h-4 truncate">
                      {formatRupiah(paguNum)}
                    </div>
                  </div>

                  {/* Sumber Dana */}
                  <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                    <div className="flex items-center justify-between h-5">
                      <Label htmlFor="sumberDanaKeuangan" className="text-xs font-medium">
                        Sumber Dana <span className="text-red-500">*</span>
                      </Label>
                    </div>
                    <Select value={sumberDana} onValueChange={setSumberDana} disabled={!canEditInfo}>
                      <SelectTrigger id="sumberDanaKeuangan" className="text-sm h-9">
                        <SelectValue placeholder="Pilih sumber dana..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sumberDanaOptions.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-[11px] text-muted-foreground h-4">
                      Sumber anggaran DPA
                    </div>
                  </div>

                  {/* Kode RUP */}
                  <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                    <div className="flex items-center justify-between h-5">
                      <Label htmlFor="kodeRupKeuangan" className="text-xs font-medium">
                        Kode RUP SiRUP LKPP
                      </Label>
                      <button
                        type="button"
                        onClick={() => setSirupDialogOpen(true)}
                        disabled={!canEditInfo}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
                      >
                        <Search className="h-3 w-3" />
                        Cari di SiRUP
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        id="kodeRupKeuangan"
                        placeholder="Contoh: 58616940"
                        value={kodeRupKontrak}
                        onChange={(e) => setKodeRupKontrak(e.target.value)}
                        disabled={!canEditInfo}
                        className="font-mono text-sm h-9 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isFetchingSirup || !kodeRupKontrak.trim() || !canEditInfo}
                        onClick={handleFetchSirupByKode}
                        className="h-9 px-2.5 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 shrink-0 font-medium"
                        title="Tarik data otomatis dari SiRUP LKPP"
                      >
                        {isFetchingSirup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
                        Tarik
                      </Button>
                    </div>
                    <div className="text-[11px] text-muted-foreground h-4">
                      Integrasi SiRUP (opsional)
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div className="sm:col-span-2 lg:col-span-12 space-y-1.5">
                    <div className="flex items-center justify-between h-5">
                      <Label htmlFor="keteranganKeuangan" className="text-xs font-medium">
                        Keterangan / Catatan Belanja
                      </Label>
                    </div>
                    <Textarea
                      id="keteranganKeuangan"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      disabled={!canEditInfo}
                      placeholder="Contoh: Pembayaran rutin operasional kantor sesuai kebutuhan selama tahun anggaran..."
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>


              </div>
            )}

            {/* SEKSI PENGADAAN & KONTRAK */}
            {!isKeuangan && (
              <>
                {/* SECTION 2: Mekanisme PBJ & Sumber Dana */}
                <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2.5">
                    <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>2. Mekanisme PBJ & Sumber Dana</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                    {/* Kode RUP */}
                    <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="kodeRupKontrak" className="text-xs font-medium">
                          Kode RUP SiRUP LKPP
                        </Label>
                        <button
                          type="button"
                          onClick={() => setSirupDialogOpen(true)}
                          disabled={!canEditInfo}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                          <Search className="h-3 w-3" />
                          Cari di SiRUP
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          id="kodeRupKontrak"
                          placeholder="Contoh: 58616940"
                          value={kodeRupKontrak}
                          onChange={(e) => setKodeRupKontrak(e.target.value)}
                          disabled={!canEditInfo}
                          className="font-mono text-sm h-9 flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isFetchingSirup || !kodeRupKontrak.trim() || !canEditInfo}
                          onClick={handleFetchSirupByKode}
                          className="h-9 px-2.5 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 shrink-0 font-medium"
                          title="Tarik data otomatis dari SiRUP LKPP"
                        >
                          {isFetchingSirup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
                          Tarik
                        </Button>
                      </div>
                    </div>

                    {/* Nomor Kontrak */}
                    <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="nomorKontrak" className="text-xs font-medium">
                          Nomor Kontrak / SPK {isKontrakActive && <span className="text-red-500 font-bold">*</span>}
                        </Label>
                      </div>
                      <Input
                        id="nomorKontrak"
                        placeholder="Contoh: 602/01/SPK/DPUPR/2026"
                        value={nomorKontrak}
                        onChange={(e) => setNomorKontrak(e.target.value)}
                        disabled={!canEditInfo}
                        className="font-mono text-sm h-9"
                      />
                    </div>

                    {/* Sumber Dana */}
                    <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="sumberDana" className="text-xs font-medium">
                          Sumber Dana
                        </Label>
                      </div>
                      <Select value={sumberDana} onValueChange={setSumberDana} disabled={!canEditInfo}>
                        <SelectTrigger id="sumberDana" className="text-sm h-9">
                          <SelectValue placeholder="Pilih sumber dana..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sumberDanaOptions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Metode Pemilihan */}
                    <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="metodePemilihan" className="text-xs font-medium">
                          Metode Pemilihan Pengadaan
                        </Label>
                      </div>
                      <Select value={metodePemilihan} onValueChange={setMetodePemilihan} disabled={!canEditInfo}>
                        <SelectTrigger id="metodePemilihan" className="text-sm h-9">
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
                    <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="jenisPengadaan" className="text-xs font-medium">
                          Jenis Pengadaan
                        </Label>
                      </div>
                      <Select value={jenisPengadaan} onValueChange={setJenisPengadaan} disabled={!canEditInfo}>
                        <SelectTrigger id="jenisPengadaan" className="text-sm h-9">
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

                    {/* Rekanan / Pelaksana Pemenang */}
                    <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="pemenangRekanan" className="text-xs font-medium">
                          Penyedia Jasa / Rekanan {isKontrakActive && <span className="text-red-500 font-bold">*</span>}
                        </Label>
                      </div>
                      <Input
                        id="pemenangRekanan"
                        placeholder="Contoh: PT. Konawe Perkasa Mandiri"
                        value={pemenangRekanan}
                        onChange={(e) => setPemenangRekanan(e.target.value)}
                        disabled={!canEditInfo}
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Nilai Anggaran & Efisiensi Kontrak */}
                <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2.5">
                    <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>3. Nilai Anggaran & Efisiensi Kontrak</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Nilai Pagu */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="nilaiPagu" className="text-xs font-medium">
                          {isGelondongan ? "Nilai Pagu Induk Gelondongan (Rp)" : "Nilai Pagu Anggaran (Rp)"} <span className="text-red-500">*</span>
                        </Label>
                      </div>
                      <Input
                        id="nilaiPagu"
                        type="number"
                        placeholder="0"
                        value={nilaiPagu}
                        onChange={(e) => setNilaiPagu(e.target.value)}
                        disabled={!canEditInfo}
                        className="font-mono text-sm h-9"
                      />
                      <div className="text-[11px] text-muted-foreground font-mono h-4 truncate">
                        {formatRupiah(paguNum)} {isGelondongan && "(Plafon Induk)"}
                      </div>
                    </div>

                    {/* Nilai Kontrak */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="nilaiKontrak" className="text-xs font-medium">
                          Nilai Kontrak Terikat (Rp)
                        </Label>
                      </div>
                      <Input
                        id="nilaiKontrak"
                        type="number"
                        placeholder="0"
                        value={nilaiKontrak}
                        onChange={(e) => setNilaiKontrak(e.target.value)}
                        disabled={!canEditInfo}
                        className="font-mono text-sm h-9"
                      />
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium h-4 truncate">
                        {formatRupiah(kontrakNum)}
                      </div>
                    </div>

                    {/* Live Efisiensi Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Efisiensi PBJ / Penghematan
                        </Label>
                      </div>
                      <div className="flex items-center justify-between h-9 px-3 rounded-md border bg-muted/40">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {persenEfisiensi}%
                        </span>
                        <span className="text-xs text-muted-foreground font-mono truncate" title={formatRupiah(selisihEfisiensi)}>
                          {formatRupiah(selisihEfisiensi)}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono h-4 truncate">
                        {kontrakNum > 0
                          ? selisihEfisiensi >= 0
                            ? "Penghematan dari nilai pagu"
                            : "Melebihi nilai pagu"
                          : "Belum ada nilai kontrak"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning Banner: Jika Nilai Kontrak Terisi, Form Kontrak Wajib Lengkap */}
                {isKontrakActive && !isKontrakComplete && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs shadow-xs animate-in fade-in">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <div className="font-bold text-amber-900 dark:text-amber-100 text-sm">
                        Nilai Kontrak Terisi — Data Pengadaan Wajib Dilengkapi:
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Karena nilai kontrak telah ditentukan (<strong>{formatRupiah(kontrakNum)}</strong>), Anda <strong>wajib mengisi Lokasi Pekerjaan, Nomor Kontrak, Penyedia Jasa/Rekanan, dan Tanggal Pelaksanaan</strong> (Keterangan bersifat opsional). Anda tidak dapat lanjut mengisi Target Fisik atau Realisasi sebelum data ini lengkap.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {kontrakMissingFields.map((f) => (
                          <Badge key={f} variant="outline" className="border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-[11px] font-semibold">
                            Wajib Diisi: {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 4: Jadwal & Keterangan */}
                <div className="rounded-xl border bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2.5">
                    <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>4. Waktu Pelaksanaan & Catatan</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                    {/* Tanggal Mulai */}
                    <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="tanggalMulai" className="text-xs font-medium">
                          Tanggal Mulai Pelaksanaan {isKontrakActive && <span className="text-red-500 font-bold">*</span>}
                        </Label>
                      </div>
                      <Input
                        id="tanggalMulai"
                        type="date"
                        value={tanggalMulai}
                        onChange={(e) => {
                          setTanggalMulai(e.target.value)
                          reconcileWeeklyPeriods(e.target.value, tanggalSelesai)
                        }}
                        disabled={!canEditInfo}
                        className="text-sm h-9"
                      />
                      <div className="text-[11px] text-muted-foreground h-4">
                        Awal SPMK / Mulai Pekerjaan
                      </div>
                    </div>

                    {/* Tanggal Selesai */}
                    <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="tanggalSelesai" className="text-xs font-medium">
                          Tanggal Selesai Pelaksanaan {isKontrakActive && <span className="text-red-500 font-bold">*</span>}
                        </Label>
                      </div>
                      <Input
                        id="tanggalSelesai"
                        type="date"
                        value={tanggalSelesai}
                        onChange={(e) => {
                          setTanggalSelesai(e.target.value)
                          reconcileWeeklyPeriods(tanggalMulai, e.target.value)
                        }}
                        disabled={!canEditInfo}
                        className="text-sm h-9"
                      />
                      <div className="text-[11px] text-muted-foreground h-4">
                        Batas Akhir Kontrak / PHO
                      </div>
                    </div>

                    {/* Durasi Kontrak Indicator */}
                    <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Masa Kontrak / Durasi
                        </Label>
                      </div>
                      <div className="flex items-center justify-between h-9 px-3 rounded-md border bg-muted/40 text-xs font-medium">
                        {durasiKontrak ? (
                          <>
                            <span className="text-foreground font-semibold">
                              {durasiKontrak.days} Hari Kalender
                            </span>
                            <span className="text-muted-foreground">
                              ~{durasiKontrak.months} Bulan Kerja
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Tentukan rentang tanggal
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground h-4">
                        Dihitung otomatis kalender
                      </div>
                    </div>

                    {/* Keterangan */}
                    <div className="sm:col-span-2 lg:col-span-12 space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="keterangan" className="text-xs font-medium">
                          Keterangan Tambahan / Catatan Teknis
                        </Label>
                      </div>
                      <Textarea
                        id="keterangan"
                        placeholder="Catatan tahapan pelelangan, kondisi lapangan, atau informasi spesifik..."
                        rows={2}
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        disabled={!canEditInfo}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB 2: TARGET FISIK MINGGUAN */}
          <TabsContent value="targets" className="flex-1 overflow-y-auto p-6 space-y-5 m-0">
            {/* Banner kewenangan Admin Perencanaan */}
            {!canEditTarget && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-900 dark:text-amber-100">Kewenangan Khusus Admin Perencanaan:</span>
                  <p className="mt-0.5 text-muted-foreground">
                    Penetapan target fisik mingguan dilakukan oleh <strong>Admin Perencanaan</strong> setelah paket pengadaan dibuat oleh Admin SiRUP. Rekap bulanan untuk dashboard dan TEPRA dihitung otomatis dari target minggu terakhir setiap bulan.
                  </p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-emerald-500/10 via-card to-card p-4">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Rencana Fisik Kumulatif per Minggu Kontrak
                </div>
                <p className="text-xs text-muted-foreground">
                  Hanya bulan dalam tanggal mulai–selesai kontrak yang ditampilkan. Setiap bulan dibagi per minggu sejak tanggal mulai kontrak.
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
                    Bagi Otomatis per Minggu
                  </Button>
                </div>
              )}
            </div>

            {weeklyTargets.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Lengkapi tanggal mulai dan tanggal selesai kontrak pada Tab 1 untuk membentuk periode target mingguan.
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(new Set(weeklyTargets.map((item) => item.bulan))).map((bulan) => (
                  <div key={bulan} className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">B{String(bulan).padStart(2, "0")} · {BULAN_NAMES[bulan - 1]}</div>
                        <div className="text-[11px] text-muted-foreground">{weeklyTargets.filter((item) => item.bulan === bulan).length} periode minggu kontrak</div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-xs">
                        <thead className="bg-muted/20 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium w-24">Minggu</th>
                            <th className="px-4 py-2 text-left font-medium w-56">Rentang Tanggal</th>
                            <th className="px-4 py-2 text-left font-medium">Nama/Uraian Kegiatan</th>
                            <th className="px-4 py-2 text-right font-medium w-36">Target Kumulatif</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyTargets.filter((item) => item.bulan === bulan).map((item) => (
                            <tr key={`${item.bulan}-${item.mingguKe}`} className="border-t">
                              <td className="px-4 py-3 font-semibold">MINGGU {item.mingguKe}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatContractDate(item.tanggalMulai)} – {formatContractDate(item.tanggalSelesai)}
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  value={item.uraianKegiatan || ""}
                                  onChange={(event) => handleUraianChange(item.bulan, item.mingguKe, event.target.value)}
                                  disabled={!canEditTarget}
                                  placeholder="Contoh: pekerjaan pondasi"
                                  className="h-9 text-xs"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={item.targetFisik}
                                    onChange={(event) => handleTargetChange(item.bulan, item.mingguKe, event.target.value)}
                                    disabled={!canEditTarget}
                                    className="h-9 pr-7 text-right font-mono font-semibold"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                    Target Akhir Kontrak: {" "}
                    <span className={finalTarget === 100 ? "text-emerald-600" : "text-amber-600"}>
                      {finalTarget}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {finalTarget === 100
                      ? "Target fisik telah lengkap mencapai 100.00% pada minggu terakhir kontrak."
                      : "Target minggu terakhir kontrak disarankan mencapai 100.00%."}
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
            {activeTab === "info" ? (isKeuangan ? "Monitoring Keuangan" : "Tab 1: Rincian PBJ & Kontrak") : "Tab 2: Target Fisik Mingguan"}
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
                {/* Paket non-fisik / keuangan bisa langsung simpan di tab info */}
                {(isKeuangan && canEditInfo) && (
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
                        Simpan Data Anggaran
                      </>
                    )}
                  </Button>
                )}

                <Button
                  type="button"
                  disabled={isKeuangan}
                  variant="default"
                  onClick={() => {
                    if (validateKontrakBeforeNext()) {
                      setActiveTab("targets")
                    }
                  }}
                  className="gap-1.5"
                >
                  <span>Target Fisik Mingguan</span>
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
                      {canEditTarget
                        ? isEdit
                          ? "Simpan Target Fisik & Perubahan"
                          : "Simpan Target & Paket Baru"
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

      {/* Modal Pencarian Langsung SiRUP LKPP */}
      <SirupSearchDialog
        open={sirupDialogOpen}
        onOpenChange={setSirupDialogOpen}
        onSelectPaket={applySirupData}
        currentTahun={tahunAnggaran}
      />

      {/* Modal Tambah / Edit Sub Paket */}
      <Dialog open={subPaketDialogOpen} onOpenChange={setSubPaketDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Boxes className="h-4 w-4 text-emerald-600" />
              {subPaketEditingIndex !== null ? "Edit Sub Paket" : "Tambah Sub Paket Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan rincian sub-paket pecahan pagu gelondongan (nomor kontrak, rekanan, dan alokasi pagu).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Nama Sub Paket */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Nama Sub Paket <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: Pengadaan Obat dan BMHP (DAU) Pkt 1 _ BHP PTM"
                value={subPaketForm.namaSubPaket}
                onChange={(e) => setSubPaketForm({ ...subPaketForm, namaSubPaket: e.target.value })}
                className="text-xs h-8.5"
              />
            </div>

            {/* Pagu & Nilai Kontrak */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Pagu Sub Paket (Rp) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={subPaketForm.pagu || ""}
                  onChange={(e) => setSubPaketForm({ ...subPaketForm, pagu: Number(e.target.value) || 0 })}
                  className="text-xs font-mono h-8.5"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Nilai Kontrak (Rp)
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Sama dengan pagu"
                  value={subPaketForm.nilaiKontrak || ""}
                  onChange={(e) => setSubPaketForm({ ...subPaketForm, nilaiKontrak: Number(e.target.value) || 0 })}
                  className="text-xs font-mono h-8.5"
                />
              </div>
            </div>

            {/* Nomor Kontrak / SPK / EP */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Nomor Kontrak / SPK / Kode EP
              </Label>
              <Input
                placeholder="Contoh: EP-01KHH4FHV2ZTMT2ZHHEDVTMW76"
                value={subPaketForm.nomorKontrak || ""}
                onChange={(e) => setSubPaketForm({ ...subPaketForm, nomorKontrak: e.target.value })}
                className="text-xs font-mono h-8.5"
              />
            </div>

            {/* Masa Kontrak (Mulai - Selesai) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={subPaketForm.tanggalMulai || ""}
                  onChange={(e) => setSubPaketForm({ ...subPaketForm, tanggalMulai: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={subPaketForm.tanggalSelesai || ""}
                  onChange={(e) => setSubPaketForm({ ...subPaketForm, tanggalSelesai: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>
            </div>

            {/* Rekanan & Sumber Dana */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Penyedia / Rekanan</Label>
                <Input
                  placeholder="Contoh: PT. Sumber Medika"
                  value={subPaketForm.rekanan || ""}
                  onChange={(e) => setSubPaketForm({ ...subPaketForm, rekanan: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Sumber Dana</Label>
                <Input
                  placeholder="Contoh: DAU KESEHATAN / DAK"
                  value={subPaketForm.sumberDana || ""}
                  onChange={(e) => setSubPaketForm({ ...subPaketForm, sumberDana: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>
            </div>

            {/* Keterangan */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Keterangan Tambahan</Label>
              <Input
                placeholder="Contoh: SUDAH DILAKSANAKAN"
                value={subPaketForm.keterangan || ""}
                onChange={(e) => setSubPaketForm({ ...subPaketForm, keterangan: e.target.value })}
                className="text-xs h-8.5"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSubPaketDialogOpen(false)}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveSubPaket}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
            >
              Simpan Sub Paket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
