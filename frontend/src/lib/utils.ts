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

