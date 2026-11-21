"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Camera,
  Calendar,
  CheckCircle2,
  FileDown,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  FileText,
  User,
  ArrowLeft,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  MonevLapanganItem,
  MonevListResponse,
  MonevPaketInfo,
  monevFotoUrl,
} from "../lib/monev-types"
import { cetakLaporanMonev, buildLaporanMonevHtml } from "../lib/cetak-monev-pdf"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MonevDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paketId: string | null
  initialPaket?: any
  defaultView?: "auto" | "pdf" | "kelola"
}

const formatRupiah = (val?: number | null) => {
  const n = Number(val) || 0
  return `Rp ${new Intl.NumberFormat("id-ID").format(n)}`
}

const formatTanggal = (iso?: string | null) => {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function MonevDialog({
  open,
  onOpenChange,
  paketId,
  initialPaket,
  defaultView,
}: MonevDialogProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Hak akses: ADMINISTRATOR atau MONEV
  const userRoles: string[] =
    user?.roles && user.roles.length > 0
      ? user.roles
      : user?.role
      ? [user.role]
      : []
  const canManage = userRoles.some((r) => ["ADMINISTRATOR", "MONEV"].includes(r))

  // State tampilan: OPD (PPK/Bendahara) SELALU "pdf". Admin/Monev bisa beralih.
  const [activeTab, setActiveTab] = React.useState<"pdf" | "kelola">("pdf")
  const isPdfView = !canManage || defaultView === "pdf" || activeTab === "pdf"

  const [selectedReportId, setSelectedReportId] = React.useState<string>("ALL")
  const [previewHtml, setPreviewHtml] = React.useState<string>("")
  const [isGeneratingHtml, setIsGeneratingHtml] = React.useState<boolean>(false)

  // State tampilan & form
  const [mode, setMode] = React.useState<"list" | "create" | "edit">("list")
  const [editingItem, setEditingItem] = React.useState<MonevLapanganItem | null>(null)

  // Form states
  const [tanggalMonev, setTanggalMonev] = React.useState(
    new Date().toISOString().split("T")[0],
  )
  const [progresFisik, setProgresFisik] = React.useState<number | string>(100)
  const [kondisiFisik, setKondisiFisik] = React.useState("")
  const [permasalahan, setPermasalahan] = React.useState("")
  const [saran, setSaran] = React.useState("")
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Fetch daftar hasil monev paket
  const {
    data: monevResponse,
    isLoading,
    refetch,
  } = useQuery<MonevListResponse>({
    queryKey: ["monev-lapangan", paketId],
    queryFn: async () => {
      if (!paketId) throw new Error("Paket ID tidak ditemukan")
      const res = await apiClient.get(`/pembangunan/${paketId}/monev`)
      return res.data?.data
    },
    enabled: open && !!paketId,
  })

  const paket: MonevPaketInfo = React.useMemo(() => {
    return (
      monevResponse?.paket || {
        id: paketId || "",
        namaPaket: initialPaket?.namaPaket || "",
        tahunAnggaran: initialPaket?.tahunAnggaran || new Date().getFullYear(),
        nomorKontrak: initialPaket?.nomorKontrak || initialPaket?.noKontrak || null,
        pemenangRekanan: initialPaket?.pemenangRekanan || initialPaket?.rekanan || null,
        tanggalMulai: initialPaket?.tanggalMulai || null,
        tanggalSelesai: initialPaket?.tanggalSelesai || null,
        nilaiKontrak: Number(initialPaket?.nilaiKontrak) || 0,
        lokasiKegiatan: initialPaket?.lokasiKegiatan || null,
        polaMonitoring: initialPaket?.polaMonitoring,
        opd: initialPaket?.opd ? { namaOpd: initialPaket.opd.namaOpd } : null,
        subUnit: initialPaket?.subUnit
          ? { namaSubUnit: initialPaket.subUnit.namaSubUnit }
          : null,
      }
    )
  }, [monevResponse?.paket, paketId, initialPaket])

  const monevList = monevResponse?.data || []

  // Urutan kronologis (Kunjungan tertua = Monev Ke-1, berikutnya = Monev Ke-2, dst.)
  const orderedMonevList = React.useMemo(() => {
    const sorted = [...monevList].sort(
      (a, b) => new Date(a.tanggalMonev).getTime() - new Date(b.tanggalMonev).getTime(),
    )
    return sorted.map((item, idx) => ({
      ...item,
      kunjunganKe: idx + 1,
    }))
  }, [monevList])

  // Reset tab saat dibuka
  React.useEffect(() => {
    if (open) {
      if (!canManage || defaultView === "pdf") {
        setActiveTab("pdf")
      }
      setSelectedReportId("ALL")
    } else {
      setMode("list")
      setEditingItem(null)
      setSelectedFiles([])
      cleanupPreviews()
    }
  }, [open, canManage, defaultView])

  const selectedReports = React.useMemo(() => {
    if (selectedReportId === "ALL") return orderedMonevList
    const found = orderedMonevList.find((m) => m.id === selectedReportId)
    return found ? [found] : orderedMonevList
  }, [orderedMonevList, selectedReportId])

  React.useEffect(() => {
    let isCancelled = false
    if (!open || monevList.length === 0) {
      setPreviewHtml("")
      return
    }

    setIsGeneratingHtml(true)
    buildLaporanMonevHtml(paket, selectedReports, { forPreview: true, hideToolbar: true })
      .then((html) => {
        if (!isCancelled) {
          setPreviewHtml(html)
          setIsGeneratingHtml(false)
        }
      })
      .catch((err) => {
        console.error("Gagal generate pratinjau HTML monev:", err)
        if (!isCancelled) setIsGeneratingHtml(false)
      })

    return () => {
      isCancelled = true
    }
  }, [open, selectedReports, paket, monevList.length])

  const cleanupPreviews = () => {
    previewUrls.forEach((u) => URL.revokeObjectURL(u))
    setPreviewUrls([])
  }

  const handleStartCreate = () => {
    // Estimasi progres dari paket saat ini jika ada
    const defaultProgres = initialPaket?.realisasiFisik ?? 100
    setEditingItem(null)
    setTanggalMonev(new Date().toISOString().split("T")[0])
    setProgresFisik(defaultProgres)
    setKondisiFisik("")
    setPermasalahan("-")
    setSaran("-")
    setSelectedFiles([])
    cleanupPreviews()
    setMode("create")
  }

  const handleStartEdit = (item: MonevLapanganItem) => {
    setEditingItem(item)
    setTanggalMonev(item.tanggalMonev ? item.tanggalMonev.split("T")[0] : "")
    setProgresFisik(item.progresFisik ?? 0)
    setKondisiFisik(item.kondisiFisik || "")
    setPermasalahan(item.permasalahan || "")
    setSaran(item.saran || "")
    setSelectedFiles([])
    cleanupPreviews()
    setMode("edit")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validasi tipe dan batas
    const valid = files.filter((f) => {
      const isImg = /^image\/(jpeg|png|webp)$/i.test(f.type)
      if (!isImg) {
        toast.error(`File "${f.name}" bukan format gambar JPG/PNG/WEBP`)
      }
      return isImg
    })

    const combined = [...selectedFiles, ...valid]
    if (combined.length > 12) {
      toast.error("Maksimal 12 foto dokumentasi per laporan monev")
      return
    }

    setSelectedFiles(combined)
    const newUrls = valid.map((f) => URL.createObjectURL(f))
    setPreviewUrls((prev) => [...prev, ...newUrls])
  }

  const handleRemoveSelectedFile = (idx: number) => {
    URL.revokeObjectURL(previewUrls[idx])
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  // Mutation simpan (Create)
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!paketId) throw new Error("Paket ID tidak valid")
      const form = new FormData()
      form.append("tanggalMonev", tanggalMonev)
      form.append("progresFisik", String(Number(progresFisik) || 0))
      form.append("kondisiFisik", kondisiFisik.trim())
      form.append("permasalahan", permasalahan.trim() || "-")
      form.append("saran", saran.trim() || "-")

      selectedFiles.forEach((f) => {
        form.append("files", f)
      })

      const res = await apiClient.post(`/pembangunan/${paketId}/monev`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return res.data
    },
    onSuccess: () => {
      toast.success("Laporan monitoring lapangan berhasil disimpan")
      queryClient.invalidateQueries({ queryKey: ["monev-lapangan", paketId] })
      queryClient.invalidateQueries({ queryKey: ["paket-pembangunan"] })
      setMode("list")
      cleanupPreviews()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Gagal menyimpan laporan"
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg))
    },
  })

  // Mutation update (Edit)
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!paketId || !editingItem) throw new Error("Item tidak valid")
      const form = new FormData()
      form.append("tanggalMonev", tanggalMonev)
      form.append("progresFisik", String(Number(progresFisik) || 0))
      form.append("kondisiFisik", kondisiFisik.trim())
      form.append("permasalahan", permasalahan.trim() || "-")
      form.append("saran", saran.trim() || "-")

      selectedFiles.forEach((f) => {
        form.append("files", f)
      })

      const res = await apiClient.patch(
        `/pembangunan/${paketId}/monev/${editingItem.id}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      return res.data
    },
    onSuccess: () => {
      toast.success("Laporan monitoring lapangan berhasil diperbarui")
      queryClient.invalidateQueries({ queryKey: ["monev-lapangan", paketId] })
      setMode("list")
      cleanupPreviews()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Gagal memperbarui laporan"
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg))
    },
  })

  // Mutation hapus (Delete)
  const deleteMutation = useMutation({
    mutationFn: async (monevId: string) => {
      if (!paketId) throw new Error("Paket ID tidak valid")
      const res = await apiClient.delete(`/pembangunan/${paketId}/monev/${monevId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success("Laporan monitoring lapangan berhasil dihapus")
      queryClient.invalidateQueries({ queryKey: ["monev-lapangan", paketId] })
      queryClient.invalidateQueries({ queryKey: ["paket-pembangunan"] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Gagal menghapus laporan"
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!kondisiFisik.trim()) {
      toast.error("Wajib mengisi KONDISI FISIK KEGIATAN")
      return
    }

    if (mode === "create") {
      createMutation.mutate()
    } else {
      updateMutation.mutate()
    }
  }

  const handleDelete = (item: MonevLapanganItem) => {
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus laporan monitoring tanggal ${formatTanggal(
          item.tanggalMonev,
        )}?`,
      )
    ) {
      deleteMutation.mutate(item.id)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-h-[94vh] z-[60] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[94vw] sm:max-w-[94vw] 2xl:w-[1360px] 2xl:max-w-[1360px] bg-background">
        {/* Header Modal */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20">
                  {isPdfView ? <FileText className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                </span>
                <DialogTitle className="text-lg font-bold flex flex-wrap items-center gap-2">
                  <span>{isPdfView ? "Dokumen Laporan Hasil MONEV Lapangan" : "Monitoring & Evaluasi Lapangan (Tim MONEV)"}</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-400 text-emerald-700 dark:text-emerald-300">
                    Tim MONEV Adpem Setda
                  </Badge>
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {isPdfView
                  ? "Dokumen resmi hasil monitoring pelaksanaan kegiatan APBD/DAK format F4/Folio (Dapat dicetak atau diunduh langsung sebagai PDF)."
                  : "Dokumentasi fisik visual, kondisi riil lapangan, permasalahan, dan saran rekomendasi sesuai standar format laporan APBD/DAK."}
              </DialogDescription>
            </div>

            {/* Tombol Aksi di Header */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Switcher khusus Admin/Tim Monev */}
              {canManage && (
                <div className="flex items-center p-1 bg-muted rounded-lg border text-xs mr-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("pdf")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      activeTab === "pdf"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pratinjau PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("kelola")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      activeTab === "kelola"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Kelola Laporan
                  </button>
                </div>
              )}

              {/* Kontrol saat Mode PDF Aktif */}
              {isPdfView && orderedMonevList.length > 0 && (
                <>
                  {orderedMonevList.length > 1 && (
                    <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                      <SelectTrigger className="h-8 text-xs w-[200px] bg-background">
                        <SelectValue placeholder="Pilih Kunjungan Monev" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">
                          Semua Digabung ({orderedMonevList.length} Lembar)
                        </SelectItem>
                        {orderedMonevList.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            Monev Ke-{m.kunjunganKe} · {formatTanggal(m.tanggalMonev)} (±{m.progresFisik}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    size="sm"
                    onClick={() => cetakLaporanMonev(paket, selectedReports)}
                    className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                    title="Cetak atau Unduh Dokumen Resmi Format PDF (Folio F4)"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Cetak / Unduh PDF</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cetakLaporanMonev(paket, selectedReports)}
                    className="h-8 gap-1.5 text-xs"
                    title="Buka dokumen di tab jendela baru"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Tab Baru</span>
                  </Button>
                </>
              )}

              {/* Tombol aksi khusus Mode Kelola (Admin / Tim Monev) */}
              {!isPdfView && mode === "list" && canManage && (
                <Button
                  size="sm"
                  onClick={handleStartCreate}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-semibold h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Laporan MONEV
                </Button>
              )}
              {!isPdfView && mode !== "list" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("list")}
                  className="gap-1.5 shrink-0 h-8 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Kembali ke Riwayat
                </Button>
              )}
            </div>
          </div>

          {/* Rincian Singkat Paket */}
          <div className="mt-3 p-3 rounded-lg border bg-background text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <span className="text-muted-foreground block text-[10px] font-sans">NAMA PAKET</span>
              <span className="font-semibold line-clamp-1" title={paket.namaPaket}>
                {paket.namaPaket || "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] font-sans">SKPD / INSTANSI</span>
              <span className="font-semibold truncate block">
                {paket.opd?.namaOpd || "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] font-sans">
                NILAI KONTRAK &amp; REKANAN
              </span>
              <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                {formatRupiah(paket.nilaiKontrak)}
              </span>{" "}
              <span className="text-muted-foreground text-[11px]">
                ({paket.pemenangRekanan || "Belum ada rekanan"})
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        {isPdfView ? (
          /* ======================================================== */
          /* MODE TAMPILAN PDF (LANGSUNG UNTUK OPD / PREVIEW)        */
          /* ======================================================== */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-700 overflow-hidden">
            {isLoading || isGeneratingHtml ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-200 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <p className="text-xs">Menyiapkan pratinjau dokumen laporan hasil MONEV...</p>
              </div>
            ) : monevList.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6 bg-muted/10">
                <div className="max-w-md w-full bg-background border rounded-2xl p-8 text-center space-y-4 shadow-sm">
                  <div className="h-14 w-14 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-foreground">
                      Belum Ada Hasil Monitoring Lapangan
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tim Monitoring dan Evaluasi (Bagian Administrasi Pembangunan Setda Kab. Konawe Selatan) belum mengunggah catatan atau laporan hasil monitoring lapangan untuk paket kegiatan ini.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                      Tutup
                    </Button>
                    {canManage && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveTab("kelola")
                          handleStartCreate()
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Input Hasil MONEV
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Tabs Kunjungan Monev jika terdapat > 1 laporan */}
                {orderedMonevList.length > 1 && (
                  <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-thin">
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">
                      Pilih Kunjungan:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedReportId("ALL")}
                      className={`px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                        selectedReportId === "ALL"
                          ? "bg-emerald-600 text-white shadow font-semibold"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 font-medium"
                      }`}
                    >
                      <span>Semua Digabung (1 Dokumen)</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedReportId === "ALL" ? "bg-emerald-800 text-white" : "bg-slate-700 text-slate-300"
                      }`}>
                        {orderedMonevList.length}x
                      </span>
                    </button>
                    {orderedMonevList.map((m) => {
                      const isSelected = selectedReportId === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedReportId(m.id)}
                          className={`px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow font-semibold"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 font-medium"
                          }`}
                        >
                          <span>Monev Ke-{m.kunjunganKe}</span>
                          <span className={`text-[10px] ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                            ({formatTanggal(m.tanggalMonev)} · ±{m.progresFisik}%)
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="bg-slate-900 text-slate-300 text-[11px] px-4 py-2 flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] bg-slate-800 border-slate-700 text-emerald-400">
                      Format F4 / Folio Resmi
                    </Badge>
                    <span>
                      {selectedReportId === "ALL" ? (
                        <>Menampilkan <strong className="text-white">Semua Kunjungan Digabung ({orderedMonevList.length} Lembar Laporan)</strong> · Gulir ke bawah untuk melihat Monev berikutnya</>
                      ) : (
                        (() => {
                          const curr = orderedMonevList.find((m) => m.id === selectedReportId)
                          return (
                            <>Menampilkan <strong className="text-emerald-400">Laporan Monev Ke-{curr?.kunjunganKe}</strong> · Tanggal: {formatTanggal(curr?.tanggalMonev)} (Fisik: ±{curr?.progresFisik}%)</>
                          )
                        })()
                      )}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    💡 Gunakan tombol <strong className="text-emerald-400">Cetak / Unduh PDF</strong> untuk mencetak atau menyimpan dokumen ini.
                  </div>
                </div>
                <div className="flex-1 relative w-full min-h-0 overflow-hidden bg-slate-700">
                  <iframe
                    srcDoc={previewHtml}
                    className="absolute inset-0 w-full h-full border-0 block bg-slate-700"
                    title="Pratinjau Dokumen Laporan Hasil MONEV"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* MODE KELOLA / FORM (KHUSUS ADMIN / TIM MONEV)            */
          /* ======================================================== */
          <div className="flex-1 overflow-y-auto p-6">
          {/* ======================================================== */}
          {/* MODE FORM (CREATE / EDIT) - 2 KOLOM LAPANG & LEGA        */}
          {/* ======================================================== */}
          {mode !== "list" ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    {mode === "create"
                      ? "Formulir Input Hasil Monitoring Lapangan Baru"
                      : "Perbarui Laporan Monitoring Lapangan"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Format disesuaikan dengan dokumen resmi Word Laporan MONEV APBD/DAK Kab. Konawe Selatan
                  </p>
                </div>
              </div>

              {/* GRID 2 KOLOM */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* KOLOM KIRI (5 Kolom): Parameter Tanggal, Progres & Upload Foto */}
                <div className="lg:col-span-5 space-y-4 rounded-xl border p-4 bg-muted/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="tanggalMonev" className="text-xs font-semibold">
                        Tanggal Kunjungan Monev *
                      </Label>
                      <Input
                        id="tanggalMonev"
                        type="date"
                        value={tanggalMonev}
                        onChange={(e) => setTanggalMonev(e.target.value)}
                        required
                        className="text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="progresFisik" className="text-xs font-semibold">
                        Capaian Fisik Lapangan (%) *
                      </Label>
                      <div className="relative">
                        <Input
                          id="progresFisik"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={progresFisik}
                          onChange={(e) => setProgresFisik(e.target.value)}
                          required
                          placeholder="100"
                          className="text-xs pr-8 font-mono font-semibold bg-background"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Upload Foto Dokumentasi Lapangan */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-emerald-600" />
                        Dokumentasi Foto Lapangan (Opsional)
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Maks. 12 Foto
                      </span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-600 rounded-xl p-4 text-center cursor-pointer transition-colors bg-emerald-500/[0.03] hover:bg-emerald-500/[0.08] flex flex-col items-center justify-center gap-1.5"
                    >
                      <Upload className="h-6 w-6 text-emerald-600" />
                      <div className="text-xs font-semibold">
                        Klik untuk memilih foto dokumentasi lapangan (jika ada)
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Opsional · Foto akan disusun berjejer 2 kolom pada laporan PDF
                      </p>
                    </div>

                    {/* Preview Thumbnail Foto yang Dipilih */}
                    {previewUrls.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-semibold text-muted-foreground">
                          Foto baru yang akan diunggah ({previewUrls.length} file):
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {previewUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-lg overflow-hidden border bg-muted aspect-video shadow-xs"
                            >
                              <img
                                src={url}
                                alt={`Preview ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveSelectedFile(idx)}
                                className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-90 hover:opacity-100 shadow"
                                title="Hapus foto ini"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Foto yang sudah tersimpan jika mode edit */}
                    {mode === "edit" && editingItem && editingItem.fotos.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="text-[11px] font-semibold text-muted-foreground">
                          Foto yang sudah tersimpan ({editingItem.fotos.length} file):
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {editingItem.fotos.map((f) => (
                            <div
                              key={f.id}
                              className="relative rounded-lg overflow-hidden border bg-muted aspect-video"
                            >
                              <img
                                src={monevFotoUrl(f)}
                                alt={f.namaFile}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* KOLOM KANAN (7 Kolom): 3 Blok Teks Resmi Word */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Teks 1: Kondisi Fisik Kegiatan */}
                  <div className="space-y-1.5">
                    <Label htmlFor="kondisiFisik" className="text-xs font-bold uppercase tracking-wide">
                      1. KONDISI FISIK KEGIATAN *
                    </Label>
                    <Textarea
                      id="kondisiFisik"
                      rows={5}
                      value={kondisiFisik}
                      onChange={(e) => setKondisiFisik(e.target.value)}
                      placeholder="Deskripsikan kondisi fisik terkini kegiatan di lapangan (misal: pengadaan barang telah diterima lengkap dan terpasang baik, konstruksi pondasi selesai, dsb.)"
                      className="text-xs font-serif leading-relaxed"
                      required
                    />
                  </div>

                  {/* Teks 2: Permasalahan */}
                  <div className="space-y-1.5">
                    <Label htmlFor="permasalahan" className="text-xs font-bold uppercase tracking-wide">
                      2. PERMASALAHAN *
                    </Label>
                    <Textarea
                      id="permasalahan"
                      rows={4}
                      value={permasalahan}
                      onChange={(e) => setPermasalahan(e.target.value)}
                      placeholder="Kendala atau hambatan pelaksanaan di lapangan (isi '-' jika tidak ada masalah)"
                      className="text-xs font-serif leading-relaxed"
                      required
                    />
                  </div>

                  {/* Teks 3: Saran */}
                  <div className="space-y-1.5">
                    <Label htmlFor="saran" className="text-xs font-bold uppercase tracking-wide">
                      3. SARAN *
                    </Label>
                    <Textarea
                      id="saran"
                      rows={4}
                      value={saran}
                      onChange={(e) => setSaran(e.target.value)}
                      placeholder="Saran / rekomendasi tindak lanjut bagi OPD pelaksana maupun rekanan (isi '-' jika nihil)"
                      className="text-xs font-serif leading-relaxed"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("list")}
                  disabled={isSaving}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-5 font-semibold"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {mode === "create" ? "Simpan Laporan MONEV" : "Simpan Perubahan"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* ======================================================== */
            /* MODE LIST / RIWAYAT HASIL MONEV                          */
            /* ======================================================== */
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <p className="text-xs">Memuat laporan hasil monitoring lapangan...</p>
                </div>
              ) : monevList.length === 0 ? (
                <div className="py-12 border-2 border-dashed rounded-xl text-center space-y-3 bg-muted/10">
                  <Camera className="h-10 w-10 text-muted-foreground/60 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Belum Ada Laporan Monitoring</p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Paket ini belum memiliki catatan monitoring lapangan dari Tim MONEV.
                      {canManage && " Klik tombol di atas untuk menambah laporan baru."}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      onClick={handleStartCreate}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Input Hasil MONEV Lapangan
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {monevList.map((item, idx) => (
                    <Card
                      key={item.id}
                      className="border shadow-sm overflow-hidden transition-all hover:border-emerald-500/40"
                    >
                      {/* Baris Header Item Monev */}
                      <div className="bg-muted/40 px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                            Laporan #{monevList.length - idx}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatTanggal(item.tanggalMonev)}
                          </div>
                          <Badge
                            variant="outline"
                            className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-950/20"
                          >
                            Progres Fisik: ± {item.progresFisik}%
                          </Badge>
                        </div>

                        {/* Tombol Aksi Item */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cetakLaporanMonev(paket, item)}
                            className="h-7 text-xs gap-1.5 text-emerald-700 border-emerald-500/40 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                            title="Cetak format Word / PDF Folio F4"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Cetak PDF (F4)
                          </Button>

                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(item)}
                                className="h-7 text-xs text-muted-foreground hover:text-blue-600"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item)}
                                className="h-7 text-xs text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <CardContent className="p-4 space-y-4">
                        {/* Grid Foto Dokumentasi Lapangan */}
                        {item.fotos.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                              Dokumentasi Pelaksanaan Monitoring ({item.fotos.length} Foto)
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                              {item.fotos.map((foto) => (
                                <a
                                  key={foto.id}
                                  href={monevFotoUrl(foto)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group relative rounded-lg overflow-hidden border bg-muted aspect-video block"
                                  title="Klik untuk membuka ukuran penuh"
                                >
                                  <img
                                    src={monevFotoUrl(foto)}
                                    alt={foto.namaFile}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Lihat</span>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Konten 3 Kolom Standar Word Sejajar */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                          <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                            <span className="font-bold underline uppercase tracking-wide block text-neutral-800 dark:text-neutral-200">
                              KONDISI FISIK KEGIATAN
                            </span>
                            <p className="mt-1 text-muted-foreground whitespace-pre-line leading-relaxed font-serif">
                              {item.kondisiFisik || "-"}
                            </p>
                          </div>

                          <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                            <span className="font-bold underline uppercase tracking-wide block text-neutral-800 dark:text-neutral-200">
                              PERMASALAHAN
                            </span>
                            <p className="mt-1 text-muted-foreground whitespace-pre-line leading-relaxed font-serif">
                              {item.permasalahan || "-"}
                            </p>
                          </div>

                          <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                            <span className="font-bold underline uppercase tracking-wide block text-neutral-800 dark:text-neutral-200">
                              SARAN
                            </span>
                            <p className="mt-1 text-muted-foreground whitespace-pre-line leading-relaxed font-serif">
                              {item.saran || "-"}
                            </p>
                          </div>
                        </div>

                        {/* Petugas Pembuat Laporan */}
                        {item.createdBy && (
                          <div className="pt-2 border-t flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>
                              Dicatat oleh:{" "}
                              <strong className="text-foreground">
                                {item.createdBy.namaLengkap || "Petugas Monev"}
                              </strong>
                              {item.createdBy.nip ? ` (NIP. ${item.createdBy.nip})` : ""}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
