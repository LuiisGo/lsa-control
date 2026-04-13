'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { formatFecha, formatQ } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Comprador { id: string; nombre: string; nit: string; activo: boolean }
interface PrecioHistorial { id: string; compradorId: string; fecha: string; precioLitro: number }

export default function CompradoresPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [compradores, setCompradores] = useState<Comprador[]>([])
  const [loading, setLoading] = useState(true)

  // Nuevo comprador
  const [nombre, setNombre] = useState('')
  const [nit, setNit] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  // Precios
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [precios, setPrecios] = useState<Record<string, PrecioHistorial[]>>({})
  const [newPrecioFecha, setNewPrecioFecha] = useState<Record<string, string>>({})
  const [newPrecioValor, setNewPrecioValor] = useState<Record<string, string>>({})
  const [savingPrecio, setSavingPrecio] = useState<Record<string, boolean>>({})

  async function loadCompradores() {
    if (!token) return
    setLoading(true)
    const res = await apiCall<Comprador[]>('getCompradores', {}, token)
    if (res.success && res.data) setCompradores(res.data)
    setLoading(false)
  }

  useEffect(() => { loadCompradores() }, [token])

  async function handleToggle(id: string) {
    const res = await apiCall('toggleComprador', { id }, token)
    if (res.success) {
      setCompradores(cs => cs.map(c => c.id === id ? { ...c, activo: !c.activo } : c))
      toast.success('Estado actualizado')
    } else toast.error('Error al actualizar')
  }

  async function handleSaveNew(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return toast.error('Nombre requerido')
    setSavingNew(true)
    const res = await apiCall('saveComprador', { nombre, nit }, token)
    if (res.success) {
      toast.success('Comprador agregado')
      setNombre(''); setNit('')
      loadCompradores()
    } else toast.error(res.error || 'Error')
    setSavingNew(false)
  }

  async function loadPrecios(compradorId: string) {
    const res = await apiCall<PrecioHistorial[]>('getPreciosHistorial', { compradorId }, token)
    if (res.success && res.data) {
      setPrecios(p => ({ ...p, [compradorId]: res.data! }))
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      loadPrecios(id)
    }
  }

  async function handleSavePrecio(compradorId: string, compradorNombre: string) {
    const fecha  = newPrecioFecha[compradorId]
    const precio = parseFloat(newPrecioValor[compradorId] || '')
    if (!fecha || !precio || precio <= 0) return toast.error('Fecha y precio requeridos')
    setSavingPrecio(s => ({ ...s, [compradorId]: true }))
    const res = await apiCall('savePrecioComprador', { compradorId, compradorNombre, fecha, precioLitro: precio }, token)
    if (res.success) {
      toast.success('Precio guardado')
      setNewPrecioFecha(f => ({ ...f, [compradorId]: '' }))
      setNewPrecioValor(v => ({ ...v, [compradorId]: '' }))
      loadPrecios(compradorId)
    } else toast.error(res.error || 'Error')
    setSavingPrecio(s => ({ ...s, [compradorId]: false }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Compradores</h1>

      {/* Nuevo comprador */}
      <form onSubmit={handleSaveNew} className="card space-y-3">
        <h2 className="section-title">Agregar Comprador</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" placeholder="Nombre del comprador" value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          <div>
            <label className="label">NIT (opcional)</label>
            <input className="input" placeholder="CF" value={nit} onChange={e => setNit(e.target.value)} />
          </div>
        </div>
        <button type="submit" disabled={savingNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {savingNew ? 'Guardando...' : 'Agregar'}
        </button>
      </form>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl" />)
        ) : compradores.map(c => (
          <div key={c.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{c.nombre}</p>
                {c.nit && <p className="text-xs text-slate-500">NIT: {c.nit}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(c.id)} className={`p-1 rounded-lg transition-colors ${c.activo ? 'text-success-600 hover:bg-success-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                  {c.activo ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
                <button onClick={() => toggleExpand(c.id)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                  {expandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Precios */}
            {expandedId === c.id && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Historial de Precios</h3>

                {/* Agregar precio */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="label">Fecha vigente</label>
                    <input type="date" className="input" value={newPrecioFecha[c.id] || ''} onChange={e => setNewPrecioFecha(f => ({ ...f, [c.id]: e.target.value }))} />
                  </div>
                  <div className="flex-1">
                    <label className="label">Q/Litro</label>
                    <input type="number" step="0.0001" min="0" className="input" placeholder="0.0000" value={newPrecioValor[c.id] || ''} onChange={e => setNewPrecioValor(v => ({ ...v, [c.id]: e.target.value }))} />
                  </div>
                  <button
                    onClick={() => handleSavePrecio(c.id, c.nombre)}
                    disabled={savingPrecio[c.id]}
                    className="btn-primary shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabla historial */}
                {(precios[c.id] ?? []).length > 0 ? (
                  <table className="table">
                    <thead><tr><th>Fecha</th><th className="text-right">Q/Litro</th></tr></thead>
                    <tbody>
                      {(precios[c.id] ?? []).map(p => (
                        <tr key={p.id}>
                          <td>{formatFecha(p.fecha)}</td>
                          <td className="text-right font-mono">{p.precioLitro.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-slate-400">Sin precios registrados</p>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && compradores.length === 0 && (
          <p className="text-center text-slate-400 py-8">No hay compradores registrados</p>
        )}
      </div>
    </div>
  )
}
