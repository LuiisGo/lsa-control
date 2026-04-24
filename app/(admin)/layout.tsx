import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/AdminSidebar'
import { BannerOffline } from '@/components/BannerOffline'
import AuthProvider from '@/components/AuthProvider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as { role: string })?.role !== 'admin') redirect('/empleado')

  const user = session.user as { name?: string; email?: string }

  return (
    <AuthProvider>
      <div className="min-h-dvh bg-slate-50">
        <BannerOffline />
        <AdminSidebar userName={user.name ?? 'Admin'} userEmail={user.email ?? ''} />
        <main className="lg:pl-64 pt-14 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-8">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  )
}
