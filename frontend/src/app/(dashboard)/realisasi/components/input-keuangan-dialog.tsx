"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Month {
  bulan: number
  realisasiKeuangan: number
  catatanOperator?: string
  statusVerifikasi: string
  catatanVerifikasi?: string | null
}
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  paket: { id: string; namaPaket: string; nilaiPagu: number; tahunAnggaran: number }
  timeline: Month[]
  activeBulan: number
  roles: string[]
  lockedMonths: number[]
  onSaved: () => void
}
const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

export function InputKeuanganDialog({ open, onOpenChange, paket, timeline, activeBulan, roles, lockedMonths, onSaved }: Props) {
  const [bulan, setBulan] = useState(activeBulan)
  const row = timeline.find(item => item.bulan === bulan)
  const [nominal, setNominal] = useState(String(row?.realisasiKeuangan || 0))
  const [catatan, setCatatan] = useState(row?.catatanOperator || "")
  const [alasan, setAlasan] = useState("")
  const [dirty, setDirty] = useState(false)
  const isAdmin = roles.includes("ADMINISTRATOR")
  const canEdit = isAdmin || roles.includes("BENDAHARA")
  const canReview = isAdmin || roles.includes("MONEV")
  const status = row?.statusVerifikasi || "DRAFT"
  const locked = status === "TERVERIFIKASI" || status === "DIAJUKAN" || (!isAdmin && lockedMonths.includes(bulan))
  const amount = Number(nominal)
  const selectMonth = (value: string) => {
    const next = Number(value)
    const item = timeline.find(t => t.bulan === next)
    setBulan(next); setNominal(String(item?.realisasiKeuangan || 0)); setCatatan(item?.catatanOperator || ""); setDirty(false)
  }
  const mutation = useMutation({
    mutationFn: async (action: "save" | "ajukan" | "acc" | "tolak") => {
      if (action === "save") {
        if (!Number.isFinite(amount) || amount < 0 || amount > Number(paket.nilaiPagu)) throw new Error("Realisasi harus antara 0 dan pagu anggaran")
        return apiClient.put(`/pembangunan/${paket.id}/realisasi`, { bulan, realisasiKeuangan: amount, catatanOperator: catatan })
      }
      if (action === "tolak" && !alasan.trim()) throw new Error("Isi alasan pengembalian terlebih dahulu")
      return apiClient.patch(`/pembangunan/${paket.id}/realisasi/${bulan}/${action}`, { catatanVerifikasi: action === "tolak" ? alasan.trim() : "Terverifikasi sesuai laporan keuangan" })
    },
    onSuccess: () => { setDirty(false); toast.success("Data realisasi keuangan diperbarui"); onSaved() },
    onError: (error: unknown) => {
      const e = error as { message?: string; response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || e.message || "Gagal memperbarui realisasi")
    },
  })
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Realisasi Keuangan Bulanan</DialogTitle><DialogDescription>{paket.namaPaket} · {paket.tahunAnggaran}</DialogDescription></DialogHeader>
      <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-3 text-sm">Pola keuangan saja. Tidak memerlukan kontrak, penyedia, atau target fisik mingguan.</div>
      <div className="space-y-2"><Label>Bulan pelaporan</Label><Select value={String(bulan)} onValueChange={selectMonth} disabled={mutation.isPending || dirty}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{months.map((name, i) => <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3 text-sm"><div>Pagu anggaran<strong className="block">{rupiah(Number(paket.nilaiPagu))}</strong></div><div>Sisa anggaran<strong className="block">{rupiah(Number(paket.nilaiPagu) - (amount || 0))}</strong></div></div>
      <div className="space-y-2"><Label htmlFor="keuangan-kumulatif">Realisasi kumulatif sampai {months[bulan - 1]} (Rp)</Label><Input id="keuangan-kumulatif" type="number" min={0} max={Number(paket.nilaiPagu)} value={nominal} disabled={!canEdit || locked || mutation.isPending} onChange={e => { setNominal(e.target.value); setDirty(true) }} /><p className="text-xs text-muted-foreground">Masukkan total sejak Januari sampai bulan ini, bukan tambahan transaksi bulan ini. Perbarui angka ini jika ada pencairan berikutnya pada bulan yang sama.</p></div>
      <div className="space-y-2"><Label htmlFor="catatan-keuangan">Catatan / referensi dokumen realisasi</Label><Textarea id="catatan-keuangan" value={catatan} disabled={!canEdit || locked || mutation.isPending} onChange={e => { setCatatan(e.target.value); setDirty(true) }} placeholder="Uraian pembayaran dan nomor dokumen pendukung" /></div>
      <p className="text-sm">Serapan: {Number(paket.nilaiPagu) > 0 ? (((amount || 0) / Number(paket.nilaiPagu)) * 100).toFixed(2) : "0"}% · Status: {status}</p>
      {row?.catatanVerifikasi && <p className="text-sm text-amber-700">Catatan pemeriksa: {row.catatanVerifikasi}</p>}
      {!isAdmin && lockedMonths.includes(bulan) && <p className="text-sm text-amber-700">Periode input bulan ini telah ditutup.</p>}
      {dirty && <p className="text-xs text-amber-700">Simpan perubahan sebelum mengganti bulan atau mengajukan laporan.</p>}
      {canReview && status === "DIAJUKAN" && <Textarea value={alasan} onChange={e => setAlasan(e.target.value)} placeholder="Alasan pengembalian untuk diperbaiki" />}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        {canEdit && !locked && <Button disabled={mutation.isPending} onClick={() => mutation.mutate("save")}>Simpan Realisasi</Button>}
        {canEdit && !locked && <Button variant="outline" disabled={mutation.isPending || dirty || !row?.realisasiKeuangan} onClick={() => mutation.mutate("ajukan")}>Ajukan ke MONEV</Button>}
        {canReview && status === "DIAJUKAN" && <><Button disabled={mutation.isPending} onClick={() => mutation.mutate("acc")}>Verifikasi</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("tolak")}>Kembalikan</Button></>}
      </div>
    </DialogContent>
  </Dialog>
}
