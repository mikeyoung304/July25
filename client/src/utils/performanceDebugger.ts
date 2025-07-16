/**
 * Performance debugging utility for tracking React rendering issues
 */

import { env } from '@/utils/env'

interface PerformanceMetrics {
  renderCount: number
  layoutEffectCount: number
  lastRenderTime: number
  warnings: string[]
}

class PerformanceDebugger {
  private metrics: Map<string, PerformanceMetrics> = new Map()
  private originalConsoleError: typeof console.error
  
  constructor() {
    this.originalConsoleError = console.error
    this.interceptConsoleWarnings()
  }
  
  private interceptConsoleWarnings() {
    // Only intercept in development
    if (env.MODE === 'production') return
    
    console.error = (...args: unknown[]) => {
      const message = args[0]?.toString() || ''
      
      // Detect React DOM warnings
      if (message.includes('recursivelyTraverseLayoutEffects')) {
        this.recordWarning('layout-effects', message)
      }
      
      // Call original console.error
      this.originalConsoleError.apply(console, args)
    }
  }
  
  recordWarning(component: string, warning: string) {
    const metrics = this.metrics.get(component) || {
      renderCount: 0,
      layoutEffectCount: 0,
      lastRenderTime: Date.now(),
      warnings: []
    }
    
    metrics.warnings.push(`${new Date().toISOString()}: ${warning}`)
    metrics.layoutEffectCount++
    
    this.metrics.set(component, metrics)
    
    // Log aggregated warnings every 10 occurrences
    if (metrics.layoutEffectCount % 10 === 0) {
      console.warn(`[Performance] Component "${component}" has triggered ${metrics.layoutEffectCount} layout effect warnings`)
    }
  }
  
  recordRender(component: string) {
    const metrics = this.metrics.get(component) || {
      renderCount: 0,
      layoutEffectCount: 0,
      lastRenderTime: Date.now(),
      warnings: []
    }
    
    metrics.renderCount++
    metrics.lastRenderTime = Date.now()
    
    this.metrics.set(component, metrics)
  }
  
  getMetrics(component?: string): PerformanceMetrics | Map<string, PerformanceMetrics> {
    if (component) {
      return this.metrics.get(component) || {
        renderCount: 0,
        layoutEffectCount: 0,
        lastRenderTime: 0,
        warnings: []
      }
    }
    return new Map(this.metrics)
  }
  
  clearMetrics() {
    this.metrics.clear()
  }
  
  generateReport(): string {
    const report: string[] = ['=== Performance Debug Report ===']
    
    this.metrics.forEach((metrics, component) => {
      report.push(`\nComponent: ${component}`)
      report.push(`  Renders: ${metrics.renderCount}`)
      report.push(`  Layout Effect Warnings: ${metrics.layoutEffectCount}`)
      report.push(`  Last Render: ${new Date(metrics.lastRenderTime).toISOString()}`)
      
      if (metrics.warnings.length > 0) {
        report.push(`  Recent Warnings (last 5):`)
        metrics.warnings.slice(-5).forEach(warning => {
          report.push(`    - ${warning}`)
        })
      }
    })
    
    return report.join('\n')
  }
}

// Export singleton instance
export const performanceDebugger = new PerformanceDebugger()

// React hook for tracking component renders
export function usePerformanceTracking(componentName: string) {
  if (env.DEV) {
    performanceDebugger.recordRender(componentName)
  }
}

// Utility to log performance report
export function logPerformanceReport() {
  if (env.DEV) {
    console.warn(performanceDebugger.generateReport())
  }
}