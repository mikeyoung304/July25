import { createHash } from 'crypto';
import { logger } from '../utils/logger';

const idempotencyLogger = logger.child({ service: 'idempotency' });

/**
 * Simple in-memory idempotency cache
 * In production, use Redis for distributed systems
 */
class IdempotencyService {
  private cache: Map<string, { result: any; timestamp: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  
  constructor() {
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }
  
  /**
   * Generate idempotency key from request data
   */
  generateKey(data: any, customKey?: string): string {
    if (customKey) {
      return customKey;
    }
    
    // Generate key from payload hash
    const payload = JSON.stringify({
      items: data.items,
      customerName: data.customerName,
      type: data.type,
      timestamp: Math.floor(Date.now() / 3000) // 3-second window
    });
    
    return createHash('md5').update(payload).digest('hex');
  }
  
  /**
   * Check if request is duplicate
   */
  isDuplicate(key: string): boolean {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return false;
    }
    
    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return false;
    }
    
    idempotencyLogger.debug('Duplicate request detected', { key });
    return true;
  }
  
  /**
   * Get cached result for duplicate request
   */
  getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached || Date.now() - cached.timestamp > this.TTL) {
      return null;
    }
    
    idempotencyLogger.debug('Returning cached result', { key });
    return cached.result;
  }
  
  /**
   * Store result for idempotency
   */
  storeResult(key: string, result: any): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
    
    idempotencyLogger.debug('Stored result for idempotency', { 
      key,
      cacheSize: this.cache.size 
    });
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      idempotencyLogger.debug('Cleaned expired entries', { 
        cleaned,
        remaining: this.cache.size 
      });
    }
  }
  
  /**
   * Clear all cached entries (for testing)
   */
  clear(): void {
    this.cache.clear();
    idempotencyLogger.info('Idempotency cache cleared');
  }
}

// Export singleton instance
export const idempotencyService = new IdempotencyService();