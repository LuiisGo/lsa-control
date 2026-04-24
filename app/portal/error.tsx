'use client'
import { Droplets } from 'lucide-react'

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#16a34a] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Portal de Proveedores</h1>
        </div>
        <div className="bg-white rounded-2xl p-6 space-y-4 shadow-xl text-center">
          <h2 className="text-base font-semibold text-slate-800">Error cargando el portal</h2>
          <p className="text-sm text-slate-600">
            Verificá que el link sea correcto o intentá de nuevo en unos segundos.
          </p>
          <button onClick={reset} className="btn-primary w-full">
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}
