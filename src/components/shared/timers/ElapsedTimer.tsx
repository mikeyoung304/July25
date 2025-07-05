import React, { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/utils'

export interface ElapsedTimerProps {
  startTime: Date
  format?: 'minutes' | 'seconds' | 'full'
  showIcon?: boolean
  className?: string
}

export const ElapsedTimer: React.FC<ElapsedTimerProps> = ({
  startTime,
  format = 'minutes',
  showIcon = true,
  className,
}) => {
  const elapsed = useMemo(() => {
    const now = Date.now()
    const start = startTime.getTime()
    const diffMs = now - start
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    const seconds = diffSeconds % 60

    switch (format) {
      case 'seconds':
        return `${diffSeconds}s`
      case 'full':
        if (hours > 0) {
          return `${hours}h ${minutes}m`
        }
        return `${minutes}m ${seconds}s`
      case 'minutes':
      default:
        return `${diffMinutes}m`
    }
  }, [startTime, format])

  return (
    <div className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      {showIcon && <Clock className="h-3 w-3" />}
      <span>{elapsed}</span>
    </div>
  )
}