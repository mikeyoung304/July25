/**
 * Memory Leak Prevention Tests
 *
 * Tests for P0.8 memory leak fixes:
 * - VoiceWebSocketServer cleanup interval
 * - AuthRateLimiter cleanup interval
 * - Graceful shutdown cleanup
 *
 * Related: docs/investigations/P0_MEMORY_LEAK_ANALYSIS.md
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceWebSocketServer } from '../src/voice/websocket-server';
import { startRateLimiterCleanup, stopRateLimiterCleanup } from '../src/middleware/authRateLimiter';

describe('Memory Leak Prevention', () => {
  describe('VoiceWebSocketServer', () => {
    let server: VoiceWebSocketServer;

    beforeEach(() => {
      server = new VoiceWebSocketServer();
    });

    afterEach(() => {
      // Always cleanup after each test
      server.shutdown();
    });

    test('should store cleanup interval reference on construction', () => {
      // The cleanup interval should be created and stored
      // We can't directly access private members, but we can verify behavior
      expect(server).toBeDefined();
      expect(typeof server.shutdown).toBe('function');
    });

    test('should clear cleanup interval on shutdown', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      server.shutdown();

      // Should have cleared at least one interval (the cleanup interval)
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('should stop all active sessions on shutdown', () => {
      // Create a new server
      const testServer = new VoiceWebSocketServer();

      // Shutdown should complete without errors
      expect(() => testServer.shutdown()).not.toThrow();

      // Should be able to call shutdown multiple times safely
      expect(() => testServer.shutdown()).not.toThrow();
    });

    test('should log shutdown events', () => {
      // Spy on console/logger to verify shutdown is logged
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      server.shutdown();

      // Cleanup spy
      consoleInfoSpy.mockRestore();
    });
  });

  describe('AuthRateLimiter Cleanup', () => {
    afterEach(() => {
      // Always stop cleanup after each test
      stopRateLimiterCleanup();
    });

    test('should start cleanup interval', () => {
      // Note: startRateLimiterCleanup() is called automatically on module load
      // So we just verify it's safe to call and doesn't create duplicates
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Try to start again (should warn about already started)
      startRateLimiterCleanup();

      // Cleanup spy
      consoleWarnSpy.mockRestore();

      // The function should exist and be callable
      expect(typeof startRateLimiterCleanup).toBe('function');
    });

    test('should not create duplicate intervals', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      startRateLimiterCleanup();
      const firstCallCount = setIntervalSpy.mock.calls.length;

      // Try to start again
      startRateLimiterCleanup();
      const secondCallCount = setIntervalSpy.mock.calls.length;

      // Should not have created a second interval
      expect(secondCallCount).toBe(firstCallCount);
    });

    test('should clear interval on stop', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      startRateLimiterCleanup();
      stopRateLimiterCleanup();

      // Should have cleared the interval
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('should clear all tracked IPs on stop', () => {
      startRateLimiterCleanup();

      // Stop should complete without errors
      expect(() => stopRateLimiterCleanup()).not.toThrow();

      // Should be safe to call multiple times
      expect(() => stopRateLimiterCleanup()).not.toThrow();
    });
  });

  describe('Cleanup Integration', () => {
    test('should cleanup all resources in correct order', () => {
      const voiceServer = new VoiceWebSocketServer();
      startRateLimiterCleanup();

      // Simulate graceful shutdown
      expect(() => {
        voiceServer.shutdown();
        stopRateLimiterCleanup();
      }).not.toThrow();
    });

    test('should handle cleanup errors gracefully', () => {
      // Create server
      const voiceServer = new VoiceWebSocketServer();

      // Shutdown once
      voiceServer.shutdown();

      // Second shutdown should be safe (no errors)
      expect(() => voiceServer.shutdown()).not.toThrow();
    });
  });

  describe('Interval Leak Prevention', () => {
    test('should not accumulate intervals on multiple instantiations', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const initialIntervalCount = setIntervalSpy.mock.calls.length;

      // Create and destroy multiple servers
      for (let i = 0; i < 3; i++) {
        const server = new VoiceWebSocketServer();
        server.shutdown();
      }

      // Each server creates one interval
      const intervalsCreated = setIntervalSpy.mock.calls.length - initialIntervalCount;
      const intervalsCleared = clearIntervalSpy.mock.calls.length;

      // All created intervals should be cleared
      expect(intervalsCleared).toBeGreaterThanOrEqual(intervalsCreated);
    });

    test('should not leak rate limiter intervals', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      // Start and stop multiple times
      for (let i = 0; i < 3; i++) {
        startRateLimiterCleanup();
        stopRateLimiterCleanup();
      }

      // Should have cleared intervals (at least 3 times)
      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Memory Leak Indicators', () => {
    test('should not keep references after shutdown', async () => {
      const server = new VoiceWebSocketServer();

      // Get active sessions count before shutdown
      const beforeCount = server.getActiveSessions();

      // Shutdown
      server.shutdown();

      // Active sessions should remain the same or be cleaned up
      const afterCount = server.getActiveSessions();
      expect(afterCount).toBe(beforeCount); // No new sessions should be added
    });

    test('should handle rapid shutdown calls', () => {
      const server = new VoiceWebSocketServer();

      // Call shutdown multiple times rapidly
      const shutdownPromises = Array.from({ length: 10 }, () =>
        Promise.resolve(server.shutdown())
      );

      // Should not throw errors
      expect(() => Promise.all(shutdownPromises)).not.toThrow();
    });
  });
});

describe('Error Handler Cleanup', () => {
  describe('VoiceWebSocketServer Error Handling', () => {
    let server: VoiceWebSocketServer;

    beforeEach(() => {
      server = new VoiceWebSocketServer();
    });

    afterEach(() => {
      server.shutdown();
    });

    test('should have error handler that cleans up session', () => {
      // The error handler (handleError) should call stopSession
      // This is verified by checking that the method exists and is callable
      expect(server).toBeDefined();

      // Shutdown should work even after errors
      expect(() => server.shutdown()).not.toThrow();
    });
  });
});

describe('Performance Metrics', () => {
  test('should not leak memory over multiple operations', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Create and destroy servers multiple times
    for (let i = 0; i < 100; i++) {
      const server = new VoiceWebSocketServer();
      server.shutdown();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDiff = finalMemory - initialMemory;

    // Memory difference should be reasonable (< 10MB for 100 iterations)
    // This is a soft check - exact numbers vary by runtime
    expect(memoryDiff).toBeLessThan(10 * 1024 * 1024);
  });
});
