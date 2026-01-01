// Test Bootstrap Configuration
// This file sets up the test environment for the server tests

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Configure test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.DEFAULT_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
process.env.KIOSK_JWT_SECRET = 'test-kiosk-jwt-secret-at-least-32!!';
process.env.STATION_TOKEN_SECRET = 'test-station-secret-at-least-32!!';
process.env.PIN_PEPPER = 'test-pepper-secret-at-least-32-chars';
process.env.DEVICE_FINGERPRINT_SALT = 'test-salt-must-be-at-least-32-chars';
process.env.DEMO_MODE = 'enabled';
process.env.STRIPE_SECRET_KEY = 'sk_test_FAKE_KEY_FOR_TESTING_ONLY';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_FAKE_KEY_FOR_TESTING_ONLY';
// AI config can be optional in tests
process.env.AI_DEGRADED_MODE = 'true';

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

// Test bootstrap loaded