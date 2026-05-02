'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Camera, X, Loader2, Droplets, AlertCircle } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { savePendingCarga } from '@/lib/offline'
import { imageToBase64, formatLitrosNum } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Proveedor {
  id: string
  nombre: string
  activo: boolean
  codigo?: string
}

export default function NuevaCargaPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loadingProveedores, setLoadingProveedores] = useState(true)

  const [proveedor, setProveedor] = useState('')
  const [litrosT1, setLitrosT1] = useState('')
  const [litrosT2, setLitrosT2] = useState('')
  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const totalLitros = (parseFloat(litrosT1) || 0) + (parseFloat(litrosT2) || 0)

  useEffect(() => {
    if (!token) return
    apiCall<Proveedor[]>('getProveedores', {}, token).then(res => {
      if (res.success && res.data) {
        setProveedores(res.data.filter(p => p.activo))
      }
      setLoadingProveedores(false)
    })
  }, [token])

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await imageToBase64(file)
      setFotoBase64(base64)
      setFotoPreview(base64)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error procesando la foto'
      toast.error(msg)
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!proveedor) newErrors.proveedor = 'Seleccioná un proveedor'
    if (!litrosT1 && !litrosT2) newErrors.litros = 'Ingresá al menos un valor de litros'
    if (litrosT1 && parseFloat(litrosT1) < 0) newErrors.litros = 'Los litros no pueden ser negativos'
    if (litrosT2 && parseFloat(litrosT2) < 0) newErrors.litros = 'Los litros no pueden ser negativos'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const now = new Date()
      const hora = now.toTimeString().substring(0, 5)
      const fecha = now.toISOString().split('T')[0]

      if (!navigator.onLine) {
        await savePendingCarga({
          fecha,
          hora,
          proveedor,
          litros_t1: parseFloat(litrosT1) || 0,
          litros_t2: parseFloat(litrosT2) || 0,
          foto_base64: fotoBase64 ?? undefined,
        })
        toast.success('Carga guardada localmente (se sincronizará cuando haya conexión)')
        router.push('/empleado')
        return
      }

      let fotoUrl: string | undefined
      if (fotoBase64 && token) {
        const fotoRes = await apiCall<{ url: string }>('subirFoto', { base64: fotoBase64, fecha }, token)
        if (fotoRes.success && fotoRes.data) fotoUrl = fotoRes.data.url
      }

      const res = await apiCall('saveCarga', {
        proveedor,
        litros_t1: parseFloat(litrosT1) || 0,
        litros_t2: parseFloat(litrosT2) || 0,
        foto_url: fotoUrl,
      }, token)

      if (res.success) {
        toast.success('Carga registrada correctamente')
        router.push('/empleado')
      } else {
        toast.error(res.error ?? 'Error al guardar')
      }
    } catch {
      toast.error('Error al guardar la carga')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/empleado" className="btn-ghost btn-icon">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Nueva carga</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Proveedor */}
        <div>
          <label htmlFor="proveedor" className="label label-required">Proveedor</label>
          <select
            id="proveedor"
            value={proveedor}
            onChange={e => setProveedor(e.target.value)}
            className={`input ${errors.proveedor ? 'input-error' : ''}`}
            disabled={loadingProveedores || saving}
          >
            <option value="">Seleccioná un proveedor</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.nombre}>{p.codigo ? `[${p.codigo}] ${p.nombre}` : p.nombre}</option>
            ))}
          </select>
          {errors.proveedor && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.proveedor}</p>}
        </div>

        {/* Litros */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="t1" className="label">Litros Tanque 1</label>
            <input
              id="t1"
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
            <label htmlFor="t2" className="label">Litros Tanque 2</label>
            <input
              id="t2"
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

        {/* Total preview */}
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-primary-700 font-medium">Total:</span>
            <span className="metric-value text-primary-800 text-xl">{formatLitrosNum(totalLitros)} L</span>
          </div>
        </div>

        {/* Foto */}
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
              <input
                type="file"
                accept="image/*"
                onChange={handleFoto}
                className="sr-only"
              />
            </label>
          )}
        </div>

        <button type="submit" className="btn-primary w-full text-base py-3.5" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar carga'}
        </button>
      </form>
    </div>
  )
}
