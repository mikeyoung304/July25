import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Supabase first before any imports that use it
vi.mock('../src/utils/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import { SquareAdapter } from '../src/payments/square.adapter';

// Mock Square Client
vi.mock('square', () => ({
  Client: vi.fn().mockImplementation(() => ({
    checkoutApi: {
      createPaymentLink: vi.fn(),
      retrievePaymentLink: vi.fn()
    },
    ordersApi: {
      retrieveOrder: vi.fn()
    }
  })),
  SquareEnvironment: {
    Production: 'production',
    Sandbox: 'sandbox'
  },
  ApiError: class ApiError extends Error {
    constructor(public statusCode: number, public errors: any[]) {
      super('API Error');
    }
  }
}));

describe('Payment Persistence', () => {
  let adapter: SquareAdapter;

  beforeEach(() => {
    adapter = new SquareAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createIntent', () => {
    it('should persist payment intent to database after creation', async () => {
      const mockPaymentLink = {
        id: 'link_123',
        url: 'https://square.link/123',
        orderId: 'order_123',
        version: 1,
        createdAt: '2025-01-15T00:00:00Z'
      };

      const mockInsert = vi.fn().mockReturnValue({
        error: null
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });

      // Mock Square API response
      const mockClient = (adapter as any).client;
      mockClient.checkoutApi.createPaymentLink.mockResolvedValue({
        result: { paymentLink: mockPaymentLink }
      });

      const metadata = {
        restaurantId: 'rest_123',
        mode: 'customer',
        orderDraftId: 'draft_123'
      };

      const intent = await adapter.createIntent(1000, metadata);

      // Verify Square API was called
      expect(mockClient.checkoutApi.createPaymentLink).toHaveBeenCalled();

      // Verify database insert was called
      expect(supabase.from).toHaveBeenCalledWith('payment_intents');
      expect(mockInsert).toHaveBeenCalledWith({
        provider: 'square',
        provider_payment_id: 'link_123',
        order_draft_id: 'draft_123',
        restaurant_id: 'rest_123',
        amount_cents: 1000,
        currency: 'USD',
        status: 'pending',
        metadata: expect.objectContaining({
          strategy: 'link',
          mode: 'customer'
        })
      });

      // Verify returned intent
      expect(intent).toEqual({
        id: 'link_123',
        amount: 1000,
        currency: 'USD',
        status: 'pending',
        strategy: 'link',
        paymentLinkUrl: 'https://square.link/123',
        checkoutId: 'order_123',
        metadata: expect.any(Object)
      });
    });

    it('should continue with payment flow even if persistence fails', async () => {
      const mockPaymentLink = {
        id: 'link_123',
        url: 'https://square.link/123',
        orderId: 'order_123'
      };

      const mockInsert = vi.fn().mockReturnValue({
        error: { message: 'Database error' }
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });

      const mockClient = (adapter as any).client;
      mockClient.checkoutApi.createPaymentLink.mockResolvedValue({
        result: { paymentLink: mockPaymentLink }
      });

      const metadata = {
        restaurantId: 'rest_123',
        mode: 'customer'
      };

      // Should not throw even if DB fails
      const intent = await adapter.createIntent(1000, metadata);
      expect(intent.id).toBe('link_123');
    });
  });

  describe('updateIntentStatus', () => {
    it('should update payment intent status in database', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          error: null
        })
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate
      });

      await adapter.updateIntentStatus('payment_123', 'succeeded');

      expect(supabase.from).toHaveBeenCalledWith('payment_intents');
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'succeeded',
        updated_at: expect.any(String)
      });
    });
  });

  describe('validateToken', () => {
    it('should validate a succeeded payment token', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    provider_payment_id: 'token_123',
                    restaurant_id: 'rest_123',
                    amount_cents: 1000,
                    status: 'succeeded',
                    used_at: null
                  },
                  error: null
                })
              })
            })
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      const isValid = await adapter.validateToken('token_123', 'rest_123', 1000);
      expect(isValid).toBe(true);
    });

    it('should reject token with amount mismatch', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    provider_payment_id: 'token_123',
                    restaurant_id: 'rest_123',
                    amount_cents: 1000,
                    status: 'succeeded',
                    used_at: null
                  },
                  error: null
                })
              })
            })
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      const isValid = await adapter.validateToken('token_123', 'rest_123', 2000);
      expect(isValid).toBe(false);
    });

    it('should reject already used token', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: 'No data'
                })
              })
            })
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      const isValid = await adapter.validateToken('token_123', 'rest_123', 1000);
      expect(isValid).toBe(false);
    });
  });

  describe('consumeToken', () => {
    it('should mark token as consumed with order ID', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'intent_123' },
                  error: null
                })
              })
            })
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate
      });

      const consumed = await adapter.consumeToken('token_123', 'order_456');

      expect(consumed).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        used_at: expect.any(String),
        used_by_order_id: 'order_456',
        updated_at: expect.any(String)
      });
    });

    it('should return false if token consumption fails', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: 'Token not found or already used'
                })
              })
            })
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate
      });

      const consumed = await adapter.consumeToken('token_123', 'order_456');
      expect(consumed).toBe(false);
    });
  });
});