import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Response } from 'express';
import { validateRestaurantAccess, requireRestaurantRole } from '../restaurantAccess';
import { AuthenticatedRequest } from '../auth';
import { supabase } from '../../config/database';

// Mock Supabase
vi.mock('../../config/database', () => ({
  supabase: {
    from: vi.fn()
  }
}));

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

describe('Restaurant Access Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  // Test UUIDs (as per CLAUDE.md)
  const testRestaurantId = '11111111-1111-1111-1111-111111111111';
  const forbiddenRestaurantId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue(undefined)
    };
    mockRes = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
    // Enable DEMO_MODE for demo user tests
    process.env['DEMO_MODE'] = 'enabled';
  });

  describe('validateRestaurantAccess', () => {
    it('should reject unauthenticated requests', async () => {
      // Restaurant ID set on request but no user authenticated
      mockReq.restaurantId = testRestaurantId;

      await validateRestaurantAccess(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          statusCode: 401
        })
      );
    });

    it('should reject requests without restaurant ID in JWT token', async () => {
      // User authenticated but no restaurantId set (meaning JWT didn't have it)
      mockReq.user = { id: 'user-123', email: 'test@example.com' };
      // mockReq.restaurantId is undefined - simulating JWT without restaurant_id

      await validateRestaurantAccess(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Restaurant ID is required in JWT token',
          statusCode: 403
        })
      );
    });

    it('should allow admin users access to any restaurant', async () => {
      mockReq.user = { id: 'admin-123', email: 'admin@example.com', role: 'admin' };
      // restaurantId is now set by auth middleware from JWT token
      mockReq.restaurantId = testRestaurantId;

      await validateRestaurantAccess(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.restaurantId).toBe(testRestaurantId);
      expect(mockNext).toHaveBeenCalledWith();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should validate non-admin user access to restaurant', async () => {
      mockReq.user = { id: 'user-123', email: 'user@example.com', role: 'user' };
      // restaurantId is set by auth middleware from JWT token
      mockReq.restaurantId = testRestaurantId;

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { restaurant_id: testRestaurantId, role: 'manager' },
          error: null
        })
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      await validateRestaurantAccess(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(supabase.from).toHaveBeenCalledWith('user_restaurants');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('restaurant_id', testRestaurantId);
      expect(mockReq.restaurantId).toBe(testRestaurantId);
      expect(mockReq.restaurantRole).toBe('manager');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user has no access to restaurant', async () => {
      mockReq.user = { id: 'user-123', email: 'user@example.com', role: 'user' };
      // restaurantId is set by auth middleware from JWT token
      mockReq.restaurantId = forbiddenRestaurantId;

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows found' }
        })
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      await validateRestaurantAccess(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access denied to this restaurant',
          statusCode: 403
        })
      );
    });

    it('should use restaurantId from request (set by auth middleware)', async () => {
      mockReq.user = { id: 'admin-123', email: 'admin@example.com', role: 'admin' };
      mockReq.restaurantId = testRestaurantId;

      await validateRestaurantAccess(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.restaurantId).toBe(testRestaurantId);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireRestaurantRole', () => {
    it('should allow users with required role', () => {
      mockReq.user = { id: 'user-123' };
      mockReq.restaurantRole = 'manager';

      const middleware = requireRestaurantRole(['manager', 'admin']);
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny users without required role', () => {
      mockReq.user = { id: 'user-123' };
      mockReq.restaurantRole = 'staff';

      const middleware = requireRestaurantRole(['manager', 'admin']);
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions for this restaurant',
          statusCode: 403
        })
      );
    });

    it('should deny when no restaurant role is set', () => {
      mockReq.user = { id: 'user-123' };
      // mockReq.restaurantRole = undefined;

      const middleware = requireRestaurantRole(['manager']);
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions for this restaurant',
          statusCode: 403
        })
      );
    });
  });
});
