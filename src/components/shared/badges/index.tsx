import React, { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { StationType, STATION_CONFIG } from '@/types/station'
import { cn } from '@/utils'

// Station Badge
interface StationBadgeProps {
  stationType: StationType
  className?: string
}

export const StationBadge: React.FC<StationBadgeProps> = ({ stationType, className }) => {
  const config = STATION_CONFIG[stationType]
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${className || ''}`}
    >
      <span className="mr-1">{config.icon}</span>
      {config.name}
    </Badge>
  )
}

// Status Badge
export interface StatusBadgeProps {
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  variant?: 'default' | 'compact'
  className?: string
}

const STATUS_CONFIG = {
  new: {
    label: 'New',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  preparing: {
    label: 'Preparing',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  ready: {
    label: 'Ready',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  completed: {
    label: 'Completed',
    className: 'bg-gray-100 text-gray-800 border-gray-300',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
} as const

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'default',
  className,
}) => {
  const config = STATUS_CONFIG[status]
  
  return (
    <Badge 
      className={cn(
        config.className,
        variant === 'compact' && 'text-xs px-2 py-0.5',
        className
      )}
    >
      {config.label}
    </Badge>
  )
}

// Animated Status Badge
interface AnimatedStatusBadgeProps {
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  previousStatus?: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  className?: string
}

export const AnimatedStatusBadge: React.FC<AnimatedStatusBadgeProps> = ({
  status,
  previousStatus,
  className
}) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [displayStatus, setDisplayStatus] = useState(status)
  
  useEffect(() => {
    if (previousStatus && previousStatus !== status) {
      setIsAnimating(true)
      
      const timer = setTimeout(() => {
        setDisplayStatus(status)
        
        setTimeout(() => {
          setIsAnimating(false)
        }, 500)
      }, 150)
      
      return () => clearTimeout(timer)
    } else {
      setDisplayStatus(status)
    }
  }, [status, previousStatus])
  
  const animationClasses = cn(
    isAnimating && 'animate-scale-up',
    status === 'preparing' && isAnimating && 'animate-pulse-preparing',
    status === 'ready' && isAnimating && 'animate-pulse-ready animate-flash'
  )
  
  return (
    <div className={cn('relative inline-block', animationClasses, className)}>
      <StatusBadge status={displayStatus} />
      
      {status === 'ready' && isAnimating && (
        <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-25" />
      )}
    </div>
  )
}