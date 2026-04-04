import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmpleadoHeader } from '@/components/EmpleadoHeader'
import { BannerOffline } from '@/components/BannerOffline'

export default async function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      <BannerOffline />
      <EmpleadoHeader userName={(session.user as { name: string })?.name ?? 'Usuario'} />
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6 pb-36">
        {children}
      </main>
      {/* POWERED BY FUTURA — footer fijo en mobile */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-white/80 backdrop-blur border-t border-slate-100 py-2 text-center pointer-events-none">
        <p className="text-[9px] text-slate-400 uppercase tracking-[2px]">
          Powered by <span className="font-bold text-slate-500 tracking-[2px]">FUTURA</span>
        </p>
      </footer>
    </div>
  )
}
