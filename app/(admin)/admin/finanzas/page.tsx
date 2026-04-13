'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { RefreshCw, TrendingUp, TrendingDown, Droplets, DollarSign } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { TarjetaMetrica } from '@/components/TarjetaMetrica'
import dynamic from 'next/dynamic'
const GraficaDonutSimple = dynamic(() => import('@/components/GraficaDonutInner'), { ssr: false })
import { formatQ } from '@/lib/utils'
import toast from 'react-hot-toast'

interface DashboardFinanciero {
  quincena: { inicio: string; fin: string }
  ingresos: number
  costoProveedores: number
  gastosOperativos: number
  margen: number
  margenPct: number
  litrosTotales: number
  litrosRecibidos: number
  precioPromedioCompra: number
  precioPromedioVenta: number
  porComprador: { nombre: string; litros: number; monto: number; diasEnvio: number; entregas: number; precioImplicito: number }[]
  porProveedor: { nombre: string; litros: number; entregas: number }[]
}

export default function FinanzasPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken
  const [data, setData] = useState<DashboardFinanciero | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const res = await apiCall<DashboardFinanciero>('getDashboardFinanciero', {}, token)
      if (res.success && res.data) setData(res.data)
      else toast.error('Error al cargar finanzas')
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [token])

  const margenPositivo = (data?.margen ?? 0) >= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard Financiero</h1>
          {data && <p className="text-sm text-slate-500">{data.quincena.inicio} — {data.quincena.fin}</p>}
        </div>
        <button onClick={loadData} className="btn-ghost btn-icon"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TarjetaMetrica titulo="Ingresos" valor={loading ? '...' : formatQ(data?.ingresos ?? 0)} subtitulo="quincena actual" icon={TrendingUp} variant="success" isLoading={loading} />
        <TarjetaMetrica titulo="Costo Proveedores" valor={loading ? '...' : formatQ(data?.costoProveedores ?? 0)} subtitulo="con IVA" icon={DollarSign} isLoading={loading} />
        <TarjetaMetrica titulo="Gastos Operativos" valor={loading ? '...' : formatQ(data?.gastosOperativos ?? 0)} subtitulo="del período" icon={DollarSign} variant="warning" isLoading={loading} />
        <TarjetaMetrica titulo="Margen Neto" valor={loading ? '...' : formatQ(data?.margen ?? 0)} subtitulo={`${data?.margenPct.toFixed(1) ?? 0}%`} icon={margenPositivo ? TrendingUp : TrendingDown} variant={margenPositivo ? 'success' : 'danger'} isLoading={loading} />
      </div>

      {/* Tarjetas litros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TarjetaMetrica titulo="Litros Enviados" valor={loading ? '...' : `${data?.litrosTotales.toFixed(1) ?? 0} L`} icon={Droplets} isLoading={loading} />
        <TarjetaMetrica titulo="Litros Recibidos" valor={loading ? '...' : `${data?.litrosRecibidos.toFixed(1) ?? 0} L`} icon={Droplets} isLoading={loading} />
        <TarjetaMetrica titulo="Precio Compra" valor={loading ? '...' : `Q ${data?.precioPromedioCompra.toFixed(4) ?? 0}`} subtitulo="por litro" isLoading={loading} />
        <TarjetaMetrica titulo="Precio Venta" valor={loading ? '...' : `Q ${data?.precioPromedioVenta.toFixed(4) ?? 0}`} subtitulo="por litro" variant="success" isLoading={loading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Por comprador */}
        <div className="card">
          <h2 className="section-title">Por Comprador</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Comprador</th>
                    <th className="text-right">Litros</th>
                    <th className="text-right">Monto</th>
                    <th className="text-right">Q/L</th>
                    <th className="text-right">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.porComprador ?? []).map(c => (
                    <tr key={c.nombre}>
                      <td className="font-medium">{c.nombre}</td>
                      <td className="text-right font-mono">{c.litros.toFixed(1)}</td>
                      <td className="text-right font-mono">{formatQ(c.monto)}</td>
                      <td className="text-right font-mono text-xs">{c.precioImplicito.toFixed(4)}</td>
                      <td className="text-right">{c.diasEnvio}</td>
                    </tr>
                  ))}
                  {(data?.porComprador?.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="text-center text-slate-400 py-4">Sin envíos en esta quincena</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Por proveedor — donut */}
        <div className="card">
          <h2 className="section-title">Litros por Proveedor</h2>
          {loading ? (
            <div className="skeleton h-48 w-full rounded-xl" />
          ) : (data?.porProveedor?.length ?? 0) > 0 ? (
            <div className="h-64">
              <GraficaDonutSimple
                datos={(data?.porProveedor ?? []).map(p => ({ proveedor: p.nombre, t1: 0, t2: 0, total: p.litros }))}
                campo="total"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Sin datos de proveedores</p>
          )}
        </div>
      </div>

      {/* Tabla proveedores */}
      <div className="card">
        <h2 className="section-title">Detalle por Proveedor</h2>
        {loading ? (
          <div className="skeleton h-24 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th className="text-right">Litros</th>
                  <th className="text-right">Entregas</th>
                </tr>
              </thead>
              <tbody>
                {(data?.porProveedor ?? []).map(p => (
                  <tr key={p.nombre}>
                    <td className="font-medium">{p.nombre}</td>
                    <td className="text-right font-mono">{p.litros.toFixed(1)}</td>
                    <td className="text-right">{p.entregas}</td>
                  </tr>
                ))}
                {(data?.porProveedor?.length ?? 0) === 0 && (
                  <tr><td colSpan={3} className="text-center text-slate-400 py-4">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
