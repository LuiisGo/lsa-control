'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ModalConfirmar } from '@/components/ModalConfirmar'
import { getDefaultMonthRange, type DateRange } from '@/lib/dateRange'
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
  const [range, setRange] = useState<DateRange>(getDefaultMonthRange(today))
  const [data, setData] = useState<GastosRango | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteGasto, setDeleteGasto] = useState<Gasto | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load(nextRange = range) {
    if (!token) return
    setLoading(true)
    const res = await apiCall<GastosRango>('getGastosPorRango', nextRange, token)
    if (res.success && res.data) setData(res.data)
    else toast.error('Error cargando gastos')
    setLoading(false)
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete() {
    if (!deleteGasto || !token) return
    setDeleting(true)
    try {
      const res = await apiCall('deleteGasto', { id: deleteGasto.id }, token)
      if (res.success) { toast.success('Gasto eliminado'); setDeleteGasto(null); load() }
      else toast.error(res.error || 'Error')
    } finally {
      setDeleting(false)
    }
  }

  const gastos = data?.gastos ?? []
  const columns: DataTableColumn<Gasto>[] = [
    { key: 'fecha', header: 'Fecha', render: g => <span className="whitespace-nowrap">{formatFecha(g.fecha)}</span> },
    { key: 'categoria', header: 'Categoría', render: g => <span className="badge-slate">{g.categoriaNombre || 'Sin categoría'}</span> },
    { key: 'descripcion', header: 'Descripción', cellClassName: 'max-w-[220px]', render: g => <span className="block truncate">{g.descripcion || '—'}</span> },
    { key: 'monto', header: 'Monto', className: 'text-right', cellClassName: 'text-right font-mono font-semibold', render: g => formatQ(g.monto) },
    { key: 'iva', header: 'IVA', className: 'text-center', cellClassName: 'text-center', render: g => g.ivaIncluido ? 'Si' : '—' },
    { key: 'usuario', header: 'Registrado por', cellClassName: 'text-xs text-slate-400', render: g => g.usuarioNombre || '—' },
    {
      key: 'comprobante',
      header: 'Comprobante',
      render: g => g.comprobanteUrl
        ? <a href={g.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">Ver</a>
        : <span className="text-slate-300">—</span>,
    },
    {
      key: 'acciones',
      header: '',
      render: g => (
        <button onClick={() => setDeleteGasto(g)} className="p-1.5 text-danger-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors" aria-label="Eliminar gasto">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Gastos Operativos</h1>
        <button onClick={() => load()} className="btn-ghost btn-icon"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <DateRangeFilter
        value={range}
        disabled={loading}
        onApply={next => { setRange(next); load(next) }}
        onClear={() => { const next = { fechaInicio: '', fechaFin: '' }; setRange(next); load(next) }}
      />

      {data && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card border-danger-200 bg-danger-50">
            <p className="text-xs text-danger-600 font-medium">Total Gastos</p>
            <p className="text-2xl font-bold font-mono text-danger-800">{formatQ(data.total)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-500 font-medium mb-2">Por categoría</p>
            <div className="space-y-1">
              {data.desglose.length > 0 ? data.desglose.map(d => (
                <div key={d.categoria} className="flex justify-between text-sm">
                  <span className="text-slate-600">{d.categoria}</span>
                  <span className="font-mono font-medium">{formatQ(d.total)}</span>
                </div>
              )) : <p className="text-sm text-slate-400">Sin categorías en el rango</p>}
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={gastos}
        getRowKey={g => g.id}
        loading={loading}
        emptyMessage="Sin gastos en el rango seleccionado"
      />

      <ModalConfirmar
        open={!!deleteGasto}
        title="Eliminar gasto"
        message={`¿Eliminar el gasto "${deleteGasto?.descripcion || deleteGasto?.categoriaNombre}" por ${formatQ(deleteGasto?.monto ?? 0)}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteGasto(null)}
        loading={deleting}
      />
    </div>
  )
}
