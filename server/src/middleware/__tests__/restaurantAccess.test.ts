// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Response, NextFunction } from 'express';
import { validateRestaurantAccess, requireRestaurantRole } from '../restaurantAccess';
import { AuthenticatedRequest } from '../auth';
import { supabase } from '../../config/database';

// Mock Supabase
vi.mock('../../config/database', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Restaurant Access Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined,
      restaurantId: undefined
    };
    mockRes = {};
    mockNext = vi.fn() as unknown as NextFunction;
    vi.clearAllMocks();
  });

  describe('validateRestaurantAccess', () => {
    it('should reject unauthenticated requests', async () => {
      mockReq.headers = { 'x-restaurant-id': 'test-restaurant' };

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

    it('should reject requests without restaurant ID', async () => {
      mockReq.user = { id: 'user-123', email: 'test@example.com' };

      await validateRestaurantAccess(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Restaurant ID is required',
          statusCode: 403
        })
      );
    });

    it('should allow admin users access to any restaurant', async () => {
      mockReq.user = { id: 'admin-123', email: 'admin@example.com', role: 'admin' };
      mockReq.headers = { 'x-restaurant-id': 'any-restaurant' };

      await validateRestaurantAccess(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.restaurantId).toBe('any-restaurant');
      expect(mockNext).toHaveBeenCalledWith();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should validate non-admin user access to restaurant', async () => {
      mockReq.user = { id: 'user-123', email: 'user@example.com', role: 'user' };
      mockReq.headers = { 'x-restaurant-id': 'test-restaurant' };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { restaurant_id: 'test-restaurant', role: 'manager' },
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
      expect(mockQuery.eq).toHaveBeenCalledWith('restaurant_id', 'test-restaurant');
      expect(mockReq.restaurantId).toBe('test-restaurant');
      expect(mockReq.restaurantRole).toBe('manager');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user has no access to restaurant', async () => {
      mockReq.user = { id: 'user-123', email: 'user@example.com', role: 'user' };
      mockReq.headers = { 'x-restaurant-id': 'forbidden-restaurant' };

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

    it('should use restaurantId from request if header not provided', async () => {
      mockReq.user = { id: 'admin-123', email: 'admin@example.com', role: 'admin' };
      mockReq.restaurantId = 'request-restaurant';

      await validateRestaurantAccess(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.restaurantId).toBe('request-restaurant');
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
      mockReq.restaurantRole = undefined;

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