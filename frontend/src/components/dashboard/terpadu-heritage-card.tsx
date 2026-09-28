"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  ArrowRight,
  Database,
  LineChart,
  CheckCircle2,
  Layers,
  ArrowRightLeft,
  Clock,
} from "lucide-react"

export function TerpaduHeritageCard() {
  return (
    <Card className="overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-card via-card/90 to-emerald-950/10 shadow-md">
      {/* Header Apresiasi */}
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white border-0 text-[10px] font-bold px-2 py-0.5 shadow-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                IDE &amp; GAGASAN TERPADU
              </Badge>
              <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                <Clock className="h-3 w-3 mr-1" />
                Tahap Menuju Integrasi Penuh
              </Badge>
            </div>
            <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              Apresiasi Perintis: Dari MONEV &amp; SIDAPEM Menuju SI-MANTAP
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              Sesuai dengan visi <strong className="text-foreground">&ldquo;TERPADU&rdquo;</strong>, SI-MANTAP lahir dari apresiasi terhadap dua aplikasi perintis pembangunan Konawe Selatan: <strong className="text-emerald-600 dark:text-emerald-400">MONEV</strong> (Pengawasan Realisasi Fisik &amp; Keuangan) dan <strong className="text-blue-600 dark:text-blue-400">SIDAPEM</strong> (Pengelolaan Data Paket &amp; Kontrak). Saat ini keduanya masih berjalan mandiri dan belum terintegrasi langsung, menjadi landasan utama perancangan sistem terpadu SI-MANTAP ke depan.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Grid Dua Sistem: MONEV (KIRI) dan SIDAPEM (KANAN) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 relative">
          
          {/* ── CARD 1 (SEBELAH KIRI): MONEV ── */}
          <div className="group relative rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 via-card to-card p-4 transition-all hover:border-emerald-500/40 hover:shadow-lg flex flex-col justify-between overflow-hidden">
            <div className="space-y-3">
              {/* Preview Gambar Card MONEV */}
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-emerald-500/20 bg-slate-950/40 shadow-inner group-hover:shadow-md transition-all">
                <Image
                  src="/img/monev_card.png"
                  alt="Card MONEV - Monitoring & Evaluasi Pembangunan"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold border-0 shadow-xs">
                    MONEV
                  </Badge>
                  <span className="text-[10px] font-mono text-emerald-200/90 bg-slate-900/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Aplikasi Monitoring &amp; Evaluasi
                  </span>
                </div>
              </div>

              {/* Konten Keterangan MONEV */}
              <div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <LineChart className="h-4 w-4 shrink-0" />
                  <h4>MONEV (Monitoring &amp; Evaluasi Pembangunan)</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Aplikasi perintis untuk pencatatan progres bulanan: penyusunan kurva-S target fisik B01–B12, pelaporan realisasi fisik kumulatif, penyerapan SP2D keuangan, pencatatan kendala lapangan, serta verifikasi berjenjang oleh Bagian Administrasi Pembangunan Setda.
                </p>
              </div>

              {/* Poin Kapabilitas */}
              <ul className="space-y-1.5 pt-1 text-[11px] text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Pelaporan bulanan realisasi fisik &amp; SP2D keuangan</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Verifikasi kendala lapangan &amp; matriks evaluasi RFK</span>
                </li>
              </ul>
            </div>

            {/* Aksi / Modul Terkait */}
            <div className="pt-4 mt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Inspirasi Modul Realisasi &amp; RFK
              </span>
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10 px-2">
                <Link href="/laporan" className="flex items-center gap-1">
                  <span>Menu Laporan RFK</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>

          {/* ── CARD 2 (SEBELAH KANAN): SIDAPEM ── */}
          <div className="group relative rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-500/5 via-card to-card p-4 transition-all hover:border-blue-500/40 hover:shadow-lg flex flex-col justify-between overflow-hidden">
            <div className="space-y-3">
              {/* Preview Gambar Card SIDAPEM */}
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-blue-500/20 bg-slate-950/40 shadow-inner group-hover:shadow-md transition-all">
                <Image
                  src="/img/sidapem_card.png"
                  alt="Card SIDAPEM - Sistem Informasi Data Pembangunan"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                  <Badge className="bg-blue-600 text-white text-[10px] font-bold border-0 shadow-xs">
                    SIDAPEM
                  </Badge>
                  <span className="text-[10px] font-mono text-blue-200/90 bg-slate-900/80 px-2 py-0.5 rounded-full border border-blue-500/30">
                    Aplikasi Data Pembangunan
                  </span>
                </div>
              </div>

              {/* Konten Keterangan SIDAPEM */}
              <div>
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-sm">
                  <Database className="h-4 w-4 shrink-0" />
                  <h4>SIDAPEM (Sistem Informasi Data Pembangunan)</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Aplikasi perintis untuk pencatatan awal kegiatan pembangunan: inventarisasi kode RUP SiRUP LKPP, pagu anggaran, administrasi kontrak SPK, rekanan/penyedia, titik lokasi pekerjaan, serta pengelompokan unit kerja dan PPK OPD.
                </p>
              </div>

              {/* Poin Kapabilitas */}
              <ul className="space-y-1.5 pt-1 text-[11px] text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>Pencatatan data paket, SiRUP LKPP &amp; pagu kontrak</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>Identitas rekanan, lokasi pekerjaan &amp; pejabat PPK</span>
                </li>
              </ul>
            </div>

            {/* Aksi / Modul Terkait */}
            <div className="pt-4 mt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                Inspirasi Modul Paket Pembangunan
              </span>
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10 px-2">
                <Link href="/pembangunan" className="flex items-center gap-1">
                  <span>Menu Paket</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── BANNER VISI TERPADU MASA DEPAN ── */}
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/25 via-slate-900/40 to-blue-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Gagasan Menuju Integrasi Penuh: SI-MANTAP Terpadu
                </span>
                <Badge variant="outline" className="text-[9px] font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  Target Roadmap
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Meskipun MONEV dan SIDAPEM saat ini belum terintegrasi secara langsung, SI-MANTAP dirancang sebagai arah masa depan untuk memadukan kedua alur tersebut—menghubungkan data paket dari SIDAPEM dengan pengawasan progres realisasi dari MONEV secara otomatis tanpa entri berulang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white text-xs h-8 shadow-xs">
              <Link href="/realisasi">
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Lihat Modul Terpadu
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
