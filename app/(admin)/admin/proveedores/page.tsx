'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Loader2, Truck, ToggleLeft, ToggleRight, AlertCircle, Trash2, Key, Copy, X } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { ModalConfirmar } from '@/components/ModalConfirmar'
import toast from 'react-hot-toast'

interface Proveedor {
  id: string
  nombre: string
  activo: boolean
  aplicaIVA: boolean
  frecuenciaPago: string
  diaCorte: number
}

interface AccesoPortal {
  code: string
  token: string
}

const DIAS_SEMANA = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
]

export default function ProveedoresPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)

  // Add form
  const [nombre, setNombre] = useState('')
  const [aplicaIVA, setAplicaIVA] = useState(true)
  const [frecuenciaPago, setFrecuenciaPago] = useState('quincenal')
  const [diaCorte, setDiaCorte] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Row actions
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleteProveedor, setDeleteProveedor] = useState<Proveedor | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Portal codes
  const [accesos, setAccesos] = useState<Record<string, AccesoPortal>>({})
  const [generandoAcceso, setGenerandoAcceso] = useState<string | null>(null)
  const [accesoVisible, setAccesoVisible] = useState<string | null>(null)

  async function load() {
    if (!token) return
    const [pRes, aRes] = await Promise.all([
      apiCall<Proveedor[]>('getProveedores', {}, token),
      apiCall<{ id: string; proveedorId: string; codigoAcceso: string; linkToken: string; activo: boolean }[]>(
        'getAccesosProveedores', {}, token
      ),
    ])
    if (pRes.success && pRes.data) setProveedores(pRes.data)
    if (aRes.success && aRes.data) {
      const map: Record<string, AccesoPortal> = {}
      for (const a of aRes.data) {
        if (a.activo) map[a.proveedorId] = { code: a.codigoAcceso, token: a.linkToken }
      }
      setAccesos(map)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setNombre('')
    setAplicaIVA(true)
    setFrecuenciaPago('quincenal')
    setDiaCorte(1)
    setError('')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('Ingresá un nombre'); return }
    setSaving(true)
    setError('')
    try {
      const res = await apiCall('saveProveedor', {
        nombre: nombre.trim(),
        aplicaIVA,
        frecuenciaPago,
        diaCorte: frecuenciaPago === 'semanal' ? diaCorte : 1,
      }, token)
      if (res.success) {
        toast.success('Proveedor agregado')
        resetForm()
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

  async function handleDelete() {
    if (!deleteProveedor || !token) return
    setDeleting(true)
    try {
      const res = await apiCall('deleteProveedor', { id: deleteProveedor.id }, token)
      if (res.success) {
        toast.success('Proveedor eliminado')
        setDeleteProveedor(null)
        load()
      } else {
        toast.error(res.error ?? 'Error al eliminar')
      }
    } finally {
      setDeleting(false)
    }
  }

  async function handleGenerarAcceso(p: Proveedor) {
    setGenerandoAcceso(p.id)
    try {
      const res = await apiCall<{ id: string; codigoAcceso: string; linkToken: string }>(
        'generarAccesoProveedor',
        { proveedorId: p.id, proveedorNombre: p.nombre },
        token
      )
      if (res.success && res.data) {
        const newAcceso: AccesoPortal = { code: res.data.codigoAcceso, token: res.data.linkToken }
        setAccesos(prev => ({ ...prev, [p.id]: newAcceso }))
        setAccesoVisible(p.id)
        toast.success('Acceso generado')
      } else {
        toast.error(res.error ?? 'Error al generar acceso')
      }
    } finally {
      setGenerandoAcceso(null)
    }
  }

  function portalUrl(provId: string) {
    const a = accesos[provId]
    if (!a || typeof window === 'undefined') return ''
    return `${window.location.origin}/portal/${a.token}`
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado'))
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
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Facturación IVA</label>
              <div className="flex gap-4 mt-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-700">
                  <input
                    type="radio"
                    name="aplicaIVA"
                    checked={aplicaIVA === true}
                    onChange={() => setAplicaIVA(true)}
                    className="accent-primary-600"
                    disabled={saving}
                  />
                  Con IVA
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-700">
                  <input
                    type="radio"
                    name="aplicaIVA"
                    checked={aplicaIVA === false}
                    onChange={() => setAplicaIVA(false)}
                    className="accent-primary-600"
                    disabled={saving}
                  />
                  Sin IVA
                </label>
              </div>
            </div>

            <div>
              <label className="label">Frecuencia de pago</label>
              <select
                className="input"
                value={frecuenciaPago}
                onChange={e => setFrecuenciaPago(e.target.value)}
                disabled={saving}
              >
                <option value="quincenal">Quincenal</option>
                <option value="semanal">Semanal</option>
              </select>
            </div>
          </div>

          {frecuenciaPago === 'semanal' && (
            <div>
              <label className="label">Día de inicio de semana</label>
              <select
                className="input"
                value={diaCorte}
                onChange={e => setDiaCorte(Number(e.target.value))}
                disabled={saving}
              >
                {DIAS_SEMANA.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar proveedor
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
                className={`flex flex-col transition-opacity ${!p.activo ? 'opacity-50' : ''}`}
              >
                {/* Row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${p.activo ? 'bg-success-500' : 'bg-slate-300'}`} />
                    <div className="min-w-0">
                      <span className={`text-sm font-medium ${!p.activo ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {p.nombre}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {!p.activo && <span className="badge-slate text-xs">Inactivo</span>}
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                          {p.aplicaIVA ? 'Con IVA' : 'Sin IVA'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          p.frecuenciaPago === 'semanal'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.frecuenciaPago === 'semanal'
                            ? `Semanal (${DIAS_SEMANA.find(d => d.value === p.diaCorte)?.label ?? 'Lunes'})`
                            : 'Quincenal'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Portal key button */}
                    <button
                      onClick={() => {
                        if (accesoVisible === p.id) {
                          setAccesoVisible(null)
                        } else if (accesos[p.id]) {
                          setAccesoVisible(p.id)
                        } else {
                          handleGenerarAcceso(p)
                        }
                      }}
                      disabled={generandoAcceso === p.id}
                      className="btn-ghost btn-icon"
                      aria-label="Portal proveedor"
                      title={accesos[p.id] ? 'Ver acceso portal' : 'Generar acceso portal'}
                    >
                      {generandoAcceso === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <Key className={`w-4 h-4 ${accesos[p.id] ? 'text-amber-500' : 'text-slate-400'}`} />
                      )}
                    </button>

                    {/* Toggle active */}
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

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteProveedor(p)}
                      className="btn-ghost btn-icon hover:bg-danger-50"
                      aria-label="Eliminar proveedor"
                      title="Eliminar proveedor"
                    >
                      <Trash2 className="w-4 h-4 text-danger-500" />
                    </button>
                  </div>
                </div>

                {/* Portal access reveal */}
                {accesoVisible === p.id && accesos[p.id] && (
                  <div className="mx-4 mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-amber-800">Acceso al portal del proveedor</span>
                      <button
                        onClick={() => setAccesoVisible(null)}
                        className="btn-ghost btn-icon p-0.5"
                        aria-label="Cerrar"
                      >
                        <X className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>

                    {/* Code row */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-12 shrink-0">Código:</span>
                      <span className="font-mono text-2xl font-bold text-slate-800 tracking-widest">
                        {accesos[p.id].code}
                      </span>
                      <button
                        onClick={() => copyText(accesos[p.id].code)}
                        className="btn-ghost btn-icon p-1"
                        title="Copiar código"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleGenerarAcceso(p)}
                        disabled={generandoAcceso === p.id}
                        className="ml-auto text-xs text-amber-700 hover:underline disabled:opacity-50"
                      >
                        Regenerar
                      </button>
                    </div>

                    {/* URL row */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-12 shrink-0">URL:</span>
                      <span className="text-xs font-mono text-slate-600 truncate flex-1">
                        {portalUrl(p.id)}
                      </span>
                      <button
                        onClick={() => copyText(portalUrl(p.id))}
                        className="btn-ghost btn-icon p-1 shrink-0"
                        title="Copiar URL"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <ModalConfirmar
        open={!!deleteProveedor}
        title="Eliminar proveedor"
        message={`¿Eliminar el proveedor "${deleteProveedor?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteProveedor(null)}
        loading={deleting}
      />
    </div>
  )
}
