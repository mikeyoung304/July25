import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/utils'

export interface ElapsedTimerProps {
  startTime: Date
  format?: 'minutes' | 'seconds' | 'full'
  showIcon?: boolean
  className?: string
}

/**
 * ElapsedTimer component that displays elapsed time since a given start time
 *
 * Fixed Issue #122 (OPT-005): Replaced useMemo with proper timer pattern
 *
 * BEFORE: useMemo only recalculated when dependencies changed, causing frozen display
 * AFTER: useState + useEffect + setInterval updates every second
 */
export const ElapsedTimer: React.FC<ElapsedTimerProps> = ({
  startTime,
  format = 'minutes',
  showIcon = true,
  className,
}) => {
  // Helper function to calculate elapsed time string
  const calculateElapsed = (start: Date): string => {
    const now = Date.now()
    const startMs = start.getTime()
    const diffMs = now - startMs
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
  }

  // State to hold current elapsed time
  // Initialize with empty string to avoid hydration mismatch from Date.now()
  // The useEffect will set the correct value after client-side mount
  const [elapsed, setElapsed] = useState<string>('')

  // Effect to update elapsed time every second
  useEffect(() => {
    // Calculate and set elapsed time immediately on mount
    const updateElapsed = () => setElapsed(calculateElapsed(startTime))
    updateElapsed()

    // Set up interval to update every second
    const intervalId = setInterval(updateElapsed, 1000)

    // Cleanup: clear interval on unmount or when dependencies change
    return () => {
      clearInterval(intervalId)
    }
  }, [startTime, format])

  return (
    <div className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      {showIcon && <Clock className="h-3 w-3" />}
      <span>{elapsed}</span>
    </div>
  )
}