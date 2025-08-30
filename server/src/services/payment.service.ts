import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { OrdersService } from './orders.service';
import { BadRequest } from '../middleware/errorHandler';
import type { Order } from '@rebuild/shared';

export interface PaymentValidationResult {
  amount: number;
  idempotencyKey: string;
  orderTotal: number;
  tax: number;
  subtotal: number;
}

export class PaymentService {
  private static readonly TAX_RATE = 0.08; // TODO: Make this configurable per restaurant
  private static readonly MINIMUM_ORDER_AMOUNT = 0.01;

  /**
   * Calculate order total from items
   * CRITICAL: This is the single source of truth for payment amounts
   */
  static async calculateOrderTotal(order: Order): Promise<PaymentValidationResult> {
    if (!order.items || order.items.length === 0) {
      throw BadRequest('Order has no items');
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

    // Calculate tax
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;

    // Validate minimum order amount
    if (total < this.MINIMUM_ORDER_AMOUNT) {
      throw BadRequest(`Order total must be at least $${this.MINIMUM_ORDER_AMOUNT}`);
    }

    // Generate server-side idempotency key
    const idempotencyKey = `order-${order.id}-${Date.now()}-${randomUUID()}`;

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
    const validation = await this.calculateOrderTotal(order as Order);

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
   * Create payment audit log entry
   */
  static async logPaymentAttempt(
    orderId: string,
    amount: number,
    status: 'success' | 'failed',
    paymentId?: string,
    error?: string
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      orderId,
      amount,
      status,
      paymentId,
      error,
      environment: process.env.NODE_ENV
    };

    logger.info('Payment attempt', logEntry);

    // TODO: Store in database audit table
    // await db.paymentAudits.create(logEntry);
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

    const idempotencyKey = `refund-${paymentId}-${Date.now()}-${randomUUID()}`;

    return {
      amount: refundAmount,
      idempotencyKey
    };
  }
}