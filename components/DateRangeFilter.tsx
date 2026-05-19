'use client'

import { Calendar, RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  formatDateRangeLabel,
  validateDateRange,
  type DateRange,
} from '@/lib/dateRange'

interface DateRangeFilterProps {
  value: DateRange
  onApply: (range: DateRange) => void
  onClear: () => void
  className?: string
  disabled?: boolean
  allowOpenRange?: boolean
}

export function DateRangeFilter({
  value,
  onApply,
  onClear,
  className = '',
  disabled = false,
  allowOpenRange = true,
}: DateRangeFilterProps) {
  const [draft, setDraft] = useState<DateRange>(value)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(value)
  }, [value])

  function apply() {
    const validation = validateDateRange(draft.fechaInicio, draft.fechaFin)
    if (!validation.valid) {
      setError(validation.error ?? 'Rango inválido')
      return
    }
    if (!allowOpenRange && (!draft.fechaInicio || !draft.fechaFin)) {
      setError('Seleccioná fecha inicial y fecha final')
      return
    }
    setError('')
    onApply(draft)
  }

  function clear() {
    setError('')
    setDraft({ fechaInicio: '', fechaFin: '' })
    onClear()
  }

  return (
    <div className={`card space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Calendar className="h-4 w-4 text-primary-600" aria-hidden="true" />
        <span>Rango de fechas</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr,1fr,auto,auto] sm:items-end">
        <div>
          <label className="label">Fecha inicial</label>
          <input
            type="date"
            className="input"
            value={draft.fechaInicio}
            max={draft.fechaFin || undefined}
            onChange={e => {
              setDraft(current => ({ ...current, fechaInicio: e.target.value }))
              setError('')
            }}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="label">Fecha final</label>
          <input
            type="date"
            className="input"
            value={draft.fechaFin}
            min={draft.fechaInicio || undefined}
            onChange={e => {
              setDraft(current => ({ ...current, fechaFin: e.target.value }))
              setError('')
            }}
            disabled={disabled}
          />
        </div>
        <button type="button" onClick={apply} disabled={disabled} className="btn-primary gap-2">
          <Search className="h-4 w-4" aria-hidden="true" />
          Aplicar filtro
        </button>
        <button type="button" onClick={clear} disabled={disabled} className="btn-secondary gap-2">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Limpiar
        </button>
      </div>

      <div className="text-xs text-slate-500">
        {error ? <span className="text-danger-600">{error}</span> : formatDateRangeLabel(value.fechaInicio, value.fechaFin)}
      </div>
    </div>
  )
}
