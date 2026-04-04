'use client'
import { signOut } from 'next-auth/react'
import { Droplets, LogOut, User } from 'lucide-react'

interface Props {
  userName: string
}

export function EmpleadoHeader({ userName }: Props) {
  return (
    <header className="bg-primary-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-primary-300" />
          <span className="font-semibold text-sm">Control LSA</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-primary-200 text-xs">
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:block">{userName}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1 text-xs text-primary-200 hover:text-white transition-colors py-1 px-2 rounded-md hover:bg-white/10"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
