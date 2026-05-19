'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { RefreshCw } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { getDefaultMonthRange, type DateRange } from '@/lib/dateRange'
import { getTodayString } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ComparativaRow {
  nombre: string; totalLitros: number; totalEntregas: number
  diasActivos: number; promLitrosDia: number; participacionPct: number
}

export default function ComparativaProveedoresPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const today = getTodayString()
  const [range, setRange] = useState<DateRange>(getDefaultMonthRange(today))
  const [data, setData] = useState<ComparativaRow[]>([])
  const [loading, setLoading] = useState(false)

  async function load(nextRange = range) {
    if (!token) return
    setLoading(true)
    const res = await apiCall<ComparativaRow[]>('getComparativaProveedores', nextRange, token)
    if (res.success && res.data) setData(res.data)
    else toast.error('Error cargando datos')
    setLoading(false)
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalLitros = data.reduce((s, r) => s + r.totalLitros, 0)
  const columns: DataTableColumn<ComparativaRow>[] = [
    { key: 'proveedor', header: 'Proveedor', cellClassName: 'font-medium text-slate-800', render: r => r.nombre },
    { key: 'litros', header: 'Litros', className: 'text-right', cellClassName: 'text-right font-mono', render: r => r.totalLitros.toFixed(1) },
    { key: 'entregas', header: 'Entregas', className: 'text-right', cellClassName: 'text-right', render: r => r.totalEntregas },
    { key: 'dias', header: 'Días activos', className: 'text-right', cellClassName: 'text-right', render: r => r.diasActivos },
    { key: 'promedio', header: 'L/día prom.', className: 'text-right', cellClassName: 'text-right font-mono', render: r => r.promLitrosDia.toFixed(1) },
    { key: 'participacion', header: 'Participación', className: 'text-right', cellClassName: 'text-right', render: r => <span className="badge-slate">{r.participacionPct.toFixed(1)}%</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Comparativa de Proveedores</h1>
        <button onClick={() => load()} className="btn-ghost btn-icon"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <DateRangeFilter
        value={range}
        disabled={loading}
        onApply={next => { setRange(next); load(next) }}
        onClear={() => { const next = { fechaInicio: '', fechaFin: '' }; setRange(next); load(next) }}
      />

      {totalLitros > 0 && (
        <div className="card border-primary-200 bg-primary-50">
          <p className="text-xs text-primary-600">Total recepcionado en el período</p>
          <p className="text-2xl font-bold font-mono text-primary-900">{totalLitros.toFixed(1)} L</p>
        </div>
      )}

      {/* Barras de participación */}
      {data.length > 0 && (
        <div className="card space-y-3">
          <h2 className="section-title">Participación por Proveedor</h2>
          {data.map(r => (
            <div key={r.nombre}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{r.nombre}</span>
                <span className="text-slate-500">{r.totalLitros.toFixed(1)} L — {r.participacionPct.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${r.participacionPct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <DataTable
        columns={[
          {
            key: 'index',
            header: '#',
            cellClassName: 'text-slate-400',
            render: row => data.findIndex(r => r.nombre === row.nombre) + 1,
          },
          ...columns,
        ]}
        data={data}
        getRowKey={r => r.nombre}
        loading={loading}
        emptyMessage="Sin datos para el rango seleccionado"
      />
    </div>
  )
}
