/**
 * Request Batching Service
 * Combines multiple API requests into batched calls to reduce network overhead
 */

import { logger } from '@/services/logger';

interface BatchRequest {
  id: string;
  method: string;
  url: string;
  params?: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  batchEndpoint: string;
}

export class RequestBatcher {
  private queue: Map<string, BatchRequest[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private config: BatchConfig;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      maxBatchSize: config.maxBatchSize || 10,
      maxWaitTime: config.maxWaitTime || 50, // 50ms default
      batchEndpoint: config.batchEndpoint || '/api/v1/batch',
    };
  }

  /**
   * Add a request to the batch queue
   */
  async batch<T>(
    method: string,
    url: string,
    params?: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: BatchRequest = {
        id: `${Date.now()}-${Math.random()}`,
        method,
        url,
        params,
        resolve,
        reject,
      };

      // Group requests by endpoint base
      const batchKey = this.getBatchKey(url);
      
      if (!this.queue.has(batchKey)) {
        this.queue.set(batchKey, []);
      }
      
      this.queue.get(batchKey)!.push(request);
      
      // Check if we should send immediately
      if (this.queue.get(batchKey)!.length >= this.config.maxBatchSize) {
        this.flush(batchKey);
      } else {
        // Schedule batch send
        this.scheduleBatch(batchKey);
      }
    });
  }

  /**
   * Get batch key for grouping similar requests
   */
  private getBatchKey(url: string): string {
    // Group by resource type (e.g., /api/v1/orders, /api/v1/menu-items)
    const match = url.match(/\/api\/v\d+\/([^/?]+)/);
    return match ? match[1] : 'default';
  }

  /**
   * Schedule a batch to be sent
   */
  private scheduleBatch(batchKey: string): void {
    // Clear existing timer
    if (this.timers.has(batchKey)) {
      clearTimeout(this.timers.get(batchKey)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.flush(batchKey);
    }, this.config.maxWaitTime);

    this.timers.set(batchKey, timer);
  }

  /**
   * Send all queued requests for a batch key
   */
  private async flush(batchKey: string): Promise<void> {
    const requests = this.queue.get(batchKey);
    if (!requests || requests.length === 0) return;

    // Clear queue and timer
    this.queue.delete(batchKey);
    if (this.timers.has(batchKey)) {
      clearTimeout(this.timers.get(batchKey)!);
      this.timers.delete(batchKey);
    }

    // If only one request, send it directly
    if (requests.length === 1) {
      const request = requests[0];
      try {
        const response = await this.sendSingleRequest(request);
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
      return;
    }

    // Send batch request
    try {
      logger.info(`Batching ${requests.length} requests for ${batchKey}`);
      
      const batchPayload = {
        requests: requests.map(r => ({
          id: r.id,
          method: r.method,
          url: r.url,
          params: r.params,
        })),
      };

      const response = await fetch(this.config.batchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchPayload),
      });

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.statusText}`);
      }

      const batchResponse = await response.json();
      
      // Map responses back to requests
      requests.forEach(request => {
        const result = batchResponse.responses?.find(
          (r: any) => r.id === request.id
        );
        
        if (result?.error) {
          request.reject(new Error(result.error));
        } else if (result?.data) {
          request.resolve(result.data);
        } else {
          request.reject(new Error('No response for request'));
        }
      });
    } catch (error) {
      // If batch fails, reject all requests
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }

  /**
   * Send a single request (fallback when batching isn't available)
   */
  private async sendSingleRequest(request: BatchRequest): Promise<any> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: request.params ? JSON.stringify(request.params) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Flush all pending batches
   */
  flushAll(): void {
    this.queue.forEach((_, batchKey) => {
      this.flush(batchKey);
    });
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.queue.clear();
  }
}

// Singleton instance for app-wide batching
export const requestBatcher = new RequestBatcher();

// Convenience functions for common operations
export const batchedGet = <T>(url: string, params?: any): Promise<T> => 
  requestBatcher.batch<T>('GET', url, params);

export const batchedPost = <T>(url: string, data?: any): Promise<T> => 
  requestBatcher.batch<T>('POST', url, data);

// Auto-flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    requestBatcher.flushAll();
  });
}