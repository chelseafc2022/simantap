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
const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(n)

export function InputKeuanganDialog({ open, onOpenChange, paket, pencairanTersedia, timeline, activeBulan, roles, lockedMonths, onSaved }: Props) {
  const [bulan, setBulan] = useState(activeBulan)
  const [nominal, setNominal] = useState("")
  const [catatan, setCatatan] = useState("")
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const row = timeline.find(item => item.bulan === bulan)
  const previous = timeline.find(item => item.bulan === bulan - 1)?.realisasiKeuangan || 0
  const cumulative = Number(row?.realisasiKeuangan || 0)
  const monthTotal = cumulative - Number(previous)
  const records = row?.pencairan || []
  const legacyTotal = monthTotal - records.reduce((sum, item) => sum + Number(item.nominal), 0)
  const dirty = !!nominal || !!catatan
  const isAdmin = roles.includes("ADMINISTRATOR")
  const canEdit = isAdmin || roles.includes("BENDAHARA")
  const locked = !isAdmin && lockedMonths.includes(bulan)
  const amount = Number(nominal.replace(/\./g, "").replace(",", "."))
  const disabled = !pencairanTersedia || !canEdit || locked
  const mutation = useMutation({
    mutationFn: async () => {
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
      toast.error(e.response?.data?.message || e.message || "Gagal memperbarui realisasi")
    },
  })
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Realisasi Keuangan Bulanan</DialogTitle><DialogDescription>{paket.namaPaket} · {paket.tahunAnggaran}</DialogDescription></DialogHeader>
      <div className="space-y-2"><Label>Bulan pelaporan</Label><Select value={String(bulan)} onValueChange={value => setBulan(Number(value))} disabled={mutation.isPending || dirty}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{months.map((name, i) => <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
        <div>Pagu anggaran<strong className="block">{rupiah(Number(paket.nilaiPagu))}</strong></div>
        <div>Total pencairan {months[bulan - 1]}<strong className="block">{rupiah(monthTotal)}</strong></div>
        <div>Kumulatif sampai {months[bulan - 1]}<strong className="block text-emerald-600">{rupiah(cumulative)}</strong></div>
        <div>Sisa anggaran<strong className="block">{rupiah(Number(paket.nilaiPagu) - cumulative)}</strong></div>
      </div>
      {!pencairanTersedia && <p className="rounded-lg border p-3 text-sm text-amber-700">Pencatatan bertahap belum diaktifkan. Riwayat realisasi tetap dapat dilihat.</p>}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Riwayat pencairan {months[bulan - 1]}</h3>
        {legacyTotal !== 0 && <div className="rounded-lg border p-3 text-sm"><strong>{rupiah(legacyTotal)}</strong><p className="whitespace-pre-wrap text-muted-foreground">{row?.catatanOperator || "Realisasi yang tercatat sebelum rincian pencairan tersedia"}</p><p className="mt-1 text-xs text-muted-foreground">Saldo realisasi sebelumnya</p></div>}
        {records.map((item, index) => <div key={item.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-2"><strong>{index + 1}. {rupiah(Number(item.nominal))}</strong><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA</time></div><p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{item.catatan}</p></div>)}
        {!records.length && legacyTotal === 0 && <p className="text-sm text-muted-foreground">Belum ada pencairan pada bulan ini.</p>}
      </section>
      {canEdit && <section className="space-y-3 rounded-lg border p-3">
        <h3 className="text-sm font-semibold">Tambah pencairan</h3>
        <div className="space-y-2"><Label htmlFor="keuangan-pencairan">Nominal pencairan (Rp)</Label><Input id="keuangan-pencairan" inputMode="decimal" placeholder="Contoh: 2.000.000" value={nominal} disabled={disabled || mutation.isPending} onChange={e => setNominal(e.target.value.replace(/[^\d.,]/g, ""))} /><p className="text-sm font-medium">{rupiah(Number.isFinite(amount) ? amount : 0)}</p></div>
        <div className="space-y-2"><Label htmlFor="catatan-keuangan">Catatan / referensi dokumen pencairan</Label><Textarea id="catatan-keuangan" maxLength={2000} value={catatan} disabled={disabled || mutation.isPending} onChange={e => setCatatan(e.target.value)} placeholder="Uraian pembayaran dan nomor dokumen pendukung" /></div>
        <p className="text-xs text-muted-foreground">Setiap pencairan disimpan terpisah. Total bulan ini dan kumulatif sejak Januari dijumlahkan otomatis.</p>
        {amount > 0 && <p className="text-sm">Kumulatif setelah disimpan: <strong>{rupiah(cumulative + amount)}</strong></p>}
        {!disabled && <Button disabled={mutation.isPending || !nominal || !catatan.trim()} onClick={() => mutation.mutate()}>Catat Pencairan</Button>}
      </section>}
      <p className="text-sm">Serapan: {Number(paket.nilaiPagu) > 0 ? ((cumulative / Number(paket.nilaiPagu)) * 100).toFixed(2) : "0"}%</p>
      {!isAdmin && lockedMonths.includes(bulan) && <p className="text-sm text-amber-700">Periode input bulan ini telah ditutup.</p>}
      {dirty && <p className="text-xs text-amber-700">Catat pencairan sebelum mengganti bulan.</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>Tutup</Button>
      </div>
    </DialogContent>
  </Dialog>
}
