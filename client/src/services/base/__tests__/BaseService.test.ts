import { BaseService } from '../BaseService'

// Create a concrete implementation for testing
class TestService extends BaseService {
  async testDelay(ms: number): Promise<void> {
    return this.delay(ms)
  }
  
  testRateLimit(endpoint: string): void {
    this.checkRateLimit(endpoint, 5, 1000) // 5 requests per second for testing
  }
}

describe('BaseService', () => {
  let service: TestService
  
  beforeEach(() => {
    service = new TestService()
    jest.useFakeTimers()
  })
  
  afterEach(() => {
    jest.useRealTimers()
  })
  
  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const delayPromise = service.testDelay(1000)
      
      // Should not resolve immediately
      expect(jest.getTimerCount()).toBe(1)
      
      // Fast-forward time
      jest.advanceTimersByTime(1000)
      
      await delayPromise
      expect(jest.getTimerCount()).toBe(0)
    })
  })
  
  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(() => service.testRateLimit('test-endpoint')).not.toThrow()
      }
    })
    
    it('should throw error when rate limit exceeded', () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        service.testRateLimit('test-endpoint')
      }
      
      // 6th request should fail
      expect(() => service.testRateLimit('test-endpoint')).toThrow('Rate limit exceeded')
    })
    
    it('should reset rate limit after window expires', () => {
      // Max out the rate limit
      for (let i = 0; i < 5; i++) {
        service.testRateLimit('test-endpoint')
      }
      
      // Should throw on next request
      expect(() => service.testRateLimit('test-endpoint')).toThrow()
      
      // Fast-forward past the window
      jest.advanceTimersByTime(1001)
      
      // Should now allow requests again
      expect(() => service.testRateLimit('test-endpoint')).not.toThrow()
    })
    
    it('should track rate limits separately per endpoint', () => {
      // Max out endpoint1
      for (let i = 0; i < 5; i++) {
        service.testRateLimit('endpoint1')
      }
      
      // endpoint2 should still work
      expect(() => service.testRateLimit('endpoint2')).not.toThrow()
      
      // But endpoint1 should be blocked
      expect(() => service.testRateLimit('endpoint1')).toThrow()
    })
    
    it('should include 429 status in rate limit error', () => {
      // Max out the rate limit
      for (let i = 0; i < 5; i++) {
        service.testRateLimit('test-endpoint')
      }
      
      try {
        service.testRateLimit('test-endpoint')
      } catch (error) {
        expect((error as Error & { status?: number }).status).toBe(429)
        expect((error as Error).message).toContain('Rate limit exceeded')
      }
    })
  })
})