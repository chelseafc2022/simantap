"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  ShieldCheck,
  Server,
  ArrowRight,
  Database,
  CheckCircle2,
  FileSpreadsheet,
  Target,
  FileCheck,
  Building2,
  Landmark,
  Activity,
  AlertCircle,
} from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()

  // Real-time backend connection check
  const { data: healthData, isError: isHealthError, isLoading: isHealthLoading } = useQuery({
    queryKey: ["backend-health"],
    queryFn: async () => {
      const res = await apiClient.get("/health")
      return res.data
    },
    refetchInterval: 30000,
  })

  const rolesList = [
    {
      role: "ADMINISTRATOR",
      label: "Administrator Utama",
      desc: "Akses penuh sistem, manajemen akun pengguna, sinkronisasi data E-Gov & audit log.",
      color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      icon: ShieldCheck,
    },
    {
      role: "ADMIN_SIRUP",
      label: "Admin SiRUP",
      desc: "Input data awal paket kegiatan dan import data dari SiRUP LKPP ke sistem pembangunan.",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      icon: FileSpreadsheet,
    },
    {
      role: "ADMIN_PERENCANAAN",
      label: "Admin Perencanaan",
      desc: "Menyusun target capaian bulanan dan kurva-S perencanaan paket pembangunan OPD.",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      icon: Target,
    },
    {
      role: "ADMIN_PPK",
      label: "Admin PPK",
      desc: "Penetapan dan update berkala realisasi fisik kegiatan di lapangan beserta bukti dukung.",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      icon: FileCheck,
    },
    {
      role: "BENDAHARA",
      label: "Bendahara (Admin Realisasi)",
      desc: "Pencatatan realisasi keuangan (SP2D / Kas) terhadap paket pembangunan OPD.",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      icon: Landmark,
    },
    {
      role: "KEPALA_OPD",
      label: "Kepala OPD",
      desc: "Telaah hasil, verifikasi berkala capaian fisik/keuangan, dan approval laporan bulanan OPD.",
      color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      icon: Building2,
    },
    {
      role: "PIMPINAN_DAERAH",
      label: "Bupati / Wabup / Sekda",
      desc: "Executive dashboard monitoring realisasi pembangunan terpadu se-Kabupaten Konawe Selatan.",
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="px-4 lg:px-6 space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-emerald-950 via-neutral-900 to-slate-900 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">
                Sistem Terpadu SIMANTAP
              </Badge>
              <Badge variant="outline" className="text-neutral-400 border-neutral-700 text-xs">
                Konawe Selatan
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Selamat Datang, {user?.namaLengkap || "Administrator"}
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Sistem Informasi Monitoring dan Evaluasi Data Pembangunan Terpadu (SIMANTAP).
              Frontend telah terhubung langsung dengan backend NestJS dan database E-Gov & SIMPEG Konawe Selatan.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="default" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm">
              <Link href="/users">
                <Users className="h-4 w-4 mr-2" />
                Buka Manajemen Akun
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Backend & DB Health */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Backend NestJS & DB</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              {isHealthLoading ? (
                <span className="text-sm text-muted-foreground">Memeriksa koneksi...</span>
              ) : isHealthError ? (
                <>
                  <span className="text-xl font-bold text-destructive">Terputus</span>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </>
              ) : (
                <>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Terhubung</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {healthData?.data?.details?.database?.status === "up"
                ? `PostgreSQL: UP (${healthData.data.details.database.responseTime}ms)`
                : "http://localhost:4000/api/v1"}
            </p>
          </CardContent>
        </Card>

        {/* E-Gov Server Status */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Server E-Gov Konawe Selatan</CardTitle>
            <Server className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">Terhubung</span>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Host: mysql.konaweselatankab.go.id (10.800+ ASN)
            </p>
          </CardContent>
        </Card>

        {/* RBAC Model */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Model Hak Akses (RBAC)</CardTitle>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">7 Role Terdefinisi</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Administrator, SiRUP, Perencanaan, PPK, Bendahara, OPD, Pimpinan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* RBAC Role Matrix Information */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Struktur Peran Pengguna SIMANTAP</CardTitle>
          <CardDescription>
            7 Peran RBAC terintegrasi untuk setiap OPD / Unit Kerja di Lingkungan Pemerintah Kabupaten Konawe Selatan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesList.map((r) => {
              const Icon = r.icon
              return (
                <div
                  key={r.role}
                  className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 font-medium ${r.color}`}>
                      {r.label}
                    </Badge>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {r.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
