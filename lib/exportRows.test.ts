import { describe, expect, it } from 'vitest'
import { normalizeExportRows } from './exportRows'

describe('normalizeExportRows', () => {
  it('keeps export rows usable when Apps Script sends camelCase fields', () => {
    const rows = normalizeExportRows([
      {
        fecha: '2026-05-12',
        cargaT1: 12.5,
        cargaT2: 7.5,
        totalCarga: 20,
        realT1: 11,
        realT2: 8,
        totalReal: 19,
        difLitros: -1,
        difPct: -5,
        pipa: 3,
      },
    ])

    expect(rows).toEqual([
      {
        fecha: '2026-05-12',
        carga_t1: 12.5,
        carga_t2: 7.5,
        total_carga: 20,
        real_t1: 11,
        real_t2: 8,
        total_real: 19,
        dif_litros: -1,
        dif_pct: -5,
        pipa: 3,
      },
    ])
  })

  it('keeps already-normalized snake_case rows unchanged', () => {
    const rows = normalizeExportRows([
      {
        fecha: '2026-05-12',
        carga_t1: 1,
        carga_t2: 2,
        total_carga: 3,
        real_t1: 4,
        real_t2: 5,
        total_real: 9,
        dif_litros: 6,
        dif_pct: 7,
        pipa: 8,
      },
    ])

    expect(rows[0].total_carga).toBe(3)
    expect(rows[0].dif_pct).toBe(7)
  })
})
