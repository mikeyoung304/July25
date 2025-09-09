/**
 * Enhanced HTTP Client for Macon AI Restaurant OS
 * Implements Luis's API connection specification:
 * - Supabase JWT authentication
 * - X-Restaurant-ID header for multi-tenancy
 * - snake_case data transformation
 * - Status code-based error handling
 */

import { SecureAPIClient, APIError } from '@/services/secureApi'
import { logger } from '@/services/logger'
import { supabase } from '@/core/supabase'
import { getAuthToken } from '@/services/auth'
// Removed case transformation - server handles this
import { env } from '@/utils/env'
import { RequestBatcher } from './RequestBatcher'
import { ResponseCache } from '../cache/ResponseCache'
import type { JsonValue } from '@/../../shared/types/api.types'

// Global variable to store the current restaurant ID
// This will be set by the RestaurantContext provider
let currentRestaurantId: string | null = null

export function setCurrentRestaurantId(restaurantId: string | null) {
  currentRestaurantId = restaurantId
}

export function getCurrentRestaurantId(): string | null {
  return currentRestaurantId
}

export interface HttpRequestOptions extends RequestInit {
  params?: Record<string, unknown>
  skipAuth?: boolean
  skipRestaurantId?: boolean
  skipTransform?: boolean
}

// Simple cache for GET requests
interface CacheEntry<T> {
  data: T
  timestamp: number
}

// Cache configuration
const CACHE_TTL = {
  '/api/v1/menu': 5 * 60 * 1000,          // 5 minutes for menu
  '/api/v1/menu/categories': 5 * 60 * 1000, // 5 minutes for categories
  '/api/v1/tables': 0,                    // No caching for tables (floor plan needs real-time data)
  default: 60 * 1000                      // 1 minute default
}

export class HttpClient extends SecureAPIClient {
  // Simple in-memory cache for GET requests
  private cache = new Map<string, CacheEntry<JsonValue>>()
  // Track in-flight requests to prevent duplicates
  private inFlightRequests = new Map<string, Promise<JsonValue>>()
  // Request batcher for reducing network overhead
  private batcher: RequestBatcher
  // Response cache with LRU eviction
  private responseCache: ResponseCache
  
  constructor() {
    let baseURL = 'http://localhost:3001'
    
    // Get base URL from environment
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      // Use default URL in test environment
      baseURL = 'http://localhost:3001'
    } else {
      try {
        const viteUrl = env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL
        logger.info('[httpClient] env.VITE_API_BASE_URL:', env.VITE_API_BASE_URL)
        logger.info('[httpClient] import.meta.env.VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
        if (viteUrl) {
          baseURL = viteUrl
        } else if (import.meta.env.PROD) {
          // Default to production API if no env var set
          baseURL = 'https://july25.onrender.com'
          logger.info('[httpClient] Using default production API:', baseURL)
        }
        // In production without a configured backend, warn the user
        if (import.meta.env.PROD && baseURL.includes('localhost')) {
          console.error('⚠️ Production build is trying to connect to localhost backend!')
          console.error('Using default production API instead: https://july25.onrender.com')
          console.error('You need to deploy your backend and set VITE_API_BASE_URL to its URL')
          console.error('env object:', env)
          console.error('import.meta.env:', import.meta.env)
        }
      } catch {
        // Fallback for environments without import.meta
      }
    }
    
    super(baseURL)
    
    // Initialize request batcher
    this.batcher = new RequestBatcher({
      maxBatchSize: 10,
      maxWaitTime: 50,
      batchEndpoint: '/api/v1/batch'
    })
    
    // Initialize response cache
    this.responseCache = new ResponseCache({
      maxSize: 100,
      defaultTTL: 60000
    })
  }

  /**
   * Override the base request method to add our custom logic
   */
  async request<T>(
    endpoint: string,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    const {
      params,
      skipAuth = false,
      skipRestaurantId = false,
      skipTransform = false,
      ...requestOptions
    } = options

    // Build headers
    const headers = new Headers(requestOptions.headers)

    // 1. Add authentication using auth bridge (supports all auth methods)
    if (!skipAuth) {
      try {
        // Use auth bridge which supports email/PIN/station/kiosk authentication
        const token = await getAuthToken()
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
          if (import.meta.env.DEV) {
            logger.info('🔐 Using auth bridge token for API request')
          }
        } else {
          console.warn('❌ No authentication available for API request')
        }
      } catch (error) {
        console.error('Failed to get auth token:', error)
        // No fallback - authentication is required
      }
    }

    // 2. Add x-restaurant-id header (per Luis's spec)
    if (!skipRestaurantId) {
      const restaurantId = getCurrentRestaurantId()
      
      // Restaurant ID is required for multi-tenant operations
      if (!restaurantId) {
        logger.warn('⚠️ No restaurant ID available for API request')
        throw new Error('Restaurant context is required for API requests')
      }
      
      headers.set('x-restaurant-id', restaurantId)
      
      const debugVoice = import.meta.env.VITE_DEBUG_VOICE === 'true';
      if (import.meta.env.DEV && debugVoice) {
        logger.info(`[HttpClient] X-Restaurant-ID: ${restaurantId} → ${endpoint}`);
      }
    }

    // 3. Use request body as-is (server handles transformations)
    const body = requestOptions.body

