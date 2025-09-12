// Test Bootstrap Configuration
// This file sets up the test environment for the server tests

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Configure test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.KIOSK_JWT_SECRET = 'test-kiosk-jwt-secret';

// Clean up after each test
afterEach(() => {
  // Clear any timers
  vi.clearAllTimers();
  
  // Clear all mocks
  vi.clearAllMocks();
});

// Global setup
beforeAll(() => {
  // Set a reasonable timeout for tests
  vi.setConfig({ testTimeout: 30000 });
});

// Global teardown
afterAll(() => {
  // Clean up any remaining resources
  vi.restoreAllMocks();
});

console.log('Test bootstrap loaded');