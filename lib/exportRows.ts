export interface ExportRow {
  [key: string]: string | number
  fecha: string
  carga_t1: number
  carga_t2: number
  total_carga: number
  real_t1: number
  real_t2: number
  total_real: number
  dif_litros: number
  dif_pct: number
  pipa: number
}

type RawExportRow = Record<string, unknown>

function n(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeExportRows(rows: RawExportRow[]): ExportRow[] {
  return rows.map(row => ({
    fecha: String(row.fecha ?? ''),
    carga_t1: n(row.carga_t1 ?? row.cargaT1),
    carga_t2: n(row.carga_t2 ?? row.cargaT2),
    total_carga: n(row.total_carga ?? row.totalCarga),
    real_t1: n(row.real_t1 ?? row.realT1),
    real_t2: n(row.real_t2 ?? row.realT2),
    total_real: n(row.total_real ?? row.totalReal),
    dif_litros: n(row.dif_litros ?? row.difLitros),
    dif_pct: n(row.dif_pct ?? row.difPct),
    pipa: n(row.pipa),
  }))
}
