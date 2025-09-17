import { describe, it, expect, beforeAll, vi } from 'vitest';
import jwt from 'jsonwebtoken';

describe('Simple Auth Test', () => {
  it('should verify environment is test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should create and verify JWT tokens', () => {
    const secret = 'test-secret';
    const token = jwt.sign(
      { sub: 'user-123', role: 'admin' },
      secret,
      { expiresIn: '1h' }
    );

    const decoded = jwt.verify(token, secret) as any;
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('admin');
  });

  it('should reject test-token in production', async () => {
    // Mock the authenticate function directly
    const { authenticate } = await import('../../src/middleware/auth');

    // Create mock request/response
    const req: any = {
      headers: {
        authorization: 'Bearer test-token'
      }
    };
    const res: any = {};
    const next = vi.fn();

    // Temporarily set production env
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await authenticate(req, res, next);
    } catch (error) {
      // Expected to throw
    }

    // Check that next was called with an error
    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.message).toContain('Test tokens not allowed');

    // Restore env
    process.env.NODE_ENV = originalEnv;
  });

  it('should allow test-token in test environment', async () => {
    // Mock the authenticate function directly
    const { authenticate } = await import('../../src/middleware/auth');

    // Create mock request/response
    const req: any = {
      headers: {
        authorization: 'Bearer test-token',
        'x-restaurant-id': 'test-restaurant'
      }
    };
    const res: any = {};
    const next = vi.fn();

    // Ensure we're in test env
    process.env.NODE_ENV = 'test';

    await authenticate(req, res, next);

    // Should succeed and set user
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('test-user-id');
    expect(next).toHaveBeenCalledWith(); // Called without error
  });
});