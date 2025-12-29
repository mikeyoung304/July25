
import { sanitizeInput } from '@/utils'
import { env } from '@/utils/env'

export interface SecureRequestOptions extends RequestInit {
  timeout?: number
  retries?: number
  sanitizeParams?: boolean
}

export class SecureAPIClient {
  private baseURL: string
  private defaultTimeout: number
  
  constructor(baseURL: string = '', defaultTimeout: number = 30000) {
    this.baseURL = baseURL
    this.defaultTimeout = defaultTimeout
  }
  
  async request<T>(
    endpoint: string,
    options: SecureRequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.defaultTimeout,
      retries = 0,
      sanitizeParams = true,
      ...fetchOptions
    } = options
    
    // Build full URL
    const url = new URL(endpoint, this.baseURL)
    
    // Sanitize URL parameters
    if (sanitizeParams && url.search) {
      const params = new URLSearchParams(url.search)
      const sanitizedParams = new URLSearchParams()
      
      params.forEach((value, key) => {
        sanitizedParams.set(key, sanitizeInput(value))
      })
      
      url.search = sanitizedParams.toString()
    }
    
    // Add security headers
    const headers = new Headers(fetchOptions.headers)
    
    // Add CSRF token for state-changing requests (disabled for development)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method || 'GET')) {
      try {
        // Only add CSRF if backend supports it (currently disabled)
        // const csrfHeaders = CSRFTokenManager.getHeader()
        // Object.entries(csrfHeaders).forEach(([key, value]) => {
        //   headers.set(key, value)
        // })
      } catch (error) {
        console.warn('CSRF token not is_available:', error)
      }
    }
    
    // Add request ID for tracking
    headers.set('X-Request-ID', this.generateRequestId())
    
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url.toString(), {
        ...fetchOptions,
        headers,
        signal: controller.signal,
        credentials: 'include', // Include cookies for all requests (required for cross-origin auth)
      })
      
      clearTimeout(timeoutId)
      
      // Check response status
      if (!response.ok) {
        throw new APIError(
          response.statusText || 'Request failed',
          response.status,
          await this.parseErrorResponse(response)
        )
      }
      
      // Validate content type
      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.includes('application/json')) {
        throw new APIError(
          'Invalid response content type',
          response.status,
          { contentType }
        )
      }
      
      // Parse and return response
      const data = await response.json()
      return data as T
      
    } catch (error) {
      clearTimeout(timeoutId)
      
      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError('Request timeout', 408, { timeout })
      }
      
      // Retry logic
      if (retries > 0 && this.shouldRetry(error)) {
        await this.delay(this.getRetryDelay(options.retries! - retries))
        return this.request<T>(endpoint, { ...options, retries: retries - 1 })
      }
      
      throw error
    }
  }
  
  /**
   * Convenience methods for common HTTP verbs
   */
  async get<T>(endpoint: string, options?: SecureRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }
  
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: SecureRequestOptions
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
    options?: SecureRequestOptions
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
    options?: SecureRequestOptions
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
  
  async delete<T>(endpoint: string, options?: SecureRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
  
  /**
   * Helper methods
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  private async parseErrorResponse(response: Response): Promise<unknown> {
    try {
      return await response.json()
    } catch {
      return { message: response.statusText }
    }
  }
  
  private shouldRetry(error: unknown): boolean {
    if (error instanceof APIError) {
      // Retry on server errors or rate limiting
      return error.status >= 500 || error.status === 429
    }
    return false
  }
  
  private getRetryDelay(attemptNumber: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000
    const maxDelay = 10000
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay)
    const jitter = Math.random() * 0.3 * exponentialDelay
    return exponentialDelay + jitter
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Custom API error class
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Default secure API client instance
 */
export const secureApi = new SecureAPIClient(
  env.VITE_API_BASE_URL || ''
)