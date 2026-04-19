'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Droplets, Plus, ClipboardCheck, CheckCircle2, XCircle, RefreshCw, ArrowUpRight, Archive, Receipt } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { TarjetaMetrica } from '@/components/TarjetaMetrica'
import { TablaCargas, type Carga } from '@/components/TablaCargas'
import { formatLitros, formatLitrosNum } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface DashboardHoy {
  totalT1: number
  totalT2: number
  total: number
  medicion: {
    litros_real_t1: number
    litros_real_t2: number
    total_real: number
  } | null
  cargas: Carga[]
}

export default function EmpleadoHomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardHoy | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviosHoy, setEnviosHoy] = useState<{ litrosEnviados: number }[]>([])

  const token    = (session?.user as { apiToken?: string })?.apiToken
  const role     = (session?.user as { role?: string })?.role
  const permisos = (session?.user as { permisos?: string[] })?.permisos ?? []

  function puedeHacer(permiso: string) {
    if (role === 'admin') return true
    return permisos.includes(permiso)
  }

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const [dRes, eRes] = await Promise.all([
        apiCall<DashboardHoy>('getDashboardHoy', {}, token),
        apiCall<{ litrosEnviados: number }[]>('getEnviosPorFecha', { fecha: new Date().toISOString().slice(0,10) }, token),
      ])
      if (dRes.success && dRes.data) setData(dRes.data)
      else toast.error('Error al cargar datos')
      if (eRes.success && eRes.data) setEnviosHoy(eRes.data)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const hasCargasHoy = (data?.cargas?.length ?? 0) > 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Resumen de hoy</h1>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={loadData} className="btn-ghost btn-icon" aria-label="Actualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <TarjetaMetrica
          titulo="Tanque 1 — Hoy"
          valor={loading ? '...' : formatLitrosNum(data?.totalT1 ?? 0)}
          subtitulo="litros recibidos"
          icon={Droplets}
          isLoading={loading}
        />
        <TarjetaMetrica
          titulo="Tanque 2 — Hoy"
          valor={loading ? '...' : formatLitrosNum(data?.totalT2 ?? 0)}
          subtitulo="litros recibidos"
          icon={Droplets}
          isLoading={loading}
        />
        <TarjetaMetrica
          titulo="Total del día"
          valor={loading ? '...' : formatLitrosNum(data?.total ?? 0)}
          subtitulo="litros totales"
          variant="primary"
          isLoading={loading}
          className="col-span-2"
        />
      </div>

      {/* Medición Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Medición del día</p>
          {!loading && (
            data?.medicion
              ? <span className="badge-success"><CheckCircle2 className="w-3 h-3" />Registrada</span>
              : <span className="badge-danger"><XCircle className="w-3 h-3" />Pendiente</span>
          )}
        </div>
        {loading ? (
          <div className="skeleton h-6 w-40" />
        ) : data?.medicion ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-500">T1 Real</p>
              <p className="font-mono font-semibold text-sm">{formatLitros(data.medicion.litros_real_t1)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">T2 Real</p>
              <p className="font-mono font-semibold text-sm">{formatLitros(data.medicion.litros_real_t2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="font-mono font-bold text-sm text-primary-700">{formatLitros(data.medicion.total_real)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No se ha registrado la medición de hoy</p>
        )}
      </div>

      {/* Recepcionado / Enviado / Resto card */}
      {puedeHacer('envios') && (
        <div className="card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Movimiento del tanque hoy</p>
          {loading ? <div className="skeleton h-16 w-full" /> : (() => {
            const totalCarga = data?.total ?? 0
            const totalEnvio = enviosHoy.reduce((s, e) => s + e.litrosEnviados, 0)
            const resto = totalCarga - totalEnvio
            const pct = totalCarga > 0 ? Math.min(100, (totalEnvio / totalCarga) * 100) : 0
            return (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Recepcionado</p>
                    <p className="font-mono font-semibold">{totalCarga.toFixed(1)} L</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Enviado</p>
                    <p className="font-mono font-semibold">{totalEnvio.toFixed(1)} L</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Resto</p>
                    <p className={`font-mono font-bold ${resto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {resto.toFixed(1)} L
                    </p>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${resto >= 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Cargas list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Cargas de hoy</h2>
          <span className="badge-slate">{data?.cargas?.length ?? 0}</span>
        </div>
        <TablaCargas cargas={data?.cargas ?? []} isLoading={loading} />
      </div>

      {/* FAB Buttons */}
      <div className="fab">
        {puedeHacer('cargas') && (
          <Link href="/empleado/nueva-carga" className="fab-btn flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva Carga
          </Link>
        )}
        {puedeHacer('medicion') && hasCargasHoy && !data?.medicion && (
          <Link href="/empleado/medicion" className="fab-btn flex items-center gap-2 bg-success-600 hover:bg-success-700">
            <ClipboardCheck className="w-4 h-4" />
            Registrar Medición
          </Link>
        )}
        {puedeHacer('envios') && (
          <Link href="/empleado/envio" className="fab-btn flex items-center gap-2 bg-warning-600 hover:bg-warning-700">
            <ArrowUpRight className="w-4 h-4" />
            Registrar Envío
          </Link>
        )}
        {puedeHacer('remanentes') && (
          <Link href="/empleado/remanente" className="fab-btn flex items-center gap-2 bg-slate-600 hover:bg-slate-700">
            <Archive className="w-4 h-4" />
            Remanente
          </Link>
        )}
        {puedeHacer('gastos') && (
          <Link href="/empleado/gasto" className="fab-btn flex items-center gap-2 bg-danger-600 hover:bg-danger-700">
            <Receipt className="w-4 h-4" />
            Registrar Gasto
          </Link>
        )}
      </div>
    </div>
  )
}
