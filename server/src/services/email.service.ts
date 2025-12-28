/**
 * Email Service
 *
 * Stub service for sending transactional emails.
 * Currently logs email details but does not actually send emails.
 *
 * TODO: Implement actual email sending with Postmark
 * - Add postmark package: npm install postmark
 * - Configure POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL in .env
 * - Replace stub methods with actual Postmark API calls
 *
 * Environment Variables:
 * - POSTMARK_SERVER_TOKEN: Your Postmark server token
 * - POSTMARK_FROM_EMAIL: Verified sender email address
 */

import { logger } from '../utils/logger';
import type { Order } from '@rebuild/shared';

const emailLogger = logger.child({ service: 'EmailService' });

export interface OrderConfirmationEmailData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    modifiers?: Array<{ name: string; price: number }>;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  restaurantName?: string | undefined;
  estimatedPickupTime?: string | undefined;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Service Class
 *
 * Provides methods for sending transactional emails.
 * All methods are non-blocking and log errors without throwing.
 */
export class EmailService {
  private static readonly FROM_EMAIL = process.env['POSTMARK_FROM_EMAIL'] || 'orders@restaurant.com';
  private static readonly POSTMARK_TOKEN = process.env['POSTMARK_SERVER_TOKEN'];

  /**
   * Check if email service is configured
   */
  static isConfigured(): boolean {
    return !!this.POSTMARK_TOKEN && this.POSTMARK_TOKEN !== 'your_postmark_server_token_here';
  }

  /**
   * Send order confirmation email after successful payment
   *
   * IMPORTANT: This method is non-blocking and will not throw errors.
   * Email failures should NEVER block order success.
   *
   * @param data - Order confirmation email data
   * @returns EmailResult with success status
   */
  static async sendOrderConfirmation(data: OrderConfirmationEmailData): Promise<EmailResult> {
    // Skip if no customer email
    if (!data.customerEmail) {
      emailLogger.debug('Order confirmation email skipped: No customer email', {
        orderId: data.orderId,
        orderNumber: data.orderNumber
      });
      return { success: true }; // Not an error - just no email to send
    }

    try {
      // Build email content
      const itemsList = data.items.map(item => {
        const modifiersText = item.modifiers?.length
          ? ` (${item.modifiers.map(m => m.name).join(', ')})`
          : '';
        return `${item.quantity}x ${item.name}${modifiersText} - $${(item.price * item.quantity).toFixed(2)}`;
      }).join('\n');

      const emailContent = {
        to: data.customerEmail,
        from: this.FROM_EMAIL,
        subject: `Order Confirmation #${data.orderNumber}`,
        textBody: `
Hi ${data.customerName || 'there'},

Thank you for your order!

Order #${data.orderNumber}
${data.estimatedPickupTime ? `Estimated pickup: ${data.estimatedPickupTime}\n` : ''}
Items:
${itemsList}

Subtotal: $${data.subtotal.toFixed(2)}
Tax: $${data.tax.toFixed(2)}
Total: $${data.total.toFixed(2)}

${data.restaurantName ? `\n${data.restaurantName}` : ''}
        `.trim(),
        htmlBody: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Order Confirmation #${data.orderNumber}</h2>
  <p>Hi ${data.customerName || 'there'},</p>
  <p>Thank you for your order!</p>
  ${data.estimatedPickupTime ? `<p><strong>Estimated pickup:</strong> ${data.estimatedPickupTime}</p>` : ''}
  <h3>Items</h3>
  <ul>
    ${data.items.map(item => {
      const modifiersText = item.modifiers?.length
        ? ` <em>(${item.modifiers.map(m => m.name).join(', ')})</em>`
        : '';
      return `<li>${item.quantity}x ${item.name}${modifiersText} - $${(item.price * item.quantity).toFixed(2)}</li>`;
    }).join('')}
  </ul>
  <hr />
  <p><strong>Subtotal:</strong> $${data.subtotal.toFixed(2)}</p>
  <p><strong>Tax:</strong> $${data.tax.toFixed(2)}</p>
  <p><strong>Total:</strong> $${data.total.toFixed(2)}</p>
  ${data.restaurantName ? `<p style="margin-top: 20px; color: #666;">${data.restaurantName}</p>` : ''}
</div>
        `.trim()
      };

      // TODO: Replace this stub with actual Postmark implementation
      // Example with Postmark:
      // const postmark = require('postmark');
      // const client = new postmark.ServerClient(this.POSTMARK_TOKEN);
      // const response = await client.sendEmail({
      //   From: emailContent.from,
      //   To: emailContent.to,
      //   Subject: emailContent.subject,
      //   TextBody: emailContent.textBody,
      //   HtmlBody: emailContent.htmlBody,
      //   MessageStream: 'outbound'
      // });
      // return { success: true, messageId: response.MessageID };

      // STUB: Log what would be sent
      emailLogger.info('Order confirmation email (STUB - not sent)', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        to: data.customerEmail.replace(/^(.{2}).*@/, '$1***@'), // Mask email for logs
        subject: emailContent.subject,
        itemCount: data.items.length,
        total: data.total,
        isConfigured: this.isConfigured()
      });

      // Return success for stub (doesn't block order flow)
      return {
        success: true,
        messageId: `stub_${data.orderId}_${Date.now()}`
      };

    } catch (error: any) {
      // Log but don't throw - email failures should NEVER block order success
      emailLogger.error('Order confirmation email failed', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        customerEmail: data.customerEmail.replace(/^(.{2}).*@/, '$1***@'),
        error: error.message || String(error)
      });

      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Helper to extract email data from an Order object
   *
   * @param order - Order object from database
   * @param restaurantName - Optional restaurant name for email
   * @returns OrderConfirmationEmailData or null if no email available
   */
  static extractEmailDataFromOrder(
    order: Order & { metadata?: Record<string, any> },
    restaurantName?: string
  ): OrderConfirmationEmailData | null {
    // Get customer email from metadata (stored there since column doesn't exist)
    const customerEmail = (order as any).customer_email || order.metadata?.customerEmail;

    if (!customerEmail) {
      return null;
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number || (order as any).orderNumber || 'N/A',
      customerName: order.customer_name || (order as any).customerName || 'Customer',
      customerEmail,
      items: (order.items || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        modifiers: item.modifiers
      })),
      subtotal: (order as any).subtotal || 0,
      tax: (order as any).tax || 0,
      total: order.total || (order as any).total_amount || 0,
      restaurantName
    };
  }
}

export default EmailService;
