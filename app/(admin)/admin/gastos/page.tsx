'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { formatFecha, formatQ, getTodayString } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Gasto {
  id: string; fecha: string; categoriaId: string; categoriaNombre: string
  descripcion: string; monto: number; ivaIncluido: boolean
  usuarioNombre: string; comprobanteUrl: string
}

interface GastosRango {
  gastos: Gasto[]
  total: number
  desglose: { categoria: string; total: number }[]
}

export default function GastosPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const today = getTodayString()
  const [inicio, setInicio] = useState(today.slice(0, 8) + '01')
  const [fin, setFin] = useState(today)
  const [data, setData] = useState<GastosRango | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!token) return
    setLoading(true)
    const res = await apiCall<GastosRango>('getGastosPorRango', { fechaInicio: inicio, fechaFin: fin }, token)
    if (res.success && res.data) setData(res.data)
    else toast.error('Error cargando gastos')
    setLoading(false)
  }

  useEffect(() => { load() }, [token, inicio, fin])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return
    const res = await apiCall('deleteGasto', { id }, token)
    if (res.success) { toast.success('Gasto eliminado'); load() }
    else toast.error(res.error || 'Error')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Gastos Operativos</h1>
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

      {data && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card border-danger-200 bg-danger-50">
            <p className="text-xs text-danger-600 font-medium">Total Gastos</p>
            <p className="text-2xl font-bold font-mono text-danger-800">{formatQ(data.total)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-500 font-medium mb-2">Por categoría</p>
            <div className="space-y-1">
              {data.desglose.map(d => (
                <div key={d.categoria} className="flex justify-between text-sm">
                  <span className="text-slate-600">{d.categoria}</span>
                  <span className="font-mono font-medium">{formatQ(d.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full" />)}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th className="text-right">Monto</th>
                <th>IVA</th>
                <th>Registrado por</th>
                <th>Comprobante</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data?.gastos ?? []).map(g => (
                <tr key={g.id}>
                  <td className="whitespace-nowrap">{formatFecha(g.fecha)}</td>
                  <td><span className="badge-slate">{g.categoriaNombre}</span></td>
                  <td className="max-w-[160px] truncate">{g.descripcion}</td>
                  <td className="text-right font-mono font-semibold">{formatQ(g.monto)}</td>
                  <td className="text-center">{g.ivaIncluido ? '✓' : '—'}</td>
                  <td className="text-xs text-slate-400">{g.usuarioNombre}</td>
                  <td>
                    {g.comprobanteUrl
                      ? <a href={g.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">Ver</a>
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td>
                    <button onClick={() => handleDelete(g.id)} className="p-1.5 text-danger-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {(data?.gastos?.length ?? 0) === 0 && (
                <tr><td colSpan={8} className="text-center text-slate-400 py-6">Sin gastos en el rango seleccionado</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
