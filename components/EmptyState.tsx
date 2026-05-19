import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  message: string
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-slate-400">
      <Inbox className="mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
      {title && <p className="text-sm font-semibold text-slate-500">{title}</p>}
      <p className="text-sm">{message}</p>
    </div>
  )
}
