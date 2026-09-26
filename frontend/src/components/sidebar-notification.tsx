"use client"

import * as React from "react"
import { X, Bell, Calendar, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "simantap_notification_dismissed"

export function SidebarNotification() {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY)
    if (!dismissed) setIsVisible(true)
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "true")
    setIsVisible(false)
  }

  if (!isVisible) return null

  const bulan = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })

  return (
    <div className="mx-2 mb-2 group-data-[collapsible=icon]:hidden">
      <div className="relative rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-3 overflow-hidden">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 rounded-t-xl" />

        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1.5 right-1.5 h-5 w-5 p-0 hover:bg-amber-500/20 rounded-md"
          onClick={handleDismiss}
        >
          <X className="h-3 w-3 text-amber-700 dark:text-amber-400" />
          <span className="sr-only">Tutup</span>
        </Button>

        <div className="flex items-start gap-2 pr-4">
          <div className="mt-0.5 shrink-0 p-1 rounded-md bg-amber-500/15">
            <Bell className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
              Pengisian RFK Aktif
            </p>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed mt-0.5">
              Pastikan realisasi fisik &amp; keuangan {bulan} sudah diinput sebelum akhir bulan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
