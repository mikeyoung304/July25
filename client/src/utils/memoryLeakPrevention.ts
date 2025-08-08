/**
 * Memory Leak Prevention Utilities
 * Provides tools to detect and prevent memory leaks in React applications
 */

interface MemorySnapshot {
  timestamp: number
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = []
  private readonly MAX_SNAPSHOTS = 20
  private warningThreshold = 0.7 // 70% memory usage
  private criticalThreshold = 0.85 // 85% memory usage
  private monitorInterval: NodeJS.Timeout | null = null
  
  /**
   * Start monitoring memory usage
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitorInterval) {
      this.stopMonitoring()
    }
    
    this.monitorInterval = setInterval(() => {
      this.takeSnapshot()
    }, intervalMs)
    
    // Take initial snapshot
    this.takeSnapshot()
  }
  
  /**
   * Stop monitoring memory usage
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    this.snapshots = []
  }
  
  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    if (!performance || !('memory' in performance)) {
      return // Memory API not available
    }
    
    const memory = (performance as any).memory
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    }
    
    this.snapshots.push(snapshot)
    
    // Keep only recent snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS)
    }
    
    // Check for memory issues
    this.checkMemoryHealth(snapshot)
  }
  
  /**
   * Check memory health and trigger warnings
   */
  private checkMemoryHealth(snapshot: MemorySnapshot): void {
    const usagePercent = snapshot.usedJSHeapSize / snapshot.jsHeapSizeLimit
    
    if (usagePercent > this.criticalThreshold) {
      console.error(`🚨 CRITICAL: Memory usage at ${(usagePercent * 100).toFixed(1)}%`)
      this.triggerMemoryCleanup()
    } else if (usagePercent > this.warningThreshold) {
      console.warn(`⚠️ WARNING: High memory usage at ${(usagePercent * 100).toFixed(1)}%`)
    }
    
    // Check for memory leak pattern (continuous growth)
    if (this.detectMemoryLeak()) {
      console.error('🚨 Potential memory leak detected!')
    }
  }
  
  /**
   * Detect potential memory leak based on growth pattern
   */
  private detectMemoryLeak(): boolean {
    if (this.snapshots.length < 5) return false
    
    const recentSnapshots = this.snapshots.slice(-5)
    let growthCount = 0
    
    for (let i = 1; i < recentSnapshots.length; i++) {
      if (recentSnapshots[i].usedJSHeapSize > recentSnapshots[i - 1].usedJSHeapSize) {
        growthCount++
      }
    }
    
    // If memory grew in 4 out of 5 snapshots, potential leak
    return growthCount >= 4
  }
  
  /**
   * Trigger memory cleanup
   */
  private triggerMemoryCleanup(): void {
    // Dispatch custom event for components to clean up
    window.dispatchEvent(new CustomEvent('memory-pressure', {
      detail: { 
        severity: 'critical',
        timestamp: Date.now()
      }
    }))
    
    // Force garbage collection if available (Chrome with --js-flags="--expose-gc")
    if (typeof (global as any).gc === 'function') {
      (global as any).gc()
    }
  }
  
  /**
   * Get memory statistics
   */
  getStats(): {
    current: MemorySnapshot | null
    average: number
    trend: 'stable' | 'growing' | 'shrinking'
    healthStatus: 'good' | 'warning' | 'critical'
  } {
    if (this.snapshots.length === 0) {
      return {
        current: null,
        average: 0,
        trend: 'stable',
        healthStatus: 'good'
      }
    }
    
    const current = this.snapshots[this.snapshots.length - 1]
    const average = this.snapshots.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / this.snapshots.length
    
    // Determine trend
    let trend: 'stable' | 'growing' | 'shrinking' = 'stable'
    if (this.snapshots.length >= 3) {
      const recent = this.snapshots.slice(-3)
      const firstUsage = recent[0].usedJSHeapSize
      const lastUsage = recent[2].usedJSHeapSize
      const change = (lastUsage - firstUsage) / firstUsage
      
      if (change > 0.1) trend = 'growing'
      else if (change < -0.1) trend = 'shrinking'
    }
    
    // Determine health status
    const usagePercent = current.usedJSHeapSize / current.jsHeapSizeLimit
    let healthStatus: 'good' | 'warning' | 'critical' = 'good'
    if (usagePercent > this.criticalThreshold) healthStatus = 'critical'
    else if (usagePercent > this.warningThreshold) healthStatus = 'warning'
    
    return {
      current,
      average,
      trend,
      healthStatus
    }
  }
}

/**
 * WeakMap-based cache for preventing memory leaks
 */
export class WeakCache<K extends object, V> {
  private cache = new WeakMap<K, V>()
  
  get(key: K): V | undefined {
    return this.cache.get(key)
  }
  
  set(key: K, value: V): void {
    this.cache.set(key, value)
  }
  
  has(key: K): boolean {
    return this.cache.has(key)
  }
  
  delete(key: K): boolean {
    return this.cache.delete(key)
  }
}

/**
 * Cleanup registry for managing disposable resources
 */
export class CleanupRegistry {
  private cleanupFunctions: Array<() => void> = []
  
  register(cleanup: () => void): () => void {
    this.cleanupFunctions.push(cleanup)
    
    // Return unregister function
    return () => {
      const index = this.cleanupFunctions.indexOf(cleanup)
      if (index > -1) {
        this.cleanupFunctions.splice(index, 1)
      }
    }
  }
  
  cleanup(): void {
    // Run all cleanup functions in reverse order
    for (let i = this.cleanupFunctions.length - 1; i >= 0; i--) {
      try {
        this.cleanupFunctions[i]()
      } catch (error) {
        console.error('Cleanup error:', error)
      }
    }
    this.cleanupFunctions = []
  }
}

// Export singleton instance
export const memoryLeakDetector = new MemoryLeakDetector()

// Auto-start monitoring in development
if (import.meta.env.DEV) {
  memoryLeakDetector.startMonitoring(60000) // Check every minute
}

// Listen for memory pressure events
window.addEventListener('memory-pressure', ((event: CustomEvent) => {
  console.warn('Memory pressure event received:', event.detail)
  
  // Clear caches and temporary data
  // This could trigger app-specific cleanup
}) as EventListener)

// Export utility functions
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getMemoryUsage(): {
  used: string
  total: string
  percent: number
} | null {
  if (!performance || !('memory' in performance)) {
    return null
  }
  
  const memory = (performance as any).memory
  const percent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
  
  return {
    used: formatBytes(memory.usedJSHeapSize),
    total: formatBytes(memory.jsHeapSizeLimit),
    percent: Math.round(percent)
  }
}