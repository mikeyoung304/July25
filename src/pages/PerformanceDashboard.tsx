import React from 'react'
import { Activity, Download, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'
import { PerformanceChart } from '@/features/performance/components/PerformanceChart'
import { ComponentMetricsTable } from '@/features/performance/components/ComponentMetricsTable'
import { APIMetricsTable } from '@/features/performance/components/APIMetricsTable'
import { cn } from '@/lib/utils'

export const PerformanceDashboard: React.FC = () => {
  const { 
    metrics, 
    statistics, 
    getSlowOperations, 
    exportPerformanceData, 
    clearMetrics 
  } = usePerformanceMonitor()

  const slowOps = getSlowOperations()
  const hasPerformanceIssues = slowOps.renders.length > 0 || slowOps.apiCalls.length > 0

  // Calculate key metrics
  const totalRenders = metrics.renders.length
  const totalAPICalls = metrics.apiCalls.length
  const avgRenderTime = totalRenders > 0
    ? metrics.renders.reduce((sum, r) => sum + r.duration, 0) / totalRenders
    : 0
  const avgAPITime = totalAPICalls > 0
    ? metrics.apiCalls.reduce((sum, a) => sum + a.duration, 0) / totalAPICalls
    : 0
  const apiErrorRate = totalAPICalls > 0
    ? (metrics.apiCalls.filter(a => a.status === 'error').length / totalAPICalls) * 100
    : 0

  const memoryStats = statistics.memory

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Performance Dashboard
            </h1>
            <p className="text-muted-foreground">Monitor and analyze KDS performance metrics</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPerformanceData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={clearMetrics}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Performance Alert */}
        {hasPerformanceIssues && (
          <Card className="mb-6 border-yellow-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                Performance Issues Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {slowOps.renders.length > 0 && (
                  <p className="text-sm">
                    <Badge variant="outline" className="mr-2">{slowOps.renders.length}</Badge>
                    slow component renders detected (&gt;16ms)
                  </p>
                )}
                {slowOps.apiCalls.length > 0 && (
                  <p className="text-sm">
                    <Badge variant="outline" className="mr-2">{slowOps.apiCalls.length}</Badge>
                    slow API calls detected (&gt;1000ms)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Render Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                avgRenderTime > 16 ? "text-yellow-500" : "text-green-500"
              )}>
                {avgRenderTime.toFixed(2)}ms
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Target: &lt;16ms (60fps)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg API Response</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                avgAPITime > 1000 ? "text-yellow-500" : "text-green-500"
              )}>
                {avgAPITime.toFixed(0)}ms
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Target: &lt;1000ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">API Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                apiErrorRate > 5 ? "text-red-500" : "text-green-500"
              )}>
                {apiErrorRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Target: &lt;5%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {memoryStats ? (memoryStats.current / 1024 / 1024).toFixed(0) : '0'}MB
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {memoryStats ? `${((memoryStats.current / memoryStats.limit) * 100).toFixed(0)}% of limit` : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Render Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart 
                data={metrics.renders.slice(-50)}
                type="render"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart 
                data={metrics.apiCalls.slice(-50)}
                type="api"
              />
            </CardContent>
          </Card>
        </div>

        {/* Component Metrics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Component Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ComponentMetricsTable statistics={statistics.renders} />
          </CardContent>
        </Card>

        {/* API Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>API Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <APIMetricsTable statistics={statistics.apiCalls} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}