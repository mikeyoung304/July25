import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MenuEmbeddingService } from '../../src/services/menu-embedding.service';

// Mock the logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    child: () => ({
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    })
  }
}));

// Mock the config
vi.mock('../../src/config/environment', () => ({
  getConfig: () => ({
    openai: {
      apiKey: 'test-api-key',
      embeddingModel: 'text-embedding-3-small',
      embeddingDimensions: 256
    },
    features: {
      semanticSearch: false
    }
  })
}));

// Mock Supabase
vi.mock('../../src/config/database', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('MenuEmbeddingService', () => {
  beforeEach(() => {
    // Clear rate limit history before each test
    MenuEmbeddingService.clearRateLimitHistory();
    // Reset any timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Stop cleanup interval if running
    MenuEmbeddingService.stopRateLimitCleanup();
    // Restore timers
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    const testRestaurantId = '11111111-1111-1111-1111-111111111111';

    it('allows first generation attempt', () => {
      const result = MenuEmbeddingService.checkRateLimit(testRestaurantId);

      expect(result.allowed).toBe(true);
      expect(result.retryAfterMs).toBe(0);
    });

    it('enforces 12-minute cooldown between calls', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Record a generation
      MenuEmbeddingService.recordGeneration(testRestaurantId);

      // Immediately check - should be rate limited (cooldown active)
      const immediateResult = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(immediateResult.allowed).toBe(false);
      expect(immediateResult.retryAfterMs).toBeGreaterThan(0);
      // Should be close to 12 minutes (720000ms)
      expect(immediateResult.retryAfterMs).toBeLessThanOrEqual(12 * 60 * 1000);

      // Advance time by 5 minutes (less than 12-minute cooldown)
      vi.advanceTimersByTime(5 * 60 * 1000);

      // Check again - should still be rate limited
      const afterFiveMinutes = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(afterFiveMinutes.allowed).toBe(false);
      expect(afterFiveMinutes.retryAfterMs).toBeGreaterThan(0);
      // Should be approximately 7 minutes remaining (420000ms)
      expect(afterFiveMinutes.retryAfterMs).toBeLessThanOrEqual(7 * 60 * 1000 + 1000);

      // Advance time to pass the cooldown (7 more minutes)
      vi.advanceTimersByTime(7 * 60 * 1000);

      // Check again - should now be allowed
      const afterCooldown = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(afterCooldown.allowed).toBe(true);
      expect(afterCooldown.retryAfterMs).toBe(0);
    });

    it('enforces max 5 calls per hour', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Record 5 generations quickly (all within a few seconds)
      // to ensure they all fall within the 1-hour window
      for (let i = 0; i < 5; i++) {
        MenuEmbeddingService.recordGeneration(testRestaurantId);
      }

      // All 5 generations happened at ~now, so hourly limit is hit
      // The 6th check should be blocked by hourly limit
      const result = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);

      // Advance time by more than 1 hour so all generations expire
      vi.advanceTimersByTime(61 * 60 * 1000);

      // After 61 minutes, all 5 generations are > 1 hour old, so they're filtered out
      // Should now be allowed
      const afterExpiry = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(afterExpiry.allowed).toBe(true);
      expect(afterExpiry.retryAfterMs).toBe(0);
    });

    it('isolates rate limits per restaurant', () => {
      const restaurant1 = '11111111-1111-1111-1111-111111111111';
      const restaurant2 = '22222222-2222-2222-2222-222222222222';
      const restaurant3 = '33333333-3333-3333-3333-333333333333';

      const now = Date.now();
      vi.setSystemTime(now);

      // Record generation for restaurant 1
      MenuEmbeddingService.recordGeneration(restaurant1);

      // Check rate limit for restaurant 1 - should be blocked (cooldown)
      const result1 = MenuEmbeddingService.checkRateLimit(restaurant1);
      expect(result1.allowed).toBe(false);

      // Check rate limit for restaurant 2 - should be allowed (independent)
      const result2 = MenuEmbeddingService.checkRateLimit(restaurant2);
      expect(result2.allowed).toBe(true);

      // Check rate limit for restaurant 3 - should also be allowed (independent)
      const result3 = MenuEmbeddingService.checkRateLimit(restaurant3);
      expect(result3.allowed).toBe(true);

      // Record generation for restaurant 2
      MenuEmbeddingService.recordGeneration(restaurant2);

      // Restaurant 2 now blocked, restaurant 3 still allowed
      const result2After = MenuEmbeddingService.checkRateLimit(restaurant2);
      expect(result2After.allowed).toBe(false);

      const result3After = MenuEmbeddingService.checkRateLimit(restaurant3);
      expect(result3After.allowed).toBe(true);
    });

    it('cleans up old timestamps on check', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Record 5 generations (hit the hourly limit)
      for (let i = 0; i < 5; i++) {
        MenuEmbeddingService.recordGeneration(testRestaurantId);
        vi.advanceTimersByTime(1000); // Small gap between each
      }

      // Should be rate limited now
      const limitedResult = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(limitedResult.allowed).toBe(false);

      // Advance time by more than 1 hour
      vi.advanceTimersByTime(61 * 60 * 1000);

      // Check again - old timestamps should be cleaned up, should be allowed
      const result = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(result.allowed).toBe(true);
      expect(result.retryAfterMs).toBe(0);
    });

    it('returns correct retryAfterMs when limited', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Record a generation to trigger cooldown
      MenuEmbeddingService.recordGeneration(testRestaurantId);

      // Check rate limit - should return retryAfterMs for cooldown
      const result = MenuEmbeddingService.checkRateLimit(testRestaurantId);

      expect(result.allowed).toBe(false);
      expect(typeof result.retryAfterMs).toBe('number');
      expect(result.retryAfterMs).toBeGreaterThan(0);
      // retryAfterMs should be approximately 12 minutes (720000ms)
      expect(result.retryAfterMs).toBeLessThanOrEqual(12 * 60 * 1000);
      expect(result.retryAfterMs).toBeGreaterThan(11 * 60 * 1000);

      // Test retryAfterMs for hourly limit
      MenuEmbeddingService.clearRateLimitHistory();

      // Record 5 generations quickly (within cooldown to ensure hourly limit is hit)
      for (let i = 0; i < 5; i++) {
        MenuEmbeddingService.recordGeneration(testRestaurantId);
      }

      // Check should hit hourly limit
      const hourlyResult = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(hourlyResult.allowed).toBe(false);
      // retryAfterMs should be about 1 hour (oldest generation + 1 hour - now)
      expect(hourlyResult.retryAfterMs).toBeGreaterThan(0);
      expect(hourlyResult.retryAfterMs).toBeLessThanOrEqual(60 * 60 * 1000);
    });

    it('handles empty restaurant id gracefully', () => {
      // Edge case: empty string restaurant id
      const result = MenuEmbeddingService.checkRateLimit('');

      expect(result.allowed).toBe(true);
      expect(result.retryAfterMs).toBe(0);
    });
  });

  describe('clearRateLimitHistory', () => {
    it('clears all rate limit history', () => {
      const restaurant1 = '11111111-1111-1111-1111-111111111111';
      const restaurant2 = '22222222-2222-2222-2222-222222222222';

      // Record generations to create rate limits
      MenuEmbeddingService.recordGeneration(restaurant1);
      MenuEmbeddingService.recordGeneration(restaurant2);

      // Verify both are rate limited
      expect(MenuEmbeddingService.checkRateLimit(restaurant1).allowed).toBe(false);
      expect(MenuEmbeddingService.checkRateLimit(restaurant2).allowed).toBe(false);

      // Clear history
      MenuEmbeddingService.clearRateLimitHistory();

      // After clearing, all checks should be allowed
      const result1 = MenuEmbeddingService.checkRateLimit(restaurant1);
      const result2 = MenuEmbeddingService.checkRateLimit(restaurant2);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('can be called multiple times safely', () => {
      // Should not throw when called multiple times
      expect(() => {
        MenuEmbeddingService.clearRateLimitHistory();
        MenuEmbeddingService.clearRateLimitHistory();
        MenuEmbeddingService.clearRateLimitHistory();
      }).not.toThrow();
    });
  });

  describe('startRateLimitCleanup', () => {
    it('starts the cleanup interval', () => {
      // Should not throw when starting
      expect(() => {
        MenuEmbeddingService.startRateLimitCleanup();
      }).not.toThrow();
    });

    it('logs warning when called multiple times', () => {
      // First call should succeed
      MenuEmbeddingService.startRateLimitCleanup();

      // Second call should log a warning but not throw
      expect(() => {
        MenuEmbeddingService.startRateLimitCleanup();
      }).not.toThrow();
    });

    it('does not create multiple intervals when called repeatedly', () => {
      // Start cleanup
      MenuEmbeddingService.startRateLimitCleanup();

      // Start again (should be idempotent)
      MenuEmbeddingService.startRateLimitCleanup();

      // Stop should work correctly
      expect(() => {
        MenuEmbeddingService.stopRateLimitCleanup();
      }).not.toThrow();
    });
  });

  describe('stopRateLimitCleanup', () => {
    it('stops the cleanup interval', () => {
      // Start first
      MenuEmbeddingService.startRateLimitCleanup();

      // Should not throw when stopping
      expect(() => {
        MenuEmbeddingService.stopRateLimitCleanup();
      }).not.toThrow();
    });

    it('can be called without starting first', () => {
      // Should not throw when stopping without starting
      expect(() => {
        MenuEmbeddingService.stopRateLimitCleanup();
      }).not.toThrow();
    });

    it('clears rate limit data on stop', () => {
      const testRestaurantId = '11111111-1111-1111-1111-111111111111';

      // Start cleanup
      MenuEmbeddingService.startRateLimitCleanup();

      // Record a generation to create rate limit data
      MenuEmbeddingService.recordGeneration(testRestaurantId);

      // Verify rate limited
      expect(MenuEmbeddingService.checkRateLimit(testRestaurantId).allowed).toBe(false);

      // Stop cleanup (should clear data)
      MenuEmbeddingService.stopRateLimitCleanup();

      // After stop, data should be cleared
      const result = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(result.allowed).toBe(true);
    });

    it('can be called multiple times safely', () => {
      MenuEmbeddingService.startRateLimitCleanup();

      // Should not throw when called multiple times
      expect(() => {
        MenuEmbeddingService.stopRateLimitCleanup();
        MenuEmbeddingService.stopRateLimitCleanup();
        MenuEmbeddingService.stopRateLimitCleanup();
      }).not.toThrow();
    });
  });

  describe('cleanup mechanism', () => {
    it('removes stale entries after 1 hour', () => {
      const testRestaurantId = '11111111-1111-1111-1111-111111111111';
      const now = Date.now();
      vi.setSystemTime(now);

      // Start cleanup
      MenuEmbeddingService.startRateLimitCleanup();

      // Record a generation
      MenuEmbeddingService.recordGeneration(testRestaurantId);

      // Verify rate limited
      expect(MenuEmbeddingService.checkRateLimit(testRestaurantId).allowed).toBe(false);

      // Advance time by more than 1 hour (STALE_ENTRY_THRESHOLD_MS)
      vi.advanceTimersByTime(61 * 60 * 1000);

      // Trigger the cleanup interval
      vi.runOnlyPendingTimers();

      // After cleanup, the entry should be considered stale
      // New check should be allowed
      const result = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(result.allowed).toBe(true);
    });

    it('retains recent entries during cleanup', () => {
      const testRestaurantId = '11111111-1111-1111-1111-111111111111';
      const now = Date.now();
      vi.setSystemTime(now);

      // Start cleanup
      MenuEmbeddingService.startRateLimitCleanup();

      // Record a generation
      MenuEmbeddingService.recordGeneration(testRestaurantId);

      // Advance time by less than 1 hour but past cooldown
      vi.advanceTimersByTime(30 * 60 * 1000);

      // After 30 minutes, cooldown (12 min) is cleared but entry is not stale
      // Check should be allowed (cooldown passed) but entry still exists for hourly tracking
      const result = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(result.allowed).toBe(true);

      // Record another generation
      MenuEmbeddingService.recordGeneration(testRestaurantId);

      // Now should be rate limited again (cooldown from new generation)
      const afterSecondGen = MenuEmbeddingService.checkRateLimit(testRestaurantId);
      expect(afterSecondGen.allowed).toBe(false);
    });

    it('handles cleanup with multiple restaurants', () => {
      const restaurant1 = '11111111-1111-1111-1111-111111111111';
      const restaurant2 = '22222222-2222-2222-2222-222222222222';
      const now = Date.now();
      vi.setSystemTime(now);

      // Start cleanup
      MenuEmbeddingService.startRateLimitCleanup();

      // Record generations for both restaurants
      MenuEmbeddingService.recordGeneration(restaurant1);
      MenuEmbeddingService.recordGeneration(restaurant2);

      // Both should be rate limited
      expect(MenuEmbeddingService.checkRateLimit(restaurant1).allowed).toBe(false);
      expect(MenuEmbeddingService.checkRateLimit(restaurant2).allowed).toBe(false);

      // Advance time by more than 1 hour
      vi.advanceTimersByTime(61 * 60 * 1000);

      // Trigger the cleanup interval
      vi.runOnlyPendingTimers();

      // Both restaurants should have fresh limits
      const result1 = MenuEmbeddingService.checkRateLimit(restaurant1);
      const result2 = MenuEmbeddingService.checkRateLimit(restaurant2);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('formatItemForEmbedding', () => {
    it('formats basic menu item correctly', () => {
      const item = {
        id: 'item-1',
        name: 'Cheeseburger',
        description: 'A delicious burger with cheese',
        price: 1299 // $12.99 in cents
      };

      const result = MenuEmbeddingService.formatItemForEmbedding(item);

      expect(result).toContain('Cheeseburger');
      expect(result).toContain('A delicious burger with cheese');
      expect(result).toContain('Price: $12.99');
    });

    it('includes category when provided', () => {
      const item = {
        id: 'item-1',
        name: 'Cheeseburger',
        description: 'A delicious burger',
        price: 1299,
        category_name: 'Burgers'
      };

      const result = MenuEmbeddingService.formatItemForEmbedding(item);

      expect(result).toContain('Category: Burgers');
    });

    it('includes dietary flags when provided', () => {
      const item = {
        id: 'item-1',
        name: 'Garden Salad',
        description: 'Fresh garden vegetables',
        price: 899,
        dietary_flags: ['vegetarian', 'gluten-free']
      };

      const result = MenuEmbeddingService.formatItemForEmbedding(item);

      expect(result).toContain('Dietary: vegetarian, gluten-free');
    });

    it('handles null description', () => {
      const item = {
        id: 'item-1',
        name: 'Mystery Dish',
        description: null,
        price: 999
      };

      const result = MenuEmbeddingService.formatItemForEmbedding(item);

      expect(result).toContain('Mystery Dish');
      expect(result).toContain('Price: $9.99');
      expect(result).not.toContain('null');
    });

    it('handles empty dietary flags array', () => {
      const item = {
        id: 'item-1',
        name: 'Regular Dish',
        description: 'Just a dish',
        price: 799,
        dietary_flags: []
      };

      const result = MenuEmbeddingService.formatItemForEmbedding(item);

      expect(result).not.toContain('Dietary:');
    });

    it('handles undefined category and dietary flags', () => {
      const item = {
        id: 'item-1',
        name: 'Simple Dish',
        description: 'A simple dish',
        price: 599,
        category_name: undefined,
        dietary_flags: undefined
      };

      const result = MenuEmbeddingService.formatItemForEmbedding(item);

      expect(result).toContain('Simple Dish');
      expect(result).toContain('A simple dish');
      expect(result).toContain('Price: $5.99');
      expect(result).not.toContain('Category:');
      expect(result).not.toContain('Dietary:');
    });

    it('formats price correctly for various amounts', () => {
      const testCases = [
        { price: 100, expected: '$1.00' },
        { price: 1000, expected: '$10.00' },
        { price: 9999, expected: '$99.99' },
        { price: 50, expected: '$0.50' }
      ];

      testCases.forEach(({ price, expected }) => {
        const item = {
          id: 'item-1',
          name: 'Test Item',
          description: null,
          price
        };

        const result = MenuEmbeddingService.formatItemForEmbedding(item);
        expect(result).toContain(`Price: ${expected}`);
      });
    });
  });
});
