'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, FileText, Truck, Users, Download, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  userName: string
  userEmail: string
}

const navItems = [
  { href: '/admin',              label: 'Dashboard',   icon: LayoutDashboard, exact: true },
  { href: '/admin/registros',    label: 'Registros',   icon: FileText },
  { href: '/admin/proveedores',  label: 'Proveedores', icon: Truck },
  { href: '/admin/usuarios',     label: 'Usuarios',    icon: Users },
  { href: '/admin/exportar',     label: 'Exportar',    icon: Download },
]

export function AdminSidebar({ userName, userEmail }: Props) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <>
      {/* ── Mobile: header superior ─────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-primary-800 text-white h-14 flex items-center px-4 gap-3 shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LSA-Logo.png" alt="Logo LSA" width={34} height={34} className="shrink-0 rounded-full object-contain" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-xs text-white leading-tight">Grupo Lechero</p>
          <p className="text-[10px] text-primary-300 uppercase tracking-wide">San Antonio</p>
        </div>
        <span className="text-xs text-primary-300 truncate max-w-[80px]">{userName}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="p-1.5 text-primary-200 hover:text-white rounded-md hover:bg-white/10 transition-colors shrink-0"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* ── Mobile: navegación inferior ─────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex">
        {navItems.map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
                active ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Desktop: sidebar fijo ───────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-primary-800 text-white z-30">

        {/* Logo grande en sidebar */}
        <div className="px-5 pt-6 pb-4 border-b border-white/10 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LSA-Logo.png" alt="Logo Grupo Lechero San Antonio" width={100} height={100} className="rounded-full object-contain" />
          <div className="text-center">
            <p className="font-bold text-sm text-white tracking-wide">Grupo Lechero</p>
            <p className="text-[11px] text-primary-300 uppercase tracking-widest">San Antonio</p>
          </div>
          <div className="w-full h-px bg-white/10 mt-1" />
          <p className="text-[10px] text-primary-400 uppercase tracking-[2px]">Panel de administración</p>
        </div>

        {/* Links de navegación */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-primary-200 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Usuario + logout */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-[11px] text-primary-300 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary-200 hover:bg-white/10 hover:text-white transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>

          {/* POWERED BY FUTURA */}
          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <p className="text-[9px] text-primary-500 uppercase tracking-[2px]">Powered by</p>
            <p className="text-[11px] text-primary-300 font-bold tracking-[3px] uppercase mt-0.5">FUTURA</p>
          </div>
        </div>
      </aside>
    </>
  )
}
