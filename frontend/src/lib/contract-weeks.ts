export interface ContractWeek {
  bulan: number
  mingguKe: number
  tanggalMulai: string
  tanggalSelesai: string
}

const toLocalDate = (value: string) => {
  const [year, month, day] = value.substring(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

const toDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function generateContractWeeks(startValue?: string | null, endValue?: string | null): ContractWeek[] {
  if (!startValue || !endValue) return []
  const contractStart = toLocalDate(startValue)
  const contractEnd = toLocalDate(endValue)
  if (Number.isNaN(contractStart.getTime()) || Number.isNaN(contractEnd.getTime()) || contractEnd < contractStart) return []

  const result: ContractWeek[] = []
  const monthCursor = new Date(contractStart.getFullYear(), contractStart.getMonth(), 1)
  const lastMonth = new Date(contractEnd.getFullYear(), contractEnd.getMonth(), 1)

  while (monthCursor <= lastMonth) {
    const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0)
    let cursor = contractStart > monthStart ? new Date(contractStart) : monthStart
    const segmentEnd = contractEnd < monthEnd ? contractEnd : monthEnd
    let mingguKe = 1

    while (cursor <= segmentEnd) {
      const weekEnd = new Date(cursor)
      weekEnd.setDate(weekEnd.getDate() + 6)
      if (weekEnd > segmentEnd) weekEnd.setTime(segmentEnd.getTime())
      result.push({
        bulan: cursor.getMonth() + 1,
        mingguKe,
        tanggalMulai: toDateString(cursor),
        tanggalSelesai: toDateString(weekEnd),
      })
      cursor = new Date(weekEnd)
      cursor.setDate(cursor.getDate() + 1)
      mingguKe += 1
    }

    monthCursor.setMonth(monthCursor.getMonth() + 1)
  }
  return result
}

export function formatContractDate(value: string | Date) {
  const date = value instanceof Date ? value : toLocalDate(String(value))
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date)
}

export function getContractMonths(startValue?: string | null, endValue?: string | null) {
  return Array.from(new Set(generateContractWeeks(startValue, endValue).map((week) => week.bulan)))
}
