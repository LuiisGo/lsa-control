import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
