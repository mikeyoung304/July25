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
// Removed case transformation - server handles this
import { env } from '@/utils/env'
import { getDemoToken } from '@/services/auth/demoAuth'

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
        } else if (import.meta.env.PROD) {
          // Default to production API if no env var set
          baseURL = 'https://july25.onrender.com'
          console.log('[httpClient] Using default production API:', baseURL)
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
          // Use demo token for kiosk mode
          try {
            const demoToken = await getDemoToken()
            headers.set('Authorization', `Bearer ${demoToken}`)
            console.log('🔑 Using demo token for API request')
          } catch (demoError) {
            console.error('Failed to get demo token:', demoError)
            // Fallback to test token in development only
            if (import.meta.env.DEV) {
              headers.set('Authorization', 'Bearer test-token')
              console.log('🔧 Fallback to test token in development')
            } else {
              console.warn('No auth session available for API request')
            }
          }
        }
      } catch (error) {
        console.error('Failed to get auth session:', error)
        // Try demo token as fallback
        try {
          const demoToken = await getDemoToken()
          headers.set('Authorization', `Bearer ${demoToken}`)
          console.log('🔑 Using demo token (auth session failed)')
        } catch (demoError) {
          console.error('All auth methods failed:', demoError)
          // Final fallback to test token in development
          if (import.meta.env.DEV) {
            headers.set('Authorization', 'Bearer test-token')
            console.log('🔧 Using test token (all auth failed, dev mode)')
          }
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

    // 3. Use request body as-is (server handles transformations)
    let body = requestOptions.body

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