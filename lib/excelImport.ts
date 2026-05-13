import ExcelJS from 'exceljs'

export interface LsaExcelCarga {
  fecha: string
  proveedorCodigo: number
  proveedorNombre: string
  litros: number
}

export interface LsaExcelProveedor {
  codigo: number
  nombre: string
  litros: number
}

export interface LsaExcelComprador {
  nombre: string
  litrosEnviados: number
  litrosRecibidos: number
  diferenciaLitros: number
  precioLitro: number
  monto: number
}

export interface LsaExcelPlanilla {
  codigo: number
  proveedorNombre: string
  litros: number
  precioLitro: number
  totalPlanilla: number
  adelanto1: number
  adelanto2: number
  adelanto3: number
  descuentos: number
  totalPorPagar: number
}

export interface LsaExcelAjusteVenta {
  concepto: string
  monto: number
}

export interface LsaExcelQuincena {
  periodo: { inicio: string; fin: string }
  proveedores: LsaExcelProveedor[]
  cargas: LsaExcelCarga[]
  compradores: LsaExcelComprador[]
  planillas: LsaExcelPlanilla[]
  ajustesVenta: LsaExcelAjusteVenta[]
  totales: {
    recepcionLitros: number
    totalPlanillas: number
    adelantos: number
    totalPorPagar: number
    ventas: number
    margenBruto: number
    diferenciaLitros: number
  }
}

const RECEPCION_SHEET = 'Recepcion y envio 16 al 30 de A'
const RESUMEN_SHEET = 'Resumen de Pago'

function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value
  if (value && typeof value === 'object' && 'result' in value) {
    return (value as { result?: unknown }).result
  }
  return value
}

function n(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function s(value: unknown): string {
  return String(value ?? '').trim()
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return s(value)
}

function get(ws: ExcelJS.Worksheet, row: number, col: number): unknown {
  return cellValue(ws.getRow(row).getCell(col))
}

export async function parseLsaExcelQuincena(path: string): Promise<LsaExcelQuincena> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)

  const recepcion = workbook.getWorksheet(RECEPCION_SHEET)
  const resumen = workbook.getWorksheet(RESUMEN_SHEET)
  if (!recepcion || !resumen) throw new Error('Excel no tiene las hojas requeridas')

  const fechaCols = Array.from({ length: 15 }, (_, i) => i + 4) // D:Q = 16-30 abril
  const fechas = fechaCols.map(col => dateToIso(get(recepcion, 8, col)))

  const proveedores: LsaExcelProveedor[] = []
  const cargas: LsaExcelCarga[] = []
  for (let row = 11; row <= 22; row++) {
    const codigo = n(get(recepcion, row, 1))
    const nombre = s(get(recepcion, row, 2))
    if (!codigo || !nombre) continue

    let litrosProveedor = 0
    fechaCols.forEach((col, index) => {
      const litros = n(get(recepcion, row, col))
      litrosProveedor += litros
      if (litros > 0) {
        cargas.push({
          fecha: fechas[index],
          proveedorCodigo: codigo,
          proveedorNombre: nombre,
          litros,
        })
      }
    })

    proveedores.push({
      codigo,
      nombre,
      litros: round(litrosProveedor, 1),
    })
  }

  const planillas: LsaExcelPlanilla[] = []
  for (let row = 6; row <= 17; row++) {
    const codigo = n(get(resumen, row, 1))
    const proveedorNombre = s(get(resumen, row, 2))
    if (!codigo || !proveedorNombre) continue
    planillas.push({
      codigo,
      proveedorNombre,
      litros: n(get(resumen, row, 3)),
      precioLitro: n(get(resumen, row, 4)),
      totalPlanilla: round(n(get(resumen, row, 5))),
      adelanto1: round(n(get(resumen, row, 6))),
      adelanto2: round(n(get(resumen, row, 7))),
      adelanto3: round(n(get(resumen, row, 8))),
      descuentos: round(n(get(resumen, row, 9))),
      totalPorPagar: round(n(get(resumen, row, 10))),
    })
  }

  const compradores: LsaExcelComprador[] = [
    {
      nombre: 'Trebolac',
      litrosEnviados: n(get(recepcion, 36, 20)),
      litrosRecibidos: n(get(resumen, 23, 4)),
      diferenciaLitros: round(n(get(recepcion, 38, 20)), 1),
      precioLitro: n(get(resumen, 23, 3)),
      monto: round(n(get(resumen, 23, 5))),
    },
    {
      nombre: 'Artelac',
      litrosEnviados: n(get(recepcion, 57, 20)),
      litrosRecibidos: n(get(resumen, 24, 4)),
      diferenciaLitros: 0,
      precioLitro: n(get(resumen, 24, 3)),
      monto: round(n(get(resumen, 24, 5))),
    },
    {
      nombre: 'Inlacsa',
      litrosEnviados: n(get(recepcion, 58, 20)),
      litrosRecibidos: n(get(resumen, 25, 4)),
      diferenciaLitros: round(n(get(resumen, 25, 4)) - n(get(recepcion, 58, 20)), 1),
      precioLitro: n(get(resumen, 25, 3)),
      monto: round(n(get(resumen, 25, 5))),
    },
    {
      nombre: 'La Lecheria',
      litrosEnviados: n(get(recepcion, 27, 21)),
      litrosRecibidos: n(get(resumen, 26, 4)),
      diferenciaLitros: round(n(get(resumen, 26, 4)) - n(get(recepcion, 27, 21)), 1),
      precioLitro: n(get(resumen, 26, 3)),
      monto: round(n(get(resumen, 26, 5))),
    },
  ]

  const ajustesVenta: LsaExcelAjusteVenta[] = []
  for (let row = 23; row <= 26; row++) {
    const concepto = s(get(resumen, row, 8))
    const monto = round(n(get(resumen, row, 9)))
    if (concepto && monto) ajustesVenta.push({ concepto, monto })
  }

  return {
    periodo: { inicio: '2026-04-16', fin: '2026-04-30' },
    proveedores,
    cargas,
    compradores,
    planillas,
    ajustesVenta,
    totales: {
      recepcionLitros: round(n(get(recepcion, 25, 21)), 1),
      totalPlanillas: round(n(get(resumen, 18, 5))),
      adelantos: round(n(get(resumen, 18, 6)) + n(get(resumen, 18, 7)) + n(get(resumen, 18, 8))),
      totalPorPagar: round(n(get(resumen, 18, 10))),
      ventas: round(n(get(resumen, 28, 5))),
      margenBruto: round(n(get(resumen, 32, 5)), 1),
      diferenciaLitros: round(n(get(recepcion, 87, 3)), 1),
    },
  }
}
