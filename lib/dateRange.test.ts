import { describe, expect, it } from 'vitest'
import {
  buildRangePayload,
  formatDateRangeLabel,
  getDefaultMonthRange,
  validateDateRange,
} from './dateRange'

describe('date range helpers', () => {
  it('accepts empty ranges so the UI can clear filters', () => {
    expect(validateDateRange('', '')).toEqual({ valid: true })
  })

  it('rejects ranges where the initial date is after the final date', () => {
    expect(validateDateRange('2026-05-19', '2026-05-01')).toEqual({
      valid: false,
      error: 'La fecha inicial debe ser anterior o igual a la fecha final',
    })
  })

  it('formats active and empty range labels for users', () => {
    expect(formatDateRangeLabel('', '')).toBe('Mostrando todos los registros')
    expect(formatDateRangeLabel('2026-05-01', '2026-05-19')).toBe(
      'Mostrando registros del 01/05/2026 al 19/05/2026'
    )
    expect(formatDateRangeLabel('2026-05-01', '')).toBe(
      'Mostrando registros desde el 01/05/2026'
    )
    expect(formatDateRangeLabel('', '2026-05-19')).toBe(
      'Mostrando registros hasta el 19/05/2026'
    )
  })

  it('builds payloads that keep both date boundaries explicit', () => {
    expect(buildRangePayload('2026-05-01', '2026-05-19')).toEqual({
      fechaInicio: '2026-05-01',
      fechaFin: '2026-05-19',
    })
  })

  it('defaults to the current local month through the provided today string', () => {
    expect(getDefaultMonthRange('2026-05-19')).toEqual({
      fechaInicio: '2026-05-01',
      fechaFin: '2026-05-19',
    })
  })
})
