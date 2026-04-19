'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  RefreshCw, Droplets, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronLeft, ChevronRight, Search, Loader2, BarChart2
} from 'lucide-react'
import { apiCall } from '@/lib/api'
import { TarjetaMetrica } from '@/components/TarjetaMetrica'
import { TablaCargas, type Carga } from '@/components/TablaCargas'
import { GraficaBarras } from '@/components/GraficaBarras'
import { GraficaDonut } from '@/components/GraficaDonut'
import { ModalEditar } from '@/components/ModalEditar'
import {
  formatLitros, formatLitrosNum, formatFecha,
  getDiferenciaColor, formatPorcentaje, getTodayString,
} from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardHoy {
  totalT1: number; totalT2: number; total: number
  medicion: { litros_real_t1: number; litros_real_t2: number; total_real: number; diferencia_litros: number; diferencia_pct: number } | null
  cargas: Carga[]
}

interface ExportRow {
  fecha: string; carga_t1: number; carga_t2: number; total_carga: number
  real_t1: number; real_t2: number; total_real: number; dif_litros: number; dif_pct: number; pipa: number
}

interface DatoProveedor {
  proveedor: string; t1: number; t2: number; total: number
}

interface ResumenDia {
  fecha: string
  ingresos: number
  litrosRecibidos: number
  gastos: number
  margen: number
  enviosCount: number
  litrosRecepcionados: number
  litrosEnviados: number
  restoEstimado: number
}

// ─── Quincena helpers ────────────────────────────────────────────────────────

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

interface QuincenaItem { nombre: string; inicio: string; fin: string }

function generarQuincenas(n = 24): QuincenaItem[] {
  const list: QuincenaItem[] = []
  let d = new Date()
  for (let i = 0; i < n; i++) {
    const year = d.getFullYear(), month = d.getMonth(), day = d.getDate()
    const isA = day <= 15
    let inicio: Date, fin: Date
    if (isA) {
      inicio = new Date(year, month, 1); fin = new Date(year, month, 15)
    } else {
      inicio = new Date(year, month, 16); fin = new Date(year, month + 1, 0)
    }
    list.push({ nombre: `Quincena ${isA ? 'A' : 'B'} — ${MESES[month]} ${year}`, inicio: dateStr(inicio), fin: dateStr(fin) })
    if (isA) {
      d = new Date(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 16)
    } else {
      d = new Date(year, month, 1)
    }
  }
  return list
}

// ─── TablaQuincena ───────────────────────────────────────────────────────────

