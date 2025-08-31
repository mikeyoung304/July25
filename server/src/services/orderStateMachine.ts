import { logger } from '../utils/logger';
import { BadRequest } from '../middleware/errorHandler';
import type { Order } from '@rebuild/shared';

/**
 * Order State Machine
 * Enforces valid state transitions and provides hooks for side effects
 */

export type OrderStatus = 'new' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface StateTransition {
  from: OrderStatus;
  to: OrderStatus;
  timestamp: Date;
  userId?: string;
  reason?: string;
}

export interface TransitionHook {
  (transition: StateTransition, order: Order): Promise<void> | void;
}

export class OrderStateMachine {
  private static readonly VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    'new': ['pending', 'cancelled'],
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['completed', 'cancelled'],
    'completed': [], // Final state
    'cancelled': []  // Final state
  };

  private static readonly TRANSITION_HOOKS: Map<string, TransitionHook[]> = new Map();

  /**
   * Check if a status transition is valid
   */
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    const validTransitions = this.VALID_TRANSITIONS[from];
    return validTransitions?.includes(to) || false;
  }

  /**
   * Validate and perform a status transition
   */
  static async transition(
    order: Order,
    newStatus: OrderStatus,
    userId?: string,
    reason?: string
  ): Promise<Order> {
    const currentStatus = order.status as OrderStatus;

    // Check if transition is valid
    if (!this.canTransition(currentStatus, newStatus)) {
      const validTransitions = this.VALID_TRANSITIONS[currentStatus];
      const validStr = validTransitions.length > 0 
        ? validTransitions.join(', ')
        : 'none (final state)';
      
      throw BadRequest(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
        `Valid transitions: ${validStr}`
      );
    }

    // Create transition record
    const transition: StateTransition = {
      from: currentStatus,
      to: newStatus,
      timestamp: new Date(),
      userId,
      reason
    };

    // Log transition
    logger.info('Order status transition', {
      orderId: order.id,
      from: currentStatus,
      to: newStatus,
      userId,
      reason
    });

    // Execute pre-transition hooks
    await this.executeHooks(`${currentStatus}->${newStatus}`, transition, order);
    await this.executeHooks(`*->${newStatus}`, transition, order);

    // Update order status
    const updatedOrder = {
      ...order,
      status: newStatus,
      [`${newStatus}_at`]: transition.timestamp.toISOString()
    };

    // Execute post-transition hooks
    await this.executeHooks(`${currentStatus}->*`, transition, updatedOrder as Order);

    return updatedOrder as Order;
  }

  /**
   * Register a hook for specific transitions
   */
  static registerHook(pattern: string, hook: TransitionHook): void {
    if (!this.TRANSITION_HOOKS.has(pattern)) {
      this.TRANSITION_HOOKS.set(pattern, []);
    }
    this.TRANSITION_HOOKS.get(pattern)!.push(hook);
  }

  /**
   * Execute hooks for a transition pattern
   */
  private static async executeHooks(
    pattern: string,
    transition: StateTransition,
    order: Order
  ): Promise<void> {
    const hooks = this.TRANSITION_HOOKS.get(pattern) || [];
    
    for (const hook of hooks) {
      try {
        await hook(transition, order);
      } catch (error) {
        logger.error('Hook execution failed', {
          pattern,
          transition,
          error: error.message
        });
        // Continue with other hooks even if one fails
      }
    }
  }

  /**
   * Get next valid statuses for an order
   */
  static getNextValidStatuses(currentStatus: OrderStatus): OrderStatus[] {
    return this.VALID_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Check if a status is a final state
   */
  static isFinalState(status: OrderStatus): boolean {
    return status === 'completed' || status === 'cancelled';
  }

  /**
   * Validate status value
   */
  static isValidStatus(status: string): status is OrderStatus {
    return Object.keys(this.VALID_TRANSITIONS).includes(status);
  }

  /**
   * Get status metadata
   */
  static getStatusMetadata(status: OrderStatus): {
    label: string;
    color: string;
    icon: string;
    isFinal: boolean;
    canCancel: boolean;
  } {
    const metadata: Record<OrderStatus, any> = {
      'new': {
        label: 'New Order',
        color: 'blue',
        icon: '📝',
        isFinal: false,
        canCancel: true
      },
      'pending': {
        label: 'Pending Confirmation',
        color: 'yellow',
        icon: '⏳',
        isFinal: false,
        canCancel: true
      },
      'confirmed': {
        label: 'Confirmed',
        color: 'orange',
        icon: '✅',
        isFinal: false,
        canCancel: true
      },
      'preparing': {
        label: 'Preparing',
        color: 'purple',
        icon: '👨‍🍳',
        isFinal: false,
        canCancel: true
      },
      'ready': {
        label: 'Ready for Pickup',
        color: 'green',
        icon: '🔔',
        isFinal: false,
        canCancel: true
      },
      'completed': {
        label: 'Completed',
        color: 'gray',
        icon: '✓',
        isFinal: true,
        canCancel: false
      },
      'cancelled': {
        label: 'Cancelled',
        color: 'red',
        icon: '✗',
        isFinal: true,
        canCancel: false
      }
    };

    return metadata[status];
  }

  /**
   * Calculate estimated time for status transitions
   */
  static getEstimatedDuration(from: OrderStatus, to: OrderStatus): number {
    const durations: Record<string, number> = {
      'new->pending': 30,        // 30 seconds to confirm
      'pending->confirmed': 60,   // 1 minute to confirm
      'confirmed->preparing': 120, // 2 minutes to start preparing
      'preparing->ready': 900,     // 15 minutes to prepare
      'ready->completed': 300      // 5 minutes to complete
    };

    return durations[`${from}->${to}`] || 60;
  }
}

// Register default hooks for common side effects
OrderStateMachine.registerHook('*->confirmed', async (transition, order) => {
  logger.info('Order confirmed, notifying kitchen', { orderId: order.id });
  // TODO: Send notification to kitchen display
});

OrderStateMachine.registerHook('*->ready', async (transition, order) => {
  logger.info('Order ready, notifying customer', { orderId: order.id });
  // TODO: Send notification to customer
});

OrderStateMachine.registerHook('*->cancelled', async (transition, order) => {
  logger.info('Order cancelled, processing refund', { orderId: order.id });
  // TODO: Process refund if payment was made
});

export default OrderStateMachine;