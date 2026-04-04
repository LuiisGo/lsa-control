'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Download, Loader2, Calendar, FileSpreadsheet } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { downloadXLSX, getQuincenasRecientes, getTodayString } from '@/lib/utils'
import toast from 'react-hot-toast'

const HEADERS = [
  { key: 'fecha',       label: 'Fecha'             },
  { key: 'carga_t1',   label: 'Carga T1 (L)'       },
  { key: 'carga_t2',   label: 'Carga T2 (L)'       },
  { key: 'total_carga',label: 'Total Carga (L)'     },
  { key: 'real_t1',    label: 'Real T1 (L)'         },
  { key: 'real_t2',    label: 'Real T2 (L)'         },
  { key: 'total_real', label: 'Total Real (L)'      },
  { key: 'dif_litros', label: 'Diferencia Litros'   },
  { key: 'dif_pct',    label: 'Diferencia %'        },
  { key: 'pipa',       label: 'Envío Pipa (L)'      },
]

export default function ExportarPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const today = getTodayString()
  const [fechaInicio, setFechaInicio] = useState(today)
  const [fechaFin,    setFechaFin]    = useState(today)
  const [quincenaSelected, setQuincenaSelected] = useState('')
  const [loading, setLoading] = useState(false)

  const quincenas = getQuincenasRecientes(6)

  function handleQuincenaChange(val: string) {
    setQuincenaSelected(val)
    if (!val) return
    const q = quincenas.find(q => q.label === val)
    if (q) { setFechaInicio(q.inicio); setFechaFin(q.fin) }
  }

  async function handleExport() {
    if (!fechaInicio || !fechaFin) { toast.error('Seleccioná un rango de fechas'); return }
    if (fechaInicio > fechaFin)    { toast.error('La fecha inicio debe ser anterior al fin'); return }

    setLoading(true)
    try {
      const res = await apiCall<Record<string, unknown>[]>(
        'exportarDatos', { fechaInicio, fechaFin }, token
      )
      if (!res.success || !res.data) {
        toast.error(res.error ?? 'Error al obtener datos')
        return
      }

      const filename = `LSA_${fechaInicio}_al_${fechaFin}.xlsx`
      downloadXLSX(res.data, HEADERS, filename, 'Control LSA')
      toast.success(`✅ Excel generado: ${res.data.length} registros`)
    } catch {
      toast.error('Error al exportar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Exportar a Excel</h1>
        <p className="text-sm text-slate-500 mt-1">Descargá los registros en formato .xlsx listo para Excel</p>
      </div>

      <div className="card space-y-5">
        {/* Quincena predefinida */}
        <div>
          <label className="label">Quincena predefinida (opcional)</label>
          <select
            value={quincenaSelected}
            onChange={e => handleQuincenaChange(e.target.value)}
            className="input"
          >
            <option value="">— Elegir quincena —</option>
            {quincenas.map(q => (
              <option key={q.label} value={q.label}>{q.label}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-slate-400">o elegí el rango manualmente</span>
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha inicio</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={fechaInicio}
                max={today}
                onChange={e => { setFechaInicio(e.target.value); setQuincenaSelected('') }}
                className="input pl-9"
              />
            </div>
          </div>
          <div>
            <label className="label">Fecha fin</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={fechaFin}
                max={today}
                onChange={e => { setFechaFin(e.target.value); setQuincenaSelected('') }}
                className="input pl-9"
              />
            </div>
          </div>
        </div>

        {/* Preview campos */}
        {fechaInicio && fechaFin && (
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">Columnas que incluirá el Excel:</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {HEADERS.map(h => h.label).join(' · ')}
            </p>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={loading || !fechaInicio || !fechaFin}
          className="btn-primary w-full gap-2 py-3.5 text-base"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Generando Excel...</>
          ) : (
            <><FileSpreadsheet className="w-4 h-4" />Exportar Excel (.xlsx)</>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="card bg-primary-50 border-primary-100">
        <div className="flex gap-3">
          <Download className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
          <div className="text-xs text-primary-700 space-y-1">
            <p className="font-medium">El archivo .xlsx se abre directo en Excel:</p>
            <ul className="list-disc ml-4 space-y-0.5 text-primary-600">
              <li>Doble click en el archivo descargado</li>
              <li>Los números ya están como valores numéricos</li>
              <li>Encabezados con color azul LSA</li>
              <li>Compatible con Excel, Google Sheets y LibreOffice</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
