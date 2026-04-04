'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Loader2, Truck, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'
import { apiCall } from '@/lib/api'
import toast from 'react-hot-toast'

interface Proveedor {
  id: string
  nombre: string
  activo: boolean
}

export default function ProveedoresPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    if (!token) return
    const res = await apiCall<Proveedor[]>('getProveedores', {}, token)
    if (res.success && res.data) setProveedores(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [token])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('Ingresá un nombre'); return }
    setSaving(true)
    setError('')
    try {
      const res = await apiCall('saveProveedor', { nombre: nombre.trim() }, token)
      if (res.success) {
        toast.success('Proveedor agregado')
        setNombre('')
        load()
      } else {
        toast.error(res.error ?? 'Error al agregar')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(p: Proveedor) {
    setToggling(p.id)
    try {
      const res = await apiCall('toggleProveedor', { id: p.id }, token)
      if (res.success) {
        toast.success(p.activo ? 'Proveedor desactivado' : 'Proveedor activado')
        load()
      } else {
        toast.error(res.error ?? 'Error')
      }
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Proveedores</h1>
        <p className="text-sm text-slate-500 mt-1">Administrá los proveedores disponibles para registrar cargas</p>
      </div>

      {/* Add form */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Agregar proveedor</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError('') }}
              className={`input ${error ? 'input-error' : ''}`}
              placeholder="Nombre del proveedor"
              disabled={saving}
            />
            {error && <p className="error-msg mt-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          </div>
          <button type="submit" className="btn-primary shrink-0" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:block">Agregar</span>
          </button>
        </form>
      </div>

      {/* List */}
      <div className="card p-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Lista de proveedores</h2>
          <span className="badge-slate">{proveedores.length}</span>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        ) : proveedores.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-slate-400">
            <Truck className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No hay proveedores registrados</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {proveedores.map(p => (
              <li
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 transition-opacity ${!p.activo ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${p.activo ? 'bg-success-500' : 'bg-slate-300'}`} />
                  <span className={`text-sm font-medium ${!p.activo ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {p.nombre}
                  </span>
                  {!p.activo && <span className="badge-slate text-xs">Inactivo</span>}
                </div>
                <button
                  onClick={() => handleToggle(p)}
                  disabled={toggling === p.id}
                  className="btn-ghost btn-icon"
                  aria-label={p.activo ? 'Desactivar' : 'Activar'}
                  title={p.activo ? 'Desactivar' : 'Activar'}
                >
                  {toggling === p.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : p.activo ? (
                    <ToggleRight className="w-5 h-5 text-success-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
