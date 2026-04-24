'use client'
import { useState, use, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, Droplets, LogOut, Loader2 } from 'lucide-react'
import { formatQ } from '@/lib/utils'

// ── Interfaces ────────────────────────────────────────────────

interface CargaDia { hora: string; litrosT1: number; litrosT2: number; total: number }
interface CargaPeriodo { fecha: string; totalLitros: number; acumulado: number }
interface PlanillaResumen {
  litros: number; precioLitro: number; subtotal: number
  iva: number; totalConIva: number; aplicaIva: boolean; estado: string
}
interface PeriodoData {
  tipo: string; inicio: string; fin: string
  cargas: CargaPeriodo[]; totalLitros: number
  planilla: PlanillaResumen | null
}
interface HistorialItem {
  inicio: string; fin: string; litros: number; precioLitro: number
  subtotal: number; iva: number; totalConIva: number; estado: string; aplicaIva: boolean
}
interface PortalData {
  proveedorNombre: string; proveedorCodigo?: string; frecuenciaPago: string
  hoy: { fecha: string; cargas: CargaDia[]; totalLitros: number }
  periodoActual:   PeriodoData
  periodoAnterior: PeriodoData
  historial:       HistorialItem[]
}

// ── Helper: Accordion ─────────────────────────────────────────

function Accordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between"
        aria-expanded={open}
      >
        <h2 className="section-title mb-0 text-left">{title}</h2>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        }
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

// ── Helper: Bar chart (lazy-loaded Chart.js) ──────────────────

