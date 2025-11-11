/**
 * Environment Validation Tests (P0.7)
 *
 * Tests for enhanced startup environment validation per ADR-009 fail-fast philosophy.
 * Ensures all compliance-critical variables are validated at startup.
 *
 * Related:
 * - server/src/config/env.ts
 * - docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Environment Validation (P0.7)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear module cache to force re-evaluation
    vi.resetModules();
  });

  describe('TIER 1: Always Required Variables', () => {
    it('should fail when SUPABASE_URL is missing', async () => {
      // Set up minimal valid environment except for SUPABASE_URL
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        SUPABASE_URL: '', // Missing
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
      };

      // Dynamic import to trigger validation
      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('SUPABASE_URL is required in all environments');
    });

    it('should fail when SUPABASE_ANON_KEY is missing', async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: '', // Missing
        SUPABASE_SERVICE_KEY: 'test-service-key',
        DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
      };

      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('SUPABASE_ANON_KEY is required in all environments');
    });

    it('should fail when SUPABASE_SERVICE_KEY is missing', async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: '', // Missing
        DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
      };

      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('SUPABASE_SERVICE_KEY is required in all environments');
    });

    // Note: Testing missing DEFAULT_RESTAURANT_ID is not feasible with current module structure
    // because env.ts loads .env file at module import time (before tests can modify process.env).
    // Instead, we test the UUID format validation below which catches invalid values.

    it('should fail when DEFAULT_RESTAURANT_ID is not a valid UUID', async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        DEFAULT_RESTAURANT_ID: 'not-a-uuid', // Invalid UUID
      };

      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('DEFAULT_RESTAURANT_ID must be a valid UUID format');
    });

    it('should pass when all TIER 1 variables are valid', async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
        SUPABASE_JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation',
      };

      const { validateEnv } = await import('../../src/config/env');
      expect(() => validateEnv()).not.toThrow();
    });
  });

  describe('TIER 2: Production-Critical Variables (Payment)', () => {
    const validBaseEnv = {
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      SUPABASE_JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation',
      DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
      OPENAI_API_KEY: 'test-openai-key',
    };

    it('should fail in production when SQUARE_ACCESS_TOKEN is missing', async () => {
      process.env = {
        ...originalEnv,
        ...validBaseEnv,
        SQUARE_ACCESS_TOKEN: '', // Missing
        SQUARE_LOCATION_ID: 'test-location-id',
        SQUARE_APP_ID: 'test-app-id',
        // Add auth secrets to prevent those validation errors
        KIOSK_JWT_SECRET: 'test-kiosk-jwt-secret-long-enough',
        STATION_TOKEN_SECRET: 'test-station-token-secret-long',
        PIN_PEPPER: 'test-pin-pepper-long-enough-here',
        DEVICE_FINGERPRINT_SALT: 'test-device-fingerprint-salt-here',
        FRONTEND_URL: 'https://example.com',
      };

      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('SQUARE_ACCESS_TOKEN is required for payment processing');
    });

    it('should fail in production when SQUARE_LOCATION_ID is missing', async () => {
      process.env = {
        ...originalEnv,
        ...validBaseEnv,
        SQUARE_ACCESS_TOKEN: 'test-access-token',
        SQUARE_LOCATION_ID: '', // Missing
        SQUARE_APP_ID: 'test-app-id',
        KIOSK_JWT_SECRET: 'test-kiosk-jwt-secret-long-enough',
        STATION_TOKEN_SECRET: 'test-station-token-secret-long',
        PIN_PEPPER: 'test-pin-pepper-long-enough-here',
        DEVICE_FINGERPRINT_SALT: 'test-device-fingerprint-salt-here',
        FRONTEND_URL: 'https://example.com',
      };

      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('SQUARE_LOCATION_ID is required for payment processing');
    });

    it('should fail in production when SQUARE_APP_ID is missing', async () => {
      process.env = {
        ...originalEnv,
        ...validBaseEnv,
        SQUARE_ACCESS_TOKEN: 'test-access-token',
        SQUARE_LOCATION_ID: 'test-location-id',
        SQUARE_APP_ID: '', // Missing
        KIOSK_JWT_SECRET: 'test-kiosk-jwt-secret-long-enough',
        STATION_TOKEN_SECRET: 'test-station-token-secret-long',
        PIN_PEPPER: 'test-pin-pepper-long-enough-here',
        DEVICE_FINGERPRINT_SALT: 'test-device-fingerprint-salt-here',
        FRONTEND_URL: 'https://example.com',
      };

      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('SQUARE_APP_ID is required for payment processing');
    });

    it('should only warn (not fail) when payment vars missing in development', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        SUPABASE_JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation',
        DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
        SQUARE_ACCESS_TOKEN: '', // Missing
        SQUARE_LOCATION_ID: '', // Missing
        SQUARE_APP_ID: '', // Missing
      };

      const { validateEnv } = await import('../../src/config/env');
      expect(() => validateEnv()).not.toThrow();

      // Should have warned about missing payment vars
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnings = consoleWarnSpy.mock.calls.map(call => call[0]);
      expect(warnings.some((w: string) => w.includes('SQUARE_ACCESS_TOKEN'))).toBe(true);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('TIER 2: Production-Critical Variables (Auth)', () => {
    const validBaseEnv = {
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      SUPABASE_JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation',
      DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
      OPENAI_API_KEY: 'test-openai-key',
      SQUARE_ACCESS_TOKEN: 'test-access-token',
      SQUARE_LOCATION_ID: 'test-location-id',
      SQUARE_APP_ID: 'test-app-id',
      FRONTEND_URL: 'https://example.com',
    };

    it('should fail in production when KIOSK_JWT_SECRET is missing', async () => {
      process.env = {
        ...originalEnv,
        ...validBaseEnv,
        KIOSK_JWT_SECRET: '', // Missing
        STATION_TOKEN_SECRET: 'test-station-token-secret-long',
        PIN_PEPPER: 'test-pin-pepper-long-enough-here',
        DEVICE_FINGERPRINT_SALT: 'test-device-fingerprint-salt-here',
      };

      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('KIOSK_JWT_SECRET is required for authentication');
    });

    it('should fail in production when PIN_PEPPER is missing', async () => {
      process.env = {
        ...originalEnv,
        ...validBaseEnv,
        KIOSK_JWT_SECRET: 'test-kiosk-jwt-secret-long-enough',
        STATION_TOKEN_SECRET: 'test-station-token-secret-long',
        PIN_PEPPER: '', // Missing
        DEVICE_FINGERPRINT_SALT: 'test-device-fingerprint-salt-here',
      };

      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('PIN_PEPPER is required for authentication');
    });
  });

  describe('Format Validation', () => {
    it('should fail when FRONTEND_URL is missing scheme', async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        SUPABASE_JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation',
        DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
        FRONTEND_URL: 'example.com', // Missing http:// or https://
        OPENAI_API_KEY: 'test-key',
        SQUARE_ACCESS_TOKEN: 'test-token',
        SQUARE_LOCATION_ID: 'test-location',
        SQUARE_APP_ID: 'test-app',
        KIOSK_JWT_SECRET: 'test-kiosk-jwt-secret-long-enough',
        STATION_TOKEN_SECRET: 'test-station-token-secret-long',
        PIN_PEPPER: 'test-pin-pepper-long-enough-here',
        DEVICE_FINGERPRINT_SALT: 'test-device-fingerprint-salt-here',
      };

      await expect(async () => {
        const { validateEnv } = await import('../../src/config/env');
        validateEnv();
      }).rejects.toThrow('FRONTEND_URL must start with http:// or https://');
    });

    it('should warn when secret is too short', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        SUPABASE_JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation',
        DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
        PIN_PEPPER: 'short', // Too short (< 32 chars)
        DEVICE_FINGERPRINT_SALT: 'test-device-fingerprint-salt-here',
        KIOSK_JWT_SECRET: 'test-kiosk-jwt-secret-long-enough',
        STATION_TOKEN_SECRET: 'test-station-token-secret-long',
      };

      const { validateEnv } = await import('../../src/config/env');
      validateEnv();

      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnings = consoleWarnSpy.mock.calls.map(call => call[0]);
      expect(warnings.some((w: string) => w.includes('PIN_PEPPER is too short'))).toBe(true);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Comprehensive Production Validation', () => {
    it('should pass when all production variables are valid', async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        SUPABASE_JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation',
        DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
        OPENAI_API_KEY: 'test-openai-key',
        SQUARE_ACCESS_TOKEN: 'EAAA-production-token', // Production format
        SQUARE_LOCATION_ID: 'test-location-id',
        SQUARE_APP_ID: 'test-app-id',
        SQUARE_ENVIRONMENT: 'production',
        KIOSK_JWT_SECRET: 'test-kiosk-jwt-secret-long-enough-to-pass-validation',
        STATION_TOKEN_SECRET: 'test-station-token-secret-long-enough-too',
        PIN_PEPPER: 'test-pin-pepper-long-enough-here-for-security',
        DEVICE_FINGERPRINT_SALT: 'test-device-fingerprint-salt-here-long-enough',
        FRONTEND_URL: 'https://example.com',
      };

      const { validateEnv } = await import('../../src/config/env');
      expect(() => validateEnv()).not.toThrow();
    });
  });
});
