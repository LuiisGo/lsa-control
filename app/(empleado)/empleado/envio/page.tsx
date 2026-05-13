'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, CheckCircle } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { savePendingEnvio } from '@/lib/offline'
import toast from 'react-hot-toast'

interface Comprador { id: string; nombre: string; nit: string; activo: boolean }

export default function EnvioPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [compradores, setCompradores] = useState<Comprador[]>([])

  const [compradorId, setCompradorId] = useState('')
  const [compradorNombre, setCompradorNombre] = useState('')
  const [litros, setLitros] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  interface ConfirmacionData {
    compradorNombre: string
    litros: number
    saldoInicial?: number
    totalCargaDia: number
    totalDisponibleDia?: number
    totalEnviadoDia: number
    resto: number
    tanque1?: number
    tanque2?: number
    advertencia?: string
    offline?: boolean
  }
  const [confirmacion, setConfirmacion] = useState<ConfirmacionData | null>(null)

  useEffect(() => {
    if (!token) return
    apiCall<Comprador[]>('getCompradores', {}, token).then(cRes => {
      if (cRes.success && cRes.data) setCompradores(cRes.data.filter(c => c.activo))
    })
  }, [token])

  function handleCompradorChange(id: string) {
    setCompradorId(id)
    const c = compradores.find(c => c.id === id)
    setCompradorNombre(c?.nombre ?? '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!compradorId) return toast.error('Seleccioná un comprador')
    const litrosNum = parseFloat(litros)
    if (!litrosNum || litrosNum <= 0) return toast.error('Litros debe ser > 0')

    setSaving(true)
    try {
      const res = await apiCall<{
        id: string; totalCargaDia: number; totalEnviadoDia: number
        saldoInicial: number; totalDisponibleDia: number
        resto: number; tanque1: number; tanque2: number; advertencia?: string
      }>('saveEnvio', {
        compradorId,
        compradorNombre,
        litrosEnviados: litrosNum,
        notas,
      }, token)

      if (res.success && res.data) {
        setConfirmacion({
          compradorNombre,
          litros: litrosNum,
          saldoInicial:    res.data.saldoInicial,
          totalCargaDia:   res.data.totalCargaDia,
          totalDisponibleDia: res.data.totalDisponibleDia,
          totalEnviadoDia: res.data.totalEnviadoDia,
          resto:           res.data.resto,
          tanque1:         res.data.tanque1,
          tanque2:         res.data.tanque2,
          advertencia:     res.data.advertencia,
        })
      } else {
        if (navigator.onLine) {
          toast.error(res.error || 'No se pudo registrar el envío')
          return
        }
        throw new Error(res.error || 'Sin conexión')
      }
    } catch {
      // offline fallback
      await savePendingEnvio({ compradorId, compradorNombre, litrosEnviados: litrosNum, notas })
      setConfirmacion({ compradorNombre, litros: litrosNum, totalCargaDia: 0, totalEnviadoDia: 0, resto: 0, offline: true })
    } finally {
      setSaving(false)
    }
  }

  if (confirmacion) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="card border-green-200 bg-green-50 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-800">Envío registrado</p>
          </div>
          <p className="text-sm text-green-700">
            <strong>{confirmacion.litros.toFixed(1)} L</strong> a {confirmacion.compradorNombre}
          </p>
          {confirmacion.offline ? (
            <p className="text-sm text-slate-500 italic">Sin conexión — resto no disponible</p>
          ) : (
            <div className="border-t border-green-200 pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Había al inicio</span>
                <span className="font-mono">{(confirmacion.saldoInicial ?? 0).toFixed(1)} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Recibido hoy</span>
                <span className="font-mono">{confirmacion.totalCargaDia.toFixed(1)} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total enviado hoy</span>
                <span className="font-mono">{confirmacion.totalEnviadoDia.toFixed(1)} L</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-1 font-semibold">
                <span>Queda en tanques</span>
                <span className={`font-mono ${confirmacion.resto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {confirmacion.resto.toFixed(1)} L
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="rounded-lg bg-white/70 border border-green-100 px-3 py-2">
                  <p className="text-slate-500">Tanque 1</p>
                  <p className="font-mono font-semibold text-slate-800">{(confirmacion.tanque1 ?? 0).toFixed(1)} L</p>
                </div>
                <div className="rounded-lg bg-white/70 border border-green-100 px-3 py-2">
                  <p className="text-slate-500">Tanque 2</p>
                  <p className="font-mono font-semibold text-slate-800">{(confirmacion.tanque2 ?? 0).toFixed(1)} L</p>
                </div>
              </div>
            </div>
          )}
          {confirmacion.advertencia && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ {confirmacion.advertencia}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setConfirmacion(null)
            setCompradorId(''); setCompradorNombre(''); setLitros(''); setNotas('')
          }}
          className="btn-secondary w-full"
        >
          Registrar otro envío
        </button>
        <button onClick={() => router.push('/empleado')} className="btn-primary w-full">
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Registrar Envío</h1>
        <p className="text-sm text-slate-500">Registrar leche enviada a comprador</p>
      </div>

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
