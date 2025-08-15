/**
 * Enhanced HTTP Client for Macon AI Restaurant OS
 * Implements Luis's API connection specification:
 * - Supabase JWT authentication
 * - X-Restaurant-ID header for multi-tenancy
 * - snake_case data transformation
 * - Status code-based error handling
 */

import { SecureAPIClient, APIError } from '@/services/secureApi'
import { supabase } from '@/core/supabase'
import { toSnakeCase, toCamelCase, transformQueryParams } from '@/services/utils/caseTransform'
import { env } from '@/utils/env'

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

export class HttpClient extends SecureAPIClient {
  constructor() {
    let baseURL = 'http://localhost:3001'
    
    // Get base URL from environment
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      // Use default URL in test environment
      baseURL = 'http://localhost:3001'
    } else {
      try {
        const viteUrl = env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL
        console.log('[httpClient] env.VITE_API_BASE_URL:', env.VITE_API_BASE_URL)
        console.log('[httpClient] import.meta.env.VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
        if (viteUrl) {
          baseURL = viteUrl
        }
        // In production without a configured backend, warn the user
        if (import.meta.env.PROD && baseURL.includes('localhost')) {
          console.error('⚠️ Production build is trying to connect to localhost backend!')
          console.error('Please configure VITE_API_BASE_URL in your Vercel environment variables')
          console.error('You need to deploy your backend and set VITE_API_BASE_URL to its URL')
          console.error('env object:', env)
          console.error('import.meta.env:', import.meta.env)
        }
      } catch {
        // Fallback for environments without import.meta
      }
    }
    
    super(baseURL)
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

    // 1. Add Supabase JWT authentication (per Luis's spec)
    if (!skipAuth) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`)
        } else {
          // Use test token in development mode
          if (import.meta.env.DEV) {
            headers.set('Authorization', 'Bearer test-token')
            console.log('🔧 Using development test token for API request')
          } else {
            console.warn('No auth session available for API request')
          }
        }
      } catch (error) {
        console.error('Failed to get auth session:', error)
        // Fallback to test token in development
        if (import.meta.env.DEV) {
          headers.set('Authorization', 'Bearer test-token')
          console.log('🔧 Using development test token (fallback)')
        }
      }
    }

    // 2. Add x-restaurant-id header (per Luis's spec)
    if (!skipRestaurantId) {
      const restaurantId = getCurrentRestaurantId()
      if (restaurantId) {
        headers.set('x-restaurant-id', restaurantId)
        
        const debugVoice = import.meta.env.VITE_DEBUG_VOICE === 'true';
        if (import.meta.env.DEV && debugVoice) {
          console.log(`[HttpClient] X-Restaurant-ID: ${restaurantId} → ${url}`);
        }
      } else if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_VOICE === 'true') {
        console.warn('[HttpClient] No restaurant context for request:', url);
      } else {
        console.warn('No restaurant ID available for API request to', endpoint)
      }
    }

    // 3. Transform request body to snake_case (per Luis's spec)
    let body = requestOptions.body
    if (body && typeof body === 'string' && !skipTransform) {
      try {
        const parsed = JSON.parse(body)
        const transformed = toSnakeCase(parsed)
        body = JSON.stringify(transformed)
      } catch {
        // Body is not JSON, leave as-is
      }
    }

    // 4. Transform query params to snake_case
    let url = endpoint
    if (params && Object.keys(params).length > 0) {
      const transformedParams = skipTransform ? params : transformQueryParams(params)
      const searchParams = new URLSearchParams()
      
      Object.entries(transformedParams).forEach(([key, value]) => {
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

      // 5. Transform response from snake_case to camelCase
      if (!skipTransform && response !== null && typeof response === 'object') {
        return toCamelCase(response) as T
      }

      return response as T
    } catch (error) {
      // Handle API errors according to Luis's spec (status code-based)
      if (error instanceof APIError) {
        // Transform error details from snake_case if present
        if (error.details && !skipTransform) {
          error.details = toCamelCase(error.details)
        }
      }
      throw error
    }
  }

  /**
   * Convenience methods that properly type the parameters
   */
  async get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: HttpRequestOptions
  ): Promise<T> {
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
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create and export a singleton instance
export const httpClient = new HttpClient()

// Export APIError for convenience
export { APIError }