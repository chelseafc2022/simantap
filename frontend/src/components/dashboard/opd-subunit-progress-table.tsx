"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  FolderGit2,
  FileCheck,
  Check,
  X,
} from "lucide-react"
import { isExcludedOpd } from "@/lib/utils"

interface OpdSubunitProgressTableProps {
  paketList: any[]
  rekapList: any[]
  opdMasterList: any[]
  bulan: number
  tahun: number
  namaBulanAktif: string
}

export function OpdSubunitProgressTable({
  paketList,
  rekapList,
  opdMasterList,
  bulan,
  tahun,
  namaBulanAktif,
}: OpdSubunitProgressTableProps) {
  const [search, setSearch] = useState("")
  const [expandedOpd, setExpandedOpd] = useState<Record<string, boolean>>({})

  const toggleExpand = (opdId: string) => {
    setExpandedOpd((prev) => ({
      ...prev,
      [opdId]: !prev[opdId],
    }))
  }

  const expandAll = () => {
    const all: Record<string, boolean> = {}
    groupedProgress.forEach((o) => {
      all[o.opdId] = true
    })
    setExpandedOpd(all)
  }

  const collapseAll = () => {
    setExpandedOpd({})
  }

  // Agregasi Progres Pengisian OPD dan Sub-Unit
  const groupedProgress = useMemo(() => {
    // 1. Kumpulkan semua paket per OPD
    const opdMap = new Map<
      string,
      {
        opdId: string
        namaOpd: string
        singkatan: string
        totalPaket: number
        targetFilled: number
        realFisikFilled: number
        realKeuFilled: number
        totalKontrak: number
        totalRealisasiKeu: number
        subUnitsMap: Map<
          string,
          {
            subUnitId: string
            namaSubUnit: string
            totalPaket: number
            targetFilled: number
            realFisikFilled: number
            realKeuFilled: number
            totalKontrak: number
            totalRealisasiKeu: number
          }
        >
      }
    >()

    // Daftarkan OPD yang memiliki paket
    for (const p of paketList) {
      const opdId = p.opdId || "unknown"
      const namaOpd = p.opd?.namaOpd || p.opdId || "Perangkat Daerah"
      if (isExcludedOpd(opdId) || isExcludedOpd(namaOpd)) continue
      const singkatan = p.opd?.singkatan || ""

      let opdData = opdMap.get(opdId)
      if (!opdData) {
        opdData = {
          opdId,
          namaOpd,
          singkatan,
          totalPaket: 0,
          targetFilled: 0,
          realFisikFilled: 0,
          realKeuFilled: 0,
          totalKontrak: 0,
          totalRealisasiKeu: 0,
          subUnitsMap: new Map(),
        }
        opdMap.set(opdId, opdData)
      }

      opdData.totalPaket++
      opdData.totalKontrak += Number(p.nilaiKontrak) || 0

      // Cek apakah target bulan ini / kumulatif sudah diisi
      const targetBulan = p.targetBulanan?.find((t: any) => t.bulan === bulan)
      const hasTarget = Number(targetBulan?.targetFisik || 0) > 0 || p.targetBulanan?.some((t: any) => Number(t.targetFisik) > 0)
      if (hasTarget) opdData.targetFilled++

      // Cek apakah realisasi fisik bulan ini sudah diisi
      const realBulan = p.realisasiBulanan?.find((r: any) => r.bulan === bulan)
      const hasRealFisik = Number(realBulan?.realisasiFisik || 0) > 0
      if (hasRealFisik) opdData.realFisikFilled++

      // Cek apakah realisasi keuangan bulan ini sudah dicairkan
      const hasRealKeu = Number(realBulan?.realisasiKeuangan || 0) > 0
      if (hasRealKeu) {
        opdData.realKeuFilled++
        opdData.totalRealisasiKeu += Number(realBulan?.realisasiKeuangan || 0)
      }

      // Sub-Unit grouping
      const subUnitId = p.subUnitId || "default"
      const namaSubUnit = p.subUnit?.namaSubUnit || (subUnitId === "default" ? "Induk / Pelaksana Kegiatan" : "Sub-Unit")

      let subData = opdData.subUnitsMap.get(subUnitId)
      if (!subData) {
        subData = {
          subUnitId,
          namaSubUnit,
          totalPaket: 0,
          targetFilled: 0,
          realFisikFilled: 0,
          realKeuFilled: 0,
          totalKontrak: 0,
          totalRealisasiKeu: 0,
        }
        opdData.subUnitsMap.set(subUnitId, subData)
      }

      subData.totalPaket++
      subData.totalKontrak += Number(p.nilaiKontrak) || 0
      if (hasTarget) subData.targetFilled++
      if (hasRealFisik) subData.realFisikFilled++
      if (hasRealKeu) {
        subData.realKeuFilled++
        subData.totalRealisasiKeu += Number(realBulan?.realisasiKeuangan || 0)
      }
    }

    // Format ke array list
    return Array.from(opdMap.values()).map((opd) => {
      // Hitung skor kelengkapan pengisian data (0 - 100%)
      // Bobot: Target Fisik (40%), Realisasi Fisik (30%), Realisasi Keuangan (30%)
      const pctTarget = opd.totalPaket > 0 ? (opd.targetFilled / opd.totalPaket) * 100 : 0
      const pctRealFisik = opd.totalPaket > 0 ? (opd.realFisikFilled / opd.totalPaket) * 100 : 0
      const pctRealKeu = opd.totalPaket > 0 ? (opd.realKeuFilled / opd.totalPaket) * 100 : 0
      const skorPengisian = Math.round(pctTarget * 0.4 + pctRealFisik * 0.3 + pctRealKeu * 0.3)

      const subUnits = Array.from(opd.subUnitsMap.values()).map((sub) => {
        const subPctTarget = sub.totalPaket > 0 ? (sub.targetFilled / sub.totalPaket) * 100 : 0
        const subPctRealFisik = sub.totalPaket > 0 ? (sub.realFisikFilled / sub.totalPaket) * 100 : 0
        const subPctRealKeu = sub.totalPaket > 0 ? (sub.realKeuFilled / sub.totalPaket) * 100 : 0
        const subSkor = Math.round(subPctTarget * 0.4 + subPctRealFisik * 0.3 + subPctRealKeu * 0.3)
        return {
          ...sub,
          skor: subSkor,
        }
      })

      return {
        ...opd,
        subUnits,
        skor: skorPengisian,
      }
    })
  }, [paketList, bulan])

  // Filter pencarian
  const filteredList = useMemo(() => {
    if (!search.trim()) return groupedProgress
    const q = search.toLowerCase()
    return groupedProgress.filter(
      (o) =>
        o.namaOpd.toLowerCase().includes(q) ||
        o.singkatan.toLowerCase().includes(q) ||
        o.subUnits.some((s) => s.namaSubUnit.toLowerCase().includes(q))
    )
  }, [groupedProgress, search])

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-primary" />
              Progres Pengisian Data OPD & Sub-Unit Kerja
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Monitoring kepatuhan input rencana target fisik, realisasi fisik lapangan, dan serapan SP2D keuangan ({namaBulanAktif} {tahun})
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="text-xs h-7 px-2"
            >
              Buka Semua Sub-Unit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="text-xs h-7 px-2"
            >
              Tutup
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari OPD atau Bidang / Sub-Unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/30"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            Tidak ditemukan OPD atau paket pembangunan untuk periode tahun {tahun}.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredList.map((opd, idx) => {
              const isExpanded = !!expandedOpd[opd.opdId]

              return (
                <div key={opd.opdId} className="transition-colors">
                  {/* Row OPD Utama */}
                  <div
                    onClick={() => toggleExpand(opd.opdId)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        className="mt-0.5 sm:mt-0 p-1 rounded-md hover:bg-muted text-muted-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground uppercase">
                            {opd.namaOpd}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                            {opd.totalPaket} Paket
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground">
                            {opd.subUnits.length} Sub-Unit
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Kontrak Terinput: Rp {Number(opd.totalKontrak).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>

                    {/* Status & Skor Pengisian */}
                    <div className="flex items-center gap-4 shrink-0 sm:w-80 justify-between">
                      {/* Checkboxes indicators */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono ${
                            opd.targetFilled === opd.totalPaket
                              ? "bg-emerald-500/10 text-emerald-600"
                              : opd.targetFilled > 0
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                          title={`Target Terisi: ${opd.targetFilled} / ${opd.totalPaket}`}
                        >
                          Tgt: {opd.targetFilled}/{opd.totalPaket}
                        </span>

                        <span
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono ${
                            opd.realFisikFilled === opd.totalPaket
                              ? "bg-emerald-500/10 text-emerald-600"
                              : opd.realFisikFilled > 0
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                          title={`Realisasi Fisik Terisi: ${opd.realFisikFilled} / ${opd.totalPaket}`}
                        >
                          Fisik: {opd.realFisikFilled}/{opd.totalPaket}
                        </span>

                        <span
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono ${
                            opd.realKeuFilled === opd.totalPaket
                              ? "bg-emerald-500/10 text-emerald-600"
                              : opd.realKeuFilled > 0
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                          title={`Realisasi Keuangan Terisi: ${opd.realKeuFilled} / ${opd.totalPaket}`}
                        >
                          SP2D: {opd.realKeuFilled}/{opd.totalPaket}
                        </span>
                      </div>

                      {/* Skor % Progress */}
                      <div className="w-24 text-right">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-muted-foreground">Kepatuhan:</span>
                          <span
                            className={`font-bold font-mono ${
                              opd.skor === 100
                                ? "text-emerald-600"
                                : opd.skor >= 50
                                ? "text-amber-600"
                                : "text-rose-500"
                            }`}
                          >
                            {opd.skor}%
                          </span>
                        </div>
                        <Progress value={opd.skor} className="h-1.5" />
                      </div>
                    </div>
                  </div>

                  {/* Sub-Unit Details (Expanded) */}
                  {isExpanded && (
                    <div className="bg-muted/20 border-t pl-10 pr-4 py-2 space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Daftar Sub-Unit / Bidang Kerja ({opd.subUnits.length}):
                      </div>

                      {opd.subUnits.map((sub) => (
                        <div
                          key={sub.subUnitId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/50 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-foreground">
                              {sub.namaSubUnit}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              {sub.totalPaket} Paket Pekerjaan
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-muted-foreground text-[10px]">
                              Target: <b className="text-foreground">{sub.targetFilled}/{sub.totalPaket}</b>
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              Fisik: <b className="text-foreground">{sub.realFisikFilled}/{sub.totalPaket}</b>
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              SP2D: <b className="text-foreground">{sub.realKeuFilled}/{sub.totalPaket}</b>
                            </span>

                            <Badge
                              className={`text-[9px] py-0 px-1.5 border-0 ${
                                sub.skor === 100
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : sub.skor > 0
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              {sub.skor === 100 ? "Lengkap" : sub.skor > 0 ? "Sebagian" : "Belum Diisi"} ({sub.skor}%)
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
