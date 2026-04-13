'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { savePendingEnvio } from '@/lib/offline'
import toast from 'react-hot-toast'

interface Comprador { id: string; nombre: string; nit: string; activo: boolean }
interface Remanente { id: string; fecha: string; litrosT1: number; litrosT2: number; total: number }

export default function EnvioPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [compradores, setCompradores] = useState<Comprador[]>([])
  const [remanente, setRemanente] = useState<Remanente | null>(null)
  const [remanenteDismissed, setRemanenteDismissed] = useState(false)

  const [compradorId, setCompradorId] = useState('')
  const [compradorNombre, setCompradorNombre] = useState('')
  const [litros, setLitros] = useState('')
  const [monto, setMonto] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    Promise.all([
      apiCall<Comprador[]>('getCompradores', {}, token),
      apiCall<Remanente | null>('getRemanentePendiente', {}, token),
    ]).then(([cRes, rRes]) => {
      if (cRes.success && cRes.data) setCompradores(cRes.data.filter(c => c.activo))
      if (rRes.success) setRemanente(rRes.data ?? null)
    })
  }, [token])

  function handleCompradorChange(id: string) {
    setCompradorId(id)
    const c = compradores.find(c => c.id === id)
    setCompradorNombre(c?.nombre ?? '')
  }

  async function handleRemanente(usar: boolean) {
    if (!remanente || !token) return
    const action = usar ? 'usarRemanente' : 'ignorarRemanente'
    const res = await apiCall(action, { id: remanente.id }, token)
    if (res.success) {
      toast.success(usar ? 'Remanente agregado al inventario' : 'Remanente ignorado')
      setRemanenteDismissed(true)
    } else {
      toast.error('Error procesando remanente')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!compradorId) return toast.error('Seleccioná un comprador')
    const litrosNum = parseFloat(litros)
    const montoNum  = parseFloat(monto)
    if (!litrosNum || litrosNum <= 0) return toast.error('Litros debe ser > 0')
    if (!montoNum  || montoNum  <= 0) return toast.error('Monto debe ser > 0')

    setSaving(true)
    try {
      const res = await apiCall('saveEnvio', {
        compradorId,
        compradorNombre,
        litrosEnviados: litrosNum,
        montoTotal:     montoNum,
        notas,
      }, token)

      if (res.success) {
        toast.success('Envío registrado')
        router.push('/empleado')
      } else {
        throw new Error(res.error)
      }
    } catch {
      // offline fallback
      await savePendingEnvio({ compradorId, compradorNombre, litrosEnviados: litrosNum, montoTotal: montoNum, notas })
      toast('Sin conexión — guardado localmente', { icon: '📵' })
      router.push('/empleado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Registrar Envío</h1>
        <p className="text-sm text-slate-500">Registrar leche enviada a comprador</p>
      </div>

      {/* Banner remanente */}
      {remanente && !remanenteDismissed && (
        <div className="card border-warning-300 bg-warning-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning-800">Remanente del día anterior</p>
              <p className="text-sm text-warning-700 mt-0.5">
                Hay <strong>{remanente.total.toFixed(1)} L</strong> de remanente ({remanente.fecha}).<br />
                ¿Qué hacemos con ellos?
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleRemanente(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-warning-600 text-white rounded-lg hover:bg-warning-700 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Agregar al inventario
                </button>
                <button
                  onClick={() => handleRemanente(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-warning-300 text-warning-700 rounded-lg hover:bg-warning-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Ignorar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Comprador</label>
          <select
            className="input"
            value={compradorId}
            onChange={e => handleCompradorChange(e.target.value)}
            required
          >
            <option value="">Seleccionar comprador...</option>
            {compradores.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Litros enviados</label>
            <input
              type="number"
              step="0.1"
              min="0"
              className="input"
              placeholder="0.0"
              value={litros}
              onChange={e => setLitros(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Monto total (Q)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              placeholder="0.00"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              required
            />
          </div>
        </div>

        {litros && monto && parseFloat(litros) > 0 && parseFloat(monto) > 0 && (
          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            Precio implícito: <strong>Q {(parseFloat(monto) / parseFloat(litros)).toFixed(4)}/L</strong>
          </div>
        )}

        <div>
          <label className="label">Notas (opcional)</label>
          <textarea
            className="input"
            rows={2}
            placeholder="Observaciones..."
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <ArrowUpRight className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Registrar Envío'}
        </button>
      </form>
    </div>
  )
}
