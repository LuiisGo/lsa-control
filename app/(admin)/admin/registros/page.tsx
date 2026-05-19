'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Pencil, Trash2, Image as ImageIcon, Clock } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ModalEditar } from '@/components/ModalEditar'
import { ModalConfirmar } from '@/components/ModalConfirmar'
import { getDefaultMonthRange, type DateRange } from '@/lib/dateRange'
import { formatHora, formatLitros, formatFecha, getTodayString } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Carga {
  id: string
  fecha: string
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

  const today = getTodayString()
  const [range, setRange] = useState<DateRange>(getDefaultMonthRange(today))
  const [cargas, setCargas] = useState<Carga[]>([])
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [loading, setLoading] = useState(false)

  const [editCarga, setEditCarga] = useState<Carga | null>(null)
  const [deleteCarga, setDeleteCarga] = useState<Carga | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editMedicion, setEditMedicion] = useState<Medicion | null>(null)
  const [confirmDeleteMedicion, setConfirmDeleteMedicion] = useState<Medicion | null>(null)
  const [deletingMedicion, setDeletingMedicion] = useState(false)

  async function load(nextRange = range) {
    if (!token) return
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        apiCall<Carga[]>('getCargasPorRango', nextRange, token),
        apiCall<Medicion[]>('getMedicionesPorRango', nextRange, token),
      ])
      if (r1.success) setCargas(r1.data ?? [])
      if (r2.success) setMediciones(r2.data ?? [])
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveEditCarga(values: Record<string, string | number>) {
    if (!editCarga || !token) return
    const res = await apiCall('editarCarga', {
      id: editCarga.id, proveedor: values.proveedor, litros_t1: values.litros_t1, litros_t2: values.litros_t2,
    }, token)
    if (res.success) { toast.success('Carga actualizada'); setEditCarga(null); load() }
    else toast.error(res.error ?? 'Error')
  }

  async function handleDeleteCarga() {
    if (!deleteCarga || !token) return
    setDeleting(true)
    try {
      const res = await apiCall('deleteCarga', { id: deleteCarga.id }, token)
      if (res.success) { toast.success('Carga eliminada'); setDeleteCarga(null); load() }
      else toast.error(res.error ?? 'Error')
    } finally { setDeleting(false) }
  }

  async function handleSaveEditMedicion(values: Record<string, string | number>) {
    if (!token || !editMedicion) return
    const res = await apiCall('editarMedicion', {
      fecha: editMedicion.fecha, litros_real_t1: values.litros_real_t1, litros_real_t2: values.litros_real_t2,
    }, token)
    if (res.success) { toast.success('Medición actualizada'); setEditMedicion(null); load() }
    else toast.error(res.error ?? 'Error')
  }

  async function handleDeleteMedicion() {
    if (!token || !confirmDeleteMedicion) return
    setDeletingMedicion(true)
    try {
      const res = await apiCall('deleteMedicion', { fecha: confirmDeleteMedicion.fecha }, token)
      if (res.success) { toast.success('Medición eliminada'); setConfirmDeleteMedicion(null); load() }
      else toast.error(res.error ?? 'Error al eliminar')
    } finally { setDeletingMedicion(false) }
  }

  const cargaColumns: DataTableColumn<Carga>[] = [
    { key: 'fecha', header: 'Fecha', render: c => <span className="whitespace-nowrap">{formatFecha(c.fecha)}</span> },
    { key: 'hora', header: <div className="flex items-center gap-1"><Clock className="w-3 h-3" />Hora</div>, cellClassName: 'font-mono text-xs', render: c => formatHora(c.hora) },
    { key: 'proveedor', header: 'Proveedor', cellClassName: 'font-medium text-slate-800', render: c => c.proveedor },
    { key: 't1', header: 'T1', className: 'text-right', cellClassName: 'text-right font-mono text-xs', render: c => formatLitros(c.litros_t1) },
    { key: 't2', header: 'T2', className: 'text-right', cellClassName: 'text-right font-mono text-xs', render: c => formatLitros(c.litros_t2) },
    { key: 'total', header: 'Total', className: 'text-right', cellClassName: 'text-right font-mono text-xs font-semibold text-primary-700', render: c => formatLitros(c.total) },
    {
      key: 'foto',
      header: 'Foto',
      className: 'text-center',
      cellClassName: 'text-center',
      render: c => c.foto_url
        ? <a href={c.foto_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-7 h-7 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition-colors" aria-label="Ver foto"><ImageIcon className="w-3.5 h-3.5" /></a>
        : <span className="text-slate-300 text-xs">—</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'text-center',
      render: c => (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setEditCarga(c)} className="btn-ghost btn-icon w-7 h-7 min-h-0" aria-label="Editar carga">
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button onClick={() => setDeleteCarga(c)} className="btn-ghost btn-icon w-7 h-7 min-h-0 hover:bg-danger-50" aria-label="Eliminar carga">
            <Trash2 className="w-3.5 h-3.5 text-danger-500" />
          </button>
        </div>
      ),
    },
  ]

  const medicionColumns: DataTableColumn<Medicion>[] = [
    { key: 'fecha', header: 'Fecha', render: m => <span className="whitespace-nowrap">{formatFecha(m.fecha)}</span> },
    { key: 't1', header: 'Tanque 1 Real', className: 'text-right', cellClassName: 'text-right font-mono', render: m => formatLitros(m.litros_real_t1) },
    { key: 't2', header: 'Tanque 2 Real', className: 'text-right', cellClassName: 'text-right font-mono', render: m => formatLitros(m.litros_real_t2) },
    { key: 'total', header: 'Total Real', className: 'text-right', cellClassName: 'text-right font-mono font-semibold text-primary-700', render: m => formatLitros(m.total_real) },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'text-center',
      render: m => (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setEditMedicion(m)} className="btn-secondary gap-2 text-xs">
            <Pencil className="w-3.5 h-3.5" />Editar
          </button>
          <button onClick={() => setConfirmDeleteMedicion(m)} className="btn-secondary gap-2 text-xs text-danger-600 hover:bg-danger-50 border-danger-200">
            <Trash2 className="w-3.5 h-3.5" />Eliminar
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Registros por fecha</h1>
        <p className="text-sm text-slate-500 mt-1">Consultá y editá los registros de cualquier día</p>
      </div>

      <DateRangeFilter
        value={range}
        disabled={loading}
        onApply={next => { setRange(next); load(next) }}
        onClear={() => { const next = { fechaInicio: '', fechaFin: '' }; setRange(next); load(next) }}
      />

      {/* Cargas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Cargas</h2>
          <span className="badge-slate">{cargas.length}</span>
        </div>

        <DataTable columns={cargaColumns} data={cargas} getRowKey={c => c.id} loading={loading} emptyMessage="No hay cargas para el rango seleccionado" />
      </div>

      {/* Medición */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Mediciones</h2>
          <span className="badge-slate">{mediciones.length}</span>
        </div>

        <DataTable columns={medicionColumns} data={mediciones} getRowKey={m => m.fecha} loading={loading} emptyMessage="Sin mediciones para el rango seleccionado" />
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
        open={!!editMedicion}
        title="Editar medición"
        fields={[
          { key: 'litros_real_t1', label: 'Litros Real T1', type: 'number', min: 0, step: 0.1 },
          { key: 'litros_real_t2', label: 'Litros Real T2', type: 'number', min: 0, step: 0.1 },
        ]}
        initialValues={{ litros_real_t1: editMedicion?.litros_real_t1 ?? 0, litros_real_t2: editMedicion?.litros_real_t2 ?? 0 }}
        onSave={handleSaveEditMedicion}
        onCancel={() => setEditMedicion(null)}
      />

      <ModalConfirmar
        open={!!confirmDeleteMedicion}
        title="Eliminar medición"
        message={`¿Eliminar la medición del ${formatFecha(confirmDeleteMedicion?.fecha ?? '')}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteMedicion}
        onCancel={() => setConfirmDeleteMedicion(null)}
        loading={deletingMedicion}
      />
    </div>
  )
}
