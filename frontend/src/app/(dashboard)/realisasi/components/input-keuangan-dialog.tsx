"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Edit2, Trash2, Check, X, Loader2, ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Pencairan {
  id: string
  nominal: number
  catatan: string
  createdAt: string
}
interface Month {
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

export function InputKeuanganDialog({ open, onOpenChange, paket, pencairanTersedia, timeline, activeBulan, roles, lockedMonths, onSaved }: Props) {
  const [bulan, setBulan] = useState(activeBulan)
  const [activeTab, setActiveTab] = useState(() => {
    const isAdmin = roles.includes("ADMINISTRATOR")
    const canInput = (isAdmin || roles.includes("BENDAHARA")) && pencairanTersedia
      && (isAdmin || !lockedMonths.includes(activeBulan))
    return canInput ? "tambah" : "riwayat"
  })
  const allMonths = bulan === 0
  const [nominal, setNominal] = useState("")
  const [catatan, setCatatan] = useState("")
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())

  // Inline edit state for existing pencairan record
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNominal, setEditNominal] = useState("")
  const [editCatatan, setEditCatatan] = useState("")

  const row = timeline.find(item => item.bulan === bulan)
  const previous = timeline.find(item => item.bulan === bulan - 1)?.realisasiKeuangan || 0
  const cumulative = Number((allMonths ? [...timeline].sort((a, b) => b.bulan - a.bulan)[0] : row)?.realisasiKeuangan || 0)
  const monthTotal = cumulative - Number(previous)
  const records = row?.pencairan || []
  const legacyTotal = monthTotal - records.reduce((sum, item) => sum + Number(item.nominal), 0)
  const dirty = !!nominal || !!catatan || !!editingId
  const isAdmin = roles.includes("ADMINISTRATOR")
  const canEdit = isAdmin || roles.includes("BENDAHARA")
  const locked = !isAdmin && lockedMonths.includes(bulan)
  const amount = Number(nominal.replace(/\./g, "").replace(",", "."))
  const disabled = allMonths || !pencairanTersedia || !canEdit || locked
  const allHistory = [...timeline].sort((a, b) => a.bulan - b.bulan).flatMap(month => {
    const pencairan = month.pencairan || []
    const previousTotal = Number(timeline.find(item => item.bulan === month.bulan - 1)?.realisasiKeuangan || 0)
    const saldoLama = Number(month.realisasiKeuangan) - previousTotal - pencairan.reduce((sum, item) => sum + Number(item.nominal), 0)
    return [
      ...(saldoLama !== 0 ? [{ id: `saldo-${month.bulan}`, bulan: month.bulan, nominal: saldoLama, catatan: month.catatanOperator || "Realisasi sebelum rincian pencairan bertahap", createdAt: null }] : []),
      ...pencairan.map(item => ({ ...item, bulan: month.bulan })),
    ]
  })
  const transactionCount = allMonths ? timeline.reduce((sum, month) => sum + (month.pencairan?.length || 0), 0) : records.length

  // Tambah Pencairan
  const addMutation = useMutation({
    mutationFn: async () => {
      if (allMonths) throw new Error("Pilih bulan pelaporan terlebih dahulu")
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nominal pencairan harus lebih dari nol")
      if (!catatan.trim()) throw new Error("Isi catatan pencairan terlebih dahulu")
      if (cumulative + amount > Number(paket.nilaiPagu)) throw new Error("Realisasi melebihi pagu anggaran")
      return apiClient.post(`/pembangunan/${paket.id}/pencairan`, { id: requestId, bulan, nominal: amount, catatan: catatan.trim() })
    },
    onSuccess: async () => {
      setNominal(""); setCatatan(""); setRequestId(crypto.randomUUID())
      toast.success("Pencairan dicatat dan langsung masuk ke rekap realisasi.")
      await onSaved()
    },
    onError: (error: unknown) => {
      const e = error as { message?: string; response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || e.message || "Gagal mencatat pencairan")
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
      setEditingId(null); setEditNominal(""); setEditCatatan("")
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
      toast.success("Pencairan berhasil dihapus.")
      await onSaved()
    },
    onError: (error: unknown) => {
      const e = error as { message?: string; response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || e.message || "Gagal menghapus pencairan")
    },
  })

  // Reset Saldo Legacy (jika ada saldo lama tanpa rincian pencairan)
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

  const busy = addMutation.isPending || editMutation.isPending || deleteMutation.isPending || resetLegacySaldoMutation.isPending
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
      <DialogContent className="flex h-[90dvh] max-h-[900px] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 text-left sm:px-6">
          <DialogTitle>Realisasi Keuangan Bulanan</DialogTitle>
          <DialogDescription className="line-clamp-2 break-words">{paket.namaPaket} · TA {paket.tahunAnggaran}</DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-2 border-b px-4 py-3 sm:px-6">
          <Label htmlFor="bulan-keuangan">Bulan Pelaporan</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" aria-label="Bulan sebelumnya" disabled={monthDisabled || bulan <= 1} onClick={() => selectMonth(bulan - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={String(bulan)} onValueChange={value => selectMonth(Number(value))} disabled={monthDisabled}>
              <SelectTrigger id="bulan-keuangan" className="min-w-0 flex-1"><SelectValue>{allMonths ? "Semua Bulan" : months[bulan - 1]} {paket.tahunAnggaran}</SelectValue></SelectTrigger>
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
            <Button type="button" variant="outline" size="icon" aria-label="Bulan berikutnya" disabled={monthDisabled || allMonths || bulan === 12} onClick={() => selectMonth(bulan + 1)}>
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
          <TabsContent value="tambah" className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4 sm:px-6">
            {financialSummary}

            {/* Form Tambah Pencairan Baru */}
            {canEdit && (
              <section className="space-y-3 rounded-lg border p-3.5 bg-muted/10">
                <h3 className="text-sm font-semibold">Tambah Pencairan · {months[bulan - 1]} {paket.tahunAnggaran}</h3>
                <div className="space-y-2">
                  <Label htmlFor="keuangan-pencairan" className="text-xs">Nominal Pencairan (Rp)</Label>
                  <Input
                    id="keuangan-pencairan"
                    inputMode="decimal"
                    placeholder="Contoh: 2.000.000"
                    value={nominal}
                    disabled={disabled || addMutation.isPending}
                    onChange={e => setNominal(e.target.value.replace(/[^\d.,]/g, ""))}
                    className="font-mono text-sm h-9"
                  />
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {rupiah(Number.isFinite(amount) ? amount : 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catatan-keuangan" className="text-xs">Catatan / Referensi Dokumen Pencairan (SP2D / Kuitansi)</Label>
                  <Textarea
                    id="catatan-keuangan"
                    maxLength={2000}
                    value={catatan}
                    disabled={disabled || addMutation.isPending}
                    onChange={e => setCatatan(e.target.value)}
                    placeholder="Nomor SP2D, uraian pembayaran termin/tahap, dan nomor dokumen pendukung..."
                    rows={2}
                    className="max-h-40 resize-none text-xs"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Setiap pencairan disimpan terpisah. Total bulan ini dan kumulatif sejak Januari dijumlahkan otomatis.
                </p>
                {amount > 0 && (
                  <p className="text-xs font-medium">
                    Kumulatif setelah disimpan: <strong className="text-emerald-600 font-mono">{rupiah(cumulative + amount)}</strong>
                  </p>
                )}
                {!disabled && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                    disabled={addMutation.isPending || !nominal || !catatan.trim()}
                    onClick={() => addMutation.mutate()}
                  >
                    {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    Catat Pencairan
                  </Button>
                )}
              </section>
            )}

          </TabsContent>
          <TabsContent value="riwayat" className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4 sm:px-6" key={bulan}>
            {financialSummary}

            {allMonths ? (
              <section className="space-y-3" aria-label="Riwayat pencairan semua bulan">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Seluruh Pencairan · TA {paket.tahunAnggaran}</h3>
                  <span className="text-xs text-muted-foreground">{transactionCount} transaksi</span>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[640px] text-sm">
                    <caption className="sr-only">Daftar pencairan seluruh bulan tahun anggaran {paket.tahunAnggaran}</caption>
                    <thead className="bg-muted text-left text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="p-3">Bulan</th>
                        <th scope="col" className="p-3">Waktu Pencatatan (WITA)</th>
                        <th scope="col" className="p-3">Catatan / Referensi</th>
                        <th scope="col" className="p-3 text-right">Nominal</th>
                        <th scope="col" className="p-3"><span className="sr-only">Aksi</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allHistory.map(item => (
                        <tr key={item.id} className="align-top hover:bg-muted/30">
                          <td className="p-3 whitespace-nowrap">
                            {months[item.bulan - 1]}
                            {lockedMonths.includes(item.bulan) && <span className="block text-[11px] text-muted-foreground">Ditutup{isAdmin ? " (akses admin)" : ""}</span>}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Makassar" }) : "Saldo lama"}</td>
                          <td className="max-w-xs p-3 whitespace-pre-wrap break-words text-xs">{item.catatan}</td>
                          <td className="p-3 text-right whitespace-nowrap font-medium text-emerald-700 dark:text-emerald-300">{rupiah(Number(item.nominal))}</td>
                          <td className="p-3"><Button type="button" size="sm" variant="outline" disabled={monthDisabled} onClick={() => selectMonth(item.bulan)} aria-label={`Lihat pencairan bulan ${months[item.bulan - 1]}`}>Lihat Bulan</Button></td>
                        </tr>
                      ))}
                      {!allHistory.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Belum ada pencairan pada tahun anggaran ini.</td></tr>}
                    </tbody>
                    <tfoot className="border-t bg-muted/50 font-semibold">
                      <tr><td colSpan={3} className="p-3">Total Realisasi Tahun Anggaran</td><td className="p-3 text-right whitespace-nowrap">{rupiah(cumulative)}</td><td /></tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            ) : (
              <section className="space-y-3">
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

                {records.map((item, index) => {
                  const isEditing = editingId === item.id

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
                            onChange={e => setEditNominal(e.target.value.replace(/[^\d.,]/g, ""))}
                            className="font-mono text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Catatan / Uraian Pencairan</Label>
                          <Textarea
                            value={editCatatan}
                            onChange={e => setEditCatatan(e.target.value)}
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
                    <div key={item.id} className="rounded-lg border p-3 text-sm hover:border-border transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-emerald-700 dark:text-emerald-300">{index + 1}. {rupiah(Number(item.nominal))}</strong>
                          <time className="block text-[11px] text-muted-foreground mt-0.5">
                            {new Date(item.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA
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
                                if (window.confirm(`Yakin ingin menghapus pencairan senilai ${rupiah(Number(item.nominal))} ini?`)) {
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
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-xs text-muted-foreground leading-relaxed">{item.catatan}</p>
                    </div>
                  )
                })}

                {!records.length && legacyTotal === 0 && (
                  <p className="text-sm text-muted-foreground italic py-2">Belum ada pencairan pada bulan ini.</p>
                )}
              </section>
            )}

          </TabsContent>
        </Tabs>

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