    // 4. Pass query params as-is
    let url = endpoint
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      
      url = `${endpoint}?${searchParams.toString()}`
    }

    try {
      // Make the request using the parent class
      const response = await super.request<unknown>(url, {
        ...requestOptions,
        headers,
        body
      })

      // 5. Return response as-is (already in camelCase from server)
      return response as T
    } catch (error) {
      // Handle API errors according to Luis's spec (status code-based)
      if (error instanceof APIError) {
        // Error details already in correct format from server
      }
      throw error
    }
  }

  /**
   * Get cache TTL for an endpoint
   */
  private getCacheTTL(endpoint: string): number {
    // Find matching TTL config
    for (const [key, ttl] of Object.entries(CACHE_TTL)) {
      if (endpoint.startsWith(key)) {
        return ttl as number
      }
    }
    return CACHE_TTL.default
  }

  /**
   * Convenience methods that properly type the parameters
   */
  async get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    // Build full URL with params for cache key
    let cacheKey = endpoint
    if (options?.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams()
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      cacheKey = `${endpoint}?${searchParams.toString()}`
    }
    
    // Check ResponseCache first (uses LRU eviction)
    const cachedResponse = this.responseCache.get(cacheKey)
    if (cachedResponse) {
      if (import.meta.env.DEV) {
        logger.info(`[ResponseCache HIT] ${endpoint}`)
      }
      return cachedResponse as T
    }
    
    // Fallback to simple cache for backward compatibility
    const cached = this.cache.get(cacheKey)
    if (cached) {
      const age = Date.now() - cached.timestamp
      const ttl = this.getCacheTTL(endpoint)
      if (age < ttl) {
        if (import.meta.env.DEV) {
          logger.info(`[Cache HIT] ${endpoint} (age: ${Math.round(age/1000)}s)`)
        }
        // Also store in ResponseCache for next time
        this.responseCache.set(cacheKey, cached.data, { ttl })
        return cached.data as T
      }
    }
    
    // Check for in-flight request
    const inFlight = this.inFlightRequests.get(cacheKey)
    if (inFlight) {
      if (import.meta.env.DEV) {
        logger.info(`[Cache DEDUP] ${endpoint} (waiting for in-flight request)`)
      }
      return inFlight as Promise<T>
    }
    
    // Make the request
    const requestPromise = this.request<T>(endpoint, { ...options, method: 'GET' })
    
    // Track in-flight request
    this.inFlightRequests.set(cacheKey, requestPromise as Promise<any>)
    
    // Cache the result
    requestPromise.then(data => {
      this.cache.set(cacheKey, { data: data as any, timestamp: Date.now() })
      // Also store in ResponseCache with TTL
      const ttl = this.getCacheTTL(endpoint)
      this.responseCache.set(cacheKey, data as any, { ttl })
      this.inFlightRequests.delete(cacheKey)
      if (import.meta.env.DEV) {
        logger.info(`[Cache SET] ${endpoint}`)
      }
    }).catch(() => {
      // Clean up on error
      this.inFlightRequests.delete(cacheKey)
    })
    
    return requestPromise
  }

  /**
   * Clear cache for a specific endpoint or all cache
   */
  clearCache(endpoint?: string): void {
    if (endpoint) {
      // Clear specific endpoint from both caches
      for (const key of this.cache.keys()) {
        if (key.startsWith(endpoint)) {
          this.cache.delete(key)
        }
      }
      // Also clear from ResponseCache
      this.responseCache.clear(endpoint)
    } else {
      // Clear all cache
      this.cache.clear()
      this.responseCache.clear()
    }
    
    if (import.meta.env.DEV) {
      logger.info(`[Cache CLEARED] ${endpoint || 'ALL'}`)
    }
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: HttpRequestOptions
  ): Promise<T> {
    // Clear related cache on mutations
    if (endpoint.includes('/menu')) {
      this.clearCache('/api/v1/menu')
    } else if (endpoint.includes('/tables')) {
      this.clearCache('/api/v1/tables')
    }
    
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: HttpRequestOptions
  ): Promise<T> {
    // Clear related cache on mutations
    if (endpoint.includes('/menu')) {
      this.clearCache('/api/v1/menu')
    } else if (endpoint.includes('/tables')) {
      this.clearCache('/api/v1/tables')
    }
    
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: HttpRequestOptions
  ): Promise<T> {
    // Clear related cache on mutations
    if (endpoint.includes('/menu')) {
      this.clearCache('/api/v1/menu')
    } else if (endpoint.includes('/tables')) {
      this.clearCache('/api/v1/tables')
    }
    
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  }

  async delete<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    // Clear related cache on mutations
    if (endpoint.includes('/menu')) {
      this.clearCache('/api/v1/menu')
    } else if (endpoint.includes('/tables')) {
      this.clearCache('/api/v1/tables')
    }
    
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create and export a singleton instance
export const httpClient = new HttpClient()

// Export APIError for convenience
export { APIError }

// Expose cache stats in development for debugging
if (import.meta.env.DEV) {
  (window as any).__httpCache = {
    getStats: () => ({
      cacheSize: httpClient['cache'].size,
      inFlightRequests: httpClient['inFlightRequests'].size,
      entries: Array.from(httpClient['cache'].entries()).map(([key, value]) => ({
        key,
        age: Math.round((Date.now() - value.timestamp) / 1000) + 's'
      }))
    }),
    clear: () => httpClient.clearCache()
  }
}