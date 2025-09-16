import { SquareClient, SquareEnvironment, ApiError } from 'square';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  strategy: 'link' | 'web';
  paymentLinkUrl?: string;
  checkoutId?: string;
  clientToken?: string;
  metadata?: Record<string, any>;
}

interface IntentMetadata {
  orderDraftId?: string;
  restaurantId: string;
  mode: string;
}

export class SquareAdapter {
  private client: SquareClient;
  private locationId: string;
  private environment: string;

  constructor() {
    this.environment = process.env['SQUARE_ENVIRONMENT'] || 'sandbox';
    this.locationId = process.env['SQUARE_LOCATION_ID'] || '';

    this.client = new SquareClient({
      accessToken: process.env['SQUARE_ACCESS_TOKEN'] || '',
      environment: this.environment === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox
    } as any);

    logger.info('Square adapter initialized', {
      environment: this.environment,
      locationId: this.locationId
    });
  }

  async createIntent(
    amount: number,
    metadata: IntentMetadata
  ): Promise<PaymentIntent> {
    const idempotencyKey = randomUUID();

    try {
      // For browser/kiosk, create a checkout link
      const { result } = await this.client.checkoutApi.createPaymentLink({
        idempotencyKey,
        quickPay: {
          name: `Order ${metadata.orderDraftId || 'Draft'}`,
          priceMoney: {
            amount: BigInt(amount),
            currency: 'USD'
          },
          locationId: this.locationId
        },
        checkoutOptions: {
          acceptedPaymentMethods: {
            applePay: true,
            googlePay: true,
            cashAppPay: true,
            afterpayClearpay: false
          },
          redirectUrl: `${process.env['CLIENT_URL'] || 'http://localhost:5173'}/payment/success`,
          askForShippingAddress: false
        },
        prePopulatedData: {
          buyerEmail: metadata.mode === 'voice_customer' ? undefined : 'restaurant@example.com'
        }
      });

      if (!result.paymentLink) {
        throw new Error('Failed to create payment link');
      }

      const intent: PaymentIntent = {
        id: result.paymentLink.id || idempotencyKey,
        amount,
        currency: 'USD',
        status: 'pending',
        strategy: 'link',
        paymentLinkUrl: result.paymentLink.url,
        checkoutId: result.paymentLink.orderId,
        metadata: {
          ...metadata,
          squareVersion: result.paymentLink.version,
          createdAt: result.paymentLink.createdAt
        }
      };

      logger.info('Square payment link created', {
        intentId: intent.id,
        checkoutId: intent.checkoutId,
        url: intent.paymentLinkUrl
      });

      return intent;
    } catch (error) {
      if (error instanceof ApiError) {
        logger.error('Square API error', {
          errors: error.errors,
          statusCode: error.statusCode
        });
        throw new Error(`Square API error: ${error.errors?.[0]?.detail || error.message}`);
      }
      throw error;
    }
  }

  async statusById(id: string): Promise<PaymentIntent> {
    try {
      // Try to retrieve the payment link first
      const { result: linkResult } = await this.client.checkoutApi.retrievePaymentLink(id);

      if (!linkResult.paymentLink) {
        throw new Error('Payment link not found');
      }

      // Check if order exists and get payment status
      let status: 'pending' | 'succeeded' | 'failed' = 'pending';

      if (linkResult.paymentLink.orderId) {
        try {
          const { result: orderResult } = await this.client.ordersApi.retrieveOrder(
            linkResult.paymentLink.orderId
          );

          if (orderResult.order?.state === 'COMPLETED') {
            status = 'succeeded';
          } else if (orderResult.order?.state === 'CANCELED') {
            status = 'failed';
          }
        } catch (orderError) {
          logger.debug('Could not retrieve order status', { orderId: linkResult.paymentLink.orderId });
        }
      }

      return {
        id: linkResult.paymentLink.id || id,
        amount: Number(linkResult.paymentLink.paymentNote) || 0,
        currency: 'USD',
        status,
        strategy: 'link',
        paymentLinkUrl: linkResult.paymentLink.url,
        checkoutId: linkResult.paymentLink.orderId,
        metadata: {
          version: linkResult.paymentLink.version,
          createdAt: linkResult.paymentLink.createdAt,
          updatedAt: linkResult.paymentLink.updatedAt
        }
      };
    } catch (error) {
      if (error instanceof ApiError) {
        logger.error('Square API error checking status', {
          paymentId: id,
          errors: error.errors
        });

        if (error.statusCode === 404) {
          throw new Error('Payment not found');
        }
      }
      throw error;
    }
  }

  async createWebPaymentToken(): Promise<string> {
    // For web payments SDK, we need client-side tokenization
    // This returns a client token that the frontend will use
    const clientToken = Buffer.from(JSON.stringify({
      applicationId: process.env['VITE_SQUARE_APP_ID'],
      locationId: this.locationId,
      environment: this.environment,
      timestamp: Date.now()
    })).toString('base64');

    return clientToken;
  }

  async verifyWebPaymentToken(token: string): Promise<boolean> {
    // In production, this would verify the token with Square
    // For now, basic validation
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return decoded.locationId === this.locationId;
    } catch {
      return false;
    }
  }
}