'use client'
import { Pencil, Trash2, Image as ImageIcon, Clock, Droplets } from 'lucide-react'
import { formatHora, formatLitros } from '@/lib/utils'

export interface Carga {
  id: string
  hora: string
  proveedor: string
  litros_t1: number
  litros_t2: number
  total: number
  foto_url?: string
}

interface Props {
  cargas: Carga[]
  showActions?: boolean
  onEdit?: (carga: Carga) => void
  onDelete?: (carga: Carga) => void
  isLoading?: boolean
}

export function TablaCargas({ cargas, showActions, onEdit, onDelete, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton h-14 w-full" />
        ))}
      </div>
    )
  }

  if (cargas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
        <Droplets className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No hay cargas registradas</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th><div className="flex items-center gap-1"><Clock className="w-3 h-3" />Hora</div></th>
            <th>Proveedor</th>
            <th className="text-right">T1</th>
            <th className="text-right">T2</th>
            <th className="text-right">Total</th>
            <th className="text-center">Foto</th>
            {showActions && <th className="text-center">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {cargas.map(carga => (
            <tr key={carga.id}>
              <td className="font-mono text-xs">{formatHora(carga.hora)}</td>
              <td className="font-medium text-slate-800">{carga.proveedor}</td>
              <td className="text-right font-mono text-xs">{formatLitros(carga.litros_t1)}</td>
              <td className="text-right font-mono text-xs">{formatLitros(carga.litros_t2)}</td>
              <td className="text-right font-semibold font-mono text-xs text-primary-700">{formatLitros(carga.total)}</td>
              <td className="text-center">
                {carga.foto_url ? (
                  <a href={carga.foto_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-7 h-7 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition-colors"
                    aria-label="Ver foto">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-slate-300 text-xs">—</span>
                )}
              </td>
              {showActions && (
                <td>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit?.(carga)}
                      className="btn-icon btn-ghost w-7 h-7 min-h-0"
                      aria-label="Editar carga"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <button
                      onClick={() => onDelete?.(carga)}
                      className="btn-icon btn-ghost w-7 h-7 min-h-0 hover:bg-danger-50 hover:text-danger-600"
                      aria-label="Eliminar carga"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
