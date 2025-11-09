import React from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SortBy, SortDirection } from 'shared/types'
import { cn } from '@/utils'

interface SortControlProps {
  sortBy: SortBy
  sortDirection: SortDirection
  onSortChange: (sortBy: SortBy, direction?: SortDirection) => void
  onDirectionToggle: () => void
  className?: string
}

const sortOptions: { value: SortBy; label: string }[] = [
  { value: 'created_at', label: 'Order Time' },
  { value: 'order_number', label: 'Order Number' },
  { value: 'table_number', label: 'Table Number' },
  { value: 'status', label: 'Status' },
  { value: 'itemCount', label: 'Item Count' }
]

export const SortControl: React.FC<SortControlProps> = ({
  sortBy,
  sortDirection,
  onSortChange,
  onDirectionToggle,
  className
}) => {
  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            {currentSortLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {sortOptions.map(({ value, label }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => onSortChange(value)}
              className={cn(
                'cursor-pointer',
                sortBy === value && 'font-semibold'
              )}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="icon"
        onClick={onDirectionToggle}
        className="h-8 w-8"
        aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
      >
        {sortDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}