/**
 * LocalStorage Management Service
 * Provides automatic cleanup, size monitoring, and expiry management
 * Based on TECHNICAL_DEBT.md requirements
 */

interface StorageItem {
  key: string;
  value: string;
  size: number;
  timestamp?: number;
}

interface StorageReport {
  totalSize: number;
  itemCount: number;
  largestItems: StorageItem[];
  oldestItems: StorageItem[];
  categories: Record<string, { count: number; size: number }>;
}

export class LocalStorageManager {
  private static readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly MAX_ERROR_LOGS = 50; // Per logger.ts line 117
  private static cleanupInterval: NodeJS.Timeout | null = null;
  
  // Keys that should never be removed
  private static readonly WHITELIST = [
    'restaurant_id',
    'user_preferences',
    'auth_token',
    'supabase.auth.token'
  ];
  
  // Debug flags to clear on startup
  private static readonly DEBUG_FLAGS = [
    'WEBRTC_DEBUG',
    'VOICE_DEBUG',
    'debug_mode',
    'enable_logging'
  ];

  /**
   * Clear debug flags on app startup
   */
  static clearDebugFlags(): void {
    this.DEBUG_FLAGS.forEach(flag => {
      localStorage.removeItem(flag);
    });
  }

  /**
   * Clean up expired items based on age
   */
  static cleanupExpired(): number {
    const now = Date.now();
    let removedCount = 0;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || this.WHITELIST.includes(key)) continue;

