import { logger } from '../utils/logger';
import { BadRequest } from '../middleware/errorHandler';
// ✅ PHASE 2: Import OrderStatus from shared (Single Source of Truth)
import type { Order, OrderStatus } from '@rebuild/shared';
import { getErrorMessage } from '@rebuild/shared';
import { EmailService } from './email.service';
import { generateIdempotencyKey } from './payment.service';

// =============================================================================
// External Service Initialization (Module Scope - TODO-230)
// =============================================================================
// Initialize Twilio and SendGrid clients once at module load to avoid blocking
// the event loop with dynamic require() calls on every order status transition.
// Types are defined inline since packages may not be installed.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let twilioClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sendgridClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stripeClient: any = null;

if (process.env['TWILIO_ACCOUNT_SID'] && process.env['TWILIO_AUTH_TOKEN']) {
  twilioClient = require('twilio')(
    process.env['TWILIO_ACCOUNT_SID'],
    process.env['TWILIO_AUTH_TOKEN']
  );
}

if (process.env['SENDGRID_API_KEY']) {
  sendgridClient = require('@sendgrid/mail');
  sendgridClient.setApiKey(process.env['SENDGRID_API_KEY']);
}

if (process.env['STRIPE_SECRET_KEY']) {
  stripeClient = require('stripe')(process.env['STRIPE_SECRET_KEY']);
}

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
   * Clear all registered hooks (for testing purposes)
   * This prevents hook state leakage between tests
   */
  static clearHooks(): void {
    this.TRANSITION_HOOKS.clear();
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

    await Promise.all(hooks.map(async (hook) => {
      try {
        await hook(transition, order);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Hook execution failed', {
          pattern,
          transition,
          error: errorMsg
        });
        // Continue with other hooks even if one fails
      }
    }));
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
        error: getErrorMessage(error)
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
 * Hook: Kitchen notification on order confirmation (P1.2 feature)
 * Formats kitchen ticket and logs for KDS
 * WebSocket broadcast is handled separately by OrdersService
 */
OrderStateMachine.registerHook('*->confirmed', async (_transition, order) => {
  try {
    // Format kitchen ticket with item details for KDS (P1.2)
    const kitchenTicket = {
      order_number: order.order_number,
      customer_name: order.customer_name || 'Guest',
      table_number: order.table_number || null,
      order_type: order.type,
      items: order.items?.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        modifiers: item.modifiers || [],
        notes: item.notes || ''
      })) || [],
      special_instructions: order.notes || '',
      created_at: order.created_at
    };

    logger.info('Kitchen notification: Order confirmed', {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      orderNumber: order.order_number,
      itemCount: order.items?.length || 0,
      orderType: order.type,
      tableNumber: order.table_number || null,
      kitchenTicket
    });
    // WebSocket broadcast to kitchen displays is handled by OrdersService.updateOrderStatus()
    // which calls broadcastOrderUpdate() after the database update succeeds
    // The order payload already includes all item details for KDS rendering
  } catch (error) {
    // Log but don't block - kitchen notifications are best-effort
    logger.error('Failed to process kitchen notification hook', {
      orderId: order.id,
      error: getErrorMessage(error)
    });
  }
});

/**
 * Hook: Send order confirmation email when order is confirmed (TODO-007)
 * Sends email via EmailService (non-blocking, won't fail order)
 * Requires env vars: POSTMARK_SERVER_TOKEN, POSTMARK_FROM_EMAIL
 */
OrderStateMachine.registerHook('*->confirmed', async (_transition, order) => {
  try {
    // Extract email data from order
    const emailData = EmailService.extractEmailDataFromOrder(order);

    if (!emailData) {
      logger.debug('Order confirmation email skipped: No customer email', {
        orderId: order.id,
        orderNumber: order.order_number
      });
      return;
    }

    // Send confirmation email (non-blocking)
    const result = await EmailService.sendOrderConfirmation(emailData);

    if (result.success) {
      logger.info('Order confirmation email sent', {
        orderId: order.id,
        orderNumber: order.order_number,
        messageId: result.messageId
      });
    } else {
      // Log warning but don't fail - email errors should never block orders
      logger.warn('Order confirmation email failed (non-blocking)', {
        orderId: order.id,
        orderNumber: order.order_number,
        error: result.error
      });
    }
  } catch (error) {
    // Catch-all: Log but don't block order confirmation
    logger.error('Unexpected error in order confirmation email hook', {
      orderId: order.id,
      error: getErrorMessage(error)
    });
  }
});

