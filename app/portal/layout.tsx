// Public layout — no auth wrapper
import { PoweredByFutura } from '@/components/PoweredByFutura'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <footer className="bg-slate-50 px-4 pb-6">
        <PoweredByFutura />
      </footer>
    </>
  )
}
