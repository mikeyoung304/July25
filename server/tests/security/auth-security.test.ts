import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticate, verifyWebSocketAuth } from '../../src/middleware/auth';
import { Request, Response, NextFunction } from 'express';
import { IncomingMessage } from 'http';
import { logger } from '../../src/utils/logger';

// Mock environment
const originalEnv = process.env;

describe('Auth Security Tests', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('JWT Secret Validation', () => {
    it('should reject auth when JWT_SECRET is missing', async () => {
      // Remove JWT secret
      delete process.env.SUPABASE_JWT_SECRET;

      const req = {
        headers: {
          authorization: 'Bearer fake-token'
        }
      } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      // Express middleware calls next(error) instead of throwing
      await authenticate(req as any, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      // ADR-009 fail-fast policy: EnvValidationError is thrown when required env vars are missing
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/authentication not configured|ENVIRONMENT VALIDATION FAILED|SUPABASE_JWT_SECRET/)
        })
      );
    });

    it('should reject WebSocket auth when JWT_SECRET is missing', async () => {
      // Remove JWT secret
      delete process.env.SUPABASE_JWT_SECRET;

      const request = {
        url: '/?token=fake-token',
        headers: { host: 'localhost' }
      } as IncomingMessage;

      const result = await verifyWebSocketAuth(request);

      expect(result).toBeNull();
    });
  });

  describe('Log Sanitization', () => {
    it('should not log PII in auth success logs', () => {
      const logSpy = vi.spyOn(logger, 'info');

      // Simulate auth success logging
      logger.info('auth_success', {
        user_id: 'user-123',
        restaurant_id: 'restaurant-456'
      });

      const logCalls = logSpy.mock.calls;
      const authSuccessLog = logCalls.find(call => call[0] === 'auth_success');

      expect(authSuccessLog).toBeDefined();
      if (authSuccessLog && authSuccessLog[1]) {
        const logData = authSuccessLog[1] as Record<string, any>;

        // Should NOT contain PII
        expect(logData).not.toHaveProperty('email');
        expect(logData).not.toHaveProperty('token');
        expect(logData).not.toHaveProperty('password');
        expect(logData).not.toHaveProperty('scopes');
        expect(logData).not.toHaveProperty('role');

        // Should contain only non-PII identifiers
        expect(logData).toHaveProperty('user_id');
        expect(logData).toHaveProperty('restaurant_id');
      }
    });

    it('should not log PII in auth failure logs', () => {
      const logSpy = vi.spyOn(logger, 'warn');

      // Simulate auth failure logging
      logger.warn('auth_fail', {
        reason: 'invalid_credentials',
        restaurant_id: 'restaurant-456'
      });

      const logCalls = logSpy.mock.calls;
      const authFailLog = logCalls.find(call => call[0] === 'auth_fail');

      expect(authFailLog).toBeDefined();
      if (authFailLog && authFailLog[1]) {
        const logData = authFailLog[1] as Record<string, any>;

        // Should NOT contain PII
        expect(logData).not.toHaveProperty('email');
        expect(logData).not.toHaveProperty('token');
        expect(logData).not.toHaveProperty('password');
        expect(logData).not.toHaveProperty('user_id');

        // Should contain only safe context
        expect(logData).toHaveProperty('reason');
        expect(logData).toHaveProperty('restaurant_id');
      }
    });
  });

  describe('WebSocket Auth in Production', () => {
    it('should reject WebSocket connection without token in production', async () => {
      // Set production environment
      process.env.NODE_ENV = 'production';

      const request = {
        url: '/',
        headers: { host: 'localhost' }
      } as IncomingMessage;

      const result = await verifyWebSocketAuth(request);

      expect(result).toBeNull();
    });

    it('should reject WebSocket without token even in development (P0.9 security fix)', async () => {
      // Set development environment
      process.env.NODE_ENV = 'development';

      const warnSpy = vi.spyOn(logger, 'warn');

      const request = {
        url: '/',
        headers: { host: 'localhost' }
      } as IncomingMessage;

      const result = await verifyWebSocketAuth(request);

      // P0.9: Anonymous connections removed for security
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('no token provided'),
        expect.objectContaining({ environment: 'development' })
      );
    });

    it('should reject invalid token in production', async () => {
      // Set production environment
      process.env.NODE_ENV = 'production';
      process.env.SUPABASE_JWT_SECRET = 'test-secret';

      const warnSpy = vi.spyOn(logger, 'warn');

      const request = {
        url: '/?token=invalid-token',
        headers: { host: 'localhost' }
      } as IncomingMessage;

      const result = await verifyWebSocketAuth(request);

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid token'),
        expect.objectContaining({ path: expect.any(String) })
      );
    });
  });

  describe('Security Headers and Validation', () => {
    it('should reject requests without Bearer prefix', async () => {
      process.env.SUPABASE_JWT_SECRET = 'test-secret';

      const req = {
        headers: {
          authorization: 'fake-token' // Missing "Bearer " prefix
        }
      } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      await authenticate(req as any, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401
        })
      );
    });

    it('should reject requests without authorization header', async () => {
      process.env.SUPABASE_JWT_SECRET = 'test-secret';

      const req = {
        headers: {}
      } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      await authenticate(req as any, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401
        })
      );
    });
  });
});
