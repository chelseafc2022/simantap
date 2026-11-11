"use client"

import { useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Edit2, Trash2, Check, X, Loader2, ChevronLeft, ChevronRight,
  LockKeyhole, Upload, FileText, ExternalLink, Plus, Paperclip,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const API_STORAGE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1")
  .replace(/\/api\/v1\/?$/, "")

export interface BuktiPencairanItem {
  id: string
  namaFile: string
  pathFile: string
  mimeType?: string
  ukuranBytes?: number
  deskripsi?: string
  createdAt?: string
}

export interface Pencairan {
  id: string
  nominal: number
  catatan: string
  createdAt: string
  bulan?: number
  bukti?: BuktiPencairanItem[]
}

export interface Month {
  bulan: number
  realisasiKeuangan: number
  catatanOperator?: string
  pencairan?: Pencairan[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  paket: { id: string; namaPaket: string; nilaiPagu: number; tahunAnggaran: number }
  pencairanTersedia: boolean
  timeline: Month[]
  activeBulan: number
  roles: string[]
  lockedMonths: number[]
  onSaved: () => void | Promise<unknown>
}

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const formatBytes = (bytes?: number) => {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function InputKeuanganDialog({
  open, onOpenChange, paket, pencairanTersedia, timeline,
  activeBulan, roles, lockedMonths, onSaved,
}: Props) {
  const [bulan, setBulan] = useState(activeBulan)
  const [activeTab, setActiveTab] = useState(() => {
    const isAdmin = roles.includes("ADMINISTRATOR")
    const canInput = (isAdmin || roles.includes("BENDAHARA")) && pencairanTersedia
      && (isAdmin || !lockedMonths.includes(activeBulan))
    return canInput ? "tambah" : "riwayat"
  })
  const allMonths = bulan === 0

  // Form states untuk Tambah Pencairan Baru
  const [nominal, setNominal] = useState("")
  const [catatan, setCatatan] = useState("")
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [deskripsiFile, setDeskripsiFile] = useState("")

  // Inline edit state untuk record pencairan yang sudah ada
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNominal, setEditNominal] = useState("")
  const [editCatatan, setEditCatatan] = useState("")

  // State untuk upload dokumen tambahan ke pencairan yang sudah ada
  const [uploadingPencairanId, setUploadingPencairanId] = useState<string | null>(null)

  const row = timeline.find((item) => item.bulan === bulan)
  const previous = timeline.find((item) => item.bulan === bulan - 1)?.realisasiKeuangan || 0
  const cumulative = Number((allMonths ? [...timeline].sort((a, b) => b.bulan - a.bulan)[0] : row)?.realisasiKeuangan || 0)
  const monthTotal = cumulative - Number(previous)
  const records = row?.pencairan || []
  const legacyTotal = monthTotal - records.reduce((sum, item) => sum + Number(item.nominal), 0)
  const dirty = !!nominal || !!catatan || !!editingId || pendingFiles.length > 0
  const isAdmin = roles.includes("ADMINISTRATOR")
  const canEdit = isAdmin || roles.includes("BENDAHARA")
  const locked = !isAdmin && lockedMonths.includes(bulan)
  const amount = Number(nominal.replace(/\./g, "").replace(",", "."))
  const disabled = allMonths || !pencairanTersedia || !canEdit || locked

  const allHistory: Pencairan[] = [...timeline].sort((a, b) => a.bulan - b.bulan).flatMap((month) => {
    const pencairan = month.pencairan || []
    const previousTotal = Number(timeline.find((item) => item.bulan === month.bulan - 1)?.realisasiKeuangan || 0)
    const saldoLama = Number(month.realisasiKeuangan) - previousTotal - pencairan.reduce((sum, item) => sum + Number(item.nominal), 0)
    return [
      ...(saldoLama !== 0
        ? [{
            id: `saldo-${month.bulan}`,
            bulan: month.bulan,
            nominal: saldoLama,
            catatan: month.catatanOperator || "Realisasi sebelum rincian pencairan bertahap",
            createdAt: "",
            bukti: [],
          }]
        : []),
      ...pencairan.map((item) => ({ ...item, bulan: month.bulan })),
    ]
  })

  const transactionCount = allMonths
    ? timeline.reduce((sum, month) => sum + (month.pencairan?.length || 0), 0)
    : records.length

  // Tambah Pencairan beserta file bukti dukung yang melekat padanya
  const addMutation = useMutation({
    mutationFn: async () => {
      if (allMonths) throw new Error("Pilih bulan pelaporan terlebih dahulu")
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nominal pencairan harus lebih dari nol")
      if (!catatan.trim()) throw new Error("Isi catatan / referensi dokumen pencairan terlebih dahulu")
      if (cumulative + amount > Number(paket.nilaiPagu)) throw new Error("Realisasi melebihi pagu anggaran")

      // 1. Catat record pencairan
      await apiClient.post(`/pembangunan/${paket.id}/pencairan`, {
        id: requestId,
        bulan,
        nominal: amount,
        catatan: catatan.trim(),
      })

      // 2. Upload file bukti dukung yang melekat ke pencairan tersebut
      if (pendingFiles.length > 0) {
        const formData = new FormData()
        pendingFiles.forEach((file) => formData.append("files", file))
        if (deskripsiFile.trim()) formData.append("deskripsi", deskripsiFile.trim())
        await apiClient.post(
          `/pembangunan/${paket.id}/pencairan/${requestId}/bukti`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        )
      }
    },
    onSuccess: async () => {
      setNominal("")
      setCatatan("")
      setPendingFiles([])
      setDeskripsiFile("")
      setRequestId(crypto.randomUUID())
      toast.success("Pencairan dan bukti dukung berhasil dicatat.")
      await onSaved()
    },
    onError: (error: unknown) => {
      const e = error as { message?: string; response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || e.message || "Gagal mencatat pencairan")
    },
  })

  // Upload file bukti tambahan ke pencairan yang sudah ada di riwayat
  const handleUploadToExisting = async (pencairanId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    setUploadingPencairanId(pencairanId)
    try {
      const formData = new FormData()
      fileList.forEach((file) => formData.append("files", file))
      await apiClient.post(
        `/pembangunan/${paket.id}/pencairan/${pencairanId}/bukti`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      toast.success("Dokumen bukti pencairan berhasil ditambahkan.")
      await onSaved()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gagal mengunggah dokumen bukti")
    } finally {
      setUploadingPencairanId(null)
    }
  }

  // Hapus dokumen bukti dari pencairan tertentu
  const deletePencairanBuktiMutation = useMutation({
    mutationFn: (buktiId: string) => apiClient.delete(`/pembangunan/pencairan-bukti/${buktiId}`),
    onSuccess: async () => {
      toast.success("Dokumen bukti pencairan berhasil dihapus.")
      await onSaved()
    },
    onError: (error: unknown) => {
      const e = error as { message?: string; response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || e.message || "Gagal menghapus dokumen")
    },
  })

  // Ubah / Edit Pencairan
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("Pencairan tidak dipilih")
      const parsedAmount = Number(editNominal.replace(/\./g, "").replace(",", "."))
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new Error("Nominal pencairan harus lebih dari nol")
      if (!editCatatan.trim()) throw new Error("Catatan pencairan tidak boleh kosong")
      return apiClient.patch(`/pembangunan/${paket.id}/pencairan/${editingId}`, {
        nominal: parsedAmount,
        catatan: editCatatan.trim(),
      })
    },
    onSuccess: async () => {
      setEditingId(null)
      setEditNominal("")
      setEditCatatan("")
      toast.success("Record pencairan berhasil diperbarui.")
      await onSaved()
    },
    onError: (error: unknown) => {
      const e = error as { message?: string; response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || e.message || "Gagal memperbarui pencairan")
    },
  })

  // Hapus Pencairan
  const deleteMutation = useMutation({
    mutationFn: async (pencairanId: string) => {
      return apiClient.delete(`/pembangunan/${paket.id}/pencairan/${pencairanId}`)
    },
    onSuccess: async () => {
      toast.success("Pencairan beserta dokumen buktinya berhasil dihapus.")
      await onSaved()
    },
    onError: (error: unknown) => {
      const e = error as { message?: string; response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || e.message || "Gagal menghapus pencairan")
    },
  })

  // Reset Saldo Legacy
  const resetLegacySaldoMutation = useMutation({
    mutationFn: async () => {
      return apiClient.put(`/pembangunan/${paket.id}/realisasi/${bulan}/saldo`, {
        nominal: 0,
        catatan: "Direset oleh pengguna",
      })
    },
    onSuccess: async () => {
      toast.success("Saldo realisasi lama berhasil direset ke 0.")
      await onSaved()
    },
    onError: (error: unknown) => {
      const e = error as { message?: string; response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || e.message || "Gagal mereset saldo")
    },
  })

  const busy = addMutation.isPending || editMutation.isPending || deleteMutation.isPending || resetLegacySaldoMutation.isPending || !!uploadingPencairanId
  const monthDisabled = busy || dirty

  const selectMonth = (value: number) => {
    setBulan(value)
    if (value === 0) setActiveTab("riwayat")
  }

  const startEdit = (item: Pencairan) => {
    setEditingId(item.id)
    setEditNominal(String(item.nominal))
    setEditCatatan(item.catatan || "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditNominal("")
    setEditCatatan("")
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    const available = Math.max(0, 5 - pendingFiles.length)
    if (selected.length > available) {
      toast.warning(`Maksimal 5 file bukti per pencairan. Hanya ${available} file yang dapat ditambahkan.`)
    }
    setPendingFiles((files) => [...files, ...selected.slice(0, available)])
    event.target.value = ""
  }

  const financialSummary = (
    <>
      <div className="grid grid-cols-1 gap-3 rounded-lg border p-3 text-sm min-[400px]:grid-cols-2 [&_strong]:break-words">
        <div>Pagu Anggaran<strong className="block">{rupiah(Number(paket.nilaiPagu))}</strong></div>
        <div>Total Pencairan {allMonths ? "Tahun Anggaran" : months[bulan - 1]}<strong className="block">{rupiah(allMonths ? cumulative : monthTotal)}</strong></div>
        <div>Kumulatif {allMonths ? `TA ${paket.tahunAnggaran}` : `sampai ${months[bulan - 1]}`}<strong className="block text-emerald-600 dark:text-emerald-400">{rupiah(cumulative)}</strong></div>
        <div>Sisa Anggaran<strong className="block">{rupiah(Number(paket.nilaiPagu) - cumulative)}</strong></div>
      </div>

      {!pencairanTersedia && (
        <p className="rounded-lg border p-3 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/20">
          Pencatatan bertahap belum diaktifkan. Riwayat realisasi tetap dapat dilihat.
        </p>
      )}
    </>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90dvh] max-h-[920px] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 text-left sm:px-6">
          <DialogTitle>Realisasi Keuangan Bulanan</DialogTitle>
          <DialogDescription className="line-clamp-2 break-words">{paket.namaPaket} · TA {paket.tahunAnggaran}</DialogDescription>
        </DialogHeader>

        {/* Pemilihan Bulan Pelaporan */}
        <div className="shrink-0 space-y-2 border-b px-4 py-3 sm:px-6">
          <Label htmlFor="bulan-keuangan">Bulan Pelaporan</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Bulan sebelumnya"
              disabled={monthDisabled || bulan <= 1}
              onClick={() => selectMonth(bulan - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={String(bulan)} onValueChange={(value) => selectMonth(Number(value))} disabled={monthDisabled}>
              <SelectTrigger id="bulan-keuangan" className="min-w-0 flex-1">
                <SelectValue>{allMonths ? "Semua Bulan" : months[bulan - 1]} {paket.tahunAnggaran}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Semua Bulan {paket.tahunAnggaran}</SelectItem>
                {months.map((name, i) => (
                  <SelectItem key={name} value={String(i + 1)}>
                    {name} {paket.tahunAnggaran}
                    {lockedMonths.includes(i + 1) && <span className="text-xs text-muted-foreground">· Ditutup{isAdmin ? " (akses admin)" : ""}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Bulan berikutnya"
              disabled={monthDisabled || allMonths || bulan === 12}
              onClick={() => selectMonth(bulan + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {allMonths && <p className="text-xs text-muted-foreground">Menampilkan seluruh pencairan Januari–Desember. Pilih bulan tertentu untuk menambah atau mengubah pencairan.</p>}
          {locked && <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400"><LockKeyhole className="h-3.5 w-3.5" />Periode ditutup. Riwayat tetap dapat dilihat.</p>}
          {dirty && <p className="text-xs text-amber-700 dark:text-amber-400" role="status">{editingId ? "Simpan atau batalkan perubahan sebelum mengganti bulan." : "Catat pencairan atau kosongkan formulir sebelum mengganti bulan."}</p>}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex-1 gap-0 overflow-hidden">
          <TabsList className="mx-4 my-3 grid w-auto shrink-0 grid-cols-2 sm:mx-6" aria-label="Pencairan bulanan">
            <TabsTrigger value="tambah" disabled={allMonths || !canEdit || !!editingId}>Tambah Pencairan</TabsTrigger>
            <TabsTrigger value="riwayat">Riwayat ({transactionCount})</TabsTrigger>
          </TabsList>

          {/* TAB 1: TAMBAH PENCAIRAN BARU DENGAN BUKTI DUKUNG MELEKAT */}
          <TabsContent value="tambah" className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4 sm:px-6">
            {financialSummary}

            {canEdit && (
              <section className="space-y-3.5 rounded-lg border p-4 bg-muted/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Tambah Pencairan · {months[bulan - 1]} {paket.tahunAnggaran}</h3>
                  <span className="text-xs text-muted-foreground">Input nominal dan lampirkan bukti dukungnya</span>
                </div>

                {/* 1. Nominal */}
                <div className="space-y-1.5">
                  <Label htmlFor="keuangan-pencairan" className="text-xs font-semibold">Nominal Pencairan (Rp) *</Label>
                  <Input
                    id="keuangan-pencairan"
                    inputMode="decimal"
                    placeholder="Contoh: 25.000.000"
                    value={nominal}
                    disabled={disabled || addMutation.isPending}
                    onChange={(e) => setNominal(e.target.value.replace(/[^\d.,]/g, ""))}
                    className="font-mono text-sm h-9"
                  />
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {rupiah(Number.isFinite(amount) ? amount : 0)}
                  </p>
                </div>

                {/* 2. Catatan / Uraian SP2D */}
                <div className="space-y-1.5">
                  <Label htmlFor="catatan-keuangan" className="text-xs font-semibold">Catatan / Referensi Dokumen Pencairan (SP2D / Kuitansi) *</Label>
                  <Textarea
                    id="catatan-keuangan"
                    maxLength={2000}
                    value={catatan}
                    disabled={disabled || addMutation.isPending}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Nomor SP2D, uraian pembayaran termin/tahap, kuitansi, dan nomor dokumen pendukung..."
                    rows={2}
                    className="max-h-40 resize-none text-xs"
                  />
                </div>

                {/* 3. Bukti Dokumen Pendukung yang Melekat Langsung ke Pencairan Ini */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-purple-600" />
                      Bukti Dukung Pencairan (Scan SP2D, Kuitansi, BAST, PDF / Foto)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Maks. 5 file, 10MB/file</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/mp4,application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 border-dashed hover:border-solid hover:border-purple-500"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled || addMutation.isPending}
                    >
                      <Upload className="h-3.5 w-3.5 text-purple-600" />
                      <span>Pilih File Bukti (PDF / Foto)</span>
                    </Button>
                    {pendingFiles.length > 0 && (
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        {pendingFiles.length} file dilampirkan
                      </span>
                    )}
                  </div>

                  {pendingFiles.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {pendingFiles.map((file, idx) => (
                          <Badge key={`${file.name}-${idx}`} variant="secondary" className="text-xs py-1 px-2 gap-1.5">
                            <FileText className="h-3 w-3 text-red-600" />
                            <span className="truncate max-w-[220px] font-medium">{file.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">({formatBytes(file.size)})</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground ml-1"
                              onClick={() => setPendingFiles((files) => files.filter((_, i) => i !== idx))}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>

                      <Input
                        value={deskripsiFile}
                        onChange={(e) => setDeskripsiFile(e.target.value)}
                        placeholder="Keterangan singkat dokumen bukti (opsional, misal: SP2D LS Tahap 1)"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {amount > 0 && (
                      <p className="text-xs font-medium">
                        Kumulatif setelah disimpan: <strong className="text-emerald-600 font-mono">{rupiah(cumulative + amount)}</strong>
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Pencairan akan disimpan bersama bukti dokumennya dan langsung memperbarui rekap realisasi.
                    </p>
                  </div>

                  {!disabled && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5 shrink-0"
                      disabled={addMutation.isPending || !nominal || !catatan.trim()}
                      onClick={() => addMutation.mutate()}
                    >
                      {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      <span>Catat Pencairan & Simpan Bukti</span>
                    </Button>
                  )}
                </div>
              </section>
            )}
          </TabsContent>

          {/* TAB 2: RIWAYAT PENCAIRAN DAN BUKTI DUKUNG MASING-MASING */}
          <TabsContent value="riwayat" className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4 sm:px-6" key={bulan}>
            {financialSummary}

            {allMonths ? (
              <section className="space-y-3" aria-label="Riwayat pencairan semua bulan">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Seluruh Pencairan · TA {paket.tahunAnggaran}</h3>
                  <span className="text-xs text-muted-foreground">{transactionCount} transaksi</span>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[720px] text-sm">
                    <caption className="sr-only">Daftar pencairan seluruh bulan tahun anggaran {paket.tahunAnggaran}</caption>
                    <thead className="bg-muted text-left text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="p-3">Bulan</th>
                        <th scope="col" className="p-3">Waktu Pencatatan (WITA)</th>
                        <th scope="col" className="p-3">Catatan / Referensi</th>
                        <th scope="col" className="p-3">Bukti Dokumen Dukung</th>
                        <th scope="col" className="p-3 text-right">Nominal</th>
                        <th scope="col" className="p-3"><span className="sr-only">Aksi</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allHistory.map((item) => (
                        <tr key={item.id} className="align-top hover:bg-muted/30">
                          <td className="p-3 whitespace-nowrap">
                            {months[(item.bulan || 1) - 1]}
                            {lockedMonths.includes(item.bulan || 0) && <span className="block text-[11px] text-muted-foreground">Ditutup{isAdmin ? " (akses admin)" : ""}</span>}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Makassar" }) : "Saldo lama"}
                          </td>
                          <td className="max-w-xs p-3 whitespace-pre-wrap break-words text-xs">{item.catatan}</td>
                          <td className="p-3 text-xs">
                            {item.bukti && item.bukti.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {item.bukti.map((doc) => {
                                  const fileUrl = `${API_STORAGE_URL}${doc.pathFile}`
                                  const isPdf = doc.mimeType === "application/pdf" || /\.pdf(?:[?#]|$)/i.test(doc.pathFile || doc.namaFile)
                                  return (
                                    <a
                                      key={doc.id}
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent transition-colors"
                                      title={doc.namaFile}
                                    >
                                      <FileText className={`h-3.5 w-3.5 ${isPdf ? "text-red-600" : "text-blue-600"}`} />
                                      <span className="truncate max-w-[130px]">{doc.namaFile}</span>
                                      <ExternalLink className="h-2.5 w-2.5 opacity-60 ml-0.5" />
                                    </a>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap font-medium text-emerald-700 dark:text-emerald-300">
                            {rupiah(Number(item.nominal))}
                          </td>
                          <td className="p-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={monthDisabled}
                              onClick={() => selectMonth(item.bulan || 1)}
                              aria-label={`Lihat pencairan bulan ${months[(item.bulan || 1) - 1]}`}
                              className="text-xs h-7"
                            >
                              Lihat Bulan
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {!allHistory.length && (
                        <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Belum ada pencairan pada tahun anggaran ini.</td></tr>
                      )}
                    </tbody>
                    <tfoot className="border-t bg-muted/50 font-semibold">
                      <tr>
                        <td colSpan={4} className="p-3">Total Realisasi Tahun Anggaran</td>
                        <td className="p-3 text-right whitespace-nowrap">{rupiah(cumulative)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            ) : (
              <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Riwayat Pencairan {months[bulan - 1]}</h3>
                  <span className="text-xs text-muted-foreground">{records.length} transaksi</span>
                </div>

                {legacyTotal !== 0 && (
                  <div className="rounded-lg border p-3 text-sm bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong>{rupiah(legacyTotal)}</strong>
                        <p className="whitespace-pre-wrap text-muted-foreground mt-0.5">{row?.catatanOperator || "Realisasi tercatat sebelum rincian pencairan bertahap"}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Saldo realisasi kumulatif sebelumnya</p>
                      </div>
                      {canEdit && !locked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          disabled={resetLegacySaldoMutation.isPending}
                          onClick={() => {
                            if (window.confirm("Yakin ingin mereset saldo realisasi lama ini ke 0?")) {
                              resetLegacySaldoMutation.mutate()
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Reset Saldo
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* DAFTAR TRANSAKSI PENCAIRAN BESERTA BUKTI DOKUMEN MELEKAT */}
                {records.map((item, index) => {
                  const isEditing = editingId === item.id
                  const isUploadingThis = uploadingPencairanId === item.id

                  if (isEditing) {
                    return (
                      <div key={item.id} className="rounded-lg border-2 border-primary/50 bg-primary/5 p-3.5 text-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-primary">Edit Pencairan #{index + 1}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label="Batalkan edit pencairan" disabled={editMutation.isPending} onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nominal (Rp)</Label>
                          <Input
                            inputMode="decimal"
                            value={editNominal}
                            onChange={(e) => setEditNominal(e.target.value.replace(/[^\d.,]/g, ""))}
                            className="font-mono text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Catatan / Uraian Pencairan</Label>
                          <Textarea
                            value={editCatatan}
                            onChange={(e) => setEditCatatan(e.target.value)}
                            rows={2}
                            className="text-xs"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={editMutation.isPending} onClick={cancelEdit}>
                            Batal
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={editMutation.isPending || !editNominal || !editCatatan.trim()}
                            onClick={() => editMutation.mutate()}
                          >
                            {editMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                            Simpan Perubahan
                          </Button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={item.id} className="rounded-lg border bg-card p-3.5 text-sm shadow-2xs space-y-3 hover:border-border transition-colors">
                      {/* Baris Atas: Nominal, Waktu, Tombol Aksi */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-emerald-700 dark:text-emerald-300 text-base font-bold">
                            #{index + 1} · {rupiah(Number(item.nominal))}
                          </strong>
                          <time className="block text-[11px] text-muted-foreground mt-0.5">
                            Dicatat pada {new Date(item.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA
                          </time>
                        </div>

                        {canEdit && !locked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Ubah pencairan ini"
                              onClick={() => startEdit(item)}
                              disabled={deleteMutation.isPending || editMutation.isPending}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              title="Hapus pencairan ini"
                              disabled={deleteMutation.isPending || editMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Yakin ingin menghapus pencairan senilai ${rupiah(Number(item.nominal))} beserta dokumen buktinya?`)) {
                                  deleteMutation.mutate(item.id)
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Hapus
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Uraian Catatan / SP2D */}
                      <div className="rounded-md bg-muted/30 p-2.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">Catatan / Referensi:</span>
                        {item.catatan}
                      </div>

                      {/* Dokumen Bukti yang Melekat pada Pencairan Ini */}
                      <div className="pt-2 border-t border-border/70 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-purple-600" />
                            Bukti Dokumen Pencairan ({item.bukti?.length || 0})
                          </span>

                          {canEdit && !locked && (item.bukti?.length || 0) < 5 && (
                            <label className="cursor-pointer text-[11px] font-medium text-purple-700 hover:text-purple-800 dark:text-purple-300 flex items-center gap-1 hover:underline">
                              {isUploadingThis ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                              <span>+ Lampirkan Dokumen</span>
                              <input
                                type="file"
                                multiple
                                accept="image/*,video/mp4,application/pdf"
                                className="hidden"
                                disabled={isUploadingThis}
                                onChange={(e) => handleUploadToExisting(item.id, e.target.files)}
                              />
                            </label>
                          )}
                        </div>

                        {item.bukti && item.bukti.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.bukti.map((doc) => {
                              const fileUrl = `${API_STORAGE_URL}${doc.pathFile}`
                              const isPdf = doc.mimeType === "application/pdf" || /\.pdf(?:[?#]|$)/i.test(doc.pathFile || doc.namaFile)
                              return (
                                <div key={doc.id} className="flex items-center justify-between gap-2 rounded-md border bg-background p-2 text-xs">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <FileText className={`h-4 w-4 shrink-0 ${isPdf ? "text-red-600" : "text-blue-600"}`} />
                                    <div className="min-w-0">
                                      <p className="truncate font-medium text-xs" title={doc.namaFile}>{doc.namaFile}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {doc.ukuranBytes ? formatBytes(doc.ukuranBytes) : ""} {doc.deskripsi ? `· ${doc.deskripsi}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button asChild variant="outline" size="sm" className="h-6 px-2 text-[11px]">
                                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3 mr-1" />{isPdf ? "Buka PDF" : "Buka"}
                                      </a>
                                    </Button>
                                    {canEdit && !locked && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                        disabled={deletePencairanBuktiMutation.isPending}
                                        onClick={() => {
                                          if (window.confirm(`Hapus dokumen "${doc.namaFile}" dari pencairan ini?`)) {
                                            deletePencairanBuktiMutation.mutate(doc.id)
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">
                            Belum ada dokumen bukti yang dilampirkan pada pencairan ini.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}

                {!records.length && legacyTotal === 0 && (
                  <p className="text-sm text-muted-foreground italic py-3 text-center rounded-lg border border-dashed">
                    Belum ada transaksi pencairan pada bulan ini.
                  </p>
                )}
              </section>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Serapan Anggaran */}
        <div className="shrink-0 border-t px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Serapan Anggaran: <strong className="text-foreground">{Number(paket.nilaiPagu) > 0 ? ((cumulative / Number(paket.nilaiPagu)) * 100).toFixed(2) : "0"}%</strong></span>
            {!isAdmin && lockedMonths.includes(bulan) && (
              <span className="text-amber-700 dark:text-amber-400 font-medium">⚠️ Periode input bulan ini telah ditutup</span>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
