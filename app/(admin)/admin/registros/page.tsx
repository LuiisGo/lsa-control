'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Pencil, Trash2, Image as ImageIcon, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { ModalEditar } from '@/components/ModalEditar'
import { ModalConfirmar } from '@/components/ModalConfirmar'
import { formatHora, formatLitros, formatFecha, getTodayString } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Carga {
  id: string
  hora: string
  proveedor: string
  litros_t1: number
  litros_t2: number
  total: number
  foto_url?: string
}

interface Medicion {
  fecha: string
  litros_real_t1: number
  litros_real_t2: number
  total_real: number
  foto_url?: string
}

export default function RegistrosPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [fecha, setFecha] = useState(getTodayString())
  const [cargas, setCargas] = useState<Carga[]>([])
  const [medicion, setMedicion] = useState<Medicion | null>(null)
  const [loading, setLoading] = useState(false)

  const [editCarga, setEditCarga] = useState<Carga | null>(null)
  const [deleteCarga, setDeleteCarga] = useState<Carga | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editMedicion, setEditMedicion] = useState(false)
  const [confirmDeleteMedicion, setConfirmDeleteMedicion] = useState(false)
  const [deletingMedicion, setDeletingMedicion] = useState(false)

  async function load(f: string) {
    if (!token) return
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        apiCall<Carga[]>('getCargas', { fecha: f }, token),
        apiCall<Medicion>('getMedicion', { fecha: f }, token),
      ])
      if (r1.success) setCargas(r1.data ?? [])
      if (r2.success) setMedicion(r2.data ?? null)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (fecha) load(fecha) }, [token, fecha])

  async function handleSaveEditCarga(values: Record<string, string | number>) {
    if (!editCarga || !token) return
    const res = await apiCall('editarCarga', {
      id: editCarga.id, proveedor: values.proveedor, litros_t1: values.litros_t1, litros_t2: values.litros_t2,
    }, token)
    if (res.success) { toast.success('Carga actualizada'); setEditCarga(null); load(fecha) }
    else toast.error(res.error ?? 'Error')
  }

  async function handleDeleteCarga() {
    if (!deleteCarga || !token) return
    setDeleting(true)
    try {
      const res = await apiCall('deleteCarga', { id: deleteCarga.id }, token)
      if (res.success) { toast.success('Carga eliminada'); setDeleteCarga(null); load(fecha) }
      else toast.error(res.error ?? 'Error')
    } finally { setDeleting(false) }
  }

  async function handleSaveEditMedicion(values: Record<string, string | number>) {
    if (!token) return
    const res = await apiCall('editarMedicion', {
      fecha, litros_real_t1: values.litros_real_t1, litros_real_t2: values.litros_real_t2,
    }, token)
    if (res.success) { toast.success('Medición actualizada'); setEditMedicion(false); load(fecha) }
    else toast.error(res.error ?? 'Error')
  }

  async function handleDeleteMedicion() {
    if (!token) return
    setDeletingMedicion(true)
    try {
      const res = await apiCall('deleteMedicion', { fecha }, token)
      if (res.success) { toast.success('Medición eliminada'); setConfirmDeleteMedicion(false); load(fecha) }
      else toast.error(res.error ?? 'Error al eliminar')
    } finally { setDeletingMedicion(false) }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Registros por fecha</h1>
        <p className="text-sm text-slate-500 mt-1">Consultá y editá los registros de cualquier día</p>
      </div>

      {/* Date picker */}
      <div className="card flex items-center gap-3 max-w-xs">
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="date"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          className="input border-0 p-0 focus:ring-0 bg-transparent text-slate-700 font-medium"
        />
      </div>

      {/* Cargas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Cargas del {formatFecha(fecha)}</h2>
          <span className="badge-slate">{cargas.length}</span>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full" />)}</div>
        ) : cargas.length === 0 ? (
          <div className="card text-center py-8 text-slate-400 text-sm">No hay cargas para esta fecha</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th><div className="flex items-center gap-1"><Clock className="w-3 h-3" />Hora</div></th>
                  <th>Proveedor</th>
                  <th className="text-right">T1</th>
                  <th className="text-right">T2</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Foto</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargas.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs">{formatHora(c.hora)}</td>
                    <td className="font-medium text-slate-800">{c.proveedor}</td>
                    <td className="text-right font-mono text-xs">{formatLitros(c.litros_t1)}</td>
                    <td className="text-right font-mono text-xs">{formatLitros(c.litros_t2)}</td>
                    <td className="text-right font-mono text-xs font-semibold text-primary-700">{formatLitros(c.total)}</td>
                    <td className="text-center">
                      {c.foto_url ? (
                        <a href={c.foto_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition-colors">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </a>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditCarga(c)} className="btn-ghost btn-icon w-7 h-7 min-h-0" aria-label="Editar">
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button onClick={() => setDeleteCarga(c)} className="btn-ghost btn-icon w-7 h-7 min-h-0 hover:bg-danger-50" aria-label="Eliminar">
                          <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Medición */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Medición del día</h2>
          {medicion && (
            <div className="flex gap-2">
              <button onClick={() => setEditMedicion(true)} className="btn-secondary gap-2 text-xs">
                <Pencil className="w-3.5 h-3.5" />Editar
              </button>
              <button onClick={() => setConfirmDeleteMedicion(true)} className="btn-secondary gap-2 text-xs text-danger-600 hover:bg-danger-50 border-danger-200">
                <Trash2 className="w-3.5 h-3.5" />Eliminar
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="skeleton h-20 w-full" />
        ) : medicion ? (
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-success-600" />
              <span className="text-sm font-medium text-success-700">Medición registrada</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Tanque 1 Real</p>
                <p className="font-mono font-bold text-slate-800">{formatLitros(medicion.litros_real_t1)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Tanque 2 Real</p>
                <p className="font-mono font-bold text-slate-800">{formatLitros(medicion.litros_real_t2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Real</p>
                <p className="font-mono font-bold text-primary-700">{formatLitros(medicion.total_real)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card flex items-center gap-2 text-slate-400 py-6 justify-center">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Sin medición para esta fecha</span>
          </div>
        )}
      </div>

      {/* Modals */}
      <ModalEditar
        open={!!editCarga}
        title="Editar carga"
        fields={[
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: true },
          { key: 'litros_t1', label: 'Litros T1', type: 'number', min: 0, step: 0.1 },
          { key: 'litros_t2', label: 'Litros T2', type: 'number', min: 0, step: 0.1 },
        ]}
        initialValues={{ proveedor: editCarga?.proveedor ?? '', litros_t1: editCarga?.litros_t1 ?? 0, litros_t2: editCarga?.litros_t2 ?? 0 }}
        onSave={handleSaveEditCarga}
        onCancel={() => setEditCarga(null)}
      />

      <ModalConfirmar
        open={!!deleteCarga}
        title="Eliminar carga"
        message={`¿Eliminar la carga de ${deleteCarga?.proveedor} del ${formatHora(deleteCarga?.hora ?? '')}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteCarga}
        onCancel={() => setDeleteCarga(null)}
        loading={deleting}
      />

      <ModalEditar
        open={editMedicion}
        title="Editar medición"
        fields={[
          { key: 'litros_real_t1', label: 'Litros Real T1', type: 'number', min: 0, step: 0.1 },
          { key: 'litros_real_t2', label: 'Litros Real T2', type: 'number', min: 0, step: 0.1 },
        ]}
        initialValues={{ litros_real_t1: medicion?.litros_real_t1 ?? 0, litros_real_t2: medicion?.litros_real_t2 ?? 0 }}
        onSave={handleSaveEditMedicion}
        onCancel={() => setEditMedicion(false)}
      />

      <ModalConfirmar
        open={confirmDeleteMedicion}
        title="Eliminar medición"
        message={`¿Eliminar la medición del ${formatFecha(fecha)}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteMedicion}
        onCancel={() => setConfirmDeleteMedicion(false)}
        loading={deletingMedicion}
      />
    </div>
  )
}
