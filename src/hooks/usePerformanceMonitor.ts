import { useEffect, useState, useCallback, useRef } from 'react'
import { performanceMonitor } from '@/services/performance/performanceMonitor'

export interface UsePerformanceMonitorOptions {
  trackMemory?: boolean
  memoryInterval?: number
  component?: string
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const { trackMemory = true, memoryInterval = 10000, component } = options
  const [metrics, setMetrics] = useState(() => performanceMonitor.getMetrics())
  const [statistics, setStatistics] = useState(() => performanceMonitor.getStatistics())
  const renderStartTime = useRef<number | undefined>(undefined)

  // Start render tracking
  useEffect(() => {
    if (component) {
      renderStartTime.current = performance.now()
      
      return () => {
        if (renderStartTime.current) {
          const duration = performance.now() - renderStartTime.current
          performanceMonitor.trackRender(component, duration)
        }
      }
    }
  }, [component])

  // Start memory tracking
  useEffect(() => {
    if (trackMemory) {
      const stopTracking = performanceMonitor.startMemoryTracking(memoryInterval)
      return stopTracking
    }
  }, [trackMemory, memoryInterval])

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics())
      setStatistics(performanceMonitor.getStatistics())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Track API call wrapper
  const trackAPICall = useCallback(async <T,>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await apiCall()
      const duration = performance.now() - startTime
      performanceMonitor.trackAPICall(endpoint, duration, 'success')
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      performanceMonitor.trackAPICall(endpoint, duration, 'error')
      throw error
    }
  }, [])

  // Get slow operations
  const getSlowOperations = useCallback(() => {
    return {
      renders: performanceMonitor.getSlowRenders(),
      apiCalls: performanceMonitor.getSlowAPICalls()
    }
  }, [])

  // Export data
  const exportPerformanceData = useCallback(() => {
    const data = performanceMonitor.exportMetrics()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `performance-metrics-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  // Clear metrics
  const clearMetrics = useCallback(() => {
    performanceMonitor.clear()
    setMetrics(performanceMonitor.getMetrics())
    setStatistics(performanceMonitor.getStatistics())
  }, [])

  return {
    metrics,
    statistics,
    trackAPICall,
    getSlowOperations,
    exportPerformanceData,
    clearMetrics
  }
}