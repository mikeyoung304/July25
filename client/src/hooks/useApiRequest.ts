import { useCallback } from 'react';
import { useRestaurant } from '@/core/restaurant-hooks';
import { useAsyncState } from './useAsyncState';
import { supabase } from '@/core/supabase';
import { getDemoToken } from '@/services/auth/demoAuth';

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  customHeaders?: Record<string, string>;
}

export interface ApiRequestReturn<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  execute: (endpoint: string, options?: ApiRequestOptions) => Promise<T>;
  get: (endpoint: string, options?: ApiRequestOptions) => Promise<T>;
  post: (endpoint: string, body?: unknown, options?: ApiRequestOptions) => Promise<T>;
  put: (endpoint: string, body?: unknown, options?: ApiRequestOptions) => Promise<T>;
  patch: (endpoint: string, body?: unknown, options?: ApiRequestOptions) => Promise<T>;
  del: (endpoint: string, options?: ApiRequestOptions) => Promise<T>;
  reset: () => void;
}

/**
 * Centralized API request hook that handles:
 * - Authentication headers
 * - Restaurant context
 * - Loading/error states
 * - Consistent error handling
 * 
 * @example
 * const api = useApiRequest<Order[]>();
 * 
 * const loadOrders = async () => {
 *   await api.get('/api/v1/orders');
 * };
 */
export function useApiRequest<T = unknown>(): ApiRequestReturn<T> {
  const { restaurant } = useRestaurant();
  const { data, loading, error, execute: executeAsync, reset } = useAsyncState<T>();

  const getHeaders = useCallback(async (options?: ApiRequestOptions): Promise<Headers> => {
    const headers = new Headers(options?.headers);
    
    // Add content type if not present
    if (!headers.has('Content-Type') && options?.body) {
      headers.set('Content-Type', 'application/json');
    }
    
    // Add restaurant ID if available
    if (restaurant?.id) {
      headers.set('x-restaurant-id', restaurant.id);
    } else {
      // Fallback to environment variable if no restaurant context
      const defaultRestaurantId = import.meta.env.VITE_DEFAULT_RESTAURANT_ID;
      if (defaultRestaurantId) {
        headers.set('x-restaurant-id', defaultRestaurantId);
      }
    }
    
    // Add authentication unless explicitly skipped
    if (!options?.skipAuth) {
      try {
        // Try Supabase auth first (if supabase is available)
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers.set('Authorization', `Bearer ${session.access_token}`);
          } else {
            // Fall back to demo token
            const demoToken = await getDemoToken();
            if (demoToken) {
              headers.set('Authorization', `Bearer ${demoToken}`);
            }
          }
        } else {
          // No supabase available, use demo token
          const demoToken = await getDemoToken();
          if (demoToken) {
            headers.set('Authorization', `Bearer ${demoToken}`);
          } else if (import.meta.env.DEV) {
            headers.set('Authorization', 'Bearer test-token');
          }
        }
      } catch (err) {
        console.error('Failed to get auth token:', err);
        // Continue without auth header
      }
    }
    
    // Add custom headers
    if (options?.customHeaders) {
      Object.entries(options.customHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }
    
    return headers;
  }, [restaurant]);

  const execute = useCallback(async (
    endpoint: string,
    options?: ApiRequestOptions
  ): Promise<T> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    
    const headers = await getHeaders(options);
    
    const fetchPromise = fetch(url, {
      ...options,
      headers,
    }).then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          // Use text if not JSON
          if (errorText && errorText.trim()) {
            errorMessage = errorText;
          }
        }

        // Log for debugging
        console.error('API Error Details:', {
          url,
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 500), // Limit log size
          parsedMessage: errorMessage
        });

        throw new Error(errorMessage);
      }
      
      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return null as T;
      }
      
      return response.json();
    });
    
    return executeAsync(fetchPromise);
  }, [executeAsync, getHeaders]);

  const get = useCallback((endpoint: string, options?: ApiRequestOptions) => {
    return execute(endpoint, { ...options, method: 'GET' });
  }, [execute]);

  const post = useCallback((endpoint: string, body?: unknown, options?: ApiRequestOptions) => {
    return execute(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }, [execute]);

  const put = useCallback((endpoint: string, body?: unknown, options?: ApiRequestOptions) => {
    return execute(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }, [execute]);

  const patch = useCallback((endpoint: string, body?: unknown, options?: ApiRequestOptions) => {
    return execute(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }, [execute]);

  const del = useCallback((endpoint: string, options?: ApiRequestOptions) => {
    return execute(endpoint, { ...options, method: 'DELETE' });
  }, [execute]);

  return {
    data,
    loading,
    error,
    execute,
    get,
    post,
    put,
    patch,
    del,
    reset,
  };
}