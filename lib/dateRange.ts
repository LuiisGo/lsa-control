import { formatFecha } from './utils'

export interface DateRange extends Record<string, string> {
  fechaInicio: string
  fechaFin: string
}

export interface DateRangeValidation {
  valid: boolean
  error?: string
}

export function validateDateRange(fechaInicio: string, fechaFin: string): DateRangeValidation {
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    return {
      valid: false,
      error: 'La fecha inicial debe ser anterior o igual a la fecha final',
    }
  }
  return { valid: true }
}

export function formatDateRangeLabel(fechaInicio: string, fechaFin: string): string {
  if (fechaInicio && fechaFin) {
    return `Mostrando registros del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`
  }
  if (fechaInicio) return `Mostrando registros desde el ${formatFecha(fechaInicio)}`
  if (fechaFin) return `Mostrando registros hasta el ${formatFecha(fechaFin)}`
  return 'Mostrando todos los registros'
}

export function buildRangePayload(fechaInicio: string, fechaFin: string): DateRange {
  return {
    fechaInicio,
    fechaFin,
  }
}

export function getDefaultMonthRange(today: string): DateRange {
  return {
    fechaInicio: `${today.slice(0, 8)}01`,
    fechaFin: today,
  }
}