function BarChart({ cargas }: { cargas: CargaPeriodo[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inst = useRef<any>(null)

  useEffect(() => {
    if (!ref.current) return
    const canvas = ref.current
    let cancelled = false
    import('chart.js/auto')
      .then(({ Chart }) => {
        if (cancelled) return
        if (inst.current) inst.current.destroy()
        inst.current = new Chart(canvas, {
          type: 'bar',
          data: {
            labels: cargas.map(c => c.fecha.slice(5)),
            datasets: [{
              label: 'Litros',
              data: cargas.map(c => c.totalLitros),
              backgroundColor: 'rgba(22,163,74,0.5)',
              borderColor: '#16a34a',
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          },
        })
      })
      .catch(() => { /* chart optional; table already shows data */ })
    return () => { cancelled = true; inst.current?.destroy() }
  }, [cargas])

  return <canvas ref={ref} className="w-full max-h-48" />
}

// ── Helper: Planilla card (reutilizada en período actual/anterior) ─

function PlanillaCard({ planilla }: { planilla: PlanillaResumen }) {
  return (
    <div className="border border-slate-100 rounded-xl p-4 space-y-1.5 text-sm bg-slate-50 mt-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Planilla de pago</p>
      <div className="flex justify-between">
        <span className="text-slate-500">Litros</span>
        <span className="font-mono">{planilla.litros.toFixed(1)} L</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Precio/litro</span>
        <span className="font-mono">{formatQ(planilla.precioLitro)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Subtotal</span>
        <span className="font-mono">{formatQ(planilla.subtotal)}</span>
      </div>
      {planilla.aplicaIva && (
        <div className="flex justify-between">
          <span className="text-slate-500">IVA 12%</span>
          <span className="font-mono">{formatQ(planilla.iva)}</span>
        </div>
      )}
      <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
        <span>{planilla.aplicaIva ? 'Total con IVA' : 'Total a cobrar'}</span>
        <span className="font-mono text-success-700">{formatQ(planilla.totalConIva)}</span>
      </div>
      <div className="pt-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          planilla.estado === 'PAGADA'
            ? 'bg-success-100 text-success-700'
            : 'bg-slate-200 text-slate-600'
        }`}>
          {planilla.estado}
        </span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [screen, setScreen] = useState<'login' | 'data'>('login')
  const [codigo, setCodigo] = useState('')
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState('')

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('portal_session')
    if (saved) {
      try {
        const { codigoSaved } = JSON.parse(saved) as { codigoSaved: string }
        setCodigo(codigoSaved)
        loadPortalData(codigoSaved)
      } catch {
        sessionStorage.removeItem('portal_session')
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPortalData(codigoToUse: string) {
    setLoadingData(true)
    setDataError('')
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portalData', token, codigo: codigoToUse }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Error cargando datos')
      setPortalData(json.data as PortalData)
      setScreen('data')
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Error de conexión')
      setScreen('login')
    } finally {
      setLoadingData(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoadingLogin(true)
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portalLogin', token, codigo }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Código incorrecto')
      sessionStorage.setItem('portal_session', JSON.stringify({ codigoSaved: codigo }))
      await loadPortalData(codigo)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoadingLogin(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('portal_session')
    setPortalData(null)
    setCodigo('')
    setScreen('login')
  }

  // ── Login screen ─────────────────────────────────────────────

  if (screen === 'login' || loadingData) {
    return (
      <div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#16a34a] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Droplets className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Portal de Proveedores</h1>
            <p className="text-sm text-blue-200 mt-1">Agrícola San Antonio</p>
          </div>

          {loadingData ? (
            <div className="flex flex-col items-center gap-3 text-blue-200">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Cargando datos...</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 space-y-4 shadow-xl">
              <div>
                <label className="label">Código de acceso</label>
                <input
                  type="text"
                  className="input text-center text-2xl font-bold tracking-[8px] uppercase"
                  placeholder="XXXXXX"
                  maxLength={6}
                  value={codigo}
                  onChange={e => { setCodigo(e.target.value.toUpperCase()); setLoginError('') }}
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-400 text-center mt-1">
                  Código de 6 caracteres proporcionado por la empresa
                </p>
              </div>
              {loginError && (
                <p className="text-sm text-danger-600 text-center">{loginError}</p>
              )}
              {dataError && (
                <p className="text-sm text-danger-600 text-center">{dataError}</p>
              )}
              <button
                type="submit"
                disabled={loadingLogin || codigo.length < 6}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loadingLogin
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Verificando...</>
                  : 'Ingresar'
                }
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  if (!portalData) return null

  const d = portalData
  const cargasActualesConLitros = d.periodoActual.cargas.filter(c => c.totalLitros > 0)
  const showChart = cargasActualesConLitros.length >= 5

  // ── Data screen ───────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="bg-[#1e3a5f] text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold leading-tight">
                {d.proveedorCodigo && (
                  <span className="font-mono text-blue-200 mr-2">[{d.proveedorCodigo}]</span>
                )}
                {d.proveedorNombre}
              </p>
              <p className="text-xs text-blue-200">Agrícola San Antonio</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-blue-200 hover:text-white transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Hoy ────────────────────────────────────────────── */}
        <Accordion title={`Hoy — ${d.hoy.fecha}`} defaultOpen>
          {d.hoy.cargas.length > 0 ? (
            <>
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th className="text-right">T1 (L)</th>
                    <th className="text-right">T2 (L)</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {d.hoy.cargas.map((c, i) => (
                    <tr key={i}>
                      <td className="text-slate-500">{c.hora}</td>
                      <td className="text-right font-mono">{c.litrosT1.toFixed(1)}</td>
                      <td className="text-right font-mono">{c.litrosT2.toFixed(1)}</td>
                      <td className="text-right font-mono font-semibold">{c.total.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td className="font-bold text-sm pt-2" colSpan={3}>Total del día</td>
                    <td className="text-right font-bold font-mono pt-2">{d.hoy.totalLitros.toFixed(1)} L</td>
                  </tr>
                </tfoot>
              </table>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Sin cargas registradas hoy</p>
          )}
        </Accordion>

        {/* ── Período actual ─────────────────────────────────── */}
        <Accordion title={`Período actual — ${d.periodoActual.tipo}`} defaultOpen>
          <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
            <span>{d.periodoActual.inicio} → {d.periodoActual.fin}</span>
            <span className="font-semibold text-slate-800">{d.periodoActual.totalLitros.toFixed(1)} L total</span>
          </div>

          {d.periodoActual.cargas.length > 0 ? (
            <>
              {/* Chart — only when >= 5 days */}
              {showChart && (
                <div className="mb-4">
                  <BarChart cargas={cargasActualesConLitros} />
                </div>
              )}

              <table className="table w-full text-sm">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-right">Litros</th>
                    <th className="text-right">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {d.periodoActual.cargas.map((c, i) => (
                    <tr key={i}>
                      <td className="text-slate-600">{c.fecha}</td>
                      <td className="text-right font-mono">{c.totalLitros.toFixed(1)}</td>
                      <td className="text-right font-mono text-slate-500">{c.acumulado.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-2">Sin cargas en este período</p>
          )}

          {d.periodoActual.planilla
            ? <PlanillaCard planilla={d.periodoActual.planilla} />
            : <p className="text-sm text-slate-400 mt-4">Planilla aún no generada</p>
          }
        </Accordion>

        {/* ── Período anterior ───────────────────────────────── */}
        <Accordion title={`Período anterior — ${d.periodoAnterior.tipo}`}>
          <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
            <span>{d.periodoAnterior.inicio} → {d.periodoAnterior.fin}</span>
            <span className="font-semibold text-slate-800">{d.periodoAnterior.totalLitros.toFixed(1)} L total</span>
          </div>

          {d.periodoAnterior.cargas.length > 0 ? (
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="text-right">Litros</th>
                  <th className="text-right">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {d.periodoAnterior.cargas.map((c, i) => (
                  <tr key={i}>
                    <td className="text-slate-600">{c.fecha}</td>
                    <td className="text-right font-mono">{c.totalLitros.toFixed(1)}</td>
                    <td className="text-right font-mono text-slate-500">{c.acumulado.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-400 text-center py-2">Sin cargas registradas</p>
          )}

          {d.periodoAnterior.planilla
            ? <PlanillaCard planilla={d.periodoAnterior.planilla} />
            : <p className="text-sm text-slate-400 mt-4">Planilla aún no generada</p>
          }
        </Accordion>

        {/* ── Historial ─────────────────────────────────────── */}
        <Accordion title="Historial de planillas">
          {d.historial.length > 0 ? (
            <div className="space-y-3">
              {d.historial.map((p, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-3 bg-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {p.inicio} → {p.fin}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.litros.toFixed(1)} L × {formatQ(p.precioLitro)}/L
                        {!p.aplicaIva && <span className="ml-1 text-amber-600">(sin IVA)</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-bold font-mono text-slate-800">{formatQ(p.totalConIva)}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        p.estado === 'PAGADA'
                          ? 'bg-success-100 text-success-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.estado}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Sin historial de planillas</p>
          )}
        </Accordion>

      </main>
    </div>
  )
}
