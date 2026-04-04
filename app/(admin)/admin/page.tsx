'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { RefreshCw, Droplets, TrendingUp, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { TarjetaMetrica } from '@/components/TarjetaMetrica'
import { TablaCargas, type Carga } from '@/components/TablaCargas'
import { GraficaBarras, type DatoGrafica } from '@/components/GraficaBarras'
import { GraficaLineas, type DatoLinea } from '@/components/GraficaLineas'
import { ModalEditar } from '@/components/ModalEditar'
import {
  formatLitros,
  formatLitrosNum,
  formatFecha,
  getDiferenciaColor,
  formatPorcentaje,
  downloadCSV,
  buildCSV,
} from '@/lib/utils'
import toast from 'react-hot-toast'

interface DashboardHoy {
  totalT1: number
  totalT2: number
  total: number
  medicion: {
    litros_real_t1: number
    litros_real_t2: number
    total_real: number
    diferencia_litros: number
    diferencia_pct: number
  } | null
  cargas: Carga[]
}

interface DatoQuincena {
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

interface Quincena {
  nombre: string
  inicio: string
  fin: string
  total_recepcionado: number
  total_enviado: number
  datos: DatoQuincena[]
}

interface DatoComparativa {
  fecha: string
  carga_total: number
  real_total: number
  diferencia: number
  diferencia_pct: number
  estado: string
}

function TablaQuincena({ datos }: { datos: DatoQuincena[] }) {
  if (!datos.length) return <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p>

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th className="text-right">T1</th>
            <th className="text-right">T2</th>
            <th className="text-right">Total</th>
            <th className="text-right">Real T1</th>
            <th className="text-right">Real T2</th>
            <th className="text-right">Real Total</th>
            <th className="text-right">Dif L</th>
            <th className="text-right">Dif %</th>
            <th className="text-right">Pipa</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d: DatoQuincena) => (
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

export default function AdminDashboardPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [hoy, setHoy] = useState<DashboardHoy | null>(null)
  const [quincena, setQuincena] = useState<Quincena | null>(null)
  const [quincenaAnterior, setQuincenaAnterior] = useState<Quincena | null>(null)
  const [comparativa, setComparativa] = useState<DatoComparativa[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [editCarga, setEditCarga] = useState<Carga | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        apiCall<DashboardHoy>('getDashboardHoy', {}, token),
        apiCall<Quincena>('getQuincena', {}, token),
        apiCall<Quincena>('getQuincenaAnterior', {}, token),
        apiCall<DatoComparativa[]>('getComparativa', {}, token),
      ])
      if (r1.success && r1.data) setHoy(r1.data)
      if (r2.success && r2.data) setQuincena(r2.data)
      if (r3.success && r3.data) setQuincenaAnterior(r3.data)
      if (r4.success && r4.data) setComparativa(r4.data)
      setLastUpdate(new Date().toLocaleTimeString('es-GT'))
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  async function handleSaveEditCarga(values: Record<string, string | number>) {
    if (!editCarga || !token) return
    const res = await apiCall('editarCarga', {
      id: editCarga.id,
      proveedor: values.proveedor,
      litros_t1: values.litros_t1,
      litros_t2: values.litros_t2,
    }, token)
    if (res.success) {
      toast.success('Carga actualizada')
      setEditCarga(null)
      load()
    } else {
      toast.error(res.error ?? 'Error al actualizar')
    }
  }

  function exportarQuincena(q: Quincena) {
    const csv = buildCSV(q.datos, [
      { key: 'fecha', label: 'Fecha' },
      { key: 'carga_t1', label: 'Carga T1 (L)' },
      { key: 'carga_t2', label: 'Carga T2 (L)' },
      { key: 'total_carga', label: 'Total Carga (L)' },
      { key: 'real_t1', label: 'Real T1 (L)' },
      { key: 'real_t2', label: 'Real T2 (L)' },
      { key: 'total_real', label: 'Total Real (L)' },
      { key: 'dif_litros', label: 'Dif Litros' },
      { key: 'dif_pct', label: 'Dif %' },
      { key: 'pipa', label: 'Envio Pipa (L)' },
    ])
    downloadCSV(csv, `LSA_${q.nombre.replace(/\s/g, '_')}.csv`)
  }

  const graficaDatos = (datos: DatoQuincena[]): DatoGrafica[] =>
    datos.map(d => ({ fecha: d.fecha, carga: d.total_carga, real: d.total_real }))

  const comparativaDatos = comparativa.map(d => ({
    fecha: d.fecha,
    carga: d.carga_total,
    real: d.real_total,
  })) as DatoLinea[]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          {lastUpdate && <p className="text-xs text-slate-400 mt-0.5">Actualizado: {lastUpdate}</p>}
        </div>
        <button
          onClick={() => { setLoading(true); load() }}
          className="btn-secondary gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:block">Actualizar</span>
        </button>
      </div>

