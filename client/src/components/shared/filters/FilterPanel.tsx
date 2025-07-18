import React, { useState, useEffect, useCallback } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils'
import type { OrderFilters, OrderStatus, TimeRange } from '@/types/filters'
import type { StationType } from '@/types/station'
import { STATION_CONFIG } from '@/types/station'

interface FilterPanelProps {
  filters: OrderFilters
  onStatusChange: (status: OrderStatus[]) => void
  onStationChange: (stations: (StationType | 'all')[]) => void
  onTimeRangeChange: (timeRange: TimeRange) => void
  onSearchChange: (query: string) => void
  onResetFilters: () => void
  hasActiveFilters: boolean
  className?: string
}

const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'preparing', label: 'Preparing', color: 'bg-macon-navy/10 text-macon-navy border-macon-navy/20' },
  { value: 'ready', label: 'Ready', color: 'bg-macon-teal/10 text-macon-teal-dark border-macon-teal/20' }
]

const timeRangeOptions: { value: TimeRange['preset']; label: string }[] = [
  { value: 'last15min', label: 'Last 15 minutes' },
  { value: 'last30min', label: 'Last 30 minutes' },
  { value: 'last1hour', label: 'Last hour' },
  { value: 'today', label: 'Today' }
]

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onStatusChange,
  onStationChange,
  onTimeRangeChange,
  onSearchChange,
  onResetFilters,
  hasActiveFilters,
  className
}) => {
  const [searchInput, setSearchInput] = useState(filters.searchQuery)
  const [isExpanded, setIsExpanded] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, onSearchChange])

  const handleStatusToggle = useCallback((status: OrderStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status]
    onStatusChange(newStatus)
  }, [filters.status, onStatusChange])

  const handleStationToggle = useCallback((station: StationType | 'all') => {
    if (station === 'all') {
      onStationChange(['all'])
    } else {
      const currentStations = filters.stations.filter(s => s !== 'all')
      const newStations = currentStations.includes(station)
        ? currentStations.filter(s => s !== station)
        : [...currentStations, station]
      
      onStationChange(newStations.length === 0 ? ['all'] : newStations)
    }
  }, [filters.stations, onStationChange])

  return (
    <Card className={cn('p-5 border-0 shadow-soft', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-macon-navy/10">
              <Filter className="h-4 w-4 text-macon-navy" />
            </div>
            <h3 className="font-semibold text-macon-navy">Filters</h3>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-macon-navy/40" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search orders..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 border-neutral-200 focus:border-macon-navy/30 focus:ring-macon-navy/20"
            data-search-input
            aria-label="Search orders"
            aria-describedby="search-help"
          />
          <span id="search-help" className="sr-only">
            Search by order number, table number, or item names
          </span>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-4 pt-2">
            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium text-macon-navy mb-3 block">Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(({ value, label, color }) => (
                  <label
                    key={value}
                    className="flex items-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.status.includes(value)}
                      onChange={() => handleStatusToggle(value)}
                      className="sr-only"
                    />
                    <Badge
                      variant={filters.status.includes(value) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:scale-105',
                        filters.status.includes(value) ? color : 'hover:border-neutral-300'
                      )}
                    >
                      {label}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>

            {/* Station Filter */}
            <div>
              <Label className="text-sm font-medium text-macon-navy mb-3 block">Station</Label>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.stations.includes('all')}
                    onChange={() => handleStationToggle('all')}
                    className="sr-only"
                  />
                  <Badge
                    variant={filters.stations.includes('all') ? 'default' : 'outline'}
                    className="cursor-pointer transition-all duration-200 hover:scale-105"
                  >
                    All Stations
                  </Badge>
                </label>
                {Object.entries(STATION_CONFIG).map(([key, config]) => (
                  <label
                    key={key}
                    className="flex items-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.stations.includes(key as StationType)}
                      onChange={() => handleStationToggle(key as StationType)}
                      disabled={filters.stations.includes('all')}
                      className="sr-only"
                    />
                    <Badge
                      variant={filters.stations.includes(key as StationType) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:scale-105',
                        filters.stations.includes(key as StationType) && config.color.replace('text-', 'bg-').replace('800', '100')
                      )}
                    >
                      <span className="mr-1">{config.icon}</span>
                      {config.name}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Range Filter */}
            <div>
              <Label htmlFor="time-range" className="text-sm font-medium text-macon-navy mb-3 block">
                Time Range
              </Label>
              <select
                id="time-range"
                value={filters.timeRange.preset || 'today'}
                onChange={(e) => onTimeRangeChange({ preset: e.target.value as TimeRange['preset'] })}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg bg-white hover:border-macon-navy/30 focus:border-macon-navy/30 focus:ring-2 focus:ring-macon-navy/20 focus:outline-none transition-all duration-200"
                aria-label="Time range"
              >
                {timeRangeOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}