      try {
        const value = localStorage.getItem(key);
        if (!value) continue;

        // Check if it's a timestamped item
        const parsed = this.tryParseJSON(value);
        if (parsed && parsed._timestamp) {
          const age = now - parsed._timestamp;
          if (age > this.MAX_AGE) {
            keysToRemove.push(key);
          }
        }
        
        // Special handling for error logs
        if (key === 'error_logs') {
          const errors = this.tryParseJSON(value);
          if (Array.isArray(errors)) {
            // Keep only recent errors
            const recentErrors = errors
              .filter((e: any) => {
                const timestamp = new Date(e.timestamp).getTime();
                return (now - timestamp) < this.MAX_AGE;
              })
              .slice(-this.MAX_ERROR_LOGS);
            
            if (recentErrors.length < errors.length) {
              localStorage.setItem(key, JSON.stringify(recentErrors));
            }
          }
        }
      } catch (error) {
        console.error(`Failed to process localStorage key: ${key}`, error);
      }
    }

    // Remove expired items
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      removedCount++;
    });

    return removedCount;
  }

  /**
   * Get current storage usage
   */
  static getUsage(): StorageReport {
    const items: StorageItem[] = [];
    let totalSize = 0;
    const categories: Record<string, { count: number; size: number }> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key) || '';
      const size = key.length + value.length;
      totalSize += size;

      // Categorize by prefix
      const category = key.split('_')[0] || 'other';
      if (!categories[category]) {
        categories[category] = { count: 0, size: 0 };
      }
      categories[category].count++;
      categories[category].size += size;

      // Extract timestamp if available
      const parsed = this.tryParseJSON(value);
      const timestamp = parsed?._timestamp || parsed?.timestamp;

      items.push({
        key,
        value: value.substring(0, 100), // Truncate for report
        size,
        timestamp
      });
    }

    // Sort to find largest and oldest
    const largestItems = [...items]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    const oldestItems = items
      .filter(item => item.timestamp)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .slice(0, 10);

    return {
      totalSize,
      itemCount: items.length,
      largestItems,
      oldestItems,
      categories
    };
  }

  /**
   * Set item with automatic timestamp and size checking
   */
  static setItem(key: string, value: any, ttl?: number): boolean {
    try {
      // Check if we're approaching size limit
      const usage = this.getUsage();
      if (usage.totalSize > this.MAX_SIZE * 0.9) {
        // Clean up if we're at 90% capacity
        this.cleanupExpired();
        this.compactStorage();
      }

      // Add timestamp for expiry
      const item = {
        ...value,
        _timestamp: Date.now(),
        _ttl: ttl
      };

      const serialized = JSON.stringify(item);
      
      // Check if this single item is too large
      if (serialized.length > this.MAX_SIZE * 0.1) {
        console.warn(`localStorage item ${key} is too large (${serialized.length} bytes)`);
        return false;
      }

      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`Failed to set localStorage item: ${key}`, error);
      
      // If quota exceeded, try cleanup
      if (error.name === 'QuotaExceededError') {
        this.compactStorage();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      }
      
      return false;
    }
  }

  /**
   * Get item with automatic expiry check
   */
  static getItem<T = any>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;

      const parsed = this.tryParseJSON(value);
      if (!parsed) return value as any;

      // Check TTL if present
      if (parsed._ttl && parsed._timestamp) {
        const age = Date.now() - parsed._timestamp;
        if (age > parsed._ttl) {
          localStorage.removeItem(key);
          return null;
        }
      }

      // Remove metadata before returning
      delete parsed._timestamp;
      delete parsed._ttl;

      return parsed;
    } catch (error) {
      console.error(`Failed to get localStorage item: ${key}`, error);
      return null;
    }
  }

  /**
   * Compact storage by removing old/large items
   */
  static compactStorage(): void {
    const usage = this.getUsage();
    
    // If we're over 80% capacity, be aggressive
    if (usage.totalSize > this.MAX_SIZE * 0.8) {
      // Remove oldest items first (that aren't whitelisted)
      const oldestKeys = usage.oldestItems
        .filter(item => !this.WHITELIST.includes(item.key))
        .map(item => item.key);
      
      oldestKeys.forEach(key => localStorage.removeItem(key));
      
      // If still over capacity, remove largest items
      if (this.getUsage().totalSize > this.MAX_SIZE * 0.8) {
        const largestKeys = usage.largestItems
          .filter(item => !this.WHITELIST.includes(item.key))
          .map(item => item.key);
        
        largestKeys.slice(0, 5).forEach(key => localStorage.removeItem(key));
      }
    }
  }

  /**
   * Initialize cleanup on app startup
   */
  static initialize(): void {
    // Clear debug flags immediately
    this.clearDebugFlags();
    
    // Run initial cleanup
    const removed = this.cleanupExpired();
    if (removed > 0) {
      console.log(`LocalStorage: Cleaned up ${removed} expired items`);
    }
    
    // Check usage
    const usage = this.getUsage();
    console.log(`LocalStorage: ${usage.itemCount} items, ${(usage.totalSize / 1024).toFixed(1)}KB used`);
    
    // Schedule periodic cleanup (hourly)
    // Clear any existing interval first
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60 * 60 * 1000);
  }
  
  /**
   * Cleanup and stop the interval timer
   */
  static destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Helper to safely parse JSON
   */
  private static tryParseJSON(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * Generate a usage report for debugging
   */
  static generateReport(): string {
    const usage = this.getUsage();
    const lines = [
      '=== LocalStorage Usage Report ===',
      `Total Size: ${(usage.totalSize / 1024).toFixed(1)}KB / ${(this.MAX_SIZE / 1024 / 1024).toFixed(1)}MB`,
      `Item Count: ${usage.itemCount}`,
      '',
      'Categories:',
      ...Object.entries(usage.categories).map(([cat, data]) => 
        `  ${cat}: ${data.count} items, ${(data.size / 1024).toFixed(1)}KB`
      ),
      '',
      'Largest Items:',
      ...usage.largestItems.slice(0, 5).map(item =>
        `  ${item.key}: ${(item.size / 1024).toFixed(1)}KB`
      ),
      '',
      'Oldest Items:',
      ...usage.oldestItems.slice(0, 5).map(item =>
        `  ${item.key}: ${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'unknown'}`
      )
    ];
    
    return lines.join('\n');
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  LocalStorageManager.initialize();
}