import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onRangeChange: (start: Date, end: Date) => void
  className?: string
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onRangeChange,
  className
}) => {
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const presets = [
    {
      label: 'Today',
      getValue: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const end = new Date()
        end.setHours(23, 59, 59, 999)
        return { start: today, end }
      }
    },
    {
      label: 'Last 7 days',
      getValue: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 7)
        return { start, end }
      }
    },
    {
      label: 'Last 30 days',
      getValue: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 30)
        return { start, end }
      }
    },
    {
      label: 'This month',
      getValue: () => {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return { start, end }
      }
    }
  ]

  return (
    <div className={cn('flex flex-col sm:flex-row gap-2', className)}>
      <div className="flex gap-2">
        <input
          type="date"
          value={formatDate(startDate)}
          onChange={(e) => {
            const newStart = new Date(e.target.value)
            if (newStart <= endDate) {
              onRangeChange(newStart, endDate)
            }
          }}
          className="px-3 py-2 border border-input rounded-md bg-background text-sm"
        />
        <span className="self-center text-muted-foreground">to</span>
        <input
          type="date"
          value={formatDate(endDate)}
          onChange={(e) => {
            const newEnd = new Date(e.target.value)
            if (newEnd >= startDate) {
              onRangeChange(startDate, newEnd)
            }
          }}
          className="px-3 py-2 border border-input rounded-md bg-background text-sm"
        />
      </div>
      
      <div className="flex gap-1">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => {
              const { start, end } = preset.getValue()
              onRangeChange(start, end)
            }}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  )
}