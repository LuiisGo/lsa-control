import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatQ(value: number | null | undefined): string {
  if (value == null) return '—'
  return 'Q ' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export function formatLitros(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value) + ' L'
}

export function formatLitrosNum(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatFecha(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatHora(timeStr: string): string {
  if (!timeStr) return '—'
  return timeStr.substring(0, 5)
}

export function formatTimestamp(ts: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatDiferencia(diff: number): string {
  const abs = Math.abs(diff)
  return `${diff >= 0 ? '+' : '-'}${formatLitrosNum(abs)} L`
}

export function formatPorcentaje(pct: number | null | undefined): string {
  if (pct == null) return '—'
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

export function getDiferenciaColor(pct: number): string {
  const abs = Math.abs(pct)
  if (abs <= 1) return 'text-success-600'
  if (abs <= 2) return 'text-warning-600'
  return 'text-danger-600'
}

export function getDiferenciaBadge(pct: number): string {
  const abs = Math.abs(pct)
  if (abs <= 1) return 'badge-success'
  if (abs <= 2) return 'badge-warning'
  return 'badge-danger'
}

export function getTodayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function buildCSV(rows: Record<string, unknown>[] | object[], headers: { key: string; label: string }[]): string {
  const typedRows = rows as Record<string, unknown>[]
  const headerRow = headers.map(h => h.label).join(',')
  const dataRows = typedRows.map(row =>
    headers.map(h => {
      const val = row[h.key]
      if (val == null) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadXLSX(
  rows: Record<string, unknown>[],
  headers: { key: string; label: string }[],
  filename: string,
  sheetName = 'Datos'
): void {
  // Dynamic import to avoid SSR issues
  import('xlsx').then(XLSX => {
    // Build worksheet data: header row + data rows
    const wsData: (string | number | null)[][] = [
      headers.map(h => h.label),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h.key]
          if (val == null) return null
          if (typeof val === 'number') return val
          const num = Number(val)
          return isNaN(num) ? String(val) : num
        })
      ),
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Column widths
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.label.length + 4, 14) }))

    // Header row bold styling (basic)
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!ws[cellAddr]) continue
      ws[cellAddr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E3A5F' } },
        alignment: { horizontal: 'center' },
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, filename)
  })
}

export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getQuincenasRecientes(n = 6): { label: string; inicio: string; fin: string }[] {
  const result: { label: string; inicio: string; fin: string }[] = []
  const now = new Date()

  for (let i = 0; i < n; i++) {
    const d = new Date(now)
    d.setDate(1)
    d.setMonth(d.getMonth() - Math.floor(i / 2))

    const isA = (i % 2 === (now.getDate() <= 15 ? 0 : 1))

    let inicio: Date, fin: Date
    if (isA) {
      inicio = new Date(d.getFullYear(), d.getMonth(), 1)
      fin = new Date(d.getFullYear(), d.getMonth(), 15)
    } else {
      inicio = new Date(d.getFullYear(), d.getMonth(), 16)
      fin = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    }

    const fmt = (dt: Date) => {
      const y = dt.getFullYear()
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const day = String(dt.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const mes = inicio.toLocaleString('es-GT', { month: 'short', year: 'numeric' })
    result.push({
      label: `Quincena ${isA ? 'A' : 'B'} — ${mes}`,
      inicio: fmt(inicio),
      fin: fmt(fin),
    })
  }

  return result
}
