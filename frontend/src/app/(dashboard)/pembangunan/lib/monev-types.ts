export interface MonevFotoItem {
  id: string
  namaFile: string
  mimeType?: string | null
  pathFile: string
}

export interface MonevLapanganItem {
  id: string
  paketId: string
  tanggalMonev: string
  progresFisik: number
  kondisiFisik: string
  permasalahan: string
  saran: string
  createdAt: string
  updatedAt: string
  createdBy?: { id: string; namaLengkap?: string; nip?: string } | null
  fotos: MonevFotoItem[]
}

export interface MonevPaketInfo {
  id: string
  namaPaket: string
  tahunAnggaran: number
  nomorKontrak?: string | null
  pemenangRekanan?: string | null
  tanggalMulai?: string | null
  tanggalSelesai?: string | null
  nilaiKontrak: number
  lokasiKegiatan?: string | null
  polaMonitoring?: string
  opd?: { namaOpd?: string } | null
  subUnit?: { namaSubUnit?: string } | null
}

export interface MonevListResponse {
  paket: MonevPaketInfo
  data: MonevLapanganItem[]
}

export const API_STORAGE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"
).replace(/\/api\/v1\/?$/, "")

export const monevFotoUrl = (foto: MonevFotoItem) =>
  `${API_STORAGE_URL}${foto.pathFile}`

