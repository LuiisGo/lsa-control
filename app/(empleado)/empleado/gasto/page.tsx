'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Receipt, Camera } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { savePendingGasto } from '@/lib/offline'
import toast from 'react-hot-toast'

interface Categoria { id: string; nombre: string; activo: boolean }

export default function GastoPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const token = (session?.user as { apiToken?: string })?.apiToken
  const fileRef = useRef<HTMLInputElement>(null)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaId, setCategoriaId] = useState('')
  const [categoriaNombre, setCategoriaNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [ivaIncluido, setIvaIncluido] = useState(false)
  const [fotoBase64, setFotoBase64] = useState<string | undefined>()
  const [fotoPreview, setFotoPreview] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    apiCall<Categoria[]>('getCategorias', {}, token).then(res => {
      if (res.success && res.data) setCategorias(res.data.filter(c => c.activo))
    })
  }, [token])

  function handleCategoriaChange(id: string) {
    setCategoriaId(id)
    const c = categorias.find(c => c.id === id)
    setCategoriaNombre(c?.nombre ?? '')
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target?.result as string
      setFotoBase64(b64)
      setFotoPreview(b64)
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) return toast.error('Monto debe ser > 0')

    setSaving(true)
    try {
      let comprobanteUrl: string | undefined
      if (fotoBase64) {
        const fotoRes = await apiCall<{ url: string }>('subirFoto', { base64: fotoBase64 }, token)
        if (fotoRes.success && fotoRes.data) comprobanteUrl = fotoRes.data.url
      }

      const res = await apiCall('saveGasto', {
        categoriaId,
        categoriaNombre,
        descripcion,
        monto: montoNum,
        ivaIncluido,
        comprobanteUrl,
      }, token)

      if (res.success) {
        toast.success('Gasto registrado')
        router.push('/empleado')
      } else {
        throw new Error(res.error)
      }
    } catch {
      await savePendingGasto({ categoriaId, categoriaNombre, descripcion, monto: parseFloat(monto) || 0, ivaIncluido, foto_base64: fotoBase64 })
      toast('Sin conexión — guardado localmente', { icon: '📵' })
      router.push('/empleado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Registrar Gasto</h1>
        <p className="text-sm text-slate-500">Gastos operativos del día</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Categoría</label>
          <select
            className="input"
            value={categoriaId}
            onChange={e => handleCategoriaChange(e.target.value)}
            required
          >
            <option value="">Seleccionar categoría...</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Descripción</label>
          <input
            type="text"
            className="input"
            placeholder="Descripción del gasto..."
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Monto (Q)</label>
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

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={ivaIncluido}
            onChange={e => setIvaIncluido(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-primary-600"
          />
          <span className="text-sm text-slate-700">IVA incluido en el monto</span>
        </label>

        {/* Foto comprobante */}
        <div>
          <label className="label">Comprobante (opcional)</label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
          {fotoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotoPreview} alt="Comprobante" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
              <button
                type="button"
                onClick={() => { setFotoBase64(undefined); setFotoPreview(undefined) }}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-slate-600 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-4 text-sm text-slate-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
            >
              <Camera className="w-5 h-5" />
              Tomar foto del comprobante
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Receipt className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Registrar Gasto'}
        </button>
      </form>
    </div>
  )
}
