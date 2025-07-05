import React from 'react'
import { cn } from '@/lib/utils'

export interface ModifierListProps {
  modifiers: string[]
  delimiter?: string
  className?: string
}

export const ModifierList: React.FC<ModifierListProps> = ({
  modifiers,
  delimiter = ', ',
  className,
}) => {
  if (!modifiers || modifiers.length === 0) {
    return null
  }

  return (
    <div className={cn('text-sm text-muted-foreground pl-4', className)}>
      {modifiers.join(delimiter)}
    </div>
  )
}