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
        },
        {
          title: "Realisasi Fisik dan Keuangan",
          url: "/realisasi",
          icon: TrendingUp,
          isActive: pathname.startsWith("/realisasi"),
        },
        {
          title: "Laporan & Evaluasi",
          url: "/laporan",
          icon: FileBarChart,
          isActive: pathname.startsWith("/laporan"),
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
              },
              {
                title: "Kelompok Pengguna",
                url: "/roles",
                icon: ShieldCheck,
                isActive: pathname.startsWith("/roles"),
              },
              {
                title: "Jadwal & Batas Waktu",
                url: "/periode",
                icon: CalendarClock,
                isActive: pathname.startsWith("/periode"),
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
                  src="/monalisa_sidebar.webp"
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
                    src="/monalisa_m.webp"
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
