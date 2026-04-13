'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { FileSpreadsheet, Printer, RefreshCw, Play } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { formatQ, getQuincenasRecientes } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Planilla {
  id: string; quincenaInicio: string; quincenaFin: string
  proveedorId: string; proveedorNombre: string
  totalLitros: number; precioLitro: number
  subtotal: number; iva: number; totalConIVA: number; estado: string
}

const quincenas = getQuincenasRecientes(6)

export default function PlanillasPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [qIdx, setQIdx] = useState(0)
  const [planillas, setPlanillas] = useState<Planilla[]>([])
  const [totalConIVA, setTotalConIVA] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [reciboData, setReciboData] = useState<Planilla | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const q = quincenas[qIdx]

  async function loadPlanillas() {
    if (!token || !q) return
    setLoading(true)
    const res = await apiCall<{ planillas: Planilla[]; totalConIVA: number }>('getPlanillasQuincena', { quincenaInicio: q.inicio, quincenaFin: q.fin }, token)
    if (res.success && res.data) {
      setPlanillas(res.data.planillas)
      setTotalConIVA(res.data.totalConIVA)
    }
    setLoading(false)
  }

  useEffect(() => { loadPlanillas() }, [token, qIdx])

  async function handleGenerar() {
    if (!q || !token) return
    if (!confirm(`¿Generar planillas para ${q.label}?`)) return
    setGenerando(true)
    const res = await apiCall('generarTodasLasPlanillas', { quincenaInicio: q.inicio, quincenaFin: q.fin }, token)
    if (res.success) {
      toast.success('Planillas generadas')
      loadPlanillas()
    } else toast.error(res.error || 'Error')
    setGenerando(false)
  }

  function handlePrint(p: Planilla) {
    setReciboData(p)
    setTimeout(() => window.print(), 300)
  }

  return (
    <div className="space-y-6">
      {/* Recibo imprimible — oculto en pantalla, visible al imprimir */}
      {reciboData && (
        <div ref={printRef} className="hidden print:block fixed inset-0 bg-white p-8 z-50">
          <div className="max-w-sm mx-auto text-center border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h1 className="text-lg font-bold uppercase">Agrícola San Antonio</h1>
              <p className="text-sm text-slate-500">Planilla de Pago al Proveedor</p>
              <p className="text-sm text-slate-500">Período: {reciboData.quincenaInicio} — {reciboData.quincenaFin}</p>
            </div>
            <div className="border-t border-b border-slate-200 py-4 space-y-2 text-sm text-left">
              <div className="flex justify-between"><span>Proveedor:</span><span className="font-semibold">{reciboData.proveedorNombre}</span></div>
              <div className="flex justify-between"><span>Litros entregados:</span><span className="font-mono">{reciboData.totalLitros.toFixed(1)} L</span></div>
              <div className="flex justify-between"><span>Precio por litro:</span><span className="font-mono">{formatQ(reciboData.precioLitro)}</span></div>
              <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">{formatQ(reciboData.subtotal)}</span></div>
              <div className="flex justify-between"><span>IVA (12%):</span><span className="font-mono">{formatQ(reciboData.iva)}</span></div>
            </div>
            <div className="flex justify-between items-center text-base font-bold">
              <span>TOTAL A PAGAR</span>
              <span className="text-xl">{formatQ(reciboData.totalConIVA)}</span>
            </div>
            <div className="space-y-8 pt-4 text-xs text-slate-400">
              <div className="flex justify-between">
                <div className="text-center border-t border-slate-300 pt-1 w-32">Firma Proveedor</div>
                <div className="text-center border-t border-slate-300 pt-1 w-32">Firma Administración</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-slate-800">Planillas de Pago</h1>
        <button onClick={loadPlanillas} className="btn-ghost btn-icon"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <select className="input max-w-xs" value={qIdx} onChange={e => setQIdx(parseInt(e.target.value))}>
          {quincenas.map((q, i) => <option key={i} value={i}>{q.label}</option>)}
        </select>
        <button onClick={handleGenerar} disabled={generando} className="btn-primary flex items-center gap-2">
          <Play className="w-4 h-4" />
          {generando ? 'Generando...' : 'Generar todas'}
        </button>
      </div>

      {totalConIVA > 0 && (
        <div className="card border-primary-200 bg-primary-50 print:hidden">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-primary-800">Total a pagar esta quincena</p>
            <p className="text-2xl font-bold font-mono text-primary-900">{formatQ(totalConIVA)}</p>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto print:hidden">
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full" />)}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th className="text-right">Litros</th>
                <th className="text-right">Q/L</th>
                <th className="text-right">Subtotal</th>
                <th className="text-right">IVA 12%</th>
                <th className="text-right">Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {planillas.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.proveedorNombre}</td>
                  <td className="text-right font-mono">{p.totalLitros.toFixed(1)}</td>
                  <td className="text-right font-mono">{p.precioLitro.toFixed(4)}</td>
                  <td className="text-right font-mono">{formatQ(p.subtotal)}</td>
                  <td className="text-right font-mono">{formatQ(p.iva)}</td>
                  <td className="text-right font-mono font-semibold">{formatQ(p.totalConIVA)}</td>
                  <td><span className="badge-slate">{p.estado}</span></td>
                  <td>
                    <button onClick={() => handlePrint(p)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Imprimir recibo">
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {planillas.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-6">Sin planillas para esta quincena — generá las planillas primero</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
