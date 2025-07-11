import React from 'react'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/utils'

export type LayoutMode = 'grid' | 'list'

interface KDSLayoutProps {
  mode: LayoutMode
  onModeChange: (mode: LayoutMode) => void
  children: React.ReactNode
  className?: string
}

export const KDSLayout: React.FC<KDSLayoutProps> = ({
  mode,
  onModeChange,
  children,
  className
}) => {
  return (
    <div className={className}>
      {/* Layout Controls */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-lg shadow-sm" role="group">
          <Button
            variant={mode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('grid')}
            className="rounded-r-none"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={mode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('list')}
            className="rounded-l-none border-l-0"
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>
      </div>
      
      {/* Layout Container */}
      <div
        className={cn(
          mode === 'grid' && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
          mode === 'list' && 'space-y-4'
        )}
      >
        {children}
      </div>
    </div>
  )
}