      {/* === SECCIÓN HOY === */}
      <section>
        <h2 className="section-title flex items-center gap-2">
          <Droplets className="w-4 h-4 text-primary-600" />
          Hoy
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <TarjetaMetrica titulo="Tanque 1" valor={loading ? '...' : formatLitrosNum(hoy?.totalT1 ?? 0)} subtitulo="litros" isLoading={loading} />
          <TarjetaMetrica titulo="Tanque 2" valor={loading ? '...' : formatLitrosNum(hoy?.totalT2 ?? 0)} subtitulo="litros" isLoading={loading} />
          <TarjetaMetrica titulo="Total hoy" valor={loading ? '...' : formatLitrosNum(hoy?.total ?? 0)} subtitulo="litros" variant="primary" isLoading={loading} />
          <TarjetaMetrica titulo="Dato pipa mañana" valor={loading ? '...' : formatLitrosNum(hoy?.total ?? 0)} subtitulo="litros (=total hoy)" variant="primary" isLoading={loading} />
        </div>

        {/* Medición */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Medición del día</p>
            {!loading && (
              hoy?.medicion
                ? <span className="badge-success"><CheckCircle2 className="w-3 h-3" />Registrada</span>
                : <span className="badge-danger"><AlertTriangle className="w-3 h-3" />Pendiente</span>
            )}
          </div>
          {loading ? (
            <div className="skeleton h-12 w-full" />
          ) : hoy?.medicion ? (
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

        {/* Cargas tabla */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cargas del día</p>
          <TablaCargas
            cargas={hoy?.cargas ?? []}
            showActions
            onEdit={setEditCarga}
            isLoading={loading}
          />
        </div>
      </section>

      {/* === QUINCENA ACTUAL === */}
      {quincena && (
        <section>
          <h2 className="section-title flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-600" />
            {quincena.nombre}
            <span className="text-sm font-normal text-slate-400">
              {formatFecha(quincena.inicio)} — {formatFecha(quincena.fin)}
            </span>
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <TarjetaMetrica titulo="Total recepcionado" valor={formatLitrosNum(quincena.total_recepcionado)} subtitulo="litros" variant="primary" />
            <TarjetaMetrica titulo="Total enviado" valor={formatLitrosNum(quincena.total_enviado)} subtitulo="litros" variant="success" />
          </div>

          <GraficaBarras datos={graficaDatos(quincena.datos)} titulo="Recepcionado vs Medición" />

          <div className="mt-4">
            <TablaQuincena datos={quincena.datos} />
          </div>
        </section>
      )}

      {/* === QUINCENA ANTERIOR === */}
      {quincenaAnterior && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              {quincenaAnterior.nombre}
              <span className="text-sm font-normal text-slate-400">
                {formatFecha(quincenaAnterior.inicio)} — {formatFecha(quincenaAnterior.fin)}
              </span>
            </h2>
            <button
              onClick={() => exportarQuincena(quincenaAnterior)}
              className="btn-secondary gap-2 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <TarjetaMetrica titulo="Total recepcionado" valor={formatLitrosNum(quincenaAnterior.total_recepcionado)} subtitulo="litros" />
            <TarjetaMetrica titulo="Total enviado" valor={formatLitrosNum(quincenaAnterior.total_enviado)} subtitulo="litros" />
          </div>

          <GraficaBarras datos={graficaDatos(quincenaAnterior.datos)} />

          <div className="mt-4">
            <TablaQuincena datos={quincenaAnterior.datos} />
          </div>
        </section>
      )}

      {/* === COMPARATIVA === */}
      {comparativa.length > 0 && (
        <section>
          <h2 className="section-title">Comparativa histórica</h2>
          <GraficaLineas datos={comparativaDatos} titulo="Carga vs Medición real" />
          <div className="mt-4 table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="text-right">Carga</th>
                  <th className="text-right">Real</th>
                  <th className="text-right">Diferencia</th>
                  <th className="text-right">%</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {comparativa.map(d => (
                  <tr key={d.fecha}>
                    <td className="font-mono text-xs">{formatFecha(d.fecha)}</td>
                    <td className="text-right font-mono text-xs">{formatLitros(d.carga_total)}</td>
                    <td className="text-right font-mono text-xs">{formatLitros(d.real_total)}</td>
                    <td className={`text-right font-mono text-xs ${getDiferenciaColor(d.diferencia_pct)}`}>
                      {d.diferencia >= 0 ? '+' : ''}{formatLitros(d.diferencia)}
                    </td>
                    <td className={`text-right font-mono text-xs ${getDiferenciaColor(d.diferencia_pct)}`}>
                      {formatPorcentaje(d.diferencia_pct)}
                    </td>
                    <td>
                      <span className={
                        Math.abs(d.diferencia_pct) <= 1 ? 'badge-success' :
                        Math.abs(d.diferencia_pct) <= 2 ? 'badge-warning' : 'badge-danger'
                      }>
                        {d.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Edit Carga Modal */}
      <ModalEditar
        open={!!editCarga}
        title="Editar carga"
        fields={[
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: true },
          { key: 'litros_t1', label: 'Litros Tanque 1', type: 'number', min: 0, step: 0.1 },
          { key: 'litros_t2', label: 'Litros Tanque 2', type: 'number', min: 0, step: 0.1 },
        ]}
        initialValues={{
          proveedor: editCarga?.proveedor ?? '',
          litros_t1: editCarga?.litros_t1 ?? 0,
          litros_t2: editCarga?.litros_t2 ?? 0,
        }}
        onSave={handleSaveEditCarga}
        onCancel={() => setEditCarga(null)}
      />
    </div>
  )
}
