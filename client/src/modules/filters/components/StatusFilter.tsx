import React, { memo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrderStatus } from '@shared'
import { FilterOption } from '../types'

interface StatusFilterProps {
  value: OrderStatus | 'all'
  onChange: (value: OrderStatus | 'all') => void
  options?: FilterOption<OrderStatus | 'all'>[]
}

const defaultOptions: FilterOption<OrderStatus | 'all'>[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'new', label: 'New' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

export const StatusFilter = memo<StatusFilterProps>(({
  value,
  onChange,
  options = defaultOptions
}) => {
  return (
    <Select value={value} onValueChange={(val) => onChange(val as OrderStatus | 'all')}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
            {option.count !== undefined && (
              <span className="ml-auto text-xs text-muted-foreground">
                ({option.count})
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
})

StatusFilter.displayName = 'StatusFilter'