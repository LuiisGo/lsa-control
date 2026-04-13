'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { RefreshCw, Pencil, Check, X } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { formatFecha, formatQ, getTodayString } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Envio {
  id: string; fecha: string; compradorId: string; compradorNombre: string
  litrosEnviados: number; montoTotal: number; notas: string
  usuarioNombre: string; timestamp: string
}

export default function EnviosPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [fecha, setFecha] = useState(getTodayString())
  const [envios, setEnvios] = useState<Envio[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Envio>>({})

  async function loadEnvios() {
    if (!token) return
    setLoading(true)
    const res = await apiCall<Envio[]>('getEnviosPorFecha', { fecha }, token)
    if (res.success && res.data) setEnvios(res.data)
    else toast.error('Error al cargar envíos')
    setLoading(false)
  }

  useEffect(() => { loadEnvios() }, [token, fecha])

  async function handleEdit(id: string) {
    const res = await apiCall('editarEnvio', { id, ...editData }, token)
    if (res.success) {
      toast.success('Envío actualizado')
      setEditingId(null)
      loadEnvios()
    } else toast.error(res.error || 'Error')
  }

  const total = envios.reduce((s, e) => s + e.montoTotal, 0)
  const totalL = envios.reduce((s, e) => s + e.litrosEnviados, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Envíos</h1>
        <button onClick={loadEnvios} className="btn-ghost btn-icon"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="flex items-center gap-3">
        <input type="date" className="input max-w-[160px]" value={fecha} onChange={e => setFecha(e.target.value)} />
        <span className="text-sm text-slate-500">{envios.length} envíos</span>
      </div>

      {/* Totales */}
      {envios.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-xs text-slate-500">Litros enviados</p>
            <p className="font-bold font-mono text-lg">{totalL.toFixed(1)} L</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-500">Ingresos</p>
            <p className="font-bold font-mono text-lg text-success-700">{formatQ(total)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-500">Q/Litro prom.</p>
            <p className="font-bold font-mono text-lg">{totalL > 0 ? (total / totalL).toFixed(4) : '—'}</p>
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
                <th>Comprador</th>
                <th className="text-right">Litros</th>
                <th className="text-right">Monto</th>
                <th className="text-right">Q/L</th>
                <th>Notas</th>
                <th>Registrado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {envios.map(e => (
                <tr key={e.id}>
                  <td className="font-medium">{e.compradorNombre}</td>
                  <td className="text-right font-mono">
                    {editingId === e.id
                      ? <input type="number" step="0.1" className="input w-24 text-right" value={editData.litrosEnviados ?? e.litrosEnviados} onChange={ev => setEditData(d => ({ ...d, litrosEnviados: parseFloat(ev.target.value) }))} />
                      : `${e.litrosEnviados.toFixed(1)}`
                    }
                  </td>
                  <td className="text-right font-mono">
                    {editingId === e.id
                      ? <input type="number" step="0.01" className="input w-28 text-right" value={editData.montoTotal ?? e.montoTotal} onChange={ev => setEditData(d => ({ ...d, montoTotal: parseFloat(ev.target.value) }))} />
                      : formatQ(e.montoTotal)
                    }
                  </td>
                  <td className="text-right font-mono text-xs text-slate-500">
                    {e.litrosEnviados > 0 ? (e.montoTotal / e.litrosEnviados).toFixed(4) : '—'}
                  </td>
                  <td className="text-slate-500 text-sm max-w-[120px] truncate">
                    {editingId === e.id
                      ? <input type="text" className="input" value={editData.notas ?? e.notas} onChange={ev => setEditData(d => ({ ...d, notas: ev.target.value }))} />
                      : e.notas || '—'
                    }
                  </td>
                  <td className="text-xs text-slate-400">{e.usuarioNombre}</td>
                  <td>
                    {editingId === e.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(e.id)} className="p-1.5 text-success-600 hover:bg-success-50 rounded-lg"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-danger-600 hover:bg-danger-50 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(e.id); setEditData({}) }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
              {envios.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">Sin envíos en esta fecha</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
