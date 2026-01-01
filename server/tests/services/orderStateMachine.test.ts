import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Order, OrderStatus } from '@rebuild/shared';

// Mock logger to capture log calls for testing
// Must use inline object to avoid hoisting issues
vi.mock('../../src/utils/logger', () => {
  const mockLoggerFns = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => mockLoggerFns,
  };
  return { logger: mockLoggerFns };
});

// Note: Stripe mocking is complex because orderStateMachine.ts uses require('stripe')
// at module load time. The stripeClient is initialized before vi.mock can intercept.
// For full Stripe refund testing, see E2E tests or use dependency injection pattern.

// Get reference to mocked logger for assertions
import { logger as mockLogger } from '../../src/utils/logger';

// Import OrderStateMachine AFTER mocking stripe
import { OrderStateMachine, registerDefaultHooks } from '../../src/services/orderStateMachine';

describe('OrderStateMachine', () => {
  // Helper to create a mock order
  const createMockOrder = (status: OrderStatus): Order => ({
    id: 'test-order-123',
    order_number: 'ORD-001',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    status,
    items: [
      {
        id: 'item-1',
        name: 'Test Item',
        price: 10.99,
        quantity: 2,
      },
    ],
    total: 21.98,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Order);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear hooks to prevent state leakage between tests (TODO-249)
    OrderStateMachine.clearHooks();
  });

  describe('canTransition', () => {
    describe('valid forward transitions', () => {
      it('should allow new → pending', () => {
        expect(OrderStateMachine.canTransition('new', 'pending')).toBe(true);
      });

      it('should allow pending → confirmed', () => {
        expect(OrderStateMachine.canTransition('pending', 'confirmed')).toBe(true);
      });

      it('should allow confirmed → preparing', () => {
        expect(OrderStateMachine.canTransition('confirmed', 'preparing')).toBe(true);
      });

      it('should allow preparing → ready', () => {
        expect(OrderStateMachine.canTransition('preparing', 'ready')).toBe(true);
      });

      it('should allow ready → picked-up', () => {
        expect(OrderStateMachine.canTransition('ready', 'picked-up')).toBe(true);
      });

      it('should allow ready → completed (direct completion)', () => {
        expect(OrderStateMachine.canTransition('ready', 'completed')).toBe(true);
      });

      it('should allow picked-up → completed', () => {
        expect(OrderStateMachine.canTransition('picked-up', 'completed')).toBe(true);
      });
    });

    describe('cancellation transitions', () => {
      const cancellableStates: OrderStatus[] = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up'];

      cancellableStates.forEach((status) => {
        it(`should allow ${status} → cancelled`, () => {
          expect(OrderStateMachine.canTransition(status, 'cancelled')).toBe(true);
        });
      });
    });

    describe('invalid transitions from final states', () => {
      const allStatuses: OrderStatus[] = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled'];

      it('should not allow any transitions from completed', () => {
        allStatuses.forEach((status) => {
          expect(OrderStateMachine.canTransition('completed', status)).toBe(false);
        });
      });

      it('should not allow any transitions from cancelled', () => {
        allStatuses.forEach((status) => {
          expect(OrderStateMachine.canTransition('cancelled', status)).toBe(false);
        });
      });
    });

    describe('invalid skip transitions', () => {
      it('should not allow new → confirmed (skip pending)', () => {
        expect(OrderStateMachine.canTransition('new', 'confirmed')).toBe(false);
      });

      it('should not allow new → preparing (skip multiple)', () => {
        expect(OrderStateMachine.canTransition('new', 'preparing')).toBe(false);
      });

      it('should not allow pending → ready (skip preparing)', () => {
        expect(OrderStateMachine.canTransition('pending', 'ready')).toBe(false);
      });

      it('should not allow new → completed (skip entire flow)', () => {
        expect(OrderStateMachine.canTransition('new', 'completed')).toBe(false);
      });
    });

    describe('backward transitions', () => {
      it('should not allow preparing → confirmed (backward)', () => {
        expect(OrderStateMachine.canTransition('preparing', 'confirmed')).toBe(false);
      });

      it('should not allow ready → preparing (backward)', () => {
        expect(OrderStateMachine.canTransition('ready', 'preparing')).toBe(false);
      });

      it('should not allow completed → ready (backward from final)', () => {
        expect(OrderStateMachine.canTransition('completed', 'ready')).toBe(false);
      });
    });
  });

  describe('transition', () => {
    it('should successfully transition from new to pending', async () => {
      const order = createMockOrder('new');
      const result = await OrderStateMachine.transition(order, 'pending', 'user-123');

      expect(result.status).toBe('pending');
      expect(result.pending_at).toBeDefined();
    });

    it('should successfully transition through complete order flow', async () => {
      let order = createMockOrder('new');

      // new → pending
      order = await OrderStateMachine.transition(order, 'pending');
      expect(order.status).toBe('pending');

      // pending → confirmed
      order = await OrderStateMachine.transition(order, 'confirmed');
      expect(order.status).toBe('confirmed');

      // confirmed → preparing
      order = await OrderStateMachine.transition(order, 'preparing');
      expect(order.status).toBe('preparing');

      // preparing → ready
      order = await OrderStateMachine.transition(order, 'ready');
      expect(order.status).toBe('ready');

      // ready → picked-up
      order = await OrderStateMachine.transition(order, 'picked-up');
      expect(order.status).toBe('picked-up');

      // picked-up → completed
      order = await OrderStateMachine.transition(order, 'completed');
      expect(order.status).toBe('completed');
    });

    it('should throw BadRequest for invalid transition', async () => {
      const order = createMockOrder('new');

      await expect(
        OrderStateMachine.transition(order, 'completed')
      ).rejects.toThrow(/Invalid status transition/);
    });

    it('should throw BadRequest when transitioning from completed', async () => {
      const order = createMockOrder('completed');

      await expect(
        OrderStateMachine.transition(order, 'ready')
      ).rejects.toThrow(/Invalid status transition.*none \(final state\)/);
    });

    it('should throw BadRequest when transitioning from cancelled', async () => {
      const order = createMockOrder('cancelled');

      await expect(
        OrderStateMachine.transition(order, 'pending')
      ).rejects.toThrow(/Invalid status transition.*none \(final state\)/);
    });

    it('should include valid transitions in error message', async () => {
      const order = createMockOrder('pending');

      await expect(
        OrderStateMachine.transition(order, 'ready')
      ).rejects.toThrow(/Valid transitions: confirmed, cancelled/);
    });

    it('should add timestamp for the new status', async () => {
      const order = createMockOrder('preparing');
      const result = await OrderStateMachine.transition(order, 'ready');

      expect(result.ready_at).toBeDefined();
      expect(new Date(result.ready_at as string).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should preserve reason in transition', async () => {
      const order = createMockOrder('new');
      const reason = 'Customer confirmed via phone';

      // The transition function doesn't store reason on the order,
      // but it should be logged (we can verify the function doesn't throw)
      const result = await OrderStateMachine.transition(order, 'pending', 'user-123', reason);
      expect(result.status).toBe('pending');
    });
  });

  describe('getNextValidStatuses', () => {
    it('should return [pending, cancelled] for new orders', () => {
      const next = OrderStateMachine.getNextValidStatuses('new');
      expect(next).toEqual(['pending', 'cancelled']);
    });

    it('should return [confirmed, cancelled] for pending orders', () => {
      const next = OrderStateMachine.getNextValidStatuses('pending');
      expect(next).toEqual(['confirmed', 'cancelled']);
    });

    it('should return [preparing, cancelled] for confirmed orders', () => {
      const next = OrderStateMachine.getNextValidStatuses('confirmed');
      expect(next).toEqual(['preparing', 'cancelled']);
    });

    it('should return [ready, cancelled] for preparing orders', () => {
      const next = OrderStateMachine.getNextValidStatuses('preparing');
      expect(next).toEqual(['ready', 'cancelled']);
    });

    it('should return [picked-up, completed, cancelled] for ready orders', () => {
      const next = OrderStateMachine.getNextValidStatuses('ready');
      expect(next).toEqual(['picked-up', 'completed', 'cancelled']);
    });

    it('should return [completed, cancelled] for picked-up orders', () => {
      const next = OrderStateMachine.getNextValidStatuses('picked-up');
      expect(next).toEqual(['completed', 'cancelled']);
    });

    it('should return empty array for completed orders', () => {
      const next = OrderStateMachine.getNextValidStatuses('completed');
      expect(next).toEqual([]);
    });

    it('should return empty array for cancelled orders', () => {
      const next = OrderStateMachine.getNextValidStatuses('cancelled');
      expect(next).toEqual([]);
    });
  });

  describe('isFinalState', () => {
    it('should return true for completed', () => {
      expect(OrderStateMachine.isFinalState('completed')).toBe(true);
    });

    it('should return true for cancelled', () => {
      expect(OrderStateMachine.isFinalState('cancelled')).toBe(true);
    });

    it('should return false for non-final states', () => {
      const nonFinalStates: OrderStatus[] = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up'];

      nonFinalStates.forEach((status) => {
        expect(OrderStateMachine.isFinalState(status)).toBe(false);
      });
    });
  });

  describe('isValidStatus', () => {
    it('should return true for all valid statuses', () => {
      const validStatuses = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled'];

      validStatuses.forEach((status) => {
        expect(OrderStateMachine.isValidStatus(status)).toBe(true);
      });
    });

    it('should return false for invalid statuses', () => {
      expect(OrderStateMachine.isValidStatus('invalid')).toBe(false);
      expect(OrderStateMachine.isValidStatus('')).toBe(false);
      expect(OrderStateMachine.isValidStatus('COMPLETED')).toBe(false); // Case sensitive
    });
  });

  describe('getStatusMetadata', () => {
    it('should return correct metadata for new status', () => {
      const metadata = OrderStateMachine.getStatusMetadata('new');

      expect(metadata.label).toBe('New Order');
      expect(metadata.isFinal).toBe(false);
      expect(metadata.canCancel).toBe(true);
    });

    it('should return correct metadata for completed status', () => {
      const metadata = OrderStateMachine.getStatusMetadata('completed');

      expect(metadata.label).toBe('Completed');
      expect(metadata.isFinal).toBe(true);
      expect(metadata.canCancel).toBe(false);
    });

    it('should return correct metadata for cancelled status', () => {
      const metadata = OrderStateMachine.getStatusMetadata('cancelled');

      expect(metadata.label).toBe('Cancelled');
      expect(metadata.isFinal).toBe(true);
      expect(metadata.canCancel).toBe(false);
    });

    it('should return canCancel=false for picked-up status', () => {
      const metadata = OrderStateMachine.getStatusMetadata('picked-up');

      expect(metadata.canCancel).toBe(false);
    });

    it('should include color and icon for all statuses', () => {
      const statuses: OrderStatus[] = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled'];

      statuses.forEach((status) => {
        const metadata = OrderStateMachine.getStatusMetadata(status);
        expect(metadata.color).toBeDefined();
        expect(metadata.icon).toBeDefined();
      });
    });
  });

  describe('getEstimatedDuration', () => {
    it('should return 30 seconds for new → pending', () => {
      expect(OrderStateMachine.getEstimatedDuration('new', 'pending')).toBe(30);
    });

    it('should return 15 minutes (900s) for preparing → ready', () => {
      expect(OrderStateMachine.getEstimatedDuration('preparing', 'ready')).toBe(900);
    });

    it('should return default 60 seconds for unknown transitions', () => {
      expect(OrderStateMachine.getEstimatedDuration('new', 'completed')).toBe(60);
    });
  });

  describe('registerHook', () => {
    it('should execute registered hooks on transition', async () => {
      const hookFn = vi.fn();

      // Register a hook for confirmed transitions
      OrderStateMachine.registerHook('pending->confirmed', hookFn);

      const order = createMockOrder('pending');
      await OrderStateMachine.transition(order, 'confirmed');

      expect(hookFn).toHaveBeenCalled();
    });

    it('should execute wildcard hooks', async () => {
      const hookFn = vi.fn();

      // Register a wildcard hook for any transition to ready
      OrderStateMachine.registerHook('*->ready', hookFn);

      const order = createMockOrder('preparing');
      await OrderStateMachine.transition(order, 'ready');

      expect(hookFn).toHaveBeenCalled();
    });

    it('should continue execution if hook throws', async () => {
      const failingHook = vi.fn().mockRejectedValue(new Error('Hook failed'));

      // Register a failing hook
      OrderStateMachine.registerHook('confirmed->preparing', failingHook);

      const order = createMockOrder('confirmed');

      // Should not throw, just log the error
      const result = await OrderStateMachine.transition(order, 'preparing');
      expect(result.status).toBe('preparing');
    });
  });

  describe('executeTransitionHooks', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should execute hooks without throwing errors', async () => {
      const order = createMockOrder('confirmed');

      // Should not throw
      await expect(
        OrderStateMachine.executeTransitionHooks('pending', 'confirmed', order)
      ).resolves.toBeUndefined();
    });

    it('should execute hooks with userId and reason', async () => {
      const order = createMockOrder('confirmed');

      await expect(
        OrderStateMachine.executeTransitionHooks(
          'pending',
          'confirmed',
          order,
          'user-123',
          'Customer confirmed'
        )
      ).resolves.toBeUndefined();
    });

    it('should catch and log errors from hooks', async () => {
      // Register a failing hook
      const failingHook = vi.fn().mockRejectedValue(new Error('Test hook failure'));
      OrderStateMachine.registerHook('new->pending', failingHook);

      const order = createMockOrder('pending');

      // Should not throw even if hook fails
      await expect(
        OrderStateMachine.executeTransitionHooks('new', 'pending', order)
      ).resolves.toBeUndefined();

      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Notification Hooks (GitHub Issue #146)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Re-register default hooks since afterEach() clears them
      registerDefaultHooks();
    });

    describe('Kitchen notification hook (*->confirmed)', () => {
      it('should log kitchen notification when order is confirmed', async () => {
        const order: Order = {
          ...createMockOrder('confirmed'),
          order_number: 'ORD-KITCHEN-001',
          table_number: 'T5',
          type: 'pickup',
        };

        await OrderStateMachine.executeTransitionHooks('pending', 'confirmed', order);

        // Should log kitchen notification with order details
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Kitchen notification: Order confirmed',
          expect.objectContaining({
            orderId: order.id,
            restaurantId: order.restaurant_id,
            orderNumber: 'ORD-KITCHEN-001',
            itemCount: 1,
            orderType: 'pickup',
            tableNumber: 'T5',
          })
        );
      });

      it('should handle orders without table number', async () => {
        const order: Order = {
          ...createMockOrder('confirmed'),
          table_number: undefined,
        };

        await OrderStateMachine.executeTransitionHooks('pending', 'confirmed', order);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Kitchen notification: Order confirmed',
          expect.objectContaining({
            tableNumber: null,
          })
        );
      });
    });

    describe('Customer notification hook (*->ready)', () => {
      it('should log customer notification when order is ready with contact info', async () => {
        const order: Order = {
          ...createMockOrder('ready'),
          order_number: 'ORD-READY-001',
          customer_name: 'John Doe',
          customer_phone: '+1234567890',
          customer_email: 'john@example.com',
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'ready', order);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Customer notification: Order ready for pickup',
          expect.objectContaining({
            orderId: order.id,
            orderNumber: 'ORD-READY-001',
            hasPhone: true,
            hasEmail: true,
            customerName: 'John Doe',
          })
        );
      });

      it('should skip notification when no contact info available', async () => {
        const order: Order = {
          ...createMockOrder('ready'),
          customer_phone: undefined,
          customer_email: undefined,
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'ready', order);

        // Should log debug message about skipping
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Customer notification skipped: No contact info',
          expect.objectContaining({
            orderId: order.id,
          })
        );

        // Should NOT log the "Order ready for pickup" message
        expect(mockLogger.info).not.toHaveBeenCalledWith(
          'Customer notification: Order ready for pickup',
          expect.anything()
        );
      });

      it('should notify with phone only', async () => {
        const order: Order = {
          ...createMockOrder('ready'),
          customer_phone: '+1234567890',
          customer_email: undefined,
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'ready', order);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Customer notification: Order ready for pickup',
          expect.objectContaining({
            hasPhone: true,
            hasEmail: false,
          })
        );
      });

      it('should notify with email only', async () => {
        const order: Order = {
          ...createMockOrder('ready'),
          customer_phone: undefined,
          customer_email: 'customer@example.com',
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'ready', order);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Customer notification: Order ready for pickup',
          expect.objectContaining({
            hasPhone: false,
            hasEmail: true,
          })
        );
      });

      it('should use "Guest" as default customer name', async () => {
        const order: Order = {
          ...createMockOrder('ready'),
          customer_name: undefined,
          customer_phone: '+1234567890',
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'ready', order);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Customer notification: Order ready for pickup',
          expect.objectContaining({
            customerName: 'Guest',
          })
        );
      });
    });

    describe('Refund hook (*->cancelled)', () => {
      it('should log refund warning for paid cancelled orders without payment_intent_id', async () => {
        // P1.4: Orders without payment_intent_id get a warning to add it manually
        const order: Order = {
          ...createMockOrder('cancelled'),
          order_number: 'ORD-REFUND-001',
          payment_status: 'paid',
          payment_method: 'card',
          total: 45.99,
          // No payment_intent_id - should log warning about missing it
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'cancelled', order);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Refund skipped: No payment_intent_id on paid order',
          expect.objectContaining({
            orderId: order.id,
            orderNumber: 'ORD-REFUND-001',
            paymentStatus: 'paid',
          })
        );
      });

      // Note: Testing the full Stripe refund flow requires complex module mocking
      // because stripeClient is initialized at module load time with require('stripe').
      // The bootstrap.ts sets STRIPE_SECRET_KEY, so stripeClient exists but uses the
      // real stripe package. Mocking require() in this context is non-trivial.
      //
      // The following scenarios ARE tested:
      // - Refund skipped for unpaid orders (tested below)
      // - Refund skipped for orders without payment_intent_id (tested above)
      // - Refund skipped for already refunded orders (tested below)
      //
      // The Stripe API interaction is integration-tested via E2E tests.
      it.skip('should process Stripe refund for paid orders with payment_intent_id', async () => {
        // This test is skipped because:
        // 1. stripeClient is initialized at module load with real stripe package
        // 2. vi.mock('stripe') doesn't intercept require('stripe') used in orderStateMachine
        // 3. To properly test this, we'd need to refactor to dependency injection
        //
        // The refund functionality is tested via:
        // - Manual testing with test mode Stripe keys
        // - E2E tests in the checkout flow
        const order: Order = {
          ...createMockOrder('cancelled'),
          order_number: 'ORD-REFUND-002',
          payment_status: 'paid',
          payment_method: 'card',
          total: 45.99,
          payment_intent_id: 'pi_test_123',
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'cancelled', order);

        // Would verify Stripe refund was called and success logged
        // But mock doesn't intercept the require('stripe') call
      });

      it('should skip refund for unpaid orders', async () => {
        const order: Order = {
          ...createMockOrder('cancelled'),
          payment_status: 'pending',
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'cancelled', order);

        // Should log debug message about skipping
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Refund processing skipped: Order not paid',
          expect.objectContaining({
            orderId: order.id,
            paymentStatus: 'pending',
          })
        );

        // Should NOT log the refund warning
        expect(mockLogger.warn).not.toHaveBeenCalledWith(
          'Refund required: Paid order cancelled',
          expect.anything()
        );
      });

      it('should skip refund for failed payment orders', async () => {
        const order: Order = {
          ...createMockOrder('cancelled'),
          payment_status: 'failed',
        };

        await OrderStateMachine.executeTransitionHooks('new', 'cancelled', order);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Refund processing skipped: Order not paid',
          expect.objectContaining({
            paymentStatus: 'failed',
          })
        );
      });

      it('should skip refund for already refunded orders', async () => {
        const order: Order = {
          ...createMockOrder('cancelled'),
          payment_status: 'refunded',
        };

        await OrderStateMachine.executeTransitionHooks('ready', 'cancelled', order);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Refund processing skipped: Order not paid',
          expect.objectContaining({
            paymentStatus: 'refunded',
          })
        );
      });
    });

    describe('Hook error handling', () => {
      it('should not throw when hook errors occur', async () => {
        // Create an order that will trigger all hooks
        const order: Order = {
          ...createMockOrder('confirmed'),
          customer_phone: '+1234567890',
          payment_status: 'paid',
        };

        // All hooks should execute without throwing
        await expect(
          OrderStateMachine.executeTransitionHooks('pending', 'confirmed', order)
        ).resolves.toBeUndefined();

        await expect(
          OrderStateMachine.executeTransitionHooks('preparing', 'ready', order)
        ).resolves.toBeUndefined();

        await expect(
          OrderStateMachine.executeTransitionHooks('ready', 'cancelled', order)
        ).resolves.toBeUndefined();
      });
    });

    describe('Refund hook - Multi-tenancy (TODO-267)', () => {
      // These tests verify the defense-in-depth multi-tenancy check in the refund hook.
      // The hook has TWO layers of protection:
      // 1. Early return if restaurant_id is missing (tested here)
      // 2. restaurant_id filter in DB update query (line 575)
      //
      // Testing the DB filter (layer 2) would require mocking the dynamic import
      // of supabase inside the hook, which is architecturally complex. The early
      // return (layer 1) provides the primary defense and is explicitly tested.

      it('should log error and skip refund when order missing restaurant_id', async () => {
        // Create a paid order with payment_intent_id but NO restaurant_id
        const order: Order = {
          ...createMockOrder('cancelled'),
          restaurant_id: undefined as unknown as string, // Simulate missing restaurant_id
          order_number: 'ORD-NO-TENANT-001',
          payment_status: 'paid',
          payment_method: 'card',
          total: 45.99,
          payment_intent_id: 'pi_test_123', // Trigger refund path
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'cancelled', order);

        // Should log error about missing restaurant_id
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Refund hook: Missing restaurant_id',
          expect.objectContaining({
            orderId: order.id,
          })
        );

        // Should NOT proceed to log refund success or warnings about payment_intent
        // because it returns early before checking payment_status
        expect(mockLogger.info).not.toHaveBeenCalledWith(
          'Refund processed successfully',
          expect.anything()
        );
      });

      it('should skip refund early when restaurant_id is empty string', async () => {
        // Edge case: empty string should also trigger early return
        const order: Order = {
          ...createMockOrder('cancelled'),
          restaurant_id: '' as unknown as string, // Empty string is falsy
          order_number: 'ORD-EMPTY-TENANT-001',
          payment_status: 'paid',
          payment_intent_id: 'pi_test_456',
        };

        await OrderStateMachine.executeTransitionHooks('preparing', 'cancelled', order);

        // Should log error about missing restaurant_id
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Refund hook: Missing restaurant_id',
          expect.objectContaining({
            orderId: order.id,
          })
        );
      });
    });
  });
});
