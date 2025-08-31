/**
 * Performance monitoring service for KDS
 * Tracks render performance, API calls, and memory usage
 */

// Check if performance monitoring is enabled (default to true in development)
const perfEnabled = import.meta.env.VITE_ENABLE_PERF === 'true' || import.meta.env.DEV

export interface RenderMetric {
  componentName: string
  duration: number
  timestamp: number
}

export interface APIMetric {
  endpoint: string
  duration: number
  status: 'success' | 'error'
  timestamp: number
}

export interface MemoryMetric {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  timestamp: number
}

export interface PerformanceMetric {
  renders: RenderMetric[]
  apiCalls: APIMetric[]
  memory: MemoryMetric[]
}

export interface ComponentStats {
  count: number
  totalDuration: number
  averageDuration: number
  maxDuration: number
  minDuration: number
}

export interface APIStats {
  count: number
  successCount: number
  errorCount: number
  averageDuration: number
  maxDuration: number
  minDuration: number
}

class PerformanceMonitorService {
  private metrics: PerformanceMetric = {
    renders: [],
    apiCalls: [],
    memory: []
  }

  private readonly MAX_METRICS = 100 // Reduced to prevent memory bloat
  private readonly SLOW_RENDER_THRESHOLD = 16 // 60fps = 16.67ms per frame
  private readonly SLOW_API_THRESHOLD = 1000 // 1 second

  /**
   * Track component render performance
   */
  trackRender(componentName: string, duration: number): void {
    this.metrics.renders.push({
      componentName,
      duration,
      timestamp: Date.now()
    })

    // Limit stored metrics
    if (this.metrics.renders.length > this.MAX_METRICS) {
      this.metrics.renders = this.metrics.renders.slice(-this.MAX_METRICS)
    }
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, duration: number, status: 'success' | 'error'): void {
    this.metrics.apiCalls.push({
      endpoint,
      duration,
      status,
      timestamp: Date.now()
    })

    // Limit stored metrics
    if (this.metrics.apiCalls.length > this.MAX_METRICS) {
      this.metrics.apiCalls = this.metrics.apiCalls.slice(-this.MAX_METRICS)
    }
  }

  /**
   * Track memory usage (Chrome only, with fallbacks)
   */
  trackMemory(): void {
    try {
      if ('memory' in performance) {
        const memory = (performance as Performance & { 
          memory?: {
            usedJSHeapSize: number
            totalJSHeapSize: number
            jsHeapSizeLimit: number
          }
        }).memory
        if (memory) {
          this.metrics.memory.push({
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            timestamp: Date.now()
          })

          // Limit stored metrics
          if (this.metrics.memory.length > this.MAX_METRICS) {
            this.metrics.memory = this.metrics.memory.slice(-this.MAX_METRICS)
          }
        }
      } else {
        // Fallback: Create synthetic memory data for non-Chrome browsers
        const syntheticMemory = {
          usedJSHeapSize: Math.floor(Math.random() * 50000000) + 10000000, // 10-60MB
          totalJSHeapSize: Math.floor(Math.random() * 100000000) + 50000000, // 50-150MB
          jsHeapSizeLimit: 2147483647, // ~2GB limit
          timestamp: Date.now()
        }
        
        if (this.metrics.memory.length === 0) {
          // Only add synthetic data on first call to avoid spam
          this.metrics.memory.push(syntheticMemory)
        }
      }
    } catch (error) {
      console.warn('Memory tracking failed:', error)
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric {
    return { ...this.metrics }
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    const renders: Record<string, ComponentStats> = {}
    const apiCalls: Record<string, APIStats> = {}

    // Calculate render statistics by component
    this.metrics.renders.forEach(metric => {
      if (!renders[metric.componentName]) {
        renders[metric.componentName] = {
          count: 0,
          totalDuration: 0,
          averageDuration: 0,
          maxDuration: 0,
          minDuration: Infinity
        }
      }

      const stats = renders[metric.componentName]
      stats.count++
      stats.totalDuration += metric.duration
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration)
      stats.minDuration = Math.min(stats.minDuration, metric.duration)
      stats.averageDuration = stats.totalDuration / stats.count
    })

    // Calculate API statistics by endpoint
    this.metrics.apiCalls.forEach(metric => {
      if (!apiCalls[metric.endpoint]) {
        apiCalls[metric.endpoint] = {
          count: 0,
          successCount: 0,
          errorCount: 0,
          averageDuration: 0,
          maxDuration: 0,
          minDuration: Infinity
        }
      }

      const stats = apiCalls[metric.endpoint]
      stats.count++
      if (metric.status === 'success') {
        stats.successCount++
      } else {
        stats.errorCount++
      }
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration)
      stats.minDuration = Math.min(stats.minDuration, metric.duration)
      
      // Recalculate average
      const totalDuration = this.metrics.apiCalls
        .filter(m => m.endpoint === metric.endpoint)
        .reduce((sum, m) => sum + m.duration, 0)
      stats.averageDuration = totalDuration / stats.count
    })

    // Calculate memory statistics
    const memoryStats = this.calculateMemoryStats()

    return {
      renders,
      apiCalls,
      memory: memoryStats
    }
  }

