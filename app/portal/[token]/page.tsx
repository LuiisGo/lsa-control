'use client'
import { useState, use } from 'react'
import { Droplets, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react'

interface Params { token: string }

interface PortalData {
  proveedor: { id: string; nombre: string }
  ultimas7Dias: { fecha: string; hora: string; litrosT1: number; litrosT2: number; total: number }[]
  quincenaActual:   QuincenaResumen
  quincenaAnterior: QuincenaResumen
  historialPlanillas: Planilla[]
}

interface QuincenaResumen {
  inicio: string; fin: string; totalLitros: number
  planilla: { totalLitros: number; precioLitro: number; subtotal: number; iva: number; totalConIVA: number; estado: string } | null
}

interface Planilla {
  quincenaInicio: string; quincenaFin: string
  totalLitros: number; precioLitro: number
  subtotal: number; iva: number; totalConIVA: number; estado: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL!

async function fetchPortal(token: string, codigo: string): Promise<PortalData> {
  const res = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'portalData', token, codigo }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Error')
  return json.data
}

function formatQ(n: number) { return 'Q ' + n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function PortalPage({ params }: { params: Promise<Params> }) {
  const { token } = use(params)

  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<PortalData | null>(null)
  const [showHistorial, setShowHistorial] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const d = await fetchPortal(token, codigo)
      setData(d)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Droplets className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Portal de Proveedores</h1>
            <p className="text-sm text-slate-500 mt-1">Agrícola San Antonio</p>
          </div>

          <form onSubmit={handleLogin} className="card space-y-4">
            <div>
              <label className="label">Código de acceso</label>
              <input
                type="text"
                className="input text-center text-2xl font-bold tracking-[8px] uppercase"
                placeholder="XXXXXX"
                maxLength={6}
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                required
              />
              <p className="text-xs text-slate-400 text-center mt-1">Ingresá el código de 6 caracteres que te proporcionó la empresa</p>
            </div>

            {error && <p className="text-sm text-danger-600 text-center">{error}</p>}

            <button type="submit" disabled={loading || codigo.length < 6} className="btn-primary w-full">
              {loading ? 'Verificando...' : 'Acceder'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-800 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Droplets className="w-6 h-6" />
          <div>
            <p className="font-bold">{data.proveedor.nombre}</p>
            <p className="text-xs text-primary-300">Agrícola San Antonio — Portal Proveedor</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Últimas 7 entregas */}
        <div className="card">
          <h2 className="section-title">Entregas — últimos 7 días</h2>
          {data.ultimas7Dias.length > 0 ? (
            <table className="table">
              <thead><tr><th>Fecha</th><th>Hora</th><th className="text-right">T1</th><th className="text-right">T2</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {data.ultimas7Dias.map((d, i) => (
                  <tr key={i}>
                    <td>{d.fecha}</td>
                    <td className="text-slate-400">{d.hora}</td>
                    <td className="text-right font-mono">{d.litrosT1.toFixed(1)}</td>
                    <td className="text-right font-mono">{d.litrosT2.toFixed(1)}</td>
                    <td className="text-right font-mono font-semibold">{d.total.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-400">Sin entregas en los últimos 7 días</p>
          )}
        </div>

        {/* Quincena actual */}
        <QuincenaCard titulo="Quincena Actual" q={data.quincenaActual} />
        <QuincenaCard titulo="Quincena Anterior" q={data.quincenaAnterior} />

        {/* Historial planillas */}
        <div className="card">
          <button
            onClick={() => setShowHistorial(h => !h)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="section-title mb-0 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Historial de Planillas
            </h2>
            {showHistorial ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showHistorial && (
            <div className="mt-4">
              {data.historialPlanillas.length > 0 ? (
                <div className="space-y-3">
                  {data.historialPlanillas.map((p, i) => (
                    <div key={i} className="border border-slate-100 rounded-xl p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{p.quincenaInicio} — {p.quincenaFin}</p>
                          <p className="text-xs text-slate-500">{p.totalLitros.toFixed(1)} L × {formatQ(p.precioLitro)}/L</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold font-mono">{formatQ(p.totalConIVA)}</p>
                          <span className="text-xs text-slate-400">{p.estado}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-2">Sin planillas en el historial</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function QuincenaCard({ titulo, q }: { titulo: string; q: QuincenaResumen }) {
  return (
    <div className="card">
      <h2 className="section-title">{titulo}</h2>
      <p className="text-xs text-slate-500 mb-3">{q.inicio} — {q.fin}</p>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-500">Litros entregados</p>
          <p className="text-2xl font-bold font-mono">{q.totalLitros.toFixed(1)} L</p>
        </div>
      </div>

      {q.planilla ? (
        <div className="border border-slate-100 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Precio/litro</span><span className="font-mono">{'Q ' + q.planilla.precioLitro.toFixed(4)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono">{'Q ' + q.planilla.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">IVA 12%</span><span className="font-mono">{'Q ' + q.planilla.iva.toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
            <span>Total a cobrar</span>
            <span className="font-mono text-success-700">{'Q ' + q.planilla.totalConIVA.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Planilla aún no generada</p>
      )}
    </div>
  )
}
