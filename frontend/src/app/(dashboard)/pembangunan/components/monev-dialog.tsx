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
import { cetakLaporanMonev } from "../lib/cetak-monev-pdf"

interface MonevDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paketId: string | null
  initialPaket?: any
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
  const canManage =
    userRoles.length === 0 ||
    userRoles.some((r) => ["ADMINISTRATOR", "MONEV"].includes(r))

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

  const paket: MonevPaketInfo = monevResponse?.paket || {
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

  const monevList = monevResponse?.data || []

  // Reset form saat dialog buka/tutup
  React.useEffect(() => {
    if (!open) {
      setMode("list")
      setEditingItem(null)
      setSelectedFiles([])
      cleanupPreviews()
    }
  }, [open])

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
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[94vw] sm:max-w-[94vw] 2xl:w-[1360px] 2xl:max-w-[1360px] bg-background">
        {/* Header Modal */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20">
                  <Camera className="h-5 w-5" />
                </span>
                <DialogTitle className="text-lg font-bold">
                  Monitoring &amp; Evaluasi Lapangan (Tim MONEV)
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Dokumentasi fisik visual, kondisi riil lapangan, permasalahan, dan saran
                rekomendasi sesuai standar format laporan APBD/DAK.
              </DialogDescription>
            </div>
            {mode === "list" && canManage && (
              <Button
                size="sm"
                onClick={handleStartCreate}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-semibold"
              >
                <Plus className="h-4 w-4" />
                Tambah Laporan MONEV
              </Button>
            )}
            {mode !== "list" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("list")}
                className="gap-1.5 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Riwayat
              </Button>
            )}
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
      </DialogContent>
    </Dialog>
  )
}
