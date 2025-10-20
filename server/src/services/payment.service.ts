import { logger } from '../utils/logger';
import { OrdersService, type Order } from './orders.service';
import { BadRequest } from '../middleware/errorHandler';
import { supabase } from '../config/database';

export interface PaymentValidationResult {
  amount: number;
  idempotencyKey: string;
  orderTotal: number;
  tax: number;
  subtotal: number;
}

export interface PaymentAuditLogEntry {
  orderId: string;
  amount: number;
  status: 'initiated' | 'processing' | 'success' | 'failed' | 'refunded';
  userId?: string;
  restaurantId: string;  // Made required - always provided in our usage
  paymentMethod?: 'card' | 'cash' | 'other';
  paymentId?: string;
  errorCode?: string;
  errorDetail?: string;
  ipAddress?: string;
  userAgent?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export class PaymentService {
  private static readonly MINIMUM_ORDER_AMOUNT = 0.01;

  /**
   * Get restaurant tax rate
   * Per ADR-007: Tax rates are now configured per-restaurant
   * MUST match OrdersService.getRestaurantTaxRate() to ensure consistency
   */
  private static async getRestaurantTaxRate(restaurantId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('tax_rate')
        .eq('id', restaurantId)
        .single();

      if (error) {
        logger.error('Failed to fetch restaurant tax rate', { error, restaurantId });
        // Fall back to default California rate (8.25%) if fetch fails
        logger.warn('Using default tax rate 0.0825 (8.25%) due to fetch error');
        return 0.0825;
      }

      if (!data || data.tax_rate === null || data.tax_rate === undefined) {
        logger.warn('Restaurant tax rate not found, using default', { restaurantId });
        return 0.0825;
      }

      return Number(data.tax_rate);
    } catch (error) {
      logger.error('Exception fetching restaurant tax rate', { error, restaurantId });
      return 0.0825;
    }
  }

  /**
   * Calculate order total from items
   * CRITICAL: This is the single source of truth for payment amounts
   */
  static async calculateOrderTotal(order: Order): Promise<PaymentValidationResult> {
    if (!order.items || order.items.length === 0) {
      throw BadRequest('Order has no items');
    }

    // Get restaurant ID from order
    const restaurantId = (order as any).restaurant_id || (order as any).restaurantId;
    if (!restaurantId) {
      throw BadRequest('Order missing restaurant_id');
    }

    let subtotal = 0;

    // Calculate subtotal from items
    for (const item of order.items) {
      const itemPrice = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;

      if (itemPrice < 0) {
        throw BadRequest(`Invalid price for item ${item.name}`);
      }

      if (quantity < 1) {
        throw BadRequest(`Invalid quantity for item ${item.name}`);
      }

      // Add base price
      subtotal += itemPrice * quantity;

      // Add modifiers if present
      if (item.modifiers && Array.isArray(item.modifiers)) {
        for (const modifier of item.modifiers) {
          const modifierPrice = Number(modifier.price) || 0;
          if (modifierPrice < 0) {
            throw BadRequest(`Invalid modifier price for ${modifier.name}`);
          }
          subtotal += modifierPrice * quantity;
        }
      }
    }

    // Get restaurant-specific tax rate (ADR-007: Per-Restaurant Configuration)
    // CRITICAL: This MUST match OrdersService tax calculation for consistency
    const taxRate = await this.getRestaurantTaxRate(restaurantId);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Validate minimum order amount
    if (total < this.MINIMUM_ORDER_AMOUNT) {
      throw BadRequest(`Order total must be at least $${this.MINIMUM_ORDER_AMOUNT}`);
    }

    // Generate server-side idempotency key (max 45 chars per Square)
    // Format: last 12 chars of order ID + timestamp = 26 chars total
    const idempotencyKey = `${order.id.slice(-12)}-${Date.now()}`;

    logger.info('Payment validation complete', {
      orderId: order.id,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      idempotencyKey
    });

    return {
      amount: Math.round(total * 100), // Convert to cents for payment processor
      idempotencyKey,
      orderTotal: total,
      tax,
      subtotal
    };
  }

