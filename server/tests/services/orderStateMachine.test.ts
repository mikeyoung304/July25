import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrderStateMachine } from '../../src/services/orderStateMachine';
import type { Order, OrderStatus } from '@rebuild/shared';

// Mock logger to avoid console output during tests
vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

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
});
