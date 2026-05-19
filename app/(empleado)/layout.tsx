import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmpleadoHeader } from '@/components/EmpleadoHeader'
import { BannerOffline } from '@/components/BannerOffline'

import { PoweredByFutura } from '@/components/PoweredByFutura'

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
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-white/80 backdrop-blur border-t border-slate-100 py-2 text-center">
        <PoweredByFutura
          compact
          textClassName="text-[9px] text-slate-400 tracking-[2px]"
          linkClassName="text-slate-500 hover:text-primary-600"
        />
      </footer>
    </div>
  )
}