  /**
   * Validate payment request against order
   * Ensures client cannot manipulate payment amounts
   */
  static async validatePaymentRequest(
    orderId: string,
    restaurantId: string,
    clientAmount?: number,
    clientIdempotencyKey?: string
  ): Promise<PaymentValidationResult> {
    // Get order from database
    const order = await OrdersService.getOrder(restaurantId, orderId);
    if (!order) {
      throw BadRequest('Order not found');
    }

    // Calculate server-side total
    const validation = await this.calculateOrderTotal(order);

    // If client provided amount, validate it matches
    if (clientAmount !== undefined) {
      const clientAmountCents = Math.round(clientAmount * 100);
      const difference = Math.abs(clientAmountCents - validation.amount);
      
      // Allow 1 cent difference for rounding errors
      if (difference > 1) {
        logger.error('Payment amount mismatch', {
          orderId,
          clientAmount: clientAmount,
          serverAmount: validation.orderTotal,
          difference: difference / 100
        });
        throw BadRequest(
          `Payment amount mismatch. Expected: $${validation.orderTotal.toFixed(2)}, ` +
          `Received: $${clientAmount.toFixed(2)}`
        );
      }
    }

    // Log if client tried to provide their own idempotency key
    if (clientIdempotencyKey) {
      logger.warn('Client attempted to provide idempotency key', {
        orderId,
        clientKey: clientIdempotencyKey,
        serverKey: validation.idempotencyKey
      });
    }

    return validation;
  }

  /**
   * Create payment audit log entry with full context
   */
  static async logPaymentAttempt(entry: PaymentAuditLogEntry): Promise<void> {
    const auditLog = {
      order_id: entry.orderId,
      user_id: entry.userId,
      restaurant_id: entry.restaurantId,
      amount: entry.amount * 100, // Store in cents
      payment_method: entry.paymentMethod || 'card',
      payment_id: entry.paymentId,
      status: entry.status,
      error_code: entry.errorCode,
      error_detail: entry.errorDetail,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      idempotency_key: entry.idempotencyKey,
      metadata: entry.metadata || {},
      created_at: new Date().toISOString()
    };

    logger.info('Payment audit log', {
      ...auditLog,
      environment: process.env['NODE_ENV']
    });

    // Store in database audit table
    try {
      const { error } = await supabase
        .from('payment_audit_logs')
        .insert(auditLog);

      if (error) {
        logger.error('CRITICAL: Payment audit log failed - compliance requirement violated', {
          orderId: entry.orderId,
          paymentId: entry.paymentId,
          error: error.message,
          auditLog
        });
        // FAIL-FAST: Per ADR-009 and SECURITY.md, audit log failures MUST block payment
        // This is a PCI DSS compliance requirement - payment audit logs are mandatory
        throw new Error('Payment processing unavailable - audit system failure. Please try again later.');
      }
    } catch (dbError) {
      logger.error('CRITICAL: Database error storing payment audit - compliance requirement violated', {
        dbError,
        orderId: entry.orderId,
        auditLog
      });
      // FAIL-FAST: Same as above - audit logging is mandatory for PCI compliance
      throw new Error('Payment processing unavailable - audit system failure. Please try again later.');
    }
  }

  /**
   * Validate refund request
   */
  static async validateRefundRequest(
    paymentId: string,
    requestedAmount?: number,
    originalAmount?: number
  ): Promise<{ amount: number; idempotencyKey: string }> {
    if (!paymentId) {
      throw BadRequest('Payment ID is required for refund');
    }

    let refundAmount: number;

    if (requestedAmount !== undefined) {
      if (requestedAmount <= 0) {
        throw BadRequest('Refund amount must be positive');
      }
      
      if (originalAmount && requestedAmount > originalAmount) {
        throw BadRequest('Refund amount cannot exceed original payment');
      }
      
      refundAmount = Math.round(requestedAmount * 100);
    } else if (originalAmount) {
      // Full refund
      refundAmount = Math.round(originalAmount * 100);
    } else {
      throw BadRequest('Unable to determine refund amount');
    }

    // Generate refund idempotency key (max 45 chars per Square)
    // Format: "ref-" + last 12 chars of payment ID + timestamp = 30 chars total
    const idempotencyKey = `ref-${paymentId.slice(-12)}-${Date.now()}`;

    return {
      amount: refundAmount,
      idempotencyKey
    };
  }
}