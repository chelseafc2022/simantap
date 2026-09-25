"use client"

import { useState, useEffect } from "react"
import {
  LogOut,
  ChevronsUpDown,
  Building2,
  Briefcase,
  Loader2,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

function getInitials(name?: string): string {
  if (!name) return "AD"
  const clean = name.replace(/,\s*.*$/, "").trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return clean.substring(0, 2).toUpperCase()
}

function formatRole(role?: string): string {
  switch (role) {
    case "ADMINISTRATOR":
      return "Administrator"
    case "ADMIN_SIRUP":
      return "Admin SiRUP"
    case "ADMIN_PERENCANAAN":
      return "Admin Perencanaan"
    case "ADMIN_PPK":
      return "Admin PPK"
    case "BENDAHARA":
      return "Bendahara"
    case "KEPALA_OPD":
      return "Kepala OPD"
    case "PIMPINAN_DAERAH":
      return "Pimpinan Daerah"
    default:
      return role || "Pengguna"
  }
}

export function NavUser({
  user: initialUser,
}: {
  user?: {
    name: string
    email: string
    avatar?: string
  }
}) {
  const { isMobile } = useSidebar()
  const { logout, user: authUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      toast.info("Mengeluarkan akun...")
      await logout()
    } catch {
      window.location.href = "/login"
    }
  }

  // Consistent SSR & Initial Client Render
  const activeUser = mounted ? authUser : null
  const displayName = activeUser?.namaLengkap || initialUser?.name || "Administrator"
  const displaySubtitle = activeUser?.nip
    ? `NIP. ${activeUser.nip}`
    : activeUser?.role
    ? formatRole(activeUser.role)
    : (initialUser?.email || "admin@konaweselatankab.go.id")
  const roleName = activeUser?.role ? formatRole(activeUser.role) : "Administrator"
  const opdName = activeUser?.opd?.singkatan || activeUser?.opd?.namaOpd
  const initials = getInitials(displayName)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer transition-colors"
            >
              <div
                suppressHydrationWarning
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-sm"
              >
                {initials}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span
                  suppressHydrationWarning
                  className="truncate font-semibold text-xs text-foreground"
                >
                  {displayName}
                </span>
                <span
                  suppressHydrationWarning
                  className="text-muted-foreground truncate text-[11px]"
                >
                  {displaySubtitle}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/70" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-xl p-2 shadow-xl border-border/80"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-2 font-normal">
              <div className="flex items-start gap-3 text-left">
                <div
                  suppressHydrationWarning
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold text-sm shadow-md"
                >
                  {initials}
                </div>
                <div className="grid flex-1 leading-tight gap-1 overflow-hidden">
                  <span
                    suppressHydrationWarning
                    className="truncate font-bold text-sm text-foreground"
                  >
                    {displayName}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(activeUser?.roles && activeUser.roles.length > 0 ? activeUser.roles : (activeUser?.role ? [activeUser.role] : [])).map((r) => (
                      <Badge
                        key={r}
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 font-medium"
                      >
                        {formatRole(r)}
                      </Badge>
                    ))}
                    {activeUser?.nip && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        NIP. {activeUser.nip}
                      </span>
                    )}
                  </div>
                  {activeUser?.jabatan && (
                    <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{activeUser.jabatan}</span>
                    </span>
                  )}
                  {opdName && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate flex items-center gap-1">
                      <Building2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="truncate">{opdName}</span>
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive font-medium rounded-lg py-2 transition-colors"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              {isLoggingOut ? "Sedang keluar..." : "Keluar (Logout)"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
