/**
 * Unified API Client - Single source of truth for all API calls
 * Replaces: SecureAPIClient, HttpClient, and raw fetch calls
 * 
 * Features:
 * - Automatic auth token management
 * - Restaurant context headers
 * - Response caching with TTL
 * - Request deduplication
 * - Retry logic with exponential backoff
 * - Type-safe responses
 */

import { supabase } from '@/core/supabase';
import { logger } from '@/services/logger';
import { getDemoToken } from '@/services/auth/demoAuth';

// Global restaurant context (set by RestaurantContext provider)
let currentRestaurantId: string | null = null;

export function setRestaurantId(id: string | null) {
  currentRestaurantId = id;
}

export function getRestaurantId(): string {
  return currentRestaurantId || '11111111-1111-1111-1111-111111111111'; // Demo fallback
}

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
  skipRestaurantId?: boolean;
  retries?: number;
  cacheTTL?: number;
}

// Cache configuration (in milliseconds)
const DEFAULT_CACHE_TTL = {
  '/api/v1/menu': 5 * 60 * 1000,              // 5 minutes
  '/api/v1/menu/categories': 5 * 60 * 1000,   // 5 minutes
  '/api/v1/tables': 0,                        // No cache (real-time)
  default: 60 * 1000                          // 1 minute
};

class UnifiedApiClient {
  private baseURL: string;
  private cache = new Map<string, CacheEntry<unknown>>();
  private inflightRequests = new Map<string, Promise<unknown>>();
  
  constructor() {
    // Determine base URL
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    
    if (import.meta.env.PROD && this.baseURL.includes('localhost')) {
      console.warn('⚠️ Production build using localhost API');
      this.baseURL = 'https://july25.onrender.com'; // Production fallback
    }
  }

  private getCacheTTL(endpoint: string, customTTL?: number): number {
    if (customTTL !== undefined) return customTTL;
    
    for (const [pattern, ttl] of Object.entries(DEFAULT_CACHE_TTL)) {
      if (endpoint.includes(pattern)) return ttl as number;
    }
    return DEFAULT_CACHE_TTL.default;
  }

  private getCacheKey(endpoint: string, options?: RequestOptions): string {
    let key = endpoint;
    if (options?.params) {
      const params = new URLSearchParams(
        Object.entries(options.params)
          .filter(([_, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      );
      if (params.toString()) key += `?${params}`;
    }
    return key;
  }

  private async getAuthToken(skipAuth?: boolean): Promise<string | null> {
    if (skipAuth) return null;

    try {
      // Try Supabase session first
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;

      // Fall back to demo token
      return await getDemoToken();
    } catch (error) {
      if (import.meta.env.DEV) {
        return 'test-token'; // Development fallback
      }
      logger.error('Auth failed:', error);
      return null;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = new URL(endpoint, this.baseURL);
    
    // Add query params
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value != null) url.searchParams.append(key, String(value));
      });
    }

    // Build headers
    const headers = new Headers(options.headers);
    
    // Add auth token
    const token = await this.getAuthToken(options.skipAuth);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Add restaurant context
    if (!options.skipRestaurantId) {
      headers.set('x-restaurant-id', getRestaurantId());
    }
    
    // Ensure JSON content type for body requests
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Execute request with retries
    const maxRetries = options.retries ?? 3;
    let lastError: Error | unknown;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          ...options,
          headers
        });

        if (!response.ok) {
          throw new APIError(
            response.status,
            `${response.status}: ${response.statusText}`,
            await response.json().catch(() => null)
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof APIError && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Exponential backoff for retries
        if (attempt < maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw lastError;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // For GET requests, check cache
    if (!options.method || options.method === 'GET') {
      const cacheKey = this.getCacheKey(endpoint, options);
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        const ttl = this.getCacheTTL(endpoint, options.cacheTTL);
        const age = Date.now() - cached.timestamp;
        if (age < ttl) {
          return cached.data as T;
        }
      }
      
      // Check for inflight request
      const inflight = this.inflightRequests.get(cacheKey);
      if (inflight) {
        return inflight as Promise<T>;
      }
      
      // Make request
      const promise = this.executeRequest<T>(endpoint, options);
      this.inflightRequests.set(cacheKey, promise);
      
      // Cache on success
      promise
        .then(data => {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
          this.inflightRequests.delete(cacheKey);
        })
        .catch(() => {
          this.inflightRequests.delete(cacheKey);
        });
      
      return promise;
    }
    
    // Non-GET requests: clear related cache
    this.clearCache(endpoint);
    return this.executeRequest<T>(endpoint, options);
  }

  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Convenience methods
  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  put<T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new UnifiedApiClient();

// Export types
export type { RequestOptions };