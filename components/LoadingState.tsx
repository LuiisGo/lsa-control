interface LoadingStateProps {
  rows?: number
  rowClassName?: string
}

export function LoadingState({ rows = 3, rowClassName = 'h-12 w-full' }: LoadingStateProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`skeleton ${rowClassName}`} />
      ))}
    </div>
  )
}
