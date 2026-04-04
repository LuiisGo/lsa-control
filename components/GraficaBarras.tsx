'use client'
import dynamic from 'next/dynamic'

const GraficaBarrasInner = dynamic(() => import('./GraficaBarrasInner'), { ssr: false })

export interface DatoGrafica {
  fecha: string
  carga: number
  real: number
}

interface Props {
  datos: DatoGrafica[]
  titulo?: string
}

export function GraficaBarras({ datos, titulo }: Props) {
  return (
    <div className="card">
      {titulo && <p className="text-sm font-semibold text-slate-700 mb-3">{titulo}</p>}
      <div className="h-56">
        <GraficaBarrasInner datos={datos} />
      </div>
    </div>
  )
}
