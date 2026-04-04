'use client'
import dynamic from 'next/dynamic'

const GraficaLineasInner = dynamic(() => import('./GraficaLineasInner'), { ssr: false })

export interface DatoLinea {
  fecha: string
  carga: number
  real: number
}

interface Props {
  datos: DatoLinea[]
  titulo?: string
}

export function GraficaLineas({ datos, titulo }: Props) {
  return (
    <div className="card">
      {titulo && <p className="text-sm font-semibold text-slate-700 mb-3">{titulo}</p>}
      <div className="h-56">
        <GraficaLineasInner datos={datos} />
      </div>
    </div>
  )
}
