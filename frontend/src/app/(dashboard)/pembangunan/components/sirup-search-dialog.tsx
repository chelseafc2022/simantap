"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Loader2,
  Building2,
  Coins,
  ArrowRight,
  Database,
  ExternalLink,
  Tag,
} from "lucide-react"

export interface SirupItem {
  kodeRup: string
  namaPaket: string
  satker: string
  metode: string
  pagu: number
  sumberDana: string
  tahun: string
  jenisPengadaan: string
  caraPengadaan: string
  pdn: string
  lokasi?: string
}

interface SirupSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPaket: (paket: SirupItem) => void
  currentTahun?: number
}

export function SirupSearchDialog({
  open,
  onOpenChange,
  onSelectPaket,
  currentTahun = 2026,
}: SirupSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTahun, setSelectedTahun] = useState<string>(String(currentTahun))
  const [activeSearch, setActiveSearch] = useState("")

  const { data: searchResponse, isLoading, isFetching } = useQuery({
    queryKey: ["sirup-search", selectedTahun, activeSearch],
    queryFn: async () => {
      if (!activeSearch.trim()) {
        return { total: 0, data: [] }
      }
      const res = await apiClient.get("/sirup/search", {
        params: {
          q: activeSearch.trim(),
          tahun: selectedTahun,
          limit: 25,
        },
      })
      return res.data?.data || { total: 0, data: [] }
    },
    enabled: open && !!activeSearch.trim(),
    staleTime: 5 * 60 * 1000,
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim().length < 3) return
    setActiveSearch(searchQuery.trim())
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val)
  }

  const results: SirupItem[] = searchResponse?.data || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Pencarian Data RUP Konsel Setara
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tarik data paket pengadaan resmi Pemerintah Kabupaten Konawe Selatan
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ketik nama paket atau kode RUP (min. 3 karakter)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm h-9"
                autoFocus
              />
            </div>
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(e.target.value)}
              className="h-9 px-2.5 text-xs rounded-md border bg-background font-medium"
            >
              <option value="2026">T.A. 2026</option>
              <option value="2025">T.A. 2025</option>
              <option value="2024">T.A. 2024</option>
            </select>
            <Button
              type="submit"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              disabled={isLoading || searchQuery.trim().length < 3}
            >
              {isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              Cari
            </Button>
          </form>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-xs">Membaca tabel RUP Konsel Setara...</p>
            </div>
          ) : !activeSearch ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium text-foreground">
                Mulai Mencari Paket Pengadaan
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Ketikkan kata kunci nama pekerjaan jalan, jembatan, puskesmas, atau masukkan langsung angka Kode RUP.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Database className="h-10 w-10 text-muted-foreground/40 mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium text-foreground">
                Paket Tidak Ditemukan
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Tidak ada paket SiRUP yang cocok dengan kata kunci &quot;{activeSearch}&quot; pada T.A. {selectedTahun}.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1">
                <span>
                  Ditemukan <strong>{results.length}</strong> paket pengadaan:
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  Sumber: konsel_setara.rup_paket
                </span>
              </div>

              {results.map((item) => (
                <div
                  key={item.kodeRup}
                  className="rounded-lg border bg-card p-3 hover:border-blue-400 hover:shadow-xs transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 bg-muted/50">
                          RUP #{item.kodeRup}
                        </Badge>
                        {item.metode && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {item.metode}
                          </Badge>
                        )}
                        {item.jenisPengadaan && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-blue-600 border-blue-200">
                            {item.jenisPengadaan}
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2">
                        {item.namaPaket}
                      </h4>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        onSelectPaket(item)
                        onOpenChange(false)
                      }}
                      className="shrink-0 h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Pilih
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1 truncate max-w-[280px] sm:max-w-[400px]">
                      <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{item.satker || "Pemkab Konawe Selatan"}</span>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <Coins className="h-3 w-3 text-emerald-600" />
                      <span>{formatRupiah(item.pagu)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
