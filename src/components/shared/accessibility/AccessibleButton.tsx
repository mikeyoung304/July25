import React, { forwardRef } from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AccessibleButtonProps extends ButtonProps {
  ariaLabel?: string
  ariaPressed?: boolean
  ariaExpanded?: boolean
  ariaControls?: string
  ariaDescribedBy?: string
  ariaKeyShortcuts?: string
  loading?: boolean
  loadingText?: string
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      ariaLabel,
      ariaPressed,
      ariaExpanded,
      ariaControls,
      ariaDescribedBy,
      ariaKeyShortcuts,
      loading = false,
      loadingText = 'Loading...',
      disabled,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-describedby={ariaDescribedBy}
        aria-keyshortcuts={ariaKeyShortcuts}
        aria-busy={loading}
        disabled={disabled || loading}
        className={cn(
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="sr-only">{loadingText}</span>
            <span aria-hidden="true" className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {loadingText}
            </span>
          </>
        ) : (
          children
        )}
      </Button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'