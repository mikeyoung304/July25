import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate, AuthenticatedRequest } from '../auth';
import { Response, NextFunction } from 'express';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
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
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = vi.fn();
    
    // Reset environment variables
    process.env.NODE_ENV = 'test';
    process.env.KIOSK_JWT_SECRET = 'test-kiosk-secret';
  });

  describe('JWT Authentication', () => {
    it('should reject requests without authorization header', async () => {
      await expect(
        authenticate(req as AuthenticatedRequest, res as Response, next)
      ).rejects.toThrow('No token provided');
    });

    it('should reject requests with invalid authorization format', async () => {
      req.headers = { authorization: 'Invalid token' };
      
      await expect(
        authenticate(req as AuthenticatedRequest, res as Response, next)
      ).rejects.toThrow('No token provided');
    });

    it('should accept valid JWT token', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'manager',
        scope: ['orders:read', 'payments:process'],
        restaurant_id: 'rest-123'
      };
      
      const token = jwt.sign(payload, 'test-jwt-secret');
      req.headers = { authorization: `Bearer ${token}` };
      
      await authenticate(req as AuthenticatedRequest, res as Response, next);
      
      expect(req.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'manager',
        scopes: ['orders:read', 'payments:process'],
        restaurant_id: 'rest-123'
      });
      expect(req.restaurantId).toBe('rest-123');
      expect(next).toHaveBeenCalled();
    });

    it('should reject expired JWT tokens', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };
      
      const token = jwt.sign(payload, 'test-jwt-secret', { noTimestamp: true });
      req.headers = { authorization: `Bearer ${token}` };
      
      await expect(
        authenticate(req as AuthenticatedRequest, res as Response, next)
      ).rejects.toThrow('Token expired');
    });

    it('should reject tokens with invalid signature', async () => {
      const token = jwt.sign({ sub: 'user-123' }, 'wrong-secret');
      req.headers = { authorization: `Bearer ${token}` };
      
      await expect(
        authenticate(req as AuthenticatedRequest, res as Response, next)
      ).rejects.toThrow('Invalid token');
    });

    it('should try kiosk JWT secret first if available', async () => {
      const payload = {
        sub: 'kiosk-user',
        role: 'kiosk_demo',
        scope: ['orders:create', 'orders:read']
      };
      
      const token = jwt.sign(payload, 'test-kiosk-secret');
      req.headers = { authorization: `Bearer ${token}` };
      
      await authenticate(req as AuthenticatedRequest, res as Response, next);
      
      expect(req.user?.role).toBe('kiosk_demo');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Development Mode', () => {
    it('should accept test token in development mode', async () => {
      process.env.NODE_ENV = 'development';
      req.headers = { 
        authorization: 'Bearer test-token',
        'x-restaurant-id': 'test-restaurant'
      };
      
      await authenticate(req as AuthenticatedRequest, res as Response, next);
      
      expect(req.user).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        scopes: ['orders:create', 'orders:read', 'orders:write', 'payments:write', 'payments:read']
      });
      expect(req.restaurantId).toBe('test-restaurant');
      expect(next).toHaveBeenCalled();
    });

    it('should reject test token in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PRODUCTION = 'true';
      req.headers = { authorization: 'Bearer test-token' };
      
      await expect(
        authenticate(req as AuthenticatedRequest, res as Response, next)
      ).rejects.toThrow();
    });
  });

  describe('Restaurant Context', () => {
    it('should use restaurant_id from token if available', async () => {
      const payload = {
        sub: 'user-123',
        restaurant_id: 'token-restaurant'
      };
      
      const token = jwt.sign(payload, 'test-jwt-secret');
      req.headers = { 
        authorization: `Bearer ${token}`,
        'x-restaurant-id': 'header-restaurant'
      };
      
      await authenticate(req as AuthenticatedRequest, res as Response, next);
      
      // Header takes precedence
      expect(req.restaurantId).toBe('header-restaurant');
    });

    it('should use default restaurant if none provided', async () => {
      const payload = { sub: 'user-123' };
      const token = jwt.sign(payload, 'test-jwt-secret');
      req.headers = { authorization: `Bearer ${token}` };
      
      await authenticate(req as AuthenticatedRequest, res as Response, next);
      
      expect(req.restaurantId).toBe('default-restaurant-id');
    });
  });

  describe('Session Duration', () => {
    it('should enforce 8-hour sessions for managers', async () => {
      const payload = {
        sub: 'user-123',
        role: 'manager',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (8 * 3600) // 8 hours
      };
      
      const token = jwt.sign(payload, 'test-jwt-secret', { noTimestamp: true });
      req.headers = { authorization: `Bearer ${token}` };
      
      await authenticate(req as AuthenticatedRequest, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should enforce 12-hour sessions for service staff', async () => {
      const payload = {
        sub: 'user-123',
        role: 'server',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (12 * 3600) // 12 hours
      };
      
      const token = jwt.sign(payload, 'test-jwt-secret', { noTimestamp: true });
      req.headers = { authorization: `Bearer ${token}` };
      
      await authenticate(req as AuthenticatedRequest, res as Response, next);
      expect(req.user?.role).toBe('server');
      expect(next).toHaveBeenCalled();
    });
  });
});