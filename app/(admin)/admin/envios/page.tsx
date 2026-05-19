'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { RefreshCw, Pencil, Check, X } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { getDefaultMonthRange, type DateRange } from '@/lib/dateRange'
import { formatFecha, formatQ, getTodayString } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Envio {
  id: string; fecha: string; compradorId: string; compradorNombre: string
  litrosEnviados: number; montoTotal: number; notas: string
  precioLitro?: number; litrosRecibidos?: number; diferenciaLitros?: number; origen?: string
  usuarioNombre: string; timestamp: string
}

export default function EnviosPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const today = getTodayString()
  const [range, setRange] = useState<DateRange>(getDefaultMonthRange(today))
  const [envios, setEnvios] = useState<Envio[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Envio>>({})

  async function loadEnvios(nextRange = range) {
    if (!token) return
    setLoading(true)
    const res = await apiCall<Envio[]>('getEnviosPorRango', nextRange, token)
    if (res.success && res.data) setEnvios(res.data)
    else toast.error('Error al cargar envíos')
    setLoading(false)
  }

  useEffect(() => { loadEnvios() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const totalRecibido = envios.reduce((s, e) => s + (e.litrosRecibidos ?? e.litrosEnviados), 0)
  const totalDif = totalRecibido - totalL
  const columns: DataTableColumn<Envio>[] = [
    { key: 'fecha', header: 'Fecha', render: e => <span className="whitespace-nowrap">{formatFecha(e.fecha)}</span> },
    { key: 'comprador', header: 'Comprador', cellClassName: 'font-medium text-slate-800', render: e => e.compradorNombre },
    {
      key: 'enviado',
      header: 'Enviado',
      className: 'text-right',
      cellClassName: 'text-right font-mono',
      render: e => editingId === e.id
        ? <input type="number" step="0.1" min="0" className="input w-24 text-right" value={editData.litrosEnviados ?? e.litrosEnviados} onChange={ev => setEditData(d => ({ ...d, litrosEnviados: parseFloat(ev.target.value) }))} />
        : e.litrosEnviados.toFixed(1),
    },
    { key: 'recibido', header: 'Recibido', className: 'text-right', cellClassName: 'text-right font-mono', render: e => (e.litrosRecibidos ?? e.litrosEnviados).toFixed(1) },
    { key: 'diferencia', header: 'Dif.', className: 'text-right', cellClassName: 'text-right font-mono', render: e => (e.diferenciaLitros ?? 0).toFixed(1) },
    {
      key: 'monto',
      header: 'Monto',
      className: 'text-right',
      cellClassName: 'text-right font-mono',
      render: e => editingId === e.id
        ? <input type="number" step="0.01" min="0" className="input w-28 text-right" value={editData.montoTotal ?? e.montoTotal} onChange={ev => setEditData(d => ({ ...d, montoTotal: parseFloat(ev.target.value) }))} />
        : formatQ(e.montoTotal),
    },
    {
      key: 'precio',
      header: 'Q/L',
      className: 'text-right',
      cellClassName: 'text-right font-mono text-xs text-slate-500',
      render: e => (e.precioLitro ?? (e.litrosRecibidos ? e.montoTotal / e.litrosRecibidos : e.montoTotal / e.litrosEnviados)).toFixed(4),
    },
    {
      key: 'notas',
      header: 'Notas',
      cellClassName: 'text-slate-500 text-sm max-w-[160px]',
      render: e => editingId === e.id
        ? <input type="text" className="input min-w-40" value={editData.notas ?? e.notas} onChange={ev => setEditData(d => ({ ...d, notas: ev.target.value }))} />
        : <span className="block truncate">{e.notas || '—'}</span>,
    },
    { key: 'usuario', header: 'Registrado por', cellClassName: 'text-xs text-slate-400', render: e => e.usuarioNombre || '—' },
    {
      key: 'acciones',
      header: '',
      render: e => editingId === e.id ? (
        <div className="flex gap-1">
          <button onClick={() => handleEdit(e.id)} className="p-1.5 text-success-600 hover:bg-success-50 rounded-lg" aria-label="Guardar envío"><Check className="w-4 h-4" /></button>
          <button onClick={() => setEditingId(null)} className="p-1.5 text-danger-600 hover:bg-danger-50 rounded-lg" aria-label="Cancelar edición"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button onClick={() => { setEditingId(e.id); setEditData({}) }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" aria-label="Editar envío"><Pencil className="w-4 h-4" /></button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Envíos</h1>
        <button onClick={() => loadEnvios()} className="btn-ghost btn-icon"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <DateRangeFilter
        value={range}
        disabled={loading}
        onApply={next => { setRange(next); loadEnvios(next) }}
        onClear={() => { const next = { fechaInicio: '', fechaFin: '' }; setRange(next); loadEnvios(next) }}
      />

      {/* Totales */}
      {envios.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card text-center">
            <p className="text-xs text-slate-500">Litros enviados</p>
            <p className="font-bold font-mono text-lg">{totalL.toFixed(1)} L</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-500">Litros recibidos</p>
            <p className="font-bold font-mono text-lg">{totalRecibido.toFixed(1)} L</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-500">Diferencia</p>
            <p className="font-bold font-mono text-lg">{totalDif.toFixed(1)} L</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-500">Ingresos</p>
            <p className="font-bold font-mono text-lg text-success-700">{formatQ(total)}</p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={envios}
        getRowKey={e => e.id}
        loading={loading}
        emptyMessage="Sin envíos para el rango seleccionado"
      />
    </div>
  )
}
