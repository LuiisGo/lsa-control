'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Droplets } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { savePendingRemanente } from '@/lib/offline'
import toast from 'react-hot-toast'

export default function RemanentePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [t1, setT1] = useState('')
  const [t2, setT2] = useState('')
  const [saving, setSaving] = useState(false)

  const total = (parseFloat(t1) || 0) + (parseFloat(t2) || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (total <= 0) return toast.error('El total del remanente debe ser > 0')

    setSaving(true)
    try {
      const res = await apiCall('saveRemanente', { litrosT1: parseFloat(t1) || 0, litrosT2: parseFloat(t2) || 0 }, token)
      if (res.success) {
        toast.success('Remanente guardado')
        router.push('/empleado')
      } else {
        throw new Error(res.error)
      }
    } catch {
      await savePendingRemanente({ litrosT1: parseFloat(t1) || 0, litrosT2: parseFloat(t2) || 0 })
      toast('Sin conexión — guardado localmente', { icon: '📵' })
      router.push('/empleado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Registrar Remanente</h1>
        <p className="text-sm text-slate-500">Litros que quedan en el tanque al cierre del día</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Litros restantes — Tanque 1</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className="input"
            placeholder="0.0"
            value={t1}
            onChange={e => setT1(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Litros restantes — Tanque 2</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className="input"
            placeholder="0.0"
            value={t2}
            onChange={e => setT2(e.target.value)}
          />
        </div>

        {total > 0 && (
          <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
            <Droplets className="w-5 h-5 text-primary-600 shrink-0" />
            <div>
              <p className="text-xs text-primary-600 font-medium">Total remanente</p>
              <p className="text-xl font-bold font-mono text-primary-800">{total.toFixed(1)} L</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || total <= 0}
          className="btn-primary w-full"
        >
          {saving ? 'Guardando...' : 'Guardar Remanente'}
        </button>
      </form>
    </div>
  )
}
