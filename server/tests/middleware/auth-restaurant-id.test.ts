import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authenticate } from '../../src/middleware/auth'
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

/**
 * Regression test for Oct 30, 2025 fix
 *
 * Bug: authenticate() middleware was only setting req.user.restaurant_id,
 * but menu/public routes expected req.restaurantId directly.
 *
 * This caused menu API to return 400 "Valid restaurant ID is required"
 * even with valid JWT containing restaurant_id claim.
 *
 * Fix: Added line 102 in server/src/middleware/auth.ts:
 *   req.restaurantId = decoded.restaurant_id || (req.headers['x-restaurant-id'] as string)
 */

// Mock environment
const originalEnv = process.env

describe('Auth Middleware - Restaurant ID Assignment', () => {
  const mockJwtSecret = 'test-secret-key-for-testing'
  const mockRestaurantId = '11111111-1111-1111-1111-111111111111'
  const mockUserId = '22222222-2222-2222-2222-222222222222'

  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      SUPABASE_JWT_SECRET: mockJwtSecret
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  it('sets req.restaurantId from JWT restaurant_id claim', async () => {
    // Create valid JWT with restaurant_id claim
    const token = jwt.sign(
      {
        sub: mockUserId,
        restaurant_id: mockRestaurantId,
        role: 'admin'
      },
      mockJwtSecret,
      { expiresIn: '1h' }
    )

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      },
      user: {},
      ip: '127.0.0.1',
      get: vi.fn(() => 'test-user-agent')
    } as any as Request

    const res = {} as Response
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    // Should call next() without error
    expect(next).toHaveBeenCalledWith()
    expect(next).not.toHaveBeenCalledWith(expect.any(Error))

    // CRITICAL: req.restaurantId must be set for menu/public routes
    expect(req.restaurantId).toBe(mockRestaurantId)

    // req.user.restaurant_id should also be set for backward compatibility
    expect((req as any).user.restaurant_id).toBe(mockRestaurantId)
  })

  it('does NOT fall back to X-Restaurant-ID header (CL-AUTH-002 security fix)', async () => {
    // Create JWT without restaurant_id claim
    // SECURITY: Per CL-AUTH-002, authenticate() no longer falls back to X-Restaurant-ID header
    // This prevents authenticated users from accessing other restaurants' data
    const token = jwt.sign(
      {
        sub: mockUserId,
        role: 'admin'
      },
      mockJwtSecret,
      { expiresIn: '1h' }
    )

    const headerRestaurantId = '33333333-3333-3333-3333-333333333333'

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-restaurant-id': headerRestaurantId
      },
      user: {},
      ip: '127.0.0.1',
      get: vi.fn(() => 'test-user-agent')
    } as any as Request

    const res = {} as Response
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    expect(next).toHaveBeenCalledWith()

    // SECURITY FIX: Should NOT use X-Restaurant-ID header
    // req.restaurantId should be undefined since JWT lacks restaurant_id
    expect(req.restaurantId).toBeUndefined()
  })

  it('sets req.restaurantId even when restaurant_id is only in JWT', async () => {
    // This is the bug scenario: restaurant_id in JWT, no header
    const token = jwt.sign(
      {
        sub: mockUserId,
        restaurant_id: mockRestaurantId,
        role: 'server'
      },
      mockJwtSecret,
      { expiresIn: '1h' }
    )

    const req = {
      headers: {
        authorization: `Bearer ${token}`
        // No X-Restaurant-ID header
      },
      user: {},
      ip: '127.0.0.1',
      get: vi.fn(() => 'test-user-agent')
    } as any as Request

    const res = {} as Response
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    expect(next).toHaveBeenCalledWith()

    // This was broken before Oct 30 fix - req.restaurantId was undefined
    expect(req.restaurantId).toBeDefined()
    expect(req.restaurantId).toBe(mockRestaurantId)
  })

  it('REGRESSION: menu API routes receive restaurantId', async () => {
    /**
     * Simulates the menu API flow that was failing:
     *
     * 1. Request to GET /api/v1/menu/categories with JWT
     * 2. authenticate() middleware runs
     * 3. Menu route handler expects req.restaurantId
     *
     * Before fix: req.restaurantId was undefined → 400 error
     * After fix: req.restaurantId is set from JWT → 200 success
     */

    const token = jwt.sign(
      {
        sub: mockUserId,
        restaurant_id: mockRestaurantId,
        role: 'admin'
      },
      mockJwtSecret,
      { expiresIn: '1h' }
    )

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      },
      user: {},
      method: 'GET',
      path: '/api/v1/menu/categories',
      ip: '127.0.0.1',
      get: vi.fn(() => 'test-user-agent')
    } as any as Request

    const res = {} as Response
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    // Middleware should complete successfully
    expect(next).toHaveBeenCalledWith()

    // Simulate menu route handler validation
    const validateRestaurantId = (restaurantId: string | undefined) => {
      if (!restaurantId) {
        throw new Error('Valid restaurant ID is required')
      }
      return true
    }

    // This would have thrown before the Oct 30 fix
    expect(() => validateRestaurantId(req.restaurantId)).not.toThrow()
    expect(validateRestaurantId(req.restaurantId)).toBe(true)
  })

  it('handles missing authorization header gracefully', async () => {
    const req = {
      headers: {
        'x-restaurant-id': mockRestaurantId
      },
      user: {},
      ip: '127.0.0.1',
      get: vi.fn(() => 'test-user-agent')
    } as any as Request

    const res = {} as Response
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    // Should call next with error
    expect(next).toHaveBeenCalledWith(expect.any(Error))
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/no token provided/i)
      })
    )
  })

  it('handles malformed JWT gracefully', async () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid-token-format'
      },
      user: {},
      ip: '127.0.0.1',
      get: vi.fn(() => 'test-user-agent')
    } as any as Request

    const res = {} as Response
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    // Should call next with error
    expect(next).toHaveBeenCalledWith(expect.any(Error))

    // Should not set req.restaurantId for invalid token
    expect(req.restaurantId).toBeUndefined()
  })

  it('handles expired JWT gracefully', async () => {
    const expiredToken = jwt.sign(
      {
        sub: mockUserId,
        restaurant_id: mockRestaurantId,
        role: 'admin'
      },
      mockJwtSecret,
      { expiresIn: '-1h' } // Expired 1 hour ago
    )

    const req = {
      headers: {
        authorization: `Bearer ${expiredToken}`
      },
      user: {},
      ip: '127.0.0.1',
      get: vi.fn(() => 'test-user-agent')
    } as any as Request

    const res = {} as Response
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    // Should call next with error
    expect(next).toHaveBeenCalledWith(expect.any(Error))
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/expired|invalid/i)
      })
    )

    // Should not set req.restaurantId for expired token
    expect(req.restaurantId).toBeUndefined()
  })
})
