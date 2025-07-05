import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { ComponentStats } from '@/services/performance/performanceMonitor'
import { cn } from '@/lib/utils'

interface ComponentMetricsTableProps {
  statistics: Record<string, ComponentStats>
}

export const ComponentMetricsTable: React.FC<ComponentMetricsTableProps> = ({ statistics }) => {
  const components = Object.entries(statistics)
    .sort((a, b) => b[1].averageDuration - a[1].averageDuration)

  if (components.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No component metrics available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Component</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Renders</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Avg Time</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Min Time</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Max Time</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Total Time</th>
            <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {components.map(([name, stats]) => {
            const isSlowAverage = stats.averageDuration > 16
            const hasSlowRenders = stats.maxDuration > 16
            
            return (
              <tr key={name} className="hover:bg-muted/25 transition-colors">
                <td className="px-4 py-3 text-sm font-medium">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {name}
                  </code>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {stats.count.toLocaleString()}
                </td>
                <td className={cn(
                  "px-4 py-3 text-sm text-right font-mono",
                  isSlowAverage && "text-yellow-600 font-semibold"
                )}>
                  {stats.averageDuration.toFixed(2)}ms
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono text-muted-foreground">
                  {stats.minDuration.toFixed(2)}ms
                </td>
                <td className={cn(
                  "px-4 py-3 text-sm text-right font-mono",
                  hasSlowRenders && "text-orange-600"
                )}>
                  {stats.maxDuration.toFixed(2)}ms
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono text-muted-foreground">
                  {stats.totalDuration.toFixed(0)}ms
                </td>
                <td className="px-4 py-3 text-center">
                  {isSlowAverage ? (
                    <Badge variant="destructive" className="text-xs">
                      Slow
                    </Badge>
                  ) : hasSlowRenders ? (
                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                      Warning
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                      Good
                    </Badge>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}