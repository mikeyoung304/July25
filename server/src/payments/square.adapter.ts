import { SquareClient, SquareEnvironment, ApiError } from 'square';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { supabase } from '../utils/supabase';

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
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

interface DBPaymentIntent {
  id: string;
  provider: 'square' | 'stripe';
  provider_payment_id: string | null;
  order_draft_id: string | null;
  restaurant_id: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  used_at: string | null;
  used_by_order_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
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

      // Persist payment intent to database
      await this.persistIntent(intent, metadata);

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
      let status: 'pending' | 'succeeded' | 'failed' | 'canceled' = 'pending';

      if (linkResult.paymentLink.orderId) {
        try {
          const { result: orderResult } = await this.client.ordersApi.retrieveOrder(
            linkResult.paymentLink.orderId
          );

          if (orderResult.order?.state === 'COMPLETED') {
            status = 'succeeded';
          } else if (orderResult.order?.state === 'CANCELED') {
            status = 'canceled';
          }
        } catch (orderError) {
          logger.debug('Could not retrieve order status', { orderId: linkResult.paymentLink.orderId });
        }
      }

      // Update status in database if changed
      await this.updateIntentStatus(id, status);

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

  private async persistIntent(intent: PaymentIntent, metadata: IntentMetadata): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_intents')
        .insert({
          provider: 'square',
          provider_payment_id: intent.id,
          order_draft_id: metadata.orderDraftId || null,
          restaurant_id: metadata.restaurantId,
          amount_cents: intent.amount,
          currency: intent.currency,
          status: intent.status,
          metadata: {
            ...intent.metadata,
            strategy: intent.strategy,
            mode: metadata.mode
          }
        });

      if (error) {
        logger.error('Failed to persist payment intent', { error, intentId: intent.id });
        // Don't throw - continue with payment flow even if persistence fails
      } else {
        logger.info('Payment intent persisted', { intentId: intent.id });
      }
    } catch (error) {
      logger.error('Error persisting payment intent', { error, intentId: intent.id });
      // Don't throw - continue with payment flow
    }
  }

  async updateIntentStatus(providerId: string, status: 'succeeded' | 'failed' | 'canceled'): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_intents')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('provider_payment_id', providerId);

      if (error) {
        logger.error('Failed to update payment intent status', { error, providerId, status });
      } else {
        logger.info('Payment intent status updated', { providerId, status });
      }
    } catch (error) {
      logger.error('Error updating payment intent status', { error, providerId, status });
    }
  }

  async validateToken(token: string, restaurantId: string, amountCents: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('provider_payment_id', token)
        .eq('restaurant_id', restaurantId)
        .eq('status', 'succeeded')
        .is('used_at', null)
        .single();

      if (error || !data) {
        logger.warn('Payment token validation failed', { token, restaurantId, error });
        return false;
      }

      // Verify amount matches
      if (data.amount_cents !== amountCents) {
        logger.warn('Payment amount mismatch', {
          token,
          expected: amountCents,
          actual: data.amount_cents
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error validating payment token', { error, token });
      return false;
    }
  }

  async consumeToken(token: string, orderId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payment_intents')
        .update({
          used_at: new Date().toISOString(),
          used_by_order_id: orderId,
          updated_at: new Date().toISOString()
        })
        .eq('provider_payment_id', token)
        .eq('status', 'succeeded')
        .is('used_at', null)
        .select()
        .single();

      if (error || !data) {
        logger.error('Failed to consume payment token', { error, token, orderId });
        return false;
      }

      logger.info('Payment token consumed', { token, orderId });
      return true;
    } catch (error) {
      logger.error('Error consuming payment token', { error, token, orderId });
      return false;
    }
  }
}