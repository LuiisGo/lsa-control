'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Globe, RefreshCw, Copy, KeyRound, ToggleLeft, ToggleRight } from 'lucide-react'
import { apiCall } from '@/lib/api'
import toast from 'react-hot-toast'

interface Proveedor { id: string; nombre: string; activo: boolean }
interface Acceso {
  id: string; proveedorId: string; proveedorNombre: string
  codigoAcceso: string; linkToken: string; activo: boolean
}

export default function PortalProveedoresPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [accesos, setAccesos] = useState<Acceso[]>([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState<string | null>(null)

  async function load() {
    if (!token) return
    const [pRes, aRes] = await Promise.all([
      apiCall<Proveedor[]>('getProveedores', {}, token),
      apiCall<Acceso[]>('getAccesosProveedores', {}, token),
    ])
    if (pRes.success && pRes.data) setProveedores(pRes.data.filter(p => p.activo))
    if (aRes.success && aRes.data) setAccesos(aRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [token])

  async function handleGenerar(prov: Proveedor) {
    setGenerando(prov.id)
    const res = await apiCall<{ id: string; codigoAcceso: string; linkToken: string }>('generarAccesoProveedor', { proveedorId: prov.id, proveedorNombre: prov.nombre }, token)
    if (res.success) {
      toast.success(`Acceso generado: ${res.data?.codigoAcceso}`)
      load()
    } else toast.error(res.error || 'Error')
    setGenerando(null)
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo)
    toast.success('Código copiado')
  }

  function copiarLink(linkToken: string) {
    const url = `${window.location.origin}/portal/${linkToken}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado')
  }

  const accesosByProv = accesos.reduce<Record<string, Acceso>>((acc, a) => {
    acc[a.proveedorId] = a
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-bold text-slate-800">Portal de Proveedores</h1>
      </div>
      <p className="text-sm text-slate-500">
        Genera un link y código de acceso para cada proveedor. Con esto pueden consultar sus cargas, planillas y resúmenes sin necesidad de una cuenta.
      </p>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {proveedores.map(prov => {
            const acceso = accesosByProv[prov.id]
            return (
              <div key={prov.id} className="card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{prov.nombre}</p>

                    {acceso ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <KeyRound className="w-4 h-4 text-slate-400" />
                            <span className="font-mono font-bold text-lg tracking-[4px] text-slate-800">{acceso.codigoAcceso}</span>
                          </div>
                          <button onClick={() => copiarCodigo(acceso.codigoAcceso)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Copiar código">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => copiarLink(acceso.linkToken)} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 px-2 py-1.5 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
                            <Globe className="w-3.5 h-3.5" />
                            Copiar link
                          </button>
                        </div>
                        <p className="text-xs text-slate-400">
                          El proveedor accede en <strong>/portal/{acceso.linkToken.slice(0, 8)}...</strong> e ingresa el código de acceso
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 mt-1">Sin acceso generado</p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <button
                      onClick={() => handleGenerar(prov)}
                      disabled={generando === prov.id}
                      className="btn-primary text-sm flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generando === prov.id ? 'animate-spin' : ''}`} />
                      {acceso ? 'Regenerar' : 'Generar acceso'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {proveedores.length === 0 && <p className="text-center text-slate-400 py-8">No hay proveedores activos</p>}
        </div>
      )}
    </div>
  )
}
