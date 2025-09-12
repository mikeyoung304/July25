import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateRestaurantAccess } from '../../src/middleware/auth';
import { AuthenticatedRequest } from '../../src/types/auth';
import { Response, NextFunction } from 'express';
import { BadRequest, Forbidden } from '../../src/middleware/errorHandler';

// Mock the AuthenticationService
vi.mock('../../src/services/auth/AuthenticationService', () => ({
  AuthenticationService: {
    getUserRestaurantRole: vi.fn()
  }
}));

import { AuthenticationService } from '../../src/services/auth/AuthenticationService';

describe('validateRestaurantAccess middleware (current simple implementation)', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;
  
  beforeEach(() => {
    req = {
      headers: {},
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'server',
        scopes: ['orders:read', 'orders:create']
      },
      restaurantId: undefined
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    next = vi.fn();
    
    // Reset all mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set restaurantId from x-restaurant-id header', async () => {
    // Setup: request with x-restaurant-id header
    req.headers = { 'x-restaurant-id': 'restaurant-123' };
    
    // Execute
    await validateRestaurantAccess(req as AuthenticatedRequest, res as Response, next);
    
    // Assert: restaurantId set and next() called without error
    expect(req.restaurantId).toBe('restaurant-123');
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // No error
  });

  it('should use default restaurant ID when no header provided', async () => {
    // Setup: no x-restaurant-id header
    req.headers = {};
    
    // Execute
    await validateRestaurantAccess(req as AuthenticatedRequest, res as Response, next);
    
    // Assert: uses default restaurant ID from config
    expect(req.restaurantId).toBe('11111111-1111-1111-1111-111111111111'); // Default from config
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // No error
  });

  it('should allow async/sync function signature', async () => {
    // This test validates the function signature matches Express middleware
    // The current implementation is synchronous, not async
    req.headers = { 'x-restaurant-id': 'test-restaurant' };
    
    // Execute synchronously (no await needed for current implementation)
    validateRestaurantAccess(req as AuthenticatedRequest, res as Response, next);
    
    // Assert
    expect(req.restaurantId).toBe('test-restaurant');
    expect(next).toHaveBeenCalledWith();
  });
});