/**
 * Hook: Customer notification when order is ready (P1.3 feature)
 * Sends SMS via Twilio and/or email via SendGrid (inline, no service class)
 * Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *                   SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
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

    // SMS via Twilio (inline, no service class per P1.3)
    if (order.customer_phone && twilioClient) {
      try {
        await twilioClient.messages.create({
          from: process.env['TWILIO_PHONE_NUMBER'],
          to: order.customer_phone,
          body: `Your order #${order.order_number} is ready for pickup!`
        });
        logger.info('SMS notification sent', {
          orderId: order.id,
          orderNumber: order.order_number,
          phone: order.customer_phone.replace(/\d{6}$/, '******') // Mask phone for logs
        });
      } catch (smsError) {
        // Log but don't block - notifications are best-effort (no retry queue per user decision)
        logger.error('SMS notification failed', {
          orderId: order.id,
          orderNumber: order.order_number,
          error: getErrorMessage(smsError)
        });
      }
    }

    // Email via SendGrid (inline, no service class per P1.3)
    if (order.customer_email && sendgridClient) {
      try {
        await sendgridClient.send({
          to: order.customer_email,
          from: process.env['SENDGRID_FROM_EMAIL'] || 'orders@restaurant.com',
          subject: `Order #${order.order_number} is ready!`,
          html: `<p>Hi ${order.customer_name || 'there'},</p><p>Your order #${order.order_number} is ready for pickup!</p>`
        });
        logger.info('Email notification sent', {
          orderId: order.id,
          orderNumber: order.order_number,
          email: order.customer_email.replace(/^(.{2}).*@/, '$1***@') // Mask email for logs
        });
      } catch (emailError) {
        // Log but don't block - notifications are best-effort (no retry queue per user decision)
        logger.error('Email notification failed', {
          orderId: order.id,
          orderNumber: order.order_number,
          error: getErrorMessage(emailError)
        });
      }
    }
  } catch (error) {
    // Log but don't block - customer notifications are best-effort
    logger.error('Failed to process customer notification hook', {
      orderId: order.id,
      error: getErrorMessage(error)
    });
  }
});

/**
 * Hook: Refund processing when paid order is cancelled (P1.4 feature)
 * Processes Stripe refund inline (no service class per user decision)
 * Uses idempotency key to prevent duplicate refunds
 */
OrderStateMachine.registerHook('*->cancelled', async (_transition, order) => {
  try {
    // Defense-in-depth: verify tenant context (TODO-252)
    if (!order.restaurant_id) {
      logger.error('Refund hook: Missing restaurant_id', { orderId: order.id });
      return;
    }

    // Only process refund logic for paid orders
    if (order.payment_status !== 'paid') {
      logger.debug('Refund processing skipped: Order not paid', {
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: order.payment_status
      });
      return;
    }

    // Check if we have a payment_intent_id to refund
    // Note: payment_intent_id is a database field not yet in shared types
    const paymentIntentId = (order as any).payment_intent_id as string | undefined;
    if (!paymentIntentId) {
      logger.warn('Refund skipped: No payment_intent_id on paid order', {
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: order.payment_status
      });
      return;
    }

    // Process Stripe refund (inline, no service class per P1.4)
    if (stripeClient) {
      try {
        // Generate consistent idempotency key (TODO-246: Use same format as payment.service.ts)
        // Format: refund_{restaurantSuffix}_{orderSuffix}_{timestamp}
        // This ensures tenant isolation and prevents duplicate refunds across all code paths
        const refundIdempotencyKey = generateIdempotencyKey('refund', order.restaurant_id, order.id);

        const refund = await stripeClient.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer'
        }, {
          idempotencyKey: refundIdempotencyKey
        });

        // Update order payment_status to 'refunded' in database
        const { supabase } = await import('../config/database');
        await supabase
          .from('orders')
          .update({
            payment_status: 'refunded',
            refund_id: refund.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        logger.info('Refund processed successfully', {
          orderId: order.id,
          orderNumber: order.order_number,
          refundId: refund.id,
          amount: refund.amount,
          status: refund.status
        });
      } catch (refundError) {
        // Log error - operator can see in logs and process manually via Stripe dashboard
        logger.error('Stripe refund failed - manual refund required', {
          orderId: order.id,
          orderNumber: order.order_number,
          paymentIntentId,
          error: getErrorMessage(refundError)
        });
      }
    } else {
      // No Stripe configured - log at WARN level for manual processing
      logger.warn('Refund required: Stripe not configured, manual refund needed', {
        orderId: order.id,
        restaurantId: order.restaurant_id,
        orderNumber: order.order_number,
        total: order.total,
        paymentIntentId
      });
    }
  } catch (error) {
    // Log but don't block - refund processing errors need manual attention
    logger.error('Failed to process refund hook', {
      orderId: order.id,
      error: getErrorMessage(error)
    });
  }
});

export default OrderStateMachine;