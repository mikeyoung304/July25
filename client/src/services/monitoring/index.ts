/**
 * Simple monitoring service for error logging and Web Vitals
 */

import { logger } from './logger'

// Web Vitals monitoring
let webVitalsInitialized = false

export function initializeWebVitals() {
  if (webVitalsInitialized) return

  try {
    // Dynamic import to avoid SSR issues
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB }) => {
      // Report Core Web Vitals
      onCLS((metric) => {
        logger.info('Web Vital: CLS', { value: metric.value, rating: metric.rating })
      })

      onFCP((metric) => {
        logger.info('Web Vital: FCP', { value: metric.value, rating: metric.rating })
      })

      onLCP((metric) => {
        logger.info('Web Vital: LCP', { value: metric.value, rating: metric.rating })
      })

      onTTFB((metric) => {
        logger.info('Web Vital: TTFB', { value: metric.value, rating: metric.rating })
      })

      webVitalsInitialized = true
    }).catch((error) => {
      logger.warn('Failed to initialize web vitals', { error })
    })
  } catch (error) {
    logger.warn('Web vitals not available', { error })
  }
}

// Error reporting
export function reportError(error: Error, context?: Record<string, unknown>) {
  logger.error('Application error', { 
    error: error.message, 
    stack: error.stack,
    context 
  })

  // Store in localStorage for debugging
  try {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context
    }

    const existingErrors = JSON.parse(localStorage.getItem('errorLog') || '[]')
    existingErrors.push(errorLog)
    
    // Keep only last 10 errors
    if (existingErrors.length > 10) {
      existingErrors.splice(0, existingErrors.length - 10)
    }
    
    localStorage.setItem('errorLog', JSON.stringify(existingErrors))
  } catch (storageError) {
    logger.warn('Failed to store error in localStorage', { storageError })
  }
}

// Performance monitoring
export function trackPerformance(name: string, duration: number) {
  logger.info('Performance metric', { name, duration })
}

// User interaction tracking
export function trackUserInteraction(action: string, details?: Record<string, unknown>) {
  logger.info('User interaction', { action, details })
}