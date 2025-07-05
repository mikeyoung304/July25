import React, { forwardRef } from 'react'
import { Card, CardProps } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AccessibleCardProps extends CardProps {
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  role?: string
  tabIndex?: number
  onKeyDown?: (event: React.KeyboardEvent) => void
  focusable?: boolean
}

export const AccessibleCard = forwardRef<HTMLDivElement, AccessibleCardProps>(
  (
    {
      ariaLabel,
      ariaLabelledBy,
      ariaDescribedBy,
      role = 'article',
      tabIndex,
      onKeyDown,
      focusable = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Card
        ref={ref}
        role={role}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={focusable ? tabIndex ?? 0 : tabIndex}
        onKeyDown={onKeyDown}
        className={cn(
          focusable && 'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          className
        )}
        {...props}
      >
        {children}
      </Card>
    )
  }
)

AccessibleCard.displayName = 'AccessibleCard'