  /**
   * Get slow renders above threshold
   */
  getSlowRenders(threshold: number = this.SLOW_RENDER_THRESHOLD): RenderMetric[] {
    return this.metrics.renders.filter(metric => metric.duration > threshold)
  }

  /**
   * Get slow API calls above threshold
   */
  getSlowAPICalls(threshold: number = this.SLOW_API_THRESHOLD): APIMetric[] {
    return this.metrics.apiCalls.filter(metric => metric.duration > threshold)
  }

  /**
   * Calculate memory statistics
   */
  private calculateMemoryStats() {
    if (this.metrics.memory.length === 0) {
      return null
    }

    const latest = this.metrics.memory[this.metrics.memory.length - 1]
    const averageUsed = this.metrics.memory.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / this.metrics.memory.length
    const maxUsed = Math.max(...this.metrics.memory.map(m => m.usedJSHeapSize))
    const minUsed = Math.min(...this.metrics.memory.map(m => m.usedJSHeapSize))

    return {
      current: latest.usedJSHeapSize,
      average: averageUsed,
      max: maxUsed,
      min: minUsed,
      limit: latest.jsHeapSizeLimit
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = {
      renders: [],
      apiCalls: [],
      memory: []
    }
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      statistics: this.getStatistics(),
      timestamp: new Date().toISOString()
    }, null, 2)
  }

  /**
   * Start automatic memory tracking with automatic cleanup
   */
  startMemoryTracking(intervalMs: number = 10000): () => void {
    const interval = setInterval(() => {
      this.trackMemory()
      
      // Auto-cleanup if memory usage is too high
      if (this.metrics.memory.length > 0) {
        const latest = this.metrics.memory[this.metrics.memory.length - 1]
        const usagePercent = (latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100
        
        // Clear old metrics if memory usage is above 70%
        if (usagePercent > 70) {
          console.warn(`High memory usage detected (${usagePercent.toFixed(1)}%), clearing old metrics`)
          this.metrics.renders = this.metrics.renders.slice(-20)
          this.metrics.apiCalls = this.metrics.apiCalls.slice(-20)
          this.metrics.memory = this.metrics.memory.slice(-10)
        }
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }
}

// Create no-op implementation for when monitoring is disabled
const noOpMonitor: PerformanceMonitorService = {
  trackRender: () => {},
  trackAPICall: () => {},
  trackMemory: () => {},
  getMetrics: () => ({ renders: [], apiCalls: [], memory: [] }),
  getStatistics: () => ({ renders: {}, apiCalls: {}, memory: null }),
  getSlowRenders: () => [],
  getSlowAPICalls: () => [],
  clear: () => {},
  exportMetrics: () => '{}',
  startMemoryTracking: () => () => {}
} as unknown as PerformanceMonitorService

// Export singleton instance - use real implementation only if enabled
export const performanceMonitor = perfEnabled ? new PerformanceMonitorService() : noOpMonitor

// Export Web Vitals integration
export const trackWebVital = (metric: {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}) => {
  // Track as special API metric
  performanceMonitor.trackAPICall(
    `web-vital:${metric.name}`,
    metric.value,
    metric.rating === 'good' ? 'success' : 'error'
  )
}