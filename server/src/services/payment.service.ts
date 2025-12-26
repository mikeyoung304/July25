import { logger } from '../utils/logger';
import { OrdersService, type Order } from './orders.service';
import { BadRequest } from '../middleware/errorHandler';
import { supabase } from '../config/database';
import { DEFAULT_TAX_RATE, TAX_RATE_SOURCE } from '@rebuild/shared/constants/business';

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
        logger.warn('Using fallback tax rate from shared constants', {
          restaurantId,
          fallback: DEFAULT_TAX_RATE,
          source: TAX_RATE_SOURCE.FALLBACK
        });
        return DEFAULT_TAX_RATE;
      }

      if (!data || data.tax_rate === null || data.tax_rate === undefined) {
        logger.warn('Restaurant tax rate not found, using default', {
          restaurantId,
          fallback: DEFAULT_TAX_RATE,
          source: TAX_RATE_SOURCE.FALLBACK
        });
        return DEFAULT_TAX_RATE;
      }

      return Number(data.tax_rate);
    } catch (error) {
      logger.error('Exception fetching restaurant tax rate', { error, restaurantId });
      logger.warn('Using fallback tax rate due to exception', {
        restaurantId,
        fallback: DEFAULT_TAX_RATE,
        source: TAX_RATE_SOURCE.FALLBACK
      });
      return DEFAULT_TAX_RATE;
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
      // Convert quantity, but don't default yet - validate first
      const quantity = Number(item.quantity);

      if (itemPrice < 0) {
        throw BadRequest(`Invalid price for item ${item.name}`);
      }

      // Validate quantity before using (catches 0, negative, NaN)
      if (!quantity || quantity < 1 || !Number.isFinite(quantity)) {
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

    // Generate server-side idempotency key (max 255 chars per Stripe)
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
   *
   * COMPLIANCE NOTE: Per ADR-009 and SECURITY.md, this function MUST be called
   * BEFORE processing payments (with status='initiated') to ensure no customer
   * charges occur without an audit trail.
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
   * Update existing payment audit log status (two-phase logging)
   *
   * This function updates an 'initiated' audit log to its final status after
   * payment processing completes. This ensures:
   * 1. No customer charges without initial audit trail (compliance)
   * 2. Complete audit history from initiation to completion
   * 3. No "charged but unrecorded" scenarios
   *
   * COMPLIANCE NOTE: Per ADR-009, this function also uses fail-fast error handling.
   * If we cannot update the audit log, the payment flow is considered incomplete
   * and an error is thrown to prevent silent failures.
   *
   * @param idempotencyKey - Unique key to identify the audit log entry
   * @param status - Final status: 'success' or 'failed'
   * @param paymentId - Payment processor ID (for successful payments)
   * @param errorCode - Error code (for failed payments)
   * @param errorDetail - Error details (for failed payments)
   */
  static async updatePaymentAuditStatus(
    idempotencyKey: string,
    status: 'success' | 'failed',
    paymentId?: string,
    errorCode?: string,
    errorDetail?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Add optional fields only if provided
      if (paymentId) updateData.payment_id = paymentId;
      if (errorCode) updateData.error_code = errorCode;
      if (errorDetail) updateData.error_detail = errorDetail;

      logger.info('Updating payment audit status', {
        idempotencyKey,
        status,
        paymentId,
        errorCode
      });

      const { error, count } = await supabase
        .from('payment_audit_logs')
        .update(updateData)
        .eq('idempotency_key', idempotencyKey);

      if (error) {
        logger.error('CRITICAL: Failed to update payment audit status - compliance requirement violated', {
          idempotencyKey,
          status,
          paymentId,
          error: error.message
        });
        // FAIL-FAST: Incomplete audit trail is a compliance violation
        throw new Error('Payment audit system failure - unable to update status. Please contact support.');
      }

      // Verify that exactly one row was updated
      if (count === 0) {
        logger.error('CRITICAL: Payment audit log not found for update', {
          idempotencyKey,
          status,
          paymentId
        });
        throw new Error('Payment audit system failure - audit log not found. Please contact support.');
      }

      logger.info('Payment audit status updated successfully', {
        idempotencyKey,
        status,
        paymentId,
        rowsUpdated: count
      });
    } catch (error) {
      // Re-throw if already our error
      if (error instanceof Error && error.message.includes('Payment audit system failure')) {
        throw error;
      }

      // Log and throw for unexpected errors
      logger.error('CRITICAL: Exception updating payment audit status', {
        idempotencyKey,
        status,
        error
      });
      throw new Error('Payment audit system failure - unexpected error. Please contact support.');
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

    // Generate refund idempotency key (max 255 chars per Stripe)
    // Format: "ref-" + last 12 chars of payment ID + timestamp = 30 chars total
    const idempotencyKey = `ref-${paymentId.slice(-12)}-${Date.now()}`;

    return {
      amount: refundAmount,
      idempotencyKey
    };
  }
}