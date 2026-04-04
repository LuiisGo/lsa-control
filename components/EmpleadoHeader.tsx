'use client'
import { signOut } from 'next-auth/react'
import { LogOut, User } from 'lucide-react'
import { LogoSA } from '@/components/LogoSA'

interface Props {
  userName: string
}

export function EmpleadoHeader({ userName }: Props) {
  return (
    <header className="bg-primary-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo + título */}
        <div className="flex items-center gap-2.5">
          <LogoSA size={36} variant="dark" className="shrink-0" />
          <div className="leading-tight">
            <p className="font-bold text-sm text-white">Grupo Lechero</p>
            <p className="text-[10px] text-primary-300 tracking-wide uppercase">San Antonio</p>
          </div>
        </div>

        {/* Usuario + logout */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-primary-200 text-xs">
            <User className="w-3.5 h-3.5" />
            <span>{userName}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1 text-xs text-primary-200 hover:text-white transition-colors py-1.5 px-2.5 rounded-md hover:bg-white/10"
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
