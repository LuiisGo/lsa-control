'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Tag } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { formatFecha } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Proveedor { id: string; nombre: string; activo: boolean }
interface Tarifa { id: string; proveedorId: string; proveedorNombre: string; precioLitro: number; vigenteDesde: string; activo: boolean }

export default function TarifasPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [loading, setLoading] = useState(true)

  const [proveedorId, setProveedorId] = useState('')
  const [precio, setPrecio] = useState('')
  const [vigenteDesde, setVigenteDesde] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!token) return
    setLoading(true)
    const [pRes, tRes] = await Promise.all([
      apiCall<Proveedor[]>('getProveedores', {}, token),
      apiCall<Tarifa[]>('getAllTarifas', {}, token),
    ])
    if (pRes.success && pRes.data) setProveedores(pRes.data.filter(p => p.activo))
    if (tRes.success && tRes.data) setTarifas(tRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [token])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const precioNum = parseFloat(precio)
    if (!proveedorId || !precioNum || precioNum <= 0) return toast.error('Datos inválidos')
    const prov = proveedores.find(p => p.id === proveedorId)
    if (!prov) return

    setSaving(true)
    const res = await apiCall('saveTarifa', { proveedorId, proveedorNombre: prov.nombre, precioLitro: precioNum, vigenteDesde }, token)
    if (res.success) {
      toast.success('Tarifa guardada — tarifa anterior desactivada')
      setPrecio('')
      load()
    } else toast.error(res.error || 'Error')
    setSaving(false)
  }

  // Group tarifas by proveedor
  const tarifasByProv = tarifas.reduce<Record<string, Tarifa[]>>((acc, t) => {
    if (!acc[t.proveedorNombre]) acc[t.proveedorNombre] = []
    acc[t.proveedorNombre].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Tarifas de Proveedores</h1>

      <form onSubmit={handleSave} className="card space-y-4">
        <h2 className="section-title">Nueva Tarifa</h2>
        <p className="text-sm text-slate-500">Al guardar, la tarifa anterior del proveedor se desactiva automáticamente.</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Proveedor</label>
            <select className="input" value={proveedorId} onChange={e => setProveedorId(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Q/Litro</label>
            <input type="number" step="0.0001" min="0" className="input" placeholder="0.0000" value={precio} onChange={e => setPrecio(e.target.value)} required />
          </div>
          <div>
            <label className="label">Vigente desde</label>
            <input type="date" className="input" value={vigenteDesde} onChange={e => setVigenteDesde(e.target.value)} required />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar Tarifa'}
        </button>
      </form>

      {/* Lista por proveedor */}
      <div className="space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton h-24 w-full rounded-xl" />)
        ) : Object.keys(tarifasByProv).map(provNombre => (
          <div key={provNombre} className="card">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-primary-600" />
              <h3 className="font-semibold text-slate-800">{provNombre}</h3>
            </div>
            <table className="table">
              <thead>
                <tr><th>Vigente desde</th><th className="text-right">Q/Litro</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {tarifasByProv[provNombre].sort((a, b) => b.vigenteDesde > a.vigenteDesde ? 1 : -1).map(t => (
                  <tr key={t.id}>
                    <td>{formatFecha(t.vigenteDesde)}</td>
                    <td className="text-right font-mono font-semibold">{t.precioLitro.toFixed(4)}</td>
                    <td>{t.activo ? <span className="badge-success">Activa</span> : <span className="badge-slate">Inactiva</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {!loading && Object.keys(tarifasByProv).length === 0 && (
          <p className="text-center text-slate-400 py-8">Sin tarifas registradas</p>
        )}
      </div>
    </div>
  )
}
