import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface Props {
  titulo: string
  valor: string | React.ReactNode
  subtitulo?: string
  icon?: LucideIcon
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning'
  badge?: React.ReactNode
  isLoading?: boolean
  className?: string
}

const variants = {
  default: 'border-slate-100',
  primary: 'border-primary-200 bg-primary-50',
  success: 'border-success-200 bg-success-50',
  danger: 'border-danger-200 bg-danger-50',
  warning: 'border-warning-200 bg-warning-50',
}

const iconVariants = {
  default: 'bg-slate-100 text-slate-600',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-100 text-success-700',
  danger: 'bg-danger-100 text-danger-700',
  warning: 'bg-warning-100 text-warning-700',
}

export function TarjetaMetrica({
  titulo,
  valor,
  subtitulo,
  icon: Icon,
  variant = 'default',
  badge,
  isLoading,
  className,
}: Props) {
  if (isLoading) {
    return (
      <div className={cn('card', className)}>
        <div className="skeleton h-4 w-24 mb-3" />
        <div className="skeleton h-8 w-32" />
      </div>
    )
  }

  return (
    <div className={cn('card card-hover border', variants[variant], className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{titulo}</p>
          <div className="metric-value text-slate-900">{valor}</div>
          {subtitulo && <p className="text-xs text-slate-500 mt-1">{subtitulo}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {Icon && (
            <div className={cn('p-2 rounded-lg', iconVariants[variant])}>
              <Icon className="w-4 h-4" />
            </div>
          )}
          {badge}
        </div>
      </div>
    </div>
  )
}
