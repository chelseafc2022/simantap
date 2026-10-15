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
  ShieldCheck,
  CalendarClock,
} from "lucide-react"

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
  useSidebar,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  const userRoles: string[] = [
    ...(user?.role ? [user.role] : []),
    ...(user?.roles || []),
    ...(user?.userRoles?.flatMap((ur) =>
      ur.role?.kode ? [ur.role.kode] : []
    ) || []),
  ]
  const isAdministrator = userRoles.includes("ADMINISTRATOR")

  const navGroups: { label: string; items: NavMainItem[] }[] = [
    {
      label: "Menu Utama",
      items: [
        {
          title: "Dashboard",
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
          title: "Realisasi Fisik dan Keuangan",
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
              {
                title: "Jadwal & Batas Waktu",
                url: "/periode",
                icon: CalendarClock,
                isActive: pathname.startsWith("/periode"),
                colorTheme: {
                  iconBgActive:
                    "bg-gradient-to-br from-amber-600 via-orange-600 to-red-500 text-white shadow-md shadow-orange-500/30",
                  iconBgInactive:
                    "bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover/menu-button:bg-orange-500/20 group-hover/menu-button:scale-105",
                  borderActive: "border-l-orange-500",
                  activeGlow:
                    "bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent",
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
      <SidebarHeader className="border-b border-sidebar-border/60 p-2 bg-gradient-to-b from-sidebar to-sidebar/95">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="group h-auto min-h-[92px] cursor-pointer rounded-xl p-1 transition-all hover:bg-sidebar-accent/40 sm:min-h-[108px] group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:p-0"
            >
             <Link
               href="/dashboard"
               onClick={() => {
                 if (isMobile) setOpenMobile(false)
               }}
               className="flex flex-col w-full items-center justify-center gap-1.5 p-1 pr-10 md:pr-1"
             >
                <Image
                  src="/monalisa_sidebar.png"
                  alt="MONALISA KONSEL"
                  width={768}
                  height={384}
                  priority
                  className="h-auto w-full max-w-[170px] object-contain drop-shadow-sm transition-transform group-hover:scale-[1.02] sm:max-w-[210px] group-data-[collapsible=icon]:hidden"
                />
                {/* Subtitle resmi dengan teks HTML tajam & mudah dibaca */}
                <div className="text-center group-data-[collapsible=icon]:hidden px-1">
                  <p className="text-[9.5px] font-bold tracking-tight text-sidebar-foreground uppercase leading-snug">
                    Monitoring Realisasi Anggaran &amp; Fisik
                  </p>
                  <p className="text-[8.5px] font-semibold text-sidebar-foreground/70 tracking-tight -mt-0.5">
                    Data Pembangunan Konawe Selatan
                  </p>
                </div>

                <div className="hidden size-8 items-center justify-center rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10 group-data-[collapsible=icon]:flex">
                  <Image
                    src="/monalisa_m.png"
                    alt="Logo MONALISA KONSEL"
                    width={30}
                    height={27}
                    priority
                    className="h-auto w-full object-contain"
                  />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ========== SIDEBAR NAVIGATION ITEMS ========== */}
      <SidebarContent className="px-1.5 py-2">
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>

      {/* ========== SIDEBAR FOOTER (USER PROFILE) ========== */}
      <SidebarFooter className="border-t border-sidebar-border/60 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-sidebar to-sidebar/95">
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
