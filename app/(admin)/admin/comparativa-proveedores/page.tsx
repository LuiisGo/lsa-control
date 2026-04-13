'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { RefreshCw } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { getTodayString } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ComparativaRow {
  nombre: string; totalLitros: number; totalEntregas: number
  diasActivos: number; promLitrosDia: number; participacionPct: number
}

export default function ComparativaProveedoresPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const today = getTodayString()
  const [inicio, setInicio] = useState(today.slice(0, 8) + '01')
  const [fin, setFin] = useState(today)
  const [data, setData] = useState<ComparativaRow[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!token) return
    setLoading(true)
    const res = await apiCall<ComparativaRow[]>('getComparativaProveedores', { fechaInicio: inicio, fechaFin: fin }, token)
    if (res.success && res.data) setData(res.data)
    else toast.error('Error cargando datos')
    setLoading(false)
  }

  useEffect(() => { load() }, [token, inicio, fin])

  const totalLitros = data.reduce((s, r) => s + r.totalLitros, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Comparativa de Proveedores</h1>
        <button onClick={load} className="btn-ghost btn-icon"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Desde</label>
          <input type="date" className="input" value={inicio} onChange={e => setInicio(e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" className="input" value={fin} onChange={e => setFin(e.target.value)} />
        </div>
      </div>

      {totalLitros > 0 && (
        <div className="card border-primary-200 bg-primary-50">
          <p className="text-xs text-primary-600">Total recepcionado en el período</p>
          <p className="text-2xl font-bold font-mono text-primary-900">{totalLitros.toFixed(1)} L</p>
        </div>
      )}

      {/* Barras de participación */}
      {data.length > 0 && (
        <div className="card space-y-3">
          <h2 className="section-title">Participación por Proveedor</h2>
          {data.map(r => (
            <div key={r.nombre}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{r.nombre}</span>
                <span className="text-slate-500">{r.totalLitros.toFixed(1)} L — {r.participacionPct.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${r.participacionPct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full" />)}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Proveedor</th>
                <th className="text-right">Litros</th>
                <th className="text-right">Entregas</th>
                <th className="text-right">Días activos</th>
                <th className="text-right">L/día prom.</th>
                <th className="text-right">Participación</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={r.nombre}>
                  <td className="text-slate-400">{i + 1}</td>
                  <td className="font-medium">{r.nombre}</td>
                  <td className="text-right font-mono">{r.totalLitros.toFixed(1)}</td>
                  <td className="text-right">{r.totalEntregas}</td>
                  <td className="text-right">{r.diasActivos}</td>
                  <td className="text-right font-mono">{r.promLitrosDia.toFixed(1)}</td>
                  <td className="text-right">
                    <span className="badge-slate">{r.participacionPct.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">Sin datos para el rango seleccionado</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
