import React from 'react'
import { AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AlertNoteProps {
  text: string
  icon?: React.ReactNode
  variant?: 'warning' | 'info' | 'subtle'
  className?: string
}

const VARIANT_CONFIG = {
  warning: {
    icon: AlertCircle,
    className: 'text-orange-600',
  },
  info: {
    icon: Info,
    className: 'text-blue-600',
  },
  subtle: {
    icon: AlertCircle,
    className: 'text-muted-foreground',
  },
} as const

export const AlertNote: React.FC<AlertNoteProps> = ({
  text,
  icon,
  variant = 'subtle',
  className,
}) => {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon

  return (
    <div className={cn('text-sm pl-4 flex items-start gap-1', config.className, className)}>
      {icon || <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" />}
      <span>{text}</span>
    </div>
  )
}