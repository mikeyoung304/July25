/**
 * Response Caching Service
 * Implements intelligent caching for API responses with TTL and invalidation
 */

import { logger } from '@/services/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  hits: number;
}

interface CacheConfig {
  defaultTTL: number; // milliseconds
  maxSize: number; // max entries
  maxMemory: number; // bytes
  enableCompression: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  memoryUsage: number;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    memoryUsage: 0,
  };
  private memoryUsage: number = 0;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      maxSize: config.maxSize || 100,
      maxMemory: config.maxMemory || 10 * 1024 * 1024, // 10MB
      enableCompression: config.enableCompression || false,
    };

    // Periodic cleanup - store reference for proper cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get cached response
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count
    entry.hits++;
    this.stats.hits++;
    
    logger.debug(`Cache hit for ${key} (${entry.hits} total hits)`);
    return entry.data;
  }

  /**
   * Set cached response
   */
  set<T>(
    key: string, 
    data: T, 
    options: { ttl?: number; etag?: string } = {}
  ): void {
    const ttl = options.ttl || this.config.defaultTTL;
    const dataSize = this.estimateSize(data);

    // Check memory limit
    if (this.memoryUsage + dataSize > this.config.maxMemory) {
      this.evictLRU();
    }

    // Check size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      etag: options.etag,
      hits: 0,
    };

    this.cache.set(key, entry);
    this.memoryUsage += dataSize;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.memoryUsage;
    
    logger.debug(`Cached ${key} (TTL: ${ttl}ms, Size: ${dataSize} bytes)`);
  }

  /**
   * Invalidate cache entries
   */
  invalidate(pattern?: string | RegExp): number {
    let count = 0;
    
    if (!pattern) {
      // Clear all
      count = this.cache.size;
      this.cache.clear();
      this.memoryUsage = 0;
    } else {
      // Clear matching keys
      const regex = typeof pattern === 'string' 
        ? new RegExp(pattern) 
        : pattern;
      
      for (const [key, entry] of this.cache.entries()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          this.memoryUsage -= this.estimateSize(entry.data);
          count++;
        }
      }
    }
    
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.memoryUsage;
    
    logger.info(`Invalidated ${count} cache entries`);
    return count;
  }

  /**
   * Clear cache - alias for invalidate for compatibility
   */
  clear(pattern?: string): number {
    return this.invalidate(pattern);
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let minHits = Infinity;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Prioritize by hits, then by age
      const score = entry.hits * 1000 + (Date.now() - entry.timestamp);
      if (score < minHits * 1000 + oldestTime) {
        lruKey = key;
        minHits = entry.hits;
        oldestTime = Date.now() - entry.timestamp;
      }
    }

    if (lruKey) {
      const entry = this.cache.get(lruKey)!;
      this.memoryUsage -= this.estimateSize(entry.data);
      this.cache.delete(lruKey);
      this.stats.evictions++;
      logger.debug(`Evicted ${lruKey} from cache`);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryUsage -= this.estimateSize(entry.data);
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.stats.size = this.cache.size;
      this.stats.memoryUsage = this.memoryUsage;
      logger.debug(`Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * Destroy cache and clean up resources
   */
  destroy(): void {
    // Clear cleanup interval to prevent memory leak
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    // Clear all cache entries
    this.cache.clear();
    this.memoryUsage = 0;
    
    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      memoryUsage: 0,
    };
    
    logger.info('ResponseCache destroyed and cleaned up');
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    if (data === null || data === undefined) return 0;
    
    if (typeof data === 'string') {
      return data.length * 2; // UTF-16
    }
    
    if (typeof data === 'number') {
      return 8;
    }
    
    if (typeof data === 'boolean') {
      return 4;
    }
    
    if (data instanceof Date) {
      return 8;
    }
    
    if (Array.isArray(data)) {
      return data.reduce((sum, item) => sum + this.estimateSize(item), 24);
    }
    
    if (typeof data === 'object') {
      let size = 24; // Object overhead
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          size += key.length * 2 + this.estimateSize(data[key]);
        }
      }
      return size;
    }
    
    return 24; // Default
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit ratio
   */
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Warm cache with predefined data
   */
  warm(entries: Array<{ key: string; data: any; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, { ttl });
    });
    logger.info(`Warmed cache with ${entries.length} entries`);
  }

  /**
   * Create cache key from URL and params
   */
  static createKey(url: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${url}:${paramStr}`;
  }
}

// Singleton instance with proper cleanup support
class ResponseCacheSingleton {
  private static instance: ResponseCache | null = null;

  static getInstance(): ResponseCache {
    if (!ResponseCacheSingleton.instance) {
      ResponseCacheSingleton.instance = new ResponseCache();
    }
    return ResponseCacheSingleton.instance;
  }

  static destroy(): void {
    if (ResponseCacheSingleton.instance) {
      ResponseCacheSingleton.instance.destroy();
      ResponseCacheSingleton.instance = null;
    }
  }
}

// Export singleton with backward compatibility
export const responseCache = new Proxy({} as ResponseCache & { destroy: () => void }, {
  get(target, prop) {
    if (prop === 'destroy') {
      return () => ResponseCacheSingleton.destroy();
    }
    return (ResponseCacheSingleton.getInstance() as any)[prop];
  }
});

// Cache decorators for common patterns
export function cacheable(ttl?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      
      // Check cache
      const cached = responseCache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Call original method
      const result = await originalMethod.apply(this, args);
      
      // Cache result
      responseCache.set(cacheKey, result, { ttl });
      
      return result;
    };

    return descriptor;
  };
}

// Cache invalidation patterns
export const CachePatterns = {
  ORDERS: /^\/api\/v1\/orders/,
  MENU: /^\/api\/v1\/menu/,
  TABLES: /^\/api\/v1\/tables/,
  ANALYTICS: /^\/api\/v1\/analytics/,
};

// Auto-invalidation rules
export const setupAutoInvalidation = () => {
  // Invalidate orders cache when order is created/updated
  if (typeof window !== 'undefined') {
    window.addEventListener('order:created', () => {
      responseCache.invalidate(CachePatterns.ORDERS);
    });
    
    window.addEventListener('order:updated', () => {
      responseCache.invalidate(CachePatterns.ORDERS);
    });
    
    window.addEventListener('menu:updated', () => {
      responseCache.invalidate(CachePatterns.MENU);
    });
  }
};