'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Plus, ToggleLeft, ToggleRight, Save } from 'lucide-react'
import { apiCall } from '@/lib/api'
import toast from 'react-hot-toast'

interface Alerta {
  id: string; tipo: string; descripcion: string
  umbral: number; emails: string; activo: boolean
}

const TIPOS = [
  { value: 'TANQUE_MINIMO', label: 'Tanque Mínimo', hint: 'Se dispara cuando el total de litros del día baja del umbral (en litros)' },
  { value: 'DIFERENCIA_ALTA', label: 'Diferencia Alta', hint: 'Se dispara cuando la diferencia carga vs medición supera el umbral (en %)' },
]

export default function AlertasPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  // Form nueva alerta
  const [tipo, setTipo] = useState('TANQUE_MINIMO')
  const [descripcion, setDescripcion] = useState('')
  const [umbral, setUmbral] = useState('')
  const [emails, setEmails] = useState('')
  const [saving, setSaving] = useState(false)

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Alerta>>({})

  async function load() {
    if (!token) return
    const res = await apiCall<Alerta[]>('getAlertasConfig', {}, token)
    if (res.success && res.data) setAlertas(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [token])

  async function handleToggle(id: string) {
    const res = await apiCall('toggleAlerta', { id }, token)
    if (res.success) { setAlertas(as => as.map(a => a.id === id ? { ...a, activo: !a.activo } : a)); toast.success('Estado actualizado') }
    else toast.error('Error')
  }

  async function handleSaveNew(e: React.FormEvent) {
    e.preventDefault()
    if (!umbral || !emails) return toast.error('Todos los campos son requeridos')
    setSaving(true)
    const res = await apiCall('saveAlertaConfig', { tipo, descripcion, umbral: parseFloat(umbral), emails }, token)
    if (res.success) { toast.success('Alerta creada'); setDescripcion(''); setUmbral(''); setEmails(''); load() }
    else toast.error(res.error || 'Error')
    setSaving(false)
  }

  async function handleSaveEdit(id: string) {
    const res = await apiCall('saveAlertaConfig', { id, ...editData }, token)
    if (res.success) { toast.success('Alerta actualizada'); setEditId(null); load() }
    else toast.error(res.error || 'Error')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-bold text-slate-800">Configuración de Alertas</h1>
      </div>
      <p className="text-sm text-slate-500">Las alertas envían notificaciones por email cuando se superan los umbrales configurados.</p>

      {/* Nueva alerta */}
      <form onSubmit={handleSaveNew} className="card space-y-4">
        <h2 className="section-title">Nueva Alerta</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">{TIPOS.find(t => t.value === tipo)?.hint}</p>
          </div>
          <div>
            <label className="label">Umbral {tipo === 'TANQUE_MINIMO' ? '(litros)' : '(%)'}</label>
            <input type="number" step="0.1" min="0" className="input" placeholder={tipo === 'TANQUE_MINIMO' ? '500' : '2'} value={umbral} onChange={e => setUmbral(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Descripción</label>
          <input type="text" className="input" placeholder="Descripción corta..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        </div>
        <div>
          <label className="label">Emails (separados por coma)</label>
          <input type="text" className="input" placeholder="gerente@empresa.com, admin@empresa.com" value={emails} onChange={e => setEmails(e.target.value)} required />
        </div>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {saving ? 'Creando...' : 'Crear Alerta'}
        </button>
      </form>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          [1,2].map(i => <div key={i} className="skeleton h-24 w-full rounded-xl" />)
        ) : alertas.map(a => (
          <div key={a.id} className={`card border ${a.activo ? 'border-success-200' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-slate text-xs">{TIPOS.find(t => t.value === a.tipo)?.label ?? a.tipo}</span>
                  {a.activo ? <span className="badge-success text-xs">Activa</span> : <span className="text-xs text-slate-400">Inactiva</span>}
                </div>
                {editId === a.id ? (
                  <div className="space-y-2 mt-2">
                    <input type="text" className="input text-sm" value={editData.descripcion ?? a.descripcion} onChange={e => setEditData(d => ({ ...d, descripcion: e.target.value }))} placeholder="Descripción" />
                    <div className="flex gap-2">
                      <input type="number" step="0.1" className="input text-sm" value={editData.umbral ?? a.umbral} onChange={e => setEditData(d => ({ ...d, umbral: parseFloat(e.target.value) }))} placeholder="Umbral" />
                      <input type="text" className="input text-sm" value={editData.emails ?? a.emails} onChange={e => setEditData(d => ({ ...d, emails: e.target.value }))} placeholder="Emails" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(a.id)} className="btn-primary text-sm flex items-center gap-1"><Save className="w-3.5 h-3.5" />Guardar</button>
                      <button onClick={() => setEditId(null)} className="btn-ghost text-sm">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {a.descripcion && <p className="text-sm text-slate-600">{a.descripcion}</p>}
                    <p className="text-sm text-slate-500 mt-1">
                      Umbral: <strong>{a.umbral} {a.tipo === 'TANQUE_MINIMO' ? 'L' : '%'}</strong> · Emails: <span className="text-primary-600">{a.emails}</span>
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {editId !== a.id && (
                  <button onClick={() => { setEditId(a.id); setEditData({}) }} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100">Editar</button>
                )}
                <button onClick={() => handleToggle(a.id)} className={`p-1 rounded-lg transition-colors ${a.activo ? 'text-success-600 hover:bg-success-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                  {a.activo ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && alertas.length === 0 && <p className="text-center text-slate-400 py-8">Sin alertas configuradas</p>}
      </div>
    </div>
  )
}
