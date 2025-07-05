import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface StatusBadgeProps {
  status: 'new' | 'preparing' | 'ready'
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