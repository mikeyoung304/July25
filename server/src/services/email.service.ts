/**
 * Email Service
 *
 * Stub service for sending transactional emails.
 * Currently logs email details but does not actually send emails.
 *
 * TODO: Implement actual email sending with Postmark
 */

import { logger } from '../utils/logger';
import type { Order } from '@rebuild/shared';

const emailLogger = logger.child({ service: 'EmailService' });

export interface OrderConfirmationEmailData {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string | undefined;
  total?: number | undefined;
  itemCount?: number | undefined;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Service Class
 */
export class EmailService {
  /**
   * Send order confirmation email (STUB - not actually sent until Postmark configured)
   */
  static async sendOrderConfirmation(data: OrderConfirmationEmailData): Promise<EmailResult> {
    if (!data.customerEmail) {
      return { success: true }; // Not an error - just no email to send
    }

    const isConfigured = !!process.env['POSTMARK_SERVER_TOKEN'];

    emailLogger.info('Order confirmation email (STUB - not sent)', {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      isConfigured,
    });

    return {
      success: true,
      messageId: `stub_${data.orderId}_${Date.now()}`
    };
  }

  /**
   * Helper to extract email data from an Order object
   */
  static extractEmailDataFromOrder(
    order: Order & { metadata?: Record<string, any> }
  ): OrderConfirmationEmailData | null {
    const customerEmail = order.customer_email || order.metadata?.customerEmail;

    if (!customerEmail) {
      return null;
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number || 'N/A',
      customerName: order.customer_name,
      customerEmail,
      total: order.total,
      itemCount: (order.items || []).length,
    };
  }
}

export default EmailService;
