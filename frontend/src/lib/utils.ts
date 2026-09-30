import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toTitleCase(str?: string | null): string {
  if (!str) return ""
  const acronyms = new Set([
    "TI", "IT", "UPTD", "PPK", "SPBE", "KPA", "PPTK", "ASN", "PNS", "P3K", "PPPK", "DPRD", "SETDA", "OPD"
  ])
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase()
      if (acronyms.has(upper)) return upper
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

export function getUserUnitLabel(user?: {
  opd?: { id?: string; namaOpd?: string; singkatan?: string } | null
  subUnit?: { id?: string; namaSubUnit?: string } | null
} | null): { short: string; full: string } {
  if (!user) return { short: "-", full: "-" }

  const subUnitName = user.subUnit?.namaSubUnit?.trim()
  const opdNama = user.opd?.namaOpd?.trim()
  const opdSingkatan = user.opd?.singkatan?.trim()

  // Jika user memiliki Sub Unit yang spesifik (berbeda dari nama OPD)
  if (subUnitName && (!opdNama || subUnitName.toLowerCase() !== opdNama.toLowerCase())) {
    const titleCased = toTitleCase(subUnitName)
    const full = opdSingkatan ? `${titleCased} (${opdSingkatan})` : titleCased
    return {
      short: titleCased,
      full: opdNama ? `${titleCased} - ${opdNama}` : full,
    }
  }

  // Jika tidak memiliki Sub Unit khusus, gunakan singkatan OPD atau nama lengkap OPD
  const short = opdSingkatan || (opdNama ? toTitleCase(opdNama) : "-")
  const full = opdNama || opdSingkatan || "-"
  return { short, full }
}

export const EXCLUDED_OPD_PATTERNS = [
  "KEPALA DAERAH DAN WAKIL KEPALA DAERAH",
  "PEMERINTAH DAERAH KABUPATEN KONAWE SELATAN",
  "BADAN LAYANAN UMUM DAERAH RSUD",
]

export const EXCLUDED_OPD_IDS = [
  "i33wtjx0k2hcbcgo",
  "GRJM9p35D43j64yFq",
  "i33wtjx0k2hc463b",
]

export function isExcludedOpd(idOrName?: string | null): boolean {
  if (!idOrName) return false
  const str = String(idOrName).trim()
  const upper = str.toUpperCase()

  if (EXCLUDED_OPD_IDS.some((id) => id.toLowerCase() === str.toLowerCase())) {
    return true
  }

  if (
    upper === "KEPALA DAERAH DAN WAKIL KEPALA DAERAH" ||
    upper.includes("KEPALA DAERAH DAN WAKIL KEPALA DAERAH")
  ) {
    return true
  }

  if (
    upper === "PEMERINTAH DAERAH KABUPATEN KONAWE SELATAN" ||
    upper.includes("PEMERINTAH DAERAH KABUPATEN KONAWE SELATAN")
  ) {
    return true
  }

  if (
    upper === "BADAN LAYANAN UMUM DAERAH RSUD" ||
    upper.includes("BADAN LAYANAN UMUM DAERAH RSUD") ||
    upper === "BLUD RSUD"
  ) {
    return true
  }

  return false
}

