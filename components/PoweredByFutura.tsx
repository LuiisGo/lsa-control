import { cn } from '@/lib/utils'

type PoweredByFuturaProps = {
  className?: string
  textClassName?: string
  linkClassName?: string
  compact?: boolean
}

export function PoweredByFutura({
  className,
  textClassName,
  linkClassName,
  compact = false,
}: PoweredByFuturaProps) {
  return (
    <div className={cn(compact ? 'text-center' : 'flex flex-col items-center gap-1', className)}>
      <p className={cn('text-[10px] uppercase tracking-[2px] text-slate-400', textClassName)}>
        Powered by{' '}
        <a
          href="https://futuratt.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn('font-bold text-slate-600 hover:text-primary-600 transition-colors', linkClassName)}
        >
          FUTURA
        </a>
      </p>
    </div>
  )
}
