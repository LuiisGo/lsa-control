'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Camera, X, Loader2, Droplets, AlertCircle, CheckCircle2 } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { savePendingMedicion } from '@/lib/offline'
import { imageToBase64, formatLitros, formatLitrosNum, getTodayString } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Medicion {
  fecha: string
  litros_real_t1: number
  litros_real_t2: number
  total_real: number
  foto_url?: string
}

export default function MedicionPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [medicion, setMedicion] = useState<Medicion | null>(null)
  const [loading, setLoading] = useState(true)

  const [litrosT1, setLitrosT1] = useState('')
  const [litrosT2, setLitrosT2] = useState('')
  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const totalLitros = (parseFloat(litrosT1) || 0) + (parseFloat(litrosT2) || 0)
  const fecha = getTodayString()

  useEffect(() => {
    if (!token) return
    apiCall<Medicion>('getMedicion', { fecha }, token).then(res => {
      if (res.success && res.data) setMedicion(res.data)
      setLoading(false)
    })
  }, [token])

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await imageToBase64(file)
    setFotoBase64(base64)
    setFotoPreview(base64)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!litrosT1 && !litrosT2) errs.litros = 'Ingresá al menos un valor'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      if (!navigator.onLine) {
        await savePendingMedicion({
          fecha,
          litros_real_t1: parseFloat(litrosT1) || 0,
          litros_real_t2: parseFloat(litrosT2) || 0,
          foto_base64: fotoBase64 ?? undefined,
        })
        toast.success('Medición guardada localmente')
        router.push('/empleado')
        return
      }

      let fotoUrl: string | undefined
      if (fotoBase64 && token) {
        const fotoRes = await apiCall<{ url: string }>('subirFoto', { base64: fotoBase64, fecha }, token)
        if (fotoRes.success && fotoRes.data) fotoUrl = fotoRes.data.url
      }

      const res = await apiCall('saveMedicion', {
        litros_real_t1: parseFloat(litrosT1) || 0,
        litros_real_t2: parseFloat(litrosT2) || 0,
        foto_url: fotoUrl,
      }, token)

      if (res.success) {
        toast.success('Medición registrada correctamente')
        router.push('/empleado')
      } else {
        toast.error(res.error ?? 'Error al guardar')
      }
    } catch {
      toast.error('Error al guardar la medición')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/empleado" className="btn-ghost btn-icon">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Medición del día</h1>
      </div>

      {medicion ? (
        /* Read-only view */
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-success-700 bg-success-50 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium text-sm">Medición ya registrada para hoy</span>
          </div>
          <div className="card space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Tanque 1</p>
                <p className="font-mono font-bold text-lg text-slate-800">{formatLitros(medicion.litros_real_t1)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Tanque 2</p>
                <p className="font-mono font-bold text-lg text-slate-800">{formatLitros(medicion.litros_real_t2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Total</p>
                <p className="font-mono font-bold text-lg text-primary-700">{formatLitros(medicion.total_real)}</p>
              </div>
            </div>
            {medicion.foto_url && (
              <a href={medicion.foto_url} target="_blank" rel="noopener noreferrer">
                <img src={medicion.foto_url} alt="Foto medición" className="w-full max-h-48 object-cover rounded-xl" />
              </a>
            )}
          </div>
          <Link href="/empleado" className="btn-secondary w-full flex items-center justify-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rt1" className="label">Litros Reales T1</label>
              <input
                id="rt1"
                type="number"
                min="0"
                step="0.1"
                value={litrosT1}
                onChange={e => setLitrosT1(e.target.value)}
                className={`input ${errors.litros ? 'input-error' : ''}`}
                placeholder="0.0"
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="rt2" className="label">Litros Reales T2</label>
              <input
                id="rt2"
                type="number"
                min="0"
                step="0.1"
                value={litrosT2}
                onChange={e => setLitrosT2(e.target.value)}
                className={`input ${errors.litros ? 'input-error' : ''}`}
                placeholder="0.0"
                disabled={saving}
              />
            </div>
          </div>
          {errors.litros && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.litros}</p>}

          <div className="card bg-primary-50 border-primary-200">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary-600" />
              <span className="text-sm text-primary-700 font-medium">Total real:</span>
              <span className="metric-value text-primary-800 text-xl">{formatLitrosNum(totalLitros)} L</span>
            </div>
          </div>

          <div>
            <label className="label">Foto (opcional)</label>
            {fotoPreview ? (
              <div className="relative inline-block">
                <img src={fotoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-slate-200" />
                <button
                  type="button"
                  onClick={() => { setFotoBase64(null); setFotoPreview(null) }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-danger-600 text-white rounded-full flex items-center justify-center"
                  aria-label="Eliminar foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="btn-secondary w-full cursor-pointer flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Tomar / elegir foto
                <input type="file" accept="image/*" capture="environment" onChange={handleFoto} className="sr-only" />
              </label>
            )}
          </div>

          <button type="submit" className="btn-success w-full text-base py-3.5" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar medición'}
          </button>
        </form>
      )}
    </div>
  )
}
