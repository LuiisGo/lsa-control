import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmpleadoHeader } from '@/components/EmpleadoHeader'
import { BannerOffline } from '@/components/BannerOffline'

export default async function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-dvh bg-slate-50">
      <BannerOffline />
      <EmpleadoHeader userName={(session.user as { name: string })?.name ?? 'Usuario'} />
      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {children}
      </main>
    </div>
  )
}
