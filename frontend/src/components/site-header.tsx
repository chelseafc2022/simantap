"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const routeMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pembangunan": "Paket Pembangunan",
  "/realisasi": "Rekap Realisasi",
  "/laporan": "Laporan & Evaluasi",
  "/users": "Manajemen Akun",
  "/roles": "Kelompok Pengguna",
}

function DynamicBreadcrumb() {
  const pathname = usePathname()

  // Find exact or prefix match
  const matched = Object.entries(routeMap).find(
    ([path]) => pathname === path || pathname.startsWith(path + "/")
  )

  const pageTitle = matched ? matched[1] : null
  const isRoot = pathname === "/dashboard"

  if (!pageTitle) return (
    <span className="text-sm font-semibold tracking-tight text-foreground hidden sm:inline-block">
      SIMANTAP
    </span>
  )

  return (
    <Breadcrumb className="hidden sm:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              SIMANTAP
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {!isRoot && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-semibold text-foreground">
                {pageTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-2 px-4 py-3 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <DynamicBreadcrumb />
          <div className="ml-auto flex items-center gap-2">
            <div className="w-44 sm:w-60">
              <SearchTrigger onClick={() => setSearchOpen(true)} />
            </div>
            <ModeToggle />
          </div>
        </div>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
