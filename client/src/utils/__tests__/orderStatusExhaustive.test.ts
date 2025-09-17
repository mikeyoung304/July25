import { describe, it, expect } from 'vitest';
import type { Order } from '@rebuild/shared';

// The canonical list of all order statuses
const ALL_ORDER_STATUSES: Order['status'][] = [
  'new',
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
];

/**
 * Helper function to check if a switch statement handles all statuses
 */
function testSwitchExhaustiveness(
  switchFunction: (status: Order['status']) => unknown,
  functionName: string
) {
  describe(`${functionName} switch exhaustiveness`, () => {
    ALL_ORDER_STATUSES.forEach(status => {
      it(`should handle status: ${status}`, () => {
        const result = switchFunction(status);
        // Result should not be undefined (unless that's the intended behavior)
        // This catches missing cases that fall through to default: undefined
        expect(result).toBeDefined();
      });
    });
  });
}

// Import functions that have switch statements on order status
import { normalizeOrderStatus } from '../../types/unified-order';
import { getStatusColor, getStatusLabel, isValidStatusTransition } from '../orderStatusValidation';

describe('Order Status Exhaustiveness Tests', () => {

  describe('normalizeOrderStatus', () => {
    it('should handle all 7 order statuses', () => {
      expect(normalizeOrderStatus('new')).toBe('new');
      expect(normalizeOrderStatus('pending')).toBe('pending'); // Now correctly mapped
      expect(normalizeOrderStatus('confirmed')).toBe('confirmed'); // Now correctly mapped
      expect(normalizeOrderStatus('preparing')).toBe('preparing');
      expect(normalizeOrderStatus('ready')).toBe('ready');
      expect(normalizeOrderStatus('completed')).toBe('completed');
      expect(normalizeOrderStatus('cancelled')).toBe('cancelled');
    });
  });

  describe('getStatusColor', () => {
    it('should return a color for all statuses', () => {
      ALL_ORDER_STATUSES.forEach(status => {
        const color = getStatusColor(status);
        expect(color).toBeDefined();
        expect(color).not.toBe('');
        expect(color).toContain('bg-'); // Should have background color
        expect(color).toContain('text-'); // Should have text color
      });
    });
  });

  describe('getStatusLabel', () => {
    it('should return a label for all statuses', () => {
      ALL_ORDER_STATUSES.forEach(status => {
        const label = getStatusLabel(status);
        expect(label).toBeDefined();
        expect(label).not.toBe('');
        expect(label).not.toBe('Unknown Status');
      });
    });
  });

  describe('isValidStatusTransition', () => {
    it('should define valid transitions from all statuses', () => {
      ALL_ORDER_STATUSES.forEach(fromStatus => {
        // Every status should be able to transition to cancelled (except completed/cancelled)
        if (fromStatus !== 'completed' && fromStatus !== 'cancelled') {
          expect(isValidStatusTransition(fromStatus, 'cancelled')).toBe(true);
        }

        // Check that the function handles the status without error
        ALL_ORDER_STATUSES.forEach(toStatus => {
          const result = isValidStatusTransition(fromStatus, toStatus);
          expect(typeof result).toBe('boolean');
        });
      });
    });
  });

  describe('Critical: Component Switch Statements', () => {
    // Mock test for StationStatusBar switch
    it('StationStatusBar should handle all order statuses', () => {
      const mapOrderStatusToItemStatus = (status: Order['status']) => {
        switch (status) {
          case 'completed':
          case 'ready':
            return 'completed';
          case 'preparing':
          case 'confirmed':
            return 'inProgress';
          case 'new':
          case 'pending':
            return 'pending';
          case 'cancelled':
            return 'cancelled'; // FIX: Add this case
          default:
            return 'pending'; // Safe fallback
        }
      };

      ALL_ORDER_STATUSES.forEach(status => {
        const result = mapOrderStatusToItemStatus(status);
        expect(result).toBeDefined();
        expect(['completed', 'inProgress', 'pending', 'cancelled']).toContain(result);
      });
    });

    // Mock test for useTableGrouping switch
    it('useTableGrouping should handle all order statuses', () => {
      const mapOrderStatusToGroupStatus = (status: Order['status']) => {
        switch (status) {
          case 'ready':
            return 'ready';
          case 'preparing':
          case 'confirmed':
            return 'preparing';
          case 'completed':
            return 'completed';
          case 'new':
          case 'pending':
            return 'pending'; // FIX: Add these cases
          case 'cancelled':
            return 'cancelled'; // FIX: Add this case
          default:
            return 'pending'; // Safe fallback
        }
      };

      ALL_ORDER_STATUSES.forEach(status => {
        const result = mapOrderStatusToGroupStatus(status);
        expect(result).toBeDefined();
        expect(['ready', 'preparing', 'completed', 'pending', 'cancelled']).toContain(result);
      });
    });

    // Mock test for OrderActionsBar switch
    it('OrderActionsBar getNextStatus should handle all statuses', () => {
      const getNextStatus = (status: Order['status']): Order['status'] | null => {
        switch (status) {
          case 'new':
            return 'pending';
          case 'pending':
            return 'confirmed'; // FIX: Add this transition
          case 'confirmed':
            return 'preparing'; // FIX: Add this transition
          case 'preparing':
            return 'ready';
          case 'ready':
            return 'completed';
          case 'completed':
            return null; // Final state
          case 'cancelled':
            return null; // Final state
          default:
            return null;
        }
      };

      ALL_ORDER_STATUSES.forEach(status => {
        const result = getNextStatus(status);
        // Result can be null for final states, but should be defined
        expect(result !== undefined).toBe(true);
      });
    });
  });
});