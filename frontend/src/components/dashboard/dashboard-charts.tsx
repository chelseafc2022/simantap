"use client"

import { useMemo, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Wallet } from "lucide-react"
import { isExcludedOpd } from "@/lib/utils"

interface DashboardChartsProps {
  rekapList: any[]
  paketList: any[]
  macroStats: {
    totalPaket: number
    nilaiKontrak: number
    nominalRealisasiKeuangan: number
    persenSerapanKeuangan: number
    sisaAnggaran: number
    avgFisik: number
    selesai: number
    berjalan: number
    belumMulai: number
  }
  executiveStatus: {
    aman: number
    perhatian: number
    kritis: number
    belumMulai: number
    avgTargetDaerah: number
    deviasiDaerah: number
  }
  bulan: number
  tahun: number
  namaBulanAktif: string
}

function formatJuta(val: number) {
  if (!val || isNaN(val)) return "0"
  if (val >= 1_000_000_000_000) return `${(val / 1_000_000_000_000).toFixed(1)}T`
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}Jt`
  return val.toLocaleString("id-ID")
}

function formatRupiahFull(val: number) {
  return `Rp ${Number(val || 0).toLocaleString("id-ID")}`
}

export function DashboardCharts({
  rekapList,
  paketList,
  macroStats,
  executiveStatus,
  bulan,
  tahun,
  namaBulanAktif,
}: DashboardChartsProps) {
  const [chartType, setChartType] = useState<"fisik" | "keuangan">("fisik")

  // Data Diagram Batang: Per OPD (Top 10 OPD berdasarkan Kontrak / Paket)
  const opdBarData = useMemo(() => {
    if (!rekapList || rekapList.length === 0) return []
    // Urutkan berdasarkan total kontrak atau fisik
    return [...rekapList]
      .filter((item) => !isExcludedOpd(item.opdId) && !isExcludedOpd(item.namaOpd))
      .sort((a, b) => (Number(b.totalKontrak) || 0) - (Number(a.totalKontrak) || 0))
      .slice(0, 10)
      .map((item) => ({
        name: item.singkatan || (item.namaOpd ? item.namaOpd.substring(0, 14) : "OPD"),
        fullName: item.namaOpd || "-",
        targetFisik: Number((item.avgTargetFisik || 0).toFixed(1)),
        realisasiFisik: Number((item.avgRealisasiFisik || 0).toFixed(1)),
        deviasiFisik: Number((item.avgDeviasiFisik || 0).toFixed(1)),
        paguKontrak: Number(item.totalKontrak || 0),
        realisasiKeuangan: Number(item.totalRealisasiKeuangan || 0),
        persenKeuangan: Number((item.persenSerapanKeuangan || 0).toFixed(1)),
      }))
  }, [rekapList])

  // Data Diagram Batang Alternatif: Tren Agregat Bulanan (B01 - B12) dari seluruh paket
  const monthlyTrendData = useMemo(() => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ]
    return months.map((mName, idx) => {
      const bIdx = idx + 1
      let sumTarget = 0
      let sumRealFisik = 0
      let sumRealKeu = 0
      let count = 0

      for (const p of paketList) {
        count++
        const tb = p.targetBulanan?.find((t: any) => t.bulan === bIdx)
        const rb = p.realisasiBulanan?.find((r: any) => r.bulan === bIdx)
        if (tb) sumTarget += Number(tb.targetFisik) || 0
        if (rb) {
          sumRealFisik += Number(rb.realisasiFisik) || 0
          sumRealKeu += Number(rb.realisasiKeuangan) || 0
        }
      }

      return {
        bulan: mName,
        bulanNum: bIdx,
        targetFisik: count > 0 ? parseFloat((sumTarget / count).toFixed(1)) : 0,
        realisasiFisik: count > 0 ? parseFloat((sumRealFisik / count).toFixed(1)) : 0,
        realisasiKeuangan: sumRealKeu,
        isCurrent: bIdx === bulan,
      }
    })
  }, [paketList, bulan])

  // Data Diagram Pie 1: Proporsi Penyerapan Anggaran (Keuangan Terealisasi vs Sisa)
  const pieKeuanganData = useMemo(() => {
    const real = Math.max(0, macroStats.nominalRealisasiKeuangan)
    const sisa = Math.max(0, macroStats.sisaAnggaran)
    return [
      { name: "Keuangan Cair", value: real, color: "#10b981", percent: macroStats.persenSerapanKeuangan },
      { name: "Sisa Belum Cair", value: sisa, color: "#f59e0b", percent: Math.max(0, 100 - macroStats.persenSerapanKeuangan) },
    ]
  }, [macroStats])

  // Data Diagram Pie 2: Kategori Kepatuhan Proyek Fisik
  const pieStatusFisikData = useMemo(() => {
    return [
      { name: "Aman (On-Track)", value: executiveStatus.aman, color: "#10b981" },
      { name: "Perhatian (Ringan)", value: executiveStatus.perhatian, color: "#f59e0b" },
      { name: "Kritis (Terlambat)", value: executiveStatus.kritis, color: "#f43f5e" },
      { name: "Belum Mulai", value: executiveStatus.belumMulai, color: "#94a3b8" },
    ].filter((d) => d.value > 0)
  }, [executiveStatus])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ─── DIAGRAM BATANG (BAR CHART) ─── */}
      <Card className="lg:col-span-2 border-border/60 shadow-sm flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {chartType === "fisik"
                  ? "Diagram Batang: Target Fisik vs Realisasi Fisik (%)"
                  : "Diagram Batang: Pagu Kontrak vs Realisasi Keuangan (Rp)"}
              </CardTitle>
              <CardDescription className="text-xs">
                Perbandingan komparatif 10 Perangkat Daerah utama (Evaluasi {namaBulanAktif} {tahun})
              </CardDescription>
            </div>

            <Tabs
              value={chartType}
              onValueChange={(v) => setChartType(v as "fisik" | "keuangan")}
              className="w-auto"
            >
              <TabsList className="h-7 text-xs p-0.5">
                <TabsTrigger value="fisik" className="text-[11px] h-6 px-2.5">
                  <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                  Fisik (%)
                </TabsTrigger>
                <TabsTrigger value="keuangan" className="text-[11px] h-6 px-2.5">
                  <Wallet className="h-3 w-3 mr-1 text-blue-500" />
                  Keuangan (Rp)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {opdBarData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs">
              <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-2" />
              Belum ada data paket untuk direkap dalam grafik pada tahun {tahun}.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={opdBarData}
                  margin={{ top: 12, right: 10, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="stroke-muted/40" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={40}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={chartType === "fisik" ? (v) => `${v}%` : (v) => formatJuta(v)}
                    domain={chartType === "fisik" ? [0, 100] : ["auto", "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-popover text-popover-foreground border shadow-lg rounded-xl p-3 text-xs space-y-1.5 min-w-[200px]">
                          <p className="font-bold text-foreground border-b pb-1">
                            {data.fullName}
                          </p>
                          {chartType === "fisik" ? (
                            <>
                              <div className="flex justify-between items-center text-blue-500">
                                <span>Target Fisik:</span>
                                <span className="font-mono font-bold">{data.targetFisik}%</span>
                              </div>
                              <div className="flex justify-between items-center text-emerald-500">
                                <span>Realisasi Fisik:</span>
                                <span className="font-mono font-bold">{data.realisasiFisik}%</span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t text-muted-foreground">
                                <span>Deviasi:</span>
                                <span
                                  className={`font-mono font-bold ${
                                    data.deviasiFisik >= 0 ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {data.deviasiFisik >= 0 ? "+" : ""}
                                  {data.deviasiFisik}%
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between items-center text-blue-500">
                                <span>Pagu Kontrak:</span>
                                <span className="font-mono font-bold">{formatRupiahFull(data.paguKontrak)}</span>
                              </div>
                              <div className="flex justify-between items-center text-emerald-500">
                                <span>Realisasi SP2D:</span>
                                <span className="font-mono font-bold">{formatRupiahFull(data.realisasiKeuangan)}</span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t text-muted-foreground">
                                <span>Serapan:</span>
                                <span className="font-mono font-bold text-emerald-600">{data.persenKeuangan}%</span>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 6 }}
                  />
                  {chartType === "fisik" ? (
                    <>
                      <Bar
                        dataKey="targetFisik"
                        name="Target Fisik (%)"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="realisasiFisik"
                        name="Realisasi Fisik (%)"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    </>
                  ) : (
                    <>
                      <Bar
                        dataKey="paguKontrak"
                        name="Pagu Kontrak"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="realisasiKeuangan"
                        name="Realisasi Keuangan"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quick Indicator Strip */}
          <div className="mt-2 pt-2 border-t flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
                {chartType === "fisik" ? "Target Rencana" : "Pagu Anggaran"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                {chartType === "fisik" ? "Capaian Fisik Lapangan" : "Realisasi SP2D Cair"}
              </span>
            </div>
            <span className="text-[10px] font-medium text-primary">
              Rata-rata Fisik Daerah: {macroStats.avgFisik.toFixed(1)}% · Target: {executiveStatus.avgTargetDaerah.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ─── DIAGRAM PIE / DONUT ─── */}
      <Card className="border-border/60 shadow-sm flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-emerald-500" />
            Diagram Pie Penyerapan & Status
          </CardTitle>
          <CardDescription className="text-xs">
            Proporsi realisasi keuangan dan kesehatan fisik
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-1 space-y-4">
          {/* Donut Chart: Keuangan */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground">Serapan Pagu Anggaran</span>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                {macroStats.persenSerapanKeuangan.toFixed(1)}% Terealisasi
              </Badge>
            </div>

            <div className="h-40 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieKeuanganData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieKeuanganData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatRupiahFull(Number(value))}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {macroStats.persenSerapanKeuangan.toFixed(0)}%
                </span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Cair</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="truncate">
                  <span className="text-muted-foreground block text-[10px]">Cair:</span>
                  <span className="font-semibold">{formatJuta(macroStats.nominalRealisasiKeuangan)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <div className="truncate">
                  <span className="text-muted-foreground block text-[10px]">Sisa:</span>
                  <span className="font-semibold">{formatJuta(macroStats.sisaAnggaran)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Pie Status Fisik */}
          <div className="space-y-1.5 pt-2 border-t">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground">Kepatuhan Target Fisik</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {macroStats.totalPaket} Total Paket
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">Aman (≥0%)</span>
                <span className="font-bold text-emerald-600 font-mono">{executiveStatus.aman}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <span className="text-amber-700 dark:text-amber-300 text-[11px] font-medium">Perhatian</span>
                <span className="font-bold text-amber-600 font-mono">{executiveStatus.perhatian}</span>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <span className="text-rose-700 dark:text-rose-300 text-[11px] font-medium">Kritis (&lt;-10%)</span>
                <span className="font-bold text-rose-600 font-mono">{executiveStatus.kritis}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">Belum Mulai</span>
                <span className="font-bold text-slate-500 font-mono">{executiveStatus.belumMulai}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
