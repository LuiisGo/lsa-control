import { describe, expect, it } from 'vitest'
import { parseLsaExcelQuincena } from './excelImport'

const workbookPath = '/Users/luismarroquin/Downloads/_Recepcion y envio de leche del 16 al 30 de abril 2,026.xlsx'

describe('parseLsaExcelQuincena', () => {
  it('extracts the April 16-30 operational and finance totals', async () => {
    const data = await parseLsaExcelQuincena(workbookPath)

    expect(data.periodo).toEqual({ inicio: '2026-04-16', fin: '2026-04-30' })
    expect(data.proveedores).toHaveLength(12)
    expect(data.cargas).toHaveLength(177)
    expect(data.totales.recepcionLitros).toBe(57225)
    expect(data.totales.totalPlanillas).toBe(309565.45)
    expect(data.totales.adelantos).toBe(127370.99)
    expect(data.totales.totalPorPagar).toBe(182194.46)
    expect(data.totales.ventas).toBe(359905.85)
    expect(data.totales.margenBruto).toBe(50340.4)

    const trebolac = data.compradores.find(c => c.nombre === 'Trebolac')
    expect(trebolac).toMatchObject({
      litrosEnviados: 42482,
      litrosRecibidos: 42314,
      diferenciaLitros: -168,
    })
  })
})
