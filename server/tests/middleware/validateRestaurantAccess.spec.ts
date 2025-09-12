import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRestaurantAccess } from '../../src/middleware/auth';
import { authService } from '../../src/services/auth/AuthenticationService';

// Mock the auth service
vi.mock('../../src/services/auth/AuthenticationService', () => ({
  authService: {
    getUserRestaurantRole: vi.fn()
  }
}));

describe('validateRestaurantAccess', () => {
  let nextFn: any;

  beforeEach(() => {
    vi.clearAllMocks();
    nextFn = vi.fn();
  });

  it('should return 403 Forbidden when staff user lacks restaurant membership', async () => {
    // Mock getUserRestaurantRole to return null (no membership)
    vi.mocked(authService.getUserRestaurantRole).mockResolvedValue(null);

    const req = {
      method: 'POST',
      path: '/api/v1/orders',
      restaurantId: '11111111-1111-1111-1111-111111111111',
      user: { 
        id: 'user-x', 
        tokenType: 'supabase',
        role: 'server',
        email: 'test@example.com',
        restaurant_id: undefined,
        scopes: []
      }
    } as any;

    const res = {} as any;

    await validateRestaurantAccess(req, res, nextFn);

    // Assert that next was called with an error
    expect(nextFn).toHaveBeenCalledTimes(1);
    const error = nextFn.mock.calls[0][0];
    
    // Verify it's a 403 error with correct code
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('RESTAURANT_ACCESS_DENIED');
    expect(error.message).toBe('Restaurant access denied');
  });

  it('should allow access when staff user has restaurant membership', async () => {
    // Mock getUserRestaurantRole to return valid role data
    vi.mocked(authService.getUserRestaurantRole).mockResolvedValue({
      role: 'manager',
      scopes: ['orders:read', 'orders:write']
    });

    const req = {
      method: 'POST',
      path: '/api/v1/orders',
      restaurantId: '11111111-1111-1111-1111-111111111111',
      user: { 
        id: 'user-x', 
        tokenType: 'supabase',
        role: 'server',
        email: 'test@example.com',
        restaurant_id: undefined,
        scopes: []
      }
    } as any;

    const res = {} as any;

    await validateRestaurantAccess(req, res, nextFn);

    // Assert that next was called without error
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(nextFn).toHaveBeenCalledWith();
    
    // Verify user role was updated with restaurant-specific data
    expect(req.user.role).toBe('manager');
    expect(req.user.scopes).toEqual(['orders:read', 'orders:write']);
  });

  it('should return 400 Bad Request when restaurant context is missing', async () => {
    const req = {
      method: 'POST',
      path: '/api/v1/orders',
      restaurantId: undefined, // Missing restaurant context
      user: { 
        id: 'user-x', 
        tokenType: 'supabase',
        role: 'server',
        email: 'test@example.com',
        restaurant_id: undefined,
        scopes: []
      }
    } as any;

    const res = {} as any;

    await validateRestaurantAccess(req, res, nextFn);

    // Assert that next was called with an error
    expect(nextFn).toHaveBeenCalledTimes(1);
    const error = nextFn.mock.calls[0][0];
    
    // Verify it's a 400 error
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('RESTAURANT_CONTEXT_MISSING');
    expect(error.message).toBe('Restaurant context required');
  });
});