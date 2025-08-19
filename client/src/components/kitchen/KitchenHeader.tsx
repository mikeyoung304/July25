import React from 'react'
import { Badge } from '@/components/ui/badge'
import { ActionButton } from '@/components/ui/ActionButton'
import { SortControl } from '@/components/shared/filters/SortControl'
import { SoundControl } from '@/components/shared/controls/SoundControl'
import { PageHeader } from '@/components/ui/PageHeader'
import { RefreshCw } from 'lucide-react'
import type { SortBy } from '@/types/filters'
import type { Restaurant } from '@/core'

interface KitchenHeaderProps {
  restaurant: Restaurant | null | undefined
  activeOrdersCount: number
  isConnected: boolean
  filters: {
    sortBy: string
    sortDirection: 'asc' | 'desc'
  }
  onSortChange: (sortBy: string) => void
  onDirectionToggle: () => void
  soundEnabled: boolean
  volume: number
  onToggleSound: () => void
  onVolumeChange: (volume: number) => void
  onRefresh: () => void
}

export function KitchenHeader({
  restaurant,
  activeOrdersCount,
  isConnected,
  filters,
  onSortChange,
  onDirectionToggle,
  soundEnabled,
  volume,
  onToggleSound,
  onVolumeChange,
  onRefresh
}: KitchenHeaderProps) {
  return (
    <PageHeader
      title={`${restaurant?.name || 'Restaurant'} - Kitchen Display`}
      subtitle="Real-time order management system"
      showBack={true}
      backPath="/"
      actions={
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-4 py-1.5 text-sm">
            <span className="font-semibold">{activeOrdersCount}</span>
            <span className="ml-1.5">Active Orders</span>
          </Badge>
          <Badge 
            variant={isConnected ? "success" : "destructive"} 
            className="px-3 py-1.5 text-sm"
          >
            <span className="w-2 h-2 rounded-full bg-current mr-2 inline-block"></span>
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          <SortControl
            sortBy={filters.sortBy as SortBy}
            sortDirection={filters.sortDirection}
            onSortChange={(sortBy) => {
              if (sortBy === 'created_at' || sortBy === 'order_number' || sortBy === 'status') {
                onSortChange(sortBy)
              }
            }}
            onDirectionToggle={onDirectionToggle}
          />
          <SoundControl
            enabled={soundEnabled}
            volume={volume}
            onToggle={onToggleSound}
            onVolumeChange={onVolumeChange}
          />
          <ActionButton
            size="medium"
            variant="outline"
            onClick={onRefresh}
            color="#4ECDC4"
            icon={<RefreshCw className="h-5 w-5" />}
          >
            Refresh
          </ActionButton>
        </div>
      }
    />
  )
}