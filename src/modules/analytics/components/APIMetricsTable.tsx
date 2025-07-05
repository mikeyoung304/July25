import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { APIStats } from '@/services/performance/performanceMonitor'
import { cn } from '@/lib/utils'

interface APIMetricsTableProps {
  statistics: Record<string, APIStats>
}

export const APIMetricsTable: React.FC<APIMetricsTableProps> = ({ statistics }) => {
  const endpoints = Object.entries(statistics)
    .sort((a, b) => b[1].averageDuration - a[1].averageDuration)

  if (endpoints.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No API metrics available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Endpoint</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Total Calls</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Success</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Errors</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Avg Time</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Min Time</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Max Time</th>
            <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {endpoints.map(([endpoint, stats]) => {
            const errorRate = (stats.errorCount / stats.count) * 100
            const isSlowAverage = stats.averageDuration > 1000
            const hasSlowCalls = stats.maxDuration > 1000
            const hasErrors = errorRate > 5
            
            return (
              <tr key={endpoint} className="hover:bg-muted/25 transition-colors">
                <td className="px-4 py-3 text-sm font-medium">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {endpoint}
                  </code>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {stats.count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-600">
                  {stats.successCount.toLocaleString()}
                </td>
                <td className={cn(
                  "px-4 py-3 text-sm text-right",
                  stats.errorCount > 0 && "text-red-600 font-semibold"
                )}>
                  {stats.errorCount.toLocaleString()}
                  {stats.errorCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({errorRate.toFixed(1)}%)
                    </span>
                  )}
                </td>
                <td className={cn(
                  "px-4 py-3 text-sm text-right font-mono",
                  isSlowAverage && "text-yellow-600 font-semibold"
                )}>
                  {stats.averageDuration.toFixed(0)}ms
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono text-muted-foreground">
                  {stats.minDuration.toFixed(0)}ms
                </td>
                <td className={cn(
                  "px-4 py-3 text-sm text-right font-mono",
                  hasSlowCalls && "text-orange-600"
                )}>
                  {stats.maxDuration.toFixed(0)}ms
                </td>
                <td className="px-4 py-3 text-center">
                  {hasErrors ? (
                    <Badge variant="destructive" className="text-xs">
                      Errors
                    </Badge>
                  ) : isSlowAverage ? (
                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                      Slow
                    </Badge>
                  ) : hasSlowCalls ? (
                    <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
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