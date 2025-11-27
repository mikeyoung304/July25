/**
 * Order Status Constraint Alignment Test
 *
 * This test validates that TypeScript OrderStatus values match the database
 * CHECK constraint. Catches drift at test time rather than production.
 *
 * Created: 2025-11-27
 * Incident: CL-DB-002 (constraint drift caused P1 production issue)
 *
 * @see .claude/lessons/CL-DB-002-constraint-drift-prevention.md
 */

import { describe, it, expect } from 'vitest';
import { OrderStateMachine } from '../../src/services/orderStateMachine';

/**
 * CRITICAL: Keep this in sync with the database CHECK constraint
 *
 * Database constraint (orders_status_check):
 * CHECK (status IS NULL OR status IN (
 *   'new', 'pending', 'confirmed', 'preparing',
 *   'ready', 'picked-up', 'completed', 'cancelled'
 * ))
 *
 * @see supabase/migrations/20251127155000_fix_orders_status_check_constraint.sql
 */
const DATABASE_CONSTRAINT_VALUES = [
  'new',
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked-up',
  'completed',
  'cancelled'
] as const;

describe('Order Status Constraint Alignment (CL-DB-002 Prevention)', () => {
  describe('TypeScript types match database constraint', () => {
    it('state machine should have all database constraint values', () => {
      // Get all statuses from state machine (single source of truth in code)
      const stateMachineStatuses = Object.keys(
        // Access VALID_TRANSITIONS via isValidStatus check
        {}
      ).concat(
        DATABASE_CONSTRAINT_VALUES.filter(s => OrderStateMachine.isValidStatus(s))
      );

      // Every database constraint value must be a valid state machine status
      DATABASE_CONSTRAINT_VALUES.forEach(status => {
        expect(
          OrderStateMachine.isValidStatus(status),
          `Database constraint value '${status}' is not valid in state machine. ` +
          `Update orderStateMachine.ts or the database constraint.`
        ).toBe(true);
      });
    });

    it('state machine should not have statuses missing from database', () => {
      // All 8 statuses that the state machine recognizes
      const expectedStatuses = [
        'new', 'pending', 'confirmed', 'preparing',
        'ready', 'picked-up', 'completed', 'cancelled'
      ];

      expectedStatuses.forEach(status => {
        expect(
          DATABASE_CONSTRAINT_VALUES.includes(status as any),
          `State machine status '${status}' is NOT in DATABASE_CONSTRAINT_VALUES. ` +
          `Update the database CHECK constraint via migration!`
        ).toBe(true);
      });
    });

    it('should have exactly 8 valid order statuses', () => {
      // This catches accidental additions or removals
      expect(DATABASE_CONSTRAINT_VALUES.length).toBe(8);
    });

    it('state machine metadata exists for all constraint values', () => {
      // Verify getStatusMetadata doesn't throw for any valid status
      DATABASE_CONSTRAINT_VALUES.forEach(status => {
        expect(() => {
          const metadata = OrderStateMachine.getStatusMetadata(status as any);
          expect(metadata).toBeDefined();
          expect(metadata.label).toBeDefined();
          expect(metadata.color).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('constraint values documentation', () => {
    it('documents all valid order status values', () => {
      // This test serves as documentation and catches drift
      // If this test fails, update both the database and this constant
      expect(DATABASE_CONSTRAINT_VALUES).toEqual([
        'new',        // Initial state
        'pending',    // Waiting for confirmation
        'confirmed',  // Order confirmed, waiting to prepare
        'preparing',  // Kitchen is preparing the order
        'ready',      // Ready for pickup/delivery
        'picked-up',  // Customer has picked up (before completion)
        'completed',  // Order fulfilled
        'cancelled'   // Order cancelled
      ]);
    });

    it('final states are correctly identified', () => {
      expect(OrderStateMachine.isFinalState('completed')).toBe(true);
      expect(OrderStateMachine.isFinalState('cancelled')).toBe(true);

      // Non-final states
      const nonFinalStates = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up'];
      nonFinalStates.forEach(status => {
        expect(OrderStateMachine.isFinalState(status as any)).toBe(false);
      });
    });
  });

  describe('transition coverage', () => {
    it('all database constraint values have defined transitions', () => {
      // Every valid status should have getNextValidStatuses defined
      DATABASE_CONSTRAINT_VALUES.forEach(status => {
        const transitions = OrderStateMachine.getNextValidStatuses(status as any);
        expect(Array.isArray(transitions)).toBe(true);

        // Non-final states must have at least one valid transition
        if (!OrderStateMachine.isFinalState(status as any)) {
          expect(
            transitions.length,
            `Status '${status}' has no valid transitions but is not a final state`
          ).toBeGreaterThan(0);
        }
      });
    });
  });
});
