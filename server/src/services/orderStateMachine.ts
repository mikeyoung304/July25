import { logger } from '../utils/logger';
import { BadRequest } from '../middleware/errorHandler';
// ✅ PHASE 2: Import OrderStatus from shared (Single Source of Truth)
import type { Order, OrderStatus } from '@rebuild/shared';

/**
 * Order State Machine
 * Enforces valid state transitions and provides hooks for side effects
 *
 * PHASE 2 UPDATE (2025-01-23):
 * - Now imports OrderStatus from @rebuild/shared to eliminate split-brain
 * - Added support for 'picked-up' state in transition table
 * - Enforces strict type safety across client/server boundary
 */

export interface StateTransition {
  from: OrderStatus;
  to: OrderStatus;
  timestamp: Date;
  userId?: string | undefined;
  reason?: string | undefined;
}

export interface TransitionHook {
  (transition: StateTransition, order: Order): Promise<void> | void;
}

export class OrderStateMachine {
  // ✅ PHASE 2: Updated to include 'picked-up' state (matches shared definition)
  private static readonly VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    'new': ['pending', 'cancelled'],
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['picked-up', 'completed', 'cancelled'],  // ✅ Added 'picked-up' transition
    'picked-up': ['completed', 'cancelled'],           // ✅ New state handling
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
      } catch (error: any) {
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
   * Execute hooks for a completed transition
   * Called after database update succeeds to trigger side effects
   * Hooks are non-blocking - errors are logged but don't block the transition
   */
  static async executeTransitionHooks(
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    order: Order,
    userId?: string,
    reason?: string
  ): Promise<void> {
    const transition: StateTransition = {
      from: fromStatus,
      to: toStatus,
      timestamp: new Date(),
      userId,
      reason
    };

    // Execute hooks in order, catch errors to prevent blocking
    try {
      await this.executeHooks(`${fromStatus}->${toStatus}`, transition, order);
      await this.executeHooks(`*->${toStatus}`, transition, order);
      await this.executeHooks(`${fromStatus}->*`, transition, order);
    } catch (error) {
      // This shouldn't happen since executeHooks catches errors internally
      logger.error('Unexpected error in transition hooks', {
        from: fromStatus,
        to: toStatus,
        orderId: order.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
      'picked-up': {
        label: 'Picked Up',
        color: 'teal',
        icon: '🛍️',
        isFinal: false,
        canCancel: false
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
      'new->pending': 30,          // 30 seconds to confirm
      'pending->confirmed': 60,    // 1 minute to confirm
      'confirmed->preparing': 120, // 2 minutes to start preparing
      'preparing->ready': 900,     // 15 minutes to prepare
      'ready->picked-up': 180,     // 3 minutes for customer pickup
      'picked-up->completed': 60,  // 1 minute to mark complete
      'ready->completed': 300      // 5 minutes to complete (direct path)
    };

    return durations[`${from}->${to}`] || 60;
  }
}

// =============================================================================
// Notification Hooks (Refactored - GitHub Issue #146)
// =============================================================================
// These hooks are executed after successful status transitions.
// All hooks are non-blocking - errors are logged but don't affect the transition.
// Real notification services (SMS, email, Stripe refunds) are deferred to future work.

/**
 * Hook: Kitchen notification on order confirmation
 * Logs order details for kitchen display systems
 * WebSocket broadcast is handled separately by OrdersService
 */
OrderStateMachine.registerHook('*->confirmed', async (_transition, order) => {
  try {
    logger.info('Kitchen notification: Order confirmed', {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      orderNumber: order.order_number,
      itemCount: order.items?.length || 0,
      orderType: order.type,
      tableNumber: order.table_number || null
    });
    // WebSocket broadcast to kitchen displays is handled by OrdersService.updateOrderStatus()
    // which calls broadcastOrderUpdate() after the database update succeeds
  } catch (error) {
    // Log but don't block - kitchen notifications are best-effort
    logger.error('Failed to process kitchen notification hook', {
      orderId: order.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Hook: Customer notification when order is ready
 * Logs notification intent - actual SMS/email integration is deferred
 */
OrderStateMachine.registerHook('*->ready', async (_transition, order) => {
  try {
    // Skip if no customer contact info available
    if (!order.customer_phone && !order.customer_email) {
      logger.debug('Customer notification skipped: No contact info', {
        orderId: order.id,
        orderNumber: order.order_number
      });
      return;
    }

    logger.info('Customer notification: Order ready for pickup', {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      orderNumber: order.order_number,
      hasPhone: !!order.customer_phone,
      hasEmail: !!order.customer_email,
      customerName: order.customer_name || 'Guest'
    });

    // TODO: Future integration with SMS/email notification service
    // When implemented, this hook will call:
    // - NotificationService.sendSMS(order.customer_phone, `Your order #${order.order_number} is ready!`)
    // - NotificationService.sendEmail(order.customer_email, 'Your order is ready', ...)
  } catch (error) {
    // Log but don't block - customer notifications are best-effort
    logger.error('Failed to process customer notification hook', {
      orderId: order.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Hook: Refund processing when paid order is cancelled
 * Logs refund requirement - actual Stripe refund integration is deferred
 */
OrderStateMachine.registerHook('*->cancelled', async (_transition, order) => {
  try {
    // Only process refund logic for paid orders
    if (order.payment_status !== 'paid') {
      logger.debug('Refund processing skipped: Order not paid', {
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: order.payment_status
      });
      return;
    }

    // Log at WARN level so operations team can process manually
    logger.warn('Refund required: Paid order cancelled', {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      orderNumber: order.order_number,
      total: order.total,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status
    });

    // TODO: Future integration with Stripe refund API
    // When implemented, this hook will call:
    // - StripeService.processRefund(order.payment_id, order.total)
    // - Update order.payment_status to 'refunded'
  } catch (error) {
    // Log but don't block - refund processing errors need manual attention
    logger.error('Failed to process refund hook', {
      orderId: order.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default OrderStateMachine;