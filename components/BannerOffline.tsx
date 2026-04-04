'use client'
import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { getPendingCount, syncPending } from '@/lib/offline'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

export function BannerOffline() {
  const { data: session } = useSession()
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const updateCount = async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }
    updateCount()

    const handleOnline = async () => {
      setIsOnline(true)
      const count = await getPendingCount()
      if (count > 0 && session?.user) {
        const token = (session.user as { apiToken: string }).apiToken
        setSyncing(true)
        try {
          const synced = await syncPending(token)
          if (synced > 0) {
            toast.success(`${synced} registro${synced !== 1 ? 's' : ''} sincronizado${synced !== 1 ? 's' : ''}`)
            setPendingCount(0)
          }
        } catch {
          toast.error('Error al sincronizar')
        } finally {
          setSyncing(false)
        }
      }
    }

    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [session])

  if (isOnline && pendingCount === 0) return null

  return (
    <div
      className={`w-full px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
        isOnline ? 'bg-warning-600 text-white' : 'bg-danger-600 text-white'
      }`}
      role="alert"
      aria-live="polite"
    >
      {syncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Sincronizando registros pendientes...
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          {isOnline
            ? `${pendingCount} registro${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de sincronizar`
            : `Sin conexión${pendingCount > 0 ? ` — ${pendingCount} registro${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}` : ''}`
          }
        </>
      )}
    </div>
  )
}
