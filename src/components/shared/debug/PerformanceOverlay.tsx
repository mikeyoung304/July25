import React, { useState } from 'react'
import { Activity, X, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'
import { cn } from '@/lib/utils'

interface PerformanceOverlayProps {
  enabled?: boolean
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({ enabled = true }) => {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isVisible, setIsVisible] = useState(enabled)
  const { metrics, statistics, getSlowOperations, clearMetrics } = usePerformanceMonitor()

  if (!isVisible) return null

  const slowOps = getSlowOperations()
  const memoryStats = statistics.memory
  const memoryUsageMB = memoryStats ? (memoryStats.current / 1024 / 1024).toFixed(1) : '0'
  const memoryPercentage = memoryStats 
    ? ((memoryStats.current / memoryStats.limit) * 100).toFixed(1)
    : '0'

  // Get recent render performance
  const recentRenders = metrics.renders.slice(-10)
  const avgRenderTime = recentRenders.length > 0
    ? (recentRenders.reduce((sum, r) => sum + r.duration, 0) / recentRenders.length).toFixed(2)
    : '0'

  // Get recent API performance
  const recentAPIs = metrics.apiCalls.slice(-10)
  const avgAPITime = recentAPIs.length > 0
    ? (recentAPIs.reduce((sum, a) => sum + a.duration, 0) / recentAPIs.length).toFixed(0)
    : '0'

  const errorRate = recentAPIs.length > 0
    ? ((recentAPIs.filter(a => a.status === 'error').length / recentAPIs.length) * 100).toFixed(0)
    : '0'

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="icon"
          variant="outline"
          onClick={() => setIsMinimized(false)}
          className="bg-background shadow-lg"
        >
          <Activity className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 p-4 bg-background/95 backdrop-blur shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Performance Monitor
        </h3>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Memory Usage */}
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Memory</span>
            <span className={cn(
              'font-mono',
              parseFloat(memoryPercentage) > 80 && 'text-red-500'
            )}>
              {memoryUsageMB}MB ({memoryPercentage}%)
            </span>
          </div>
          <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all',
                parseFloat(memoryPercentage) > 80 ? 'bg-red-500' : 
                parseFloat(memoryPercentage) > 60 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${memoryPercentage}%` }}
            />
          </div>
        </div>

        {/* Render Performance */}
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Avg Render</span>
            <span className={cn(
              'font-mono',
              parseFloat(avgRenderTime) > 16 && 'text-yellow-500'
            )}>
              {avgRenderTime}ms
            </span>
          </div>
          {slowOps.renders.length > 0 && (
            <div className="mt-1">
              <Badge variant="destructive" className="text-xs">
                {slowOps.renders.length} slow renders
              </Badge>
            </div>
          )}
        </div>

        {/* API Performance */}
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Avg API</span>
            <span className={cn(
              'font-mono',
              parseFloat(avgAPITime) > 1000 && 'text-yellow-500'
            )}>
              {avgAPITime}ms
            </span>
          </div>
          {parseFloat(errorRate) > 0 && (
            <div className="mt-1">
              <Badge variant="destructive" className="text-xs">
                {errorRate}% error rate
              </Badge>
            </div>
          )}
        </div>

        {/* Component Stats */}
        <div className="border-t pt-2">
          <div className="text-xs text-muted-foreground mb-1">Top Components</div>
          <div className="space-y-1">
            {Object.entries(statistics.renders)
              .sort((a, b) => b[1].averageDuration - a[1].averageDuration)
              .slice(0, 3)
              .map(([name, stats]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[150px]">{name}</span>
                  <span className="font-mono text-muted-foreground">
                    {stats.averageDuration.toFixed(1)}ms × {stats.count}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={clearMetrics}
            className="text-xs h-7"
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.href = '/performance'}
            className="text-xs h-7"
          >
            Details
          </Button>
        </div>
      </div>
    </Card>
  )
}