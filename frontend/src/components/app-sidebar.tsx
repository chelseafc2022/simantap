"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  TrendingUp,
  FileBarChart,
  Sparkles,
  ShieldCheck,
} from "lucide-react"
import { SidebarNotification } from "@/components/sidebar-notification"

import { NavMain, NavMainItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/hooks/use-auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useAuth()
  const userRoles: string[] = [
    ...(user?.role ? [user.role] : []),
    ...(user?.roles || []),
    ...(user?.userRoles?.map((ur: any) => ur.role?.kode || ur.role) || []),
  ]
  const isAdministrator = userRoles.includes("ADMINISTRATOR")

  const navGroups: { label: string; items: NavMainItem[] }[] = [
    {
      label: "Menu Utama",
      items: [
        {
          title: "Dashboard",
          subtitle: "Ringkasan Eksekutif Daerah",
          url: "/dashboard",
          icon: LayoutDashboard,
          isActive: pathname === "/dashboard",
          colorTheme: {
            iconBgActive:
              "bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/30",
            iconBgInactive:
              "bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover/menu-button:bg-blue-500/20 group-hover/menu-button:scale-105",
            borderActive: "border-l-blue-600",
            activeGlow:
              "bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent",
          },
        },
      ],
    },
    {
      label: "Pembangunan & RFK",
      items: [
        {
          title: "Paket Pembangunan",
          subtitle: "Pagu, RUP & Target Fisik",
          url: "/pembangunan",
          icon: Briefcase,
          isActive: pathname.startsWith("/pembangunan"),
          colorTheme: {
            iconBgActive:
              "bg-gradient-to-br from-blue-700 via-blue-600 to-sky-400 text-white shadow-md shadow-sky-500/30",
            iconBgInactive:
              "bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover/menu-button:bg-sky-500/20 group-hover/menu-button:scale-105",
            borderActive: "border-l-sky-500",
            activeGlow:
              "bg-gradient-to-r from-sky-500/15 via-sky-500/5 to-transparent",
          },
        },
        {
          title: "Realisasi Bulanan",
          subtitle: "Capaian Fisik & Keuangan",
          url: "/realisasi",
          icon: TrendingUp,
          isActive: pathname.startsWith("/realisasi"),
          colorTheme: {
            iconBgActive:
              "bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/30",
            iconBgInactive:
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover/menu-button:bg-emerald-500/20 group-hover/menu-button:scale-105",
            borderActive: "border-l-emerald-500",
            activeGlow:
              "bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent",
          },
        },
        {
          title: "Laporan & Evaluasi",
          subtitle: "Deviasi & Rekap RFK Resmi",
          url: "/laporan",
          icon: FileBarChart,
          isActive: pathname.startsWith("/laporan"),
          colorTheme: {
            iconBgActive:
              "bg-gradient-to-br from-amber-600 via-amber-500 to-orange-400 text-white shadow-md shadow-amber-500/30",
            iconBgInactive:
              "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover/menu-button:bg-amber-500/20 group-hover/menu-button:scale-105",
            borderActive: "border-l-amber-500",
            activeGlow:
              "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent",
          },
        },
      ],
    },
    ...(isAdministrator
      ? [
          {
            label: "Sistem & Pengguna",
            items: [
              {
                title: "Manajemen User",
                subtitle: "Role RBAC & E-Gov SIMPEG",
                url: "/users",
                icon: Users,
                isActive: pathname.startsWith("/users"),
                colorTheme: {
                  iconBgActive:
                    "bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-400 text-white shadow-md shadow-purple-500/30",
                  iconBgInactive:
                    "bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover/menu-button:bg-purple-500/20 group-hover/menu-button:scale-105",
                  borderActive: "border-l-purple-500",
                  activeGlow:
                    "bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent",
                },
              },
              {
                title: "Kelompok Pengguna",
                subtitle: "Matriks Hak Akses & Menu",
                url: "/roles",
                icon: ShieldCheck,
                isActive: pathname.startsWith("/roles"),
                colorTheme: {
                  iconBgActive:
                    "bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-500/30",
                  iconBgInactive:
                    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover/menu-button:bg-indigo-500/20 group-hover/menu-button:scale-105",
                  borderActive: "border-l-indigo-500",
                  activeGlow:
                    "bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent",
                },
              },
            ],
          },
        ]
      : []),
  ]

  const currentUser = {
    name: user?.namaLengkap || "Administrator",
    email: user?.nip
      ? `NIP: ${user.nip}`
      : user?.email || "admin@konaweselatankab.go.id",
    avatar: "",
  }

  return (
    <Sidebar {...props} className="border-r border-sidebar-border/80">
      {/* ========== SIDEBAR HEADER WITH SIMANTAP LOGO ========== */}
      <SidebarHeader className="border-b border-sidebar-border/60 p-3 bg-gradient-to-b from-sidebar to-sidebar/95">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-sidebar-accent/60 transition-all rounded-xl p-2 group h-auto cursor-pointer"
            >
              <Link href="/dashboard" className="flex items-center gap-3 w-full">
                {/* Official SIMANTAP Logo Container */}
                <div className="relative flex aspect-square size-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 shadow-md ring-1 ring-black/5 dark:ring-white/10 p-1 group-hover:scale-105 group-hover:shadow-lg transition-all group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0.5">
                  <Image
                    src="/simantap_logo.png"
                    alt="Logo SI-MANTAP"
                    width={38}
                    height={38}
                    style={{ width: "auto", height: "auto" }}
                    priority
                    className="object-contain drop-shadow-xs"
                  />
                </div>

                {/* Brand Typography */}
                <div className="grid flex-1 text-left leading-tight gap-0.5 overflow-hidden group-data-[collapsible=icon]:hidden">
                  <span className="font-black tracking-tight text-lg bg-gradient-to-r from-blue-700 via-emerald-600 to-teal-500 dark:from-blue-400 dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent whitespace-nowrap">
                    SI-MANTAP
                  </span>
                  <span className="truncate text-[11px] font-semibold text-foreground/85">
                    Kab. Konawe Selatan
                  </span>
                  <span className="truncate text-[9.5px] text-muted-foreground font-medium -mt-0.5">
                    Bag. Administrasi Pembangunan
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Tricolor Accent Line from Login Motto (Navy Blue - Emerald Green - Golden Amber) */}
        <div className="mt-2.5 h-[2.5px] w-full rounded-full bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-400 opacity-90 shadow-xs" />
      </SidebarHeader>

      {/* ========== SIDEBAR NAVIGATION ITEMS ========== */}
      <SidebarContent className="px-1.5 py-2">
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}

        {/* RFK Reminder Notification */}
        <SidebarNotification />

        {/* Mini Governmental Motto Card (Inspired by Login Face) */}
        <div className="mx-2 mt-auto mb-2 p-3 rounded-xl bg-gradient-to-br from-blue-950/5 via-emerald-950/5 to-amber-950/10 dark:from-blue-950/40 dark:via-emerald-950/30 dark:to-amber-950/20 border border-emerald-500/20 shadow-xs overflow-hidden relative group/motto group-data-[collapsible=icon]:hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-400" />
          <div className="flex items-center gap-2 mb-1.5">
            <div className="relative w-4 h-5 shrink-0">
              <Image
                src="/logo_konsel.png"
                alt="Logo Konawe Selatan"
                width={16}
                height={20}
                style={{ width: "auto", height: "auto" }}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-foreground">
                KONAWE SELATAN
              </span>
              <span className="text-[8px] text-muted-foreground font-medium -mt-0.5">
                Satu Data Pembangunan
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[8px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider pt-1.5 border-t border-border/40">
            <span>Melayani • Mengawal • Membangun</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-1" />
          </div>
        </div>
      </SidebarContent>

      {/* ========== SIDEBAR FOOTER (USER PROFILE) ========== */}
      <SidebarFooter className="border-t border-sidebar-border/60 p-2 bg-gradient-to-t from-sidebar to-sidebar/95">
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

