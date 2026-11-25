"use client"

import { useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Copy, Download, ExternalLink, QrCode } from "lucide-react"

interface SelfRegisterQrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SelfRegisterQrDialog({
  open,
  onOpenChange,
}: SelfRegisterQrDialogProps) {
  const [copied, setCopied] = useState(false)
  const svgWrapperRef = useRef<HTMLDivElement>(null)

  const registerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/registrasi/`
      : "/registrasi/"

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(registerUrl)
      setCopied(true)
      toast.success("Tautan registrasi mandiri berhasil disalin")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Gagal menyalin tautan")
    }
  }

  const handleDownloadPng = () => {
    const svg = svgWrapperRef.current?.querySelector("svg")
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const img = new Image()
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      const padding = 32
      const canvas = document.createElement("canvas")
      canvas.width = img.width + padding * 2
      canvas.height = img.height + padding * 2
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, padding, padding)
        const link = document.createElement("a")
        link.download = "qr-registrasi-monalisa-konsel.png"
        link.href = canvas.toDataURL("image/png")
        link.click()
      }
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>QR Registrasi Mandiri OPD</span>
          </DialogTitle>
          <DialogDescription>
            Bagikan atau tampilkan QR Code ini agar Admin PPK, Bendahara, atau Kepala OPD dapat mendaftarkan role aksesnya sendiri.
          </DialogDescription>
        </DialogHeader>

        <div className="flex w-full min-w-0 flex-col items-center gap-4 py-2">
          <div
            ref={svgWrapperRef}
            className="rounded-2xl border bg-white p-5 shadow-xs"
          >
            <QRCodeSVG
              value={registerUrl}
              size={220}
              level="M"
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <Badge variant="secondary" className="text-[11px]">Admin PPK</Badge>
            <Badge variant="secondary" className="text-[11px]">Bendahara</Badge>
            <Badge variant="secondary" className="text-[11px]">Kepala OPD</Badge>
          </div>

          <div className="flex w-full min-w-0 items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <span
              className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
              title={registerUrl}
            >
              {registerUrl}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => window.open(registerUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Buka Halaman</span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
            onClick={handleDownloadPng}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh QR (PNG)</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
