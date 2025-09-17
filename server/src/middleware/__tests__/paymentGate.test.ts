import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { requirePaymentIfCustomer } from '../paymentGate';
import { SquareAdapter } from '../../payments/square.adapter';
import { logger } from '../../utils/logger';

// Mock dependencies
vi.mock('../../payments/square.adapter');
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('paymentGate middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;
  let mockValidateToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = {
      body: {},
      headers: {},
      path: '/api/v1/orders',
      method: 'POST'
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();

    // Setup mock for SquareAdapter
    mockValidateToken = vi.fn();
    (SquareAdapter as any).mockImplementation(() => ({
      validateToken: mockValidateToken
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Employee mode', () => {
    it('should bypass payment requirement for employee orders', async () => {
      (req as any).orderMode = 'employee';
      (req as any).user = { id: 'user-123' };

      await requirePaymentIfCustomer(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Employee order - bypassing payment requirement',
        expect.any(Object)
      );
    });
  });

  describe('Customer mode', () => {
    beforeEach(() => {
      (req as any).orderMode = 'customer';
      (req as any).restaurantId = 'restaurant-123';
      req.body = {
        items: [
          { price: 10.00, quantity: 2, modifiers: [] },
          { price: 5.50, quantity: 1, modifiers: [{ price: 1.00 }] }
        ],
        tax: 2.13,
        tip: 3.00
      };
    });

    it('should reject customer order without payment token', async () => {
      await requirePaymentIfCustomer(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith({
        error: 'PAYMENT_REQUIRED',
        message: 'Payment token is required for customer orders'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept payment token from body (camelCase)', async () => {
      req.body.paymentToken = 'valid-token-123';
      mockValidateToken.mockResolvedValue(true);

      await requirePaymentIfCustomer(req as Request, res as Response, next);

      expect(mockValidateToken).toHaveBeenCalledWith(
        'valid-token-123',
        'restaurant-123',
        3163 // (20.00 + 6.50 + 2.13 + 3.00) * 100
      );
      expect(next).toHaveBeenCalled();
      expect((req as any).paymentToken).toBe('valid-token-123');
    });

    it('should accept payment token from body (snake_case)', async () => {
      req.body.payment_token = 'valid-token-123';
      mockValidateToken.mockResolvedValue(true);

      await requirePaymentIfCustomer(req as Request, res as Response, next);

      expect(mockValidateToken).toHaveBeenCalledWith(
        'valid-token-123',
        'restaurant-123',
        3163
      );
      expect(next).toHaveBeenCalled();
      expect((req as any).paymentToken).toBe('valid-token-123');
    });

    it('should accept payment token from header', async () => {
      req.headers['x-payment-token'] = 'header-token-123';
      mockValidateToken.mockResolvedValue(true);

      await requirePaymentIfCustomer(req as Request, res as Response, next);

      expect(mockValidateToken).toHaveBeenCalledWith(
        'header-token-123',
        'restaurant-123',
        3163
      );
      expect(next).toHaveBeenCalled();
      expect((req as any).paymentToken).toBe('header-token-123');
    });

    it('should reject invalid payment token', async () => {
      req.body.paymentToken = 'invalid-token';
      mockValidateToken.mockResolvedValue(false);

      await requirePaymentIfCustomer(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INVALID_PAYMENT_TOKEN',
        message: 'Payment token is invalid, already used, or amount mismatch'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should calculate correct total with modifiers', async () => {
      req.body = {
        items: [
          {
            price: 15.00,
            quantity: 1,
            modifiers: [
              { price: 2.00 },
              { price: 1.50 }
            ]
          }
        ],
        tax: 1.49,
        tip: 2.00
      };
      req.body.paymentToken = 'valid-token-123';
      mockValidateToken.mockResolvedValue(true);

      await requirePaymentIfCustomer(req as Request, res as Response, next);

      // Total: (15.00 + 2.00 + 1.50) + 1.49 + 2.00 = 21.99
      expect(mockValidateToken).toHaveBeenCalledWith(
        'valid-token-123',
        'restaurant-123',
        2199
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle missing orderMode', async () => {
      // orderMode not set - should default to customer behavior
      req.body.paymentToken = 'token-123';
      mockValidateToken.mockResolvedValue(true);

      await requirePaymentIfCustomer(req as Request, res as Response, next);

      // Without orderMode, it won't enter either branch
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle empty items array', async () => {
      (req as any).orderMode = 'customer';
      (req as any).restaurantId = 'restaurant-123';
      req.body = {
        items: [],
        tax: 0,
        tip: 0,
        paymentToken: 'token-123'
      };
      mockValidateToken.mockResolvedValue(true);

      await requirePaymentIfCustomer(req as Request, res as Response, next);

      expect(mockValidateToken).toHaveBeenCalledWith(
        'token-123',
        'restaurant-123',
        0
      );
      expect(next).toHaveBeenCalled();
    });
  });
});