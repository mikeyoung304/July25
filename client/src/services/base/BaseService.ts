// Base service class with common functionality

import { RateLimiter } from '@/utils'

export abstract class BaseService {
  protected rateLimiters = new Map<string, RateLimiter>()
  
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  protected checkRateLimit(endpoint: string, limit: number = 10, window: number = 60000): void {
    if (!this.rateLimiters.has(endpoint)) {
      this.rateLimiters.set(endpoint, new RateLimiter(limit, window))
    }
    
    const limiter = this.rateLimiters.get(endpoint)!
    if (!limiter.canAttempt()) {
      const error = new Error('Rate limit exceeded. Please try again later.') as Error & { status?: number }
      error.status = 429
      throw error
    }
  }

  protected resetRateLimit(): void {
    this.rateLimiters.clear()
  }
}