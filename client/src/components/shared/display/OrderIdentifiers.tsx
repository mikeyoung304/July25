import React from 'react'
import { cn, escapeHtml } from '@/utils'

// Consolidated order and table display components
// Reduces 48 lines across 2 files to 25 lines in 1 file

interface IdentifierProps {
  value: string
  prefix?: string
  className?: string
}

export const OrderNumber: React.FC<IdentifierProps & { size?: 'sm' | 'md' | 'lg' }> = ({
  value,
  prefix = 'Order #',
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  }
  return <span className={cn(sizeClasses[size], className)}>{prefix}{escapeHtml(value)}</span>
}

export const TableLabel: React.FC<IdentifierProps> = ({
  value,
  prefix = 'Table',
  className,
}) => {
  return <span className={cn('text-sm text-muted-foreground', className)}>{prefix} {escapeHtml(value)}</span>
}