function TablaQuincena({ datos }: { datos: ExportRow[] }) {
  if (!datos.length) return <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p>
  const activos = datos.filter(d => d.total_carga > 0 || d.total_real > 0)
  if (!activos.length) return <p className="text-sm text-slate-400 py-4 text-center">Sin registros en este período</p>
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th className="text-right">T1</th><th className="text-right">T2</th>
            <th className="text-right">Total</th><th className="text-right">Real T1</th>
            <th className="text-right">Real T2</th><th className="text-right">Real Total</th>
            <th className="text-right">Dif L</th><th className="text-right">Dif %</th>
            <th className="text-right">Pipa</th>
          </tr>
        </thead>
        <tbody>
          {activos.map(d => (
            <tr key={d.fecha}>
              <td className="font-mono text-xs whitespace-nowrap">{formatFecha(d.fecha)}</td>
              <td className="text-right font-mono text-xs">{formatLitros(d.carga_t1)}</td>
              <td className="text-right font-mono text-xs">{formatLitros(d.carga_t2)}</td>
              <td className="text-right font-mono text-xs font-semibold">{formatLitros(d.total_carga)}</td>
              <td className="text-right font-mono text-xs">{formatLitros(d.real_t1)}</td>
              <td className="text-right font-mono text-xs">{formatLitros(d.real_t2)}</td>
              <td className="text-right font-mono text-xs font-semibold">{formatLitros(d.total_real)}</td>
              <td className={`text-right font-mono text-xs ${getDiferenciaColor(d.dif_pct)}`}>
                {d.dif_litros >= 0 ? '+' : ''}{formatLitros(d.dif_litros)}
              </td>
              <td className={`text-right font-mono text-xs ${getDiferenciaColor(d.dif_pct)}`}>
                {formatPorcentaje(d.dif_pct)}
              </td>
              <td className="text-right font-mono text-xs">{formatLitros(d.pipa)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

const QUINCENAS = generarQuincenas(24)

export default function AdminDashboardPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  // HOY
  const [hoy, setHoy] = useState<DashboardHoy | null>(null)
  const [loadingHoy, setLoadingHoy] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [editCarga, setEditCarga] = useState<Carga | null>(null)

  // QUINCENA selector
  const [qIndex, setQIndex] = useState(0)
  const [quincenaRows, setQuincenaRows] = useState<ExportRow[] | null>(null)
  const [loadingQ, setLoadingQ] = useState(false)
  const [showQDrop, setShowQDrop] = useState(false)

  // PERÍODO PERSONALIZADO
  const today = getTodayString()
  const [periodoInicio, setPeriodoInicio] = useState(today)
  const [periodoFin, setPeriodoFin] = useState(today)
  const [periodoRows, setPeriodoRows] = useState<ExportRow[] | null>(null)
  const [proveedores, setProveedores] = useState<DatoProveedor[] | null>(null)
  const [campoPie, setCampoPie] = useState<'total' | 't1' | 't2'>('total')
  const [loadingPeriodo, setLoadingPeriodo] = useState(false)

  const [resumen, setResumen] = useState<ResumenDia | null>(null)

  // ── Load HOY ──
  const loadHoy = useCallback(async () => {
    if (!token) return
    setLoadingHoy(true)
    try {
      const [r, rDia] = await Promise.all([
        apiCall<DashboardHoy>('getDashboardHoy', {}, token),
        apiCall<ResumenDia>('getResumenFinancieroDia', {}, token),
      ])
      if (r.success && r.data) setHoy(r.data)
      if (rDia.success && rDia.data) setResumen(rDia.data)
      setLastUpdate(new Date().toLocaleTimeString('es-GT'))
    } catch { toast.error('Error al cargar datos de hoy') }
    finally { setLoadingHoy(false) }
  }, [token])

  useEffect(() => {
    loadHoy()
    const t = setInterval(loadHoy, 60000)
    return () => clearInterval(t)
  }, [loadHoy])

  // ── Load Quincena on index change ──
  useEffect(() => {
    if (!token) return
    const q = QUINCENAS[qIndex]
    setQuincenaRows(null)
    setLoadingQ(true)
    apiCall<ExportRow[]>('exportarDatos', { fechaInicio: q.inicio, fechaFin: q.fin }, token)
      .then(r => { if (r.success && r.data) setQuincenaRows(r.data) })
      .catch(() => toast.error('Error al cargar quincena'))
      .finally(() => setLoadingQ(false))
  }, [token, qIndex])

  // ── Buscar período ──
  async function buscarPeriodo() {
    if (!token || !periodoInicio || !periodoFin) return
    if (periodoInicio > periodoFin) { toast.error('La fecha inicial debe ser anterior a la final'); return }
    setLoadingPeriodo(true)
    setPeriodoRows(null); setProveedores(null)
    try {
      const [r1, r2] = await Promise.all([
        apiCall<ExportRow[]>('exportarDatos', { fechaInicio: periodoInicio, fechaFin: periodoFin }, token),
        apiCall<DatoProveedor[]>('getCargasPorProveedor', { fechaInicio: periodoInicio, fechaFin: periodoFin }, token),
      ])
      if (r1.success && r1.data) setPeriodoRows(r1.data)
      if (r2.success && r2.data) setProveedores(r2.data)
    } catch { toast.error('Error al cargar período') }
    finally { setLoadingPeriodo(false) }
  }

  // ── Edit carga ──
  async function handleSaveEditCarga(values: Record<string, string | number>) {
    if (!editCarga || !token) return
    const res = await apiCall('editarCarga', { id: editCarga.id, proveedor: values.proveedor, litros_t1: values.litros_t1, litros_t2: values.litros_t2 }, token)
    if (res.success) { toast.success('Carga actualizada'); setEditCarga(null); loadHoy() }
    else toast.error(res.error ?? 'Error al actualizar')
  }

  // ── Computed quincena totals ──
  const qTotalRec = quincenaRows?.reduce((s, r) => s + r.total_carga, 0) ?? 0
  const qTotalEnv = quincenaRows?.reduce((s, r) => s + r.total_real, 0) ?? 0
  const qGrafDatos = (quincenaRows ?? []).map(r => ({ fecha: r.fecha, carga: r.total_carga, real: r.total_real }))

  // ── Computed periodo totals ──
  const pTotalRec = periodoRows?.reduce((s, r) => s + r.total_carga, 0) ?? 0
  const pTotalRecT1 = periodoRows?.reduce((s, r) => s + r.carga_t1, 0) ?? 0
  const pTotalRecT2 = periodoRows?.reduce((s, r) => s + r.carga_t2, 0) ?? 0
  const pTotalEnv = periodoRows?.reduce((s, r) => s + r.total_real, 0) ?? 0

  const selectedQ = QUINCENAS[qIndex]

  return (
    <div className="space-y-10">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          {lastUpdate && <p className="text-xs text-slate-400 mt-0.5">Actualizado: {lastUpdate}</p>}
        </div>
        <button onClick={() => { setLoadingHoy(true); loadHoy() }} className="btn-secondary gap-2" disabled={loadingHoy}>
          <RefreshCw className={`w-4 h-4 ${loadingHoy ? 'animate-spin' : ''}`} />
          <span className="hidden sm:block">Actualizar</span>
        </button>
      </div>

      {/* ── SECCIÓN HOY ─────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title flex items-center gap-2">
          <Droplets className="w-4 h-4 text-primary-600" />Hoy
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <TarjetaMetrica titulo="Tanque 1" valor={loadingHoy ? '...' : formatLitrosNum(hoy?.totalT1 ?? 0)} subtitulo="litros" isLoading={loadingHoy} />
          <TarjetaMetrica titulo="Tanque 2" valor={loadingHoy ? '...' : formatLitrosNum(hoy?.totalT2 ?? 0)} subtitulo="litros" isLoading={loadingHoy} />
          <TarjetaMetrica titulo="Total hoy" valor={loadingHoy ? '...' : formatLitrosNum(hoy?.total ?? 0)} subtitulo="litros" variant="primary" isLoading={loadingHoy} />
          <TarjetaMetrica titulo="Pipa mañana" valor={loadingHoy ? '...' : formatLitrosNum(hoy?.total ?? 0)} subtitulo="litros (= total hoy)" variant="primary" isLoading={loadingHoy} />
        </div>

        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Medición del día</p>
            {!loadingHoy && (
              hoy?.medicion
                ? <span className="badge-success"><CheckCircle2 className="w-3 h-3" />Registrada</span>
                : <span className="badge-danger"><AlertTriangle className="w-3 h-3" />Pendiente</span>
            )}
          </div>
          {loadingHoy ? <div className="skeleton h-12 w-full" /> : hoy?.medicion ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="text-center">
                <p className="text-xs text-slate-500">T1 Real</p>
                <p className="font-mono font-semibold text-sm">{formatLitros(hoy.medicion.litros_real_t1)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">T2 Real</p>
                <p className="font-mono font-semibold text-sm">{formatLitros(hoy.medicion.litros_real_t2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Total Real</p>
                <p className="font-mono font-bold text-sm text-primary-700">{formatLitros(hoy.medicion.total_real)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Diferencia</p>
                <p className={`font-mono font-semibold text-sm ${getDiferenciaColor(hoy.medicion.diferencia_pct)}`}>
                  {hoy.medicion.diferencia_litros >= 0 ? '+' : ''}{formatLitros(hoy.medicion.diferencia_litros)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Variación</p>
                <p className={`font-mono font-bold text-sm ${getDiferenciaColor(hoy.medicion.diferencia_pct)}`}>
                  {formatPorcentaje(hoy.medicion.diferencia_pct)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No se registró medición hoy</p>
          )}
        </div>

        {resumen && !loadingHoy && (
          <div className="card mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Movimiento del tanque</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-slate-500">Recepcionado</p>
                <p className="font-mono font-semibold">{(resumen.litrosRecepcionados ?? 0).toFixed(1)} L</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Enviado</p>
                <p className="font-mono font-semibold">{(resumen.litrosEnviados ?? 0).toFixed(1)} L</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Resto</p>
                <p className={`font-mono font-bold ${(resumen.restoEstimado ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {(resumen.restoEstimado ?? 0).toFixed(1)} L
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cargas del día</p>
        <TablaCargas cargas={hoy?.cargas ?? []} showActions onEdit={setEditCarga} isLoading={loadingHoy} />
      </section>

      {/* ── SECCIÓN QUINCENAS ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <TrendingUp className="w-4 h-4 text-primary-600 shrink-0" />
          <h2 className="section-title mb-0 flex-1">Quincenas</h2>
        </div>

        {/* Quincena selector */}
        <div className="card mb-4">
          <div className="flex items-center gap-2 justify-between">
            <button
              onClick={() => setQIndex(i => Math.min(i + 1, QUINCENAS.length - 1))}
              disabled={qIndex >= QUINCENAS.length - 1}
              className="btn-secondary p-2 shrink-0 disabled:opacity-30"
              title="Quincena anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex-1">
              <button
                onClick={() => setShowQDrop(v => !v)}
                className="w-full text-center font-semibold text-slate-700 hover:text-primary-600 transition-colors py-1 rounded-lg hover:bg-primary-50"
              >
                {selectedQ.nombre}
                <span className="text-xs text-slate-400 font-normal ml-2">
                  {formatFecha(selectedQ.inicio)} — {formatFecha(selectedQ.fin)}
                </span>
              </button>

              {showQDrop && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowQDrop(false)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
                    {QUINCENAS.map((q, i) => (
                      <button
                        key={q.inicio}
                        onClick={() => { setQIndex(i); setShowQDrop(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${i === qIndex ? 'text-primary-600 font-semibold bg-primary-50' : 'text-slate-700'}`}
                      >
                        <span>{q.nombre}</span>
                        <span className="text-xs text-slate-400 ml-2">{formatFecha(q.inicio)}–{formatFecha(q.fin)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setQIndex(i => Math.max(i - 1, 0))}
              disabled={qIndex === 0}
              className="btn-secondary p-2 shrink-0 disabled:opacity-30"
              title="Quincena siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loadingQ ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton h-20 w-full" /><div className="skeleton h-20 w-full" />
            </div>
            <div className="skeleton h-56 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <TarjetaMetrica titulo="Total recepcionado" valor={formatLitrosNum(qTotalRec)} subtitulo="litros" variant="primary" />
              <TarjetaMetrica titulo="Total enviado" valor={formatLitrosNum(qTotalEnv)} subtitulo="litros" variant="success" />
            </div>
            {qGrafDatos.length > 0 && (
              <GraficaBarras datos={qGrafDatos} titulo="Recepcionado vs Medición" />
            )}
            <div className="mt-4">
              <TablaQuincena datos={quincenaRows ?? []} />
            </div>
          </>
        )}
      </section>

      {/* ── SECCIÓN ANÁLISIS POR PERÍODO ──────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="w-4 h-4 text-primary-600 shrink-0" />
          <h2 className="section-title mb-0">Análisis por período</h2>
        </div>

        {/* Date range picker */}
        <div className="card mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Seleccioná el rango de fechas</p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="label">Desde</label>
              <input
                type="date"
                value={periodoInicio}
                max={periodoFin}
                onChange={e => setPeriodoInicio(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label">Hasta</label>
              <input
                type="date"
                value={periodoFin}
                min={periodoInicio}
                max={today}
                onChange={e => setPeriodoFin(e.target.value)}
                className="input"
              />
            </div>
            <button
              onClick={buscarPeriodo}
              disabled={loadingPeriodo}
              className="btn-primary gap-2 shrink-0"
            >
              {loadingPeriodo
                ? <><Loader2 className="w-4 h-4 animate-spin" />Cargando...</>
                : <><Search className="w-4 h-4" />Analizar</>
              }
            </button>
          </div>
        </div>

        {/* Results */}
        {loadingPeriodo && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 w-full" />)}
            </div>
            <div className="skeleton h-72 w-full" />
          </div>
        )}

        {!loadingPeriodo && periodoRows !== null && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <TarjetaMetrica titulo="Total recepcionado" valor={formatLitrosNum(pTotalRec)} subtitulo="litros" variant="primary" />
              <TarjetaMetrica titulo="T1 recepcionado" valor={formatLitrosNum(pTotalRecT1)} subtitulo="litros" />
              <TarjetaMetrica titulo="T2 recepcionado" valor={formatLitrosNum(pTotalRecT2)} subtitulo="litros" />
              <TarjetaMetrica titulo="Total enviado" valor={formatLitrosNum(pTotalEnv)} subtitulo="litros" variant="success" />
            </div>

            {/* Donut chart with toggle */}
            {proveedores && proveedores.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-700">Recepción por proveedor</p>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['total', 't1', 't2'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setCampoPie(c)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          campoPie === c
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {c === 'total' ? 'Total' : c === 't1' ? 'Tanque 1' : 'Tanque 2'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-80">
                  {/* Dynamically import to avoid SSR */}
                  <GraficaDonut datos={proveedores} campo={campoPie} />
                </div>
              </div>
            )}

            {/* Bar chart for the period */}
            {periodoRows.filter(r => r.total_carga > 0 || r.total_real > 0).length > 0 && (
              <div className="mt-4">
                <GraficaBarras
                  datos={periodoRows.map(r => ({ fecha: r.fecha, carga: r.total_carga, real: r.total_real }))}
                  titulo="Recepcionado vs Medición en el período"
                />
              </div>
            )}
          </>
        )}

        {!loadingPeriodo && periodoRows === null && (
          <div className="card flex flex-col items-center py-10 text-slate-400 gap-2">
            <BarChart2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">Seleccioná un rango y hacé clic en Analizar</p>
          </div>
        )}
      </section>

      {/* Edit Carga Modal */}
      <ModalEditar
        open={!!editCarga}
        title="Editar carga"
        fields={[
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: true },
          { key: 'litros_t1', label: 'Litros Tanque 1', type: 'number', min: 0, step: 0.1 },
          { key: 'litros_t2', label: 'Litros Tanque 2', type: 'number', min: 0, step: 0.1 },
        ]}
        initialValues={{ proveedor: editCarga?.proveedor ?? '', litros_t1: editCarga?.litros_t1 ?? 0, litros_t2: editCarga?.litros_t2 ?? 0 }}
        onSave={handleSaveEditCarga}
        onCancel={() => setEditCarga(null)}
      />
    </div>
  )
}
