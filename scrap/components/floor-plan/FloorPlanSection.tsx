'use client'

import { Suspense, memo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrderFlow } from '@/lib/state/order-flow-context'
import { useServerPageData } from '@/lib/hooks/use-server-page-data'
import { PageLoadingState } from '@/components/loading-states'

// Dynamic import for FloorPlanView to reduce bundle size
const FloorPlanView = dynamic(
  () => import('@/components/floor-plan-view').then(m => ({ default: m.FloorPlanView })),
  {
    loading: () => <FloorPlanLoadingSkeleton />,
    ssr: false,
  }
)

interface FloorPlanSectionProps {
  className?: string
}

function FloorPlanLoadingSkeleton() {
  return (
    <div className="h-96 w-full rounded-lg bg-gray-800/20 animate-pulse flex items-center justify-center">
      <div className="text-center space-y-2">
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </div>
    </div>
  )
}

function FloorPlanHeader() {
  const { tables, loading } = useServerPageData()
  
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-blue-400" />
        <h3 className="font-semibold text-white">Floor Plan</h3>
      </div>
      
      <div className="flex items-center gap-2">
        {loading ? (
          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
            Loading...
          </Badge>
        ) : (
          <>
            <Badge variant="secondary" className="bg-gray-700 text-gray-300">
              {tables.length} tables
            </Badge>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                tables.filter((t: any) => t.status === 'available').length > 0 
                  ? "bg-green-900/40 text-green-400" 
                  : "bg-red-900/40 text-red-400"
              )}
            >
              {tables.filter((t: any) => t.status === 'available').length} available
            </Badge>
          </>
        )}
      </div>
    </div>
  )
}

function FloorPlanErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="h-96 flex items-center justify-center">
          <PageLoadingState message="Loading floor plan..." showProgress={false} />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function FloorPlanContent() {
  const { tables, loading, error } = useServerPageData()
  const { actions } = useOrderFlow()

  if (loading) {
    return (
      <div className="p-6">
        <PageLoadingState message="Loading floor plan..." showProgress={false} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load floor plan: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!tables || tables.length === 0) {
    return (
      <div className="p-6">
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            No tables found. Please add tables to the floor plan first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6">
      <FloorPlanErrorBoundary>
        <FloorPlanView
          floorPlanId="default"
          onSelectTable={actions.selectTable}
          tables={tables}
        />
      </FloorPlanErrorBoundary>
    </div>
  )
}

export const FloorPlanSection = memo<FloorPlanSectionProps>(({ className }) => {
  return (
    <Card className={cn(
      "bg-gray-800/40 border-gray-700/30 backdrop-blur-sm",
      className
    )}>
      <CardContent className="p-0">
        <FloorPlanHeader />
        <FloorPlanContent />
      </CardContent>
    </Card>
  )
})

FloorPlanSection.displayName = 'FloorPlanSection'