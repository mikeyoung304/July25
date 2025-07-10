/**
 * HttpServiceAdapter - Base class for services that need to communicate with the backend
 * Provides a pattern for gradual migration from mock data to real API calls
 */

import { BaseService } from './BaseService'
import { httpClient, HttpClient, APIError } from '@/services/http/httpClient'

export interface ServiceConfig {
  /**
   * Whether to use mock data instead of real API calls
   * Can be overridden per environment or feature flag
   */
  useMockData?: boolean
  
  /**
   * Custom HTTP client instance (useful for testing)
   */
  httpClient?: HttpClient
}

export abstract class HttpServiceAdapter extends BaseService {
  protected httpClient: HttpClient
  protected useMockData: boolean

  constructor(config?: ServiceConfig) {
    super()
    this.httpClient = config?.httpClient || httpClient
    
    // Default to mock data in development/test
    let defaultUseMock = true
    
    try {
      if (import.meta?.env?.VITE_USE_MOCK_DATA !== undefined) {
        defaultUseMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'
      } else if (import.meta?.env?.VITE_API_BASE_URL === undefined) {
        defaultUseMock = true
      }
    } catch {
      // In test environment, default to mock
      if (import.meta.env.MODE === 'test') {
        defaultUseMock = true
      }
    }
    
    this.useMockData = config?.useMockData ?? defaultUseMock
  }

  /**
   * Execute a service call with automatic mock fallback
   * This allows gradual migration from mock to real API
   */
  protected async execute<T>(
    realCall: () => Promise<T>,
    mockCall: () => Promise<T>,
    options?: {
      forceMock?: boolean
      forceReal?: boolean
      fallbackToMock?: boolean
    }
  ): Promise<T> {
    let defaultFallback = false
    try {
      defaultFallback = import.meta?.env?.DEV || false
    } catch {
      defaultFallback = import.meta.env.DEV
    }
    
    const { forceMock, forceReal, fallbackToMock = defaultFallback } = options || {}

    // Determine which implementation to use
    const shouldUseMock = forceMock || (!forceReal && this.useMockData)

    if (shouldUseMock) {
      return mockCall()
    }

    try {
      return await realCall()
    } catch (error) {
      // In development, optionally fall back to mock on API failure
      if (fallbackToMock && error instanceof APIError) {
        console.warn(
          `API call failed (${error.status}: ${error.message}), falling back to mock data`,
          error.details
        )
        return mockCall()
      }
      
      // Re-throw the error in production or if fallback is disabled
      throw error
    }
  }

  /**
   * Check if the service is currently using mock data
   */
  public isUsingMockData(): boolean {
    return this.useMockData
  }

  /**
   * Temporarily override the mock data setting
   * Useful for testing or feature flags
   */
  public setUseMockData(useMock: boolean): void {
    this.useMockData = useMock
  }

  /**
   * Helper to format API errors for user display
   */
  protected formatApiError(error: unknown): string {
    if (error instanceof APIError) {
      // Handle common HTTP status codes
      switch (error.status) {
        case 401:
          return 'You need to be logged in to perform this action'
        case 403:
          return 'You do not have permission to perform this action'
        case 404:
          return 'The requested resource was not found'
        case 422:
          return 'The provided data is invalid'
        case 429:
          return 'Too many requests. Please try again later'
        case 500:
          return 'An unexpected server error occurred'
        default:
          return error.message || 'An error occurred while processing your request'
      }
    }
    
    if (error instanceof Error) {
      return error.message
    }
    
    return 'An unexpected error occurred'
  }

  /**
   * Log service calls for debugging
   * Only logs in development mode
   */
  protected logServiceCall(
    method: string,
    endpoint: string,
    data?: unknown,
    response?: unknown
  ): void {
    let isDev = false
    try {
      isDev = import.meta?.env?.DEV || false
    } catch {
      isDev = import.meta.env.DEV
    }
    
    if (isDev) {
      console.group(`[${this.constructor.name}] ${method} ${endpoint}`)
      if (data) console.log('Request:', data)
      if (response) console.log('Response:', response)
      console.log('Using mock:', this.useMockData)
      console.groupEnd()
    }
  }
}