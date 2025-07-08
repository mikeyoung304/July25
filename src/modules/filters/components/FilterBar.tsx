import React, { memo } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { StatusFilter } from './StatusFilter'
import { SearchFilter } from './SearchFilter'
import { OrderFilterState } from '../types'
import { OrderStatus } from '@/types/filters'
import { cn } from '@/utils'

interface FilterBarProps {
  filters: OrderFilterState
  onStatusChange: (status: OrderStatus | 'all') => void
  onSearchChange: (query: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  className?: string
}

export const FilterBar = memo<FilterBarProps>(({
  filters,
  onStatusChange,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
  className
}) => {
  return (
    <div className={cn('flex flex-wrap gap-2 items-center', className)}>
      <StatusFilter
        value={filters.status || 'all'}
        onChange={onStatusChange}
      />
      
      <SearchFilter
        value={filters.searchQuery || ''}
        onChange={onSearchChange}
      />
      
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9"
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  )
})

FilterBar.displayName = 'FilterBar'