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
import { getApiUrl, getRestaurantId } from '@/config'
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

// Cache configuration (TTL values for ResponseCache)
const CACHE_TTL: Record<string, number> = {
  '/api/v1/menu': 5 * 60 * 1000,          // 5 minutes for menu
  '/api/v1/menu/categories': 5 * 60 * 1000, // 5 minutes for categories
  '/api/v1/voice-config/menu': 5 * 60 * 1000, // 5 minutes for voice config
  '/api/v1/tables': 0,                    // No caching for tables (real-time data)
  default: 60 * 1000                      // 1 minute default
}

export class HttpClient extends SecureAPIClient {
  // Track in-flight requests to prevent duplicate concurrent requests
  private inFlightRequests = new Map<string, Promise<JsonValue>>()
  // Single response cache with LRU eviction (C1: removed dual cache system)
  private responseCache: ResponseCache

  constructor() {
    // Use centralized config for base URL
    const baseURL = getApiUrl()

    if (import.meta.env.DEV) {
      logger.info('[httpClient] Using API base URL from config:', baseURL)
    }

    // Warn if production is misconfigured
    if (import.meta.env.PROD && baseURL.includes('localhost')) {
      console.error('Production build is trying to connect to localhost backend!')
      console.error('Please set VITE_API_BASE_URL to your production backend URL')
    }

    super(baseURL)

    // Initialize response cache (C1: now the only cache)
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

    // 1. Add JWT authentication (Supabase or localStorage-based demo/PIN/station tokens)
    if (!skipAuth) {
      try {
        // Try Supabase session first
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`)
          if (import.meta.env.DEV) {
            logger.info('🔐 Using Supabase session token for API request')
          }
        } else {
          // Fallback to localStorage for demo/PIN/station sessions
          const savedSession = localStorage.getItem('auth_session')
          if (savedSession) {
            try {
              const parsed = JSON.parse(savedSession)
              if (parsed.session?.accessToken && parsed.session?.expiresAt) {
                // Check if token is still valid
                if (parsed.session.expiresAt > Date.now() / 1000) {
                  headers.set('Authorization', `Bearer ${parsed.session.accessToken}`)
                  if (import.meta.env.DEV) {
                    logger.info('🔐 Using localStorage session token (demo/PIN/station) for API request')
                  }
                } else {
                  if (import.meta.env.DEV) {
                    logger.warn('⚠️ localStorage session token expired')
                  }
                }
              }
            } catch (parseError) {
              logger.error('Failed to parse localStorage auth session:', parseError as Error)
            }
          } else {
            logger.warn('❌ No authentication available for API request (no Supabase or localStorage session)')
          }
        }
      } catch (error) {
        logger.error('Failed to get auth session:', error as Error)
      }
    }

    // 2. Add x-restaurant-id header (per Luis's spec)
    if (!skipRestaurantId) {
      // Use centralized restaurant ID getter (handles fallback to default)
      const restaurantId = getCurrentRestaurantId() || getRestaurantId()

      // Only set header if we have a valid restaurant ID
      if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
        headers.set('x-restaurant-id', restaurantId)

        const debugVoice = import.meta.env.VITE_DEBUG_VOICE === 'true';
        if (import.meta.env.DEV && debugVoice) {
          logger.info(`[HttpClient] X-Restaurant-ID: ${restaurantId} → ${endpoint}`);
        }
      } else {
        logger.warn('[HttpClient] Restaurant ID not available for API request', {
          endpoint,
          restaurantId: restaurantId || 'null'
        });
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
      if (key !== 'default' && endpoint.startsWith(key)) {
        return ttl
      }
    }
    return CACHE_TTL.default
  }

  /**
   * Convenience methods that properly type the parameters
   */
  async get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    // Build cache key with restaurant_id prefix for tenant isolation (TODO-104 fix)
    // This prevents cross-tenant cache pollution when switching restaurants
    const restaurantId = getCurrentRestaurantId() || getRestaurantId()
    const tenantPrefix = restaurantId || 'no-tenant'

    let cacheKey = `${tenantPrefix}:${endpoint}`
    if (options?.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams()
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      cacheKey = `${tenantPrefix}:${endpoint}?${searchParams.toString()}`
    }

    // Check ResponseCache (C1: now the only cache)
    const cachedResponse = this.responseCache.get(cacheKey)
    if (cachedResponse) {
      if (import.meta.env.DEV) {
        logger.info(`[Cache HIT] ${endpoint}`)
      }
      return cachedResponse as T
    }

    // Check for in-flight request to prevent duplicates
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
    this.inFlightRequests.set(cacheKey, requestPromise as Promise<JsonValue>)

    // Cache the result on success
    requestPromise.then(data => {
      const ttl = this.getCacheTTL(endpoint)
      if (ttl > 0) {
        this.responseCache.set(cacheKey, data as JsonValue, { ttl })
        if (import.meta.env.DEV) {
          logger.info(`[Cache SET] ${endpoint} (TTL: ${ttl}ms)`)
        }
      }
      this.inFlightRequests.delete(cacheKey)
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
    this.responseCache.clear(endpoint)

    if (import.meta.env.DEV) {
      logger.info(`[Cache CLEARED] ${endpoint || 'ALL'}`)
    }
  }

  /**
   * Clear related cache entries based on mutation endpoint (TODO-106 fix)
   * Extracted to single source of truth for cache invalidation patterns
   */
  private clearRelatedCache(endpoint: string): void {
    if (endpoint.includes('/menu')) {
      this.clearCache('/api/v1/menu')
    } else if (endpoint.includes('/tables')) {
      this.clearCache('/api/v1/tables')
    } else if (endpoint.includes('/voice-config')) {
      this.clearCache('/api/v1/voice-config/menu')
    }
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: HttpRequestOptions
  ): Promise<T> {
    this.clearRelatedCache(endpoint)

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
    this.clearRelatedCache(endpoint)

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
    this.clearRelatedCache(endpoint)

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
    this.clearRelatedCache(endpoint)

    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create and export a singleton instance
export const httpClient = new HttpClient()

// Export APIError for convenience
export { APIError }

/**
 * Clear all caches when switching restaurants
 * This should be called when the restaurant context changes to prevent
 * data from one restaurant bleeding into another
 */
export function clearAllCachesForRestaurantSwitch(): void {
  // Clear HTTP client caches
  httpClient.clearCache()

  // Clear any localStorage caches with tenant-specific prefixes
  if (typeof localStorage !== 'undefined') {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('cache:') ||
        key.startsWith('menu:') ||
        key.startsWith('orders:') ||
        key.startsWith('tables:')
      )) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    if (keysToRemove.length > 0) {
      logger.info('[Multi-tenant] Cleared localStorage caches', { count: keysToRemove.length })
    }
  }

  // Log the action
  logger.info('[Multi-tenant] Cleared all caches for restaurant switch')
}

// Expose cache stats in development for debugging
if (import.meta.env.DEV) {
  (window as unknown as { __httpCache: unknown }).__httpCache = {
    getStats: () => ({
      responseCache: httpClient['responseCache'].getStats(),
      inFlightRequests: httpClient['inFlightRequests'].size
    }),
    clear: () => httpClient.clearCache()
  }
}