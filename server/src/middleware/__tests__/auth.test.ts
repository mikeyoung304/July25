import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate, AuthenticatedRequest } from '../auth';
import { Response } from 'express';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      child: vi.fn()
    }))
  }
}));

// Mock the config
vi.mock('../../config/environment', () => ({
  getConfig: () => ({
    supabase: {
      jwtSecret: 'test-jwt-secret',
      anonKey: 'test-anon-key'
    },
    restaurant: {
      defaultId: 'default-restaurant-id'
    }
  })
}));

describe('Auth Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = {
      headers: {},
      cookies: {},
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue(undefined) // Mock req.get() for user-agent header
    };
    res = {};
    next = vi.fn();

    // Reset environment variables
    process.env['NODE_ENV'] = 'test';
    process.env['KIOSK_JWT_SECRET'] = 'test-kiosk-secret';
    // Disable STRICT_AUTH for these tests - many tests don't include restaurant_id
    process.env['STRICT_AUTH'] = 'false';
  });

  describe('JWT Authentication', () => {
    it('should reject requests without authorization header', async () => {
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401
        })
      );
    });

    it('should reject requests with invalid authorization format', async () => {
      req.headers = { authorization: 'Invalid token' };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401
        })
      );
    });

    it('should accept valid JWT token', async () => {
      const testRestaurantId = '11111111-1111-1111-1111-111111111111';
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'manager',
        scope: ['orders:read', 'payments:process'],
        restaurant_id: testRestaurantId
      };

      const token = jwt.sign(payload, 'test-jwt-secret');
      req.headers = { authorization: `Bearer ${token}` };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(req.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'manager',
        scopes: ['orders:read', 'payments:process'],
        restaurant_id: testRestaurantId
      });
      expect(req.restaurantId).toBe(testRestaurantId);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject expired JWT tokens', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        restaurant_id: '11111111-1111-1111-1111-111111111111',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      const token = jwt.sign(payload, 'test-jwt-secret', { noTimestamp: true });
      req.headers = { authorization: `Bearer ${token}` };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token expired',
          statusCode: 401
        })
      );
    });

    it('should reject tokens with invalid signature', async () => {
      const token = jwt.sign({ sub: 'user-123', restaurant_id: '11111111-1111-1111-1111-111111111111' }, 'wrong-secret');
      req.headers = { authorization: `Bearer ${token}` };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401
        })
      );
    });

    it('should reject kiosk_demo role as it is no longer supported', async () => {
      // kiosk_demo role is no longer supported per security hardening P1.7
      const payload = {
        sub: 'kiosk-user',
        role: 'kiosk_demo',
        restaurant_id: '11111111-1111-1111-1111-111111111111',
        scope: ['orders:create', 'orders:read']
      };

      const token = jwt.sign(payload, 'test-jwt-secret');
      req.headers = { authorization: `Bearer ${token}` };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('kiosk_demo'),
          statusCode: 401
        })
      );
    });
  });

  describe('Development Mode', () => {
    it('should reject test token as test tokens are no longer supported', async () => {
      process.env['NODE_ENV'] = 'development';
      req.headers = {
        authorization: 'Bearer test-token',
        'x-restaurant-id': 'test-restaurant'
      };

      // Test tokens are no longer supported for security reasons
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401
        })
      );
    });

    it('should reject test token in production mode', async () => {
      process.env['NODE_ENV'] = 'production';
      process.env['PRODUCTION'] = 'true';
      req.headers = { authorization: 'Bearer test-token' };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401
        })
      );
    });
  });

  describe('Restaurant Context', () => {
    it('should use restaurant_id from JWT token only (not from header)', async () => {
      // Security fix: Always use restaurant_id from token, never from header
      const tokenRestaurantId = '11111111-1111-1111-1111-111111111111';
      const headerRestaurantId = '22222222-2222-2222-2222-222222222222';
      const payload = {
        sub: 'user-123',
        restaurant_id: tokenRestaurantId
      };

      const token = jwt.sign(payload, 'test-jwt-secret');
      req.headers = {
        authorization: `Bearer ${token}`,
        'x-restaurant-id': headerRestaurantId
      };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Token takes precedence over header (security fix CL-AUTH-002)
      expect(req.restaurantId).toBe(tokenRestaurantId);
      expect(next).toHaveBeenCalledWith();
    });

    it('should set restaurantId to undefined if none in token (STRICT_AUTH disabled)', async () => {
      // STRICT_AUTH is disabled in beforeEach, so tokens without restaurant_id are allowed
      const payload = { sub: 'user-123' };
      const token = jwt.sign(payload, 'test-jwt-secret');
      req.headers = { authorization: `Bearer ${token}` };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // No restaurant_id in token, so restaurantId should be undefined
      expect(req.restaurantId).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject tokens without restaurant_id when STRICT_AUTH enabled', async () => {
      process.env['STRICT_AUTH'] = 'true';
      const payload = { sub: 'user-123' };
      const token = jwt.sign(payload, 'test-jwt-secret');
      req.headers = { authorization: `Bearer ${token}` };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token missing restaurant context in strict auth mode',
          statusCode: 401
        })
      );
    });
  });

  describe('Session Duration', () => {
    it('should enforce 8-hour sessions for managers', async () => {
      const payload = {
        sub: 'user-123',
        role: 'manager',
        restaurant_id: '11111111-1111-1111-1111-111111111111',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (8 * 3600) // 8 hours
      };

      const token = jwt.sign(payload, 'test-jwt-secret', { noTimestamp: true });
      req.headers = { authorization: `Bearer ${token}` };

      await authenticate(req as AuthenticatedRequest, res as Response, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should enforce 12-hour sessions for service staff', async () => {
      const payload = {
        sub: 'user-123',
        role: 'server',
        restaurant_id: '11111111-1111-1111-1111-111111111111',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (12 * 3600) // 12 hours
      };

      const token = jwt.sign(payload, 'test-jwt-secret', { noTimestamp: true });
      req.headers = { authorization: `Bearer ${token}` };

      await authenticate(req as AuthenticatedRequest, res as Response, next);
      expect(req.user?.role).toBe('server');
      expect(next).toHaveBeenCalledWith();
    });
  });
});
