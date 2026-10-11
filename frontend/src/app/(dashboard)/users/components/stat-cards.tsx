"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, ShieldAlert, Building2 } from "lucide-react"

interface StatCardsProps {
  totalPegawai?: number
  totalActiveUsers?: number
  totalOpd?: number
  isLoading?: boolean
}

export function StatCards({
  totalPegawai = 0,
  totalActiveUsers = 0,
  totalOpd = 0,
  isLoading = false,
}: StatCardsProps) {
  const stats = [
    {
      title: "Total Pegawai ASN",
      value: isLoading ? "..." : totalPegawai.toLocaleString("id-ID"),
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Pengguna Aktif",
      value: isLoading ? "..." : totalActiveUsers.toLocaleString("id-ID"),
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Tanpa Hak Akses",
      value: isLoading ? "..." : Math.max(0, totalPegawai - totalActiveUsers).toLocaleString("id-ID"),
      icon: ShieldAlert,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      title: "OPD & Unit Kerja",
      value: isLoading ? "..." : totalOpd.toLocaleString("id-ID"),
      icon: Building2,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <Card key={i} className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
