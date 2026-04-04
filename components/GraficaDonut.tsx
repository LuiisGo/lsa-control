'use client'
import dynamic from 'next/dynamic'

const GraficaDonutInner = dynamic(() => import('./GraficaDonutInner'), { ssr: false })

export type { DatoProveedor } from './GraficaDonutInner'

interface Props {
  datos: { proveedor: string; t1: number; t2: number; total: number }[]
  campo: 't1' | 't2' | 'total'
  titulo?: string
}

export function GraficaDonut({ datos, campo, titulo }: Props) {
  return (
    <div className="card">
      {titulo && <p className="text-sm font-semibold text-slate-700 mb-3">{titulo}</p>}
      <div className="h-72">
        <GraficaDonutInner datos={datos} campo={campo} />
      </div>
    </div>
  )
}
