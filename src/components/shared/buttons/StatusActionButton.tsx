import React from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatusActionButtonProps {
  status: 'new' | 'preparing' | 'ready'
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-keyshortcuts'?: string
}

const BUTTON_CONFIG = {
  new: {
    label: 'Start Preparing',
    variant: 'default' as const,
    icon: null,
  },
  preparing: {
    label: 'Mark Ready',
    variant: 'default' as const,
    icon: CheckCircle,
  },
  ready: {
    label: 'Ready for Pickup',
    variant: 'secondary' as const,
    icon: null,
  },
} as const

export const StatusActionButton: React.FC<StatusActionButtonProps> = ({
  status,
  onClick,
  disabled = false,
  loading = false,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-keyshortcuts': ariaKeyShortcuts,
}) => {
  const config = BUTTON_CONFIG[status]
  const Icon = config.icon
  const isDisabled = disabled || loading || status === 'ready'

  return (
    <Button
      variant={config.variant}
      onClick={onClick}
      disabled={isDisabled}
      className={cn('flex-1', className)}
      aria-label={ariaLabel || config.label}
      aria-describedby={ariaDescribedBy}
      aria-keyshortcuts={ariaKeyShortcuts}
      aria-busy={loading}
    >
      {Icon && <Icon className="h-4 w-4 mr-2" aria-hidden="true" />}
      <span className={loading ? 'sr-only' : undefined}>
        {config.label}
      </span>
      {loading && (
        <span aria-hidden="true">Loading...</span>
      )}
    </Button>
  )
}