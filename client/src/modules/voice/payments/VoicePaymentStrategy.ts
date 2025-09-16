import { logger } from '@/utils/logger';

interface PaymentStrategyOptions {
  total: number;
  restaurantId: string;
  deviceKind: 'kiosk' | 'serverStation' | 'remote';
  prefersLink?: boolean;
  orderDraftId?: string;
}

interface PaymentIntent {
  strategy: 'link' | 'web';
  paymentId: string;
  paymentLinkUrl?: string;
  checkoutId?: string;
  clientToken?: string;
}

interface PaymentStatus {
  status: 'pending' | 'succeeded' | 'failed';
  providerId: string;
  orderDraftId?: string;
}

export class VoicePaymentStrategy {
  private static readonly API_BASE = '/api/v1';
  private static readonly POLL_INTERVAL = 2000; // 2 seconds
  private static readonly MAX_POLL_ATTEMPTS = 60; // 2 minutes total

  /**
   * Acquire a payment token for a voice order
   */
  static async acquireToken(options: PaymentStrategyOptions): Promise<string> {
    const { total, restaurantId, deviceKind, prefersLink, orderDraftId } = options;

    logger.info('Acquiring payment token', {
      total,
      restaurantId,
      deviceKind,
      prefersLink,
      orderDraftId
    });

    try {
      // Create payment intent
      const intent = await this.createIntent({
        amount: Math.round(total * 100), // Convert to cents
        orderDraftId,
        mode: 'voice_customer'
      });

      // Handle based on strategy
      if (intent.strategy === 'link') {
        return await this.handlePaymentLink(intent);
      } else if (intent.strategy === 'web') {
        return await this.handleWebPayment(intent);
      }

      throw new Error(`Unsupported payment strategy: ${intent.strategy}`);
    } catch (error) {
      logger.error('Failed to acquire payment token', { error });
      throw error;
    }
  }

  /**
   * Create a payment intent with the server
   */
  private static async createIntent(params: {
    amount: number;
    orderDraftId?: string;
    mode: string;
  }): Promise<PaymentIntent> {
    const response = await fetch(`${this.API_BASE}/payments/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'X-Restaurant-ID': localStorage.getItem('restaurantId') || ''
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create payment intent');
    }

    return response.json();
  }

  /**
   * Handle payment link strategy (QR code / remote payment)
   */
  private static async handlePaymentLink(intent: PaymentIntent): Promise<string> {
    if (!intent.paymentLinkUrl) {
      throw new Error('Payment link URL not provided');
    }

    // Display QR code modal
    await this.displayPaymentQR(intent.paymentLinkUrl, intent.paymentId);

    // Poll for payment completion
    const result = await this.pollPaymentStatus(intent.paymentId);

    if (result.status === 'succeeded') {
      logger.info('Payment link completed successfully', {
        paymentId: intent.paymentId,
        providerId: result.providerId
      });
      return result.providerId; // Return the payment ID as token
    }

    throw new Error('Payment link payment failed or timed out');
  }

  /**
   * Handle web payment strategy (in-browser card form)
   */
  private static async handleWebPayment(intent: PaymentIntent): Promise<string> {
    // For Square Web Payments SDK
    if (intent.clientToken) {
      return await this.processSquareWebPayment(intent.clientToken);
    }

    throw new Error('Web payment configuration missing');
  }

  /**
   * Process Square Web Payments SDK payment
   */
  private static async processSquareWebPayment(clientToken: string): Promise<string> {
    // Load Square Web Payments SDK if not already loaded
    if (!window.Square) {
      await this.loadSquareSDK();
    }

    const payments = window.Square.payments(
      import.meta.env.VITE_SQUARE_APP_ID,
      import.meta.env.VITE_SQUARE_LOCATION_ID
    );

    // Initialize card payment
    const card = await payments.card();
    await card.attach('#card-container');

    // Show payment form modal
    await this.displayCardForm();

    return new Promise((resolve, reject) => {
      // Add submit handler
      const form = document.getElementById('payment-form');
      if (!form) {
        reject(new Error('Payment form not found'));
        return;
      }

      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
          const result = await card.tokenize();
          if (result.status === 'OK' && result.token) {
            logger.info('Card tokenized successfully');
            this.hidePaymentModal();
            resolve(result.token);
          } else {
            reject(new Error('Card tokenization failed'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Load Square Web Payments SDK
   */
  private static async loadSquareSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(script);
    });
  }

  /**
   * Poll payment status until completed or timeout
   */
  private static async pollPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    let attempts = 0;

    while (attempts < this.MAX_POLL_ATTEMPTS) {
      const response = await fetch(`${this.API_BASE}/payments/status/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'X-Restaurant-ID': localStorage.getItem('restaurantId') || ''
        }
      });

      if (response.ok) {
        const status: PaymentStatus = await response.json();

        if (status.status === 'succeeded' || status.status === 'failed') {
          return status;
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));
      attempts++;
    }

    throw new Error('Payment status check timed out');
  }

  /**
   * Display payment QR code modal
   */
  private static async displayPaymentQR(url: string, paymentId: string): Promise<void> {
    const modal = document.createElement('div');
    modal.id = 'payment-qr-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-md">
        <h2 class="text-2xl font-bold mb-4">Complete Payment</h2>
        <div class="mb-4">
          <p class="mb-2">Scan QR code or visit:</p>
          <a href="${url}" target="_blank" class="text-blue-600 underline text-sm break-all">${url}</a>
        </div>
        <div id="qr-code" class="flex justify-center mb-4">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" alt="Payment QR Code" />
        </div>
        <p class="text-gray-600 text-center">Waiting for payment...</p>
        <div class="mt-4 text-center">
          <button onclick="document.getElementById('payment-qr-modal').remove()" class="text-gray-500 underline">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * Display card payment form modal
   */
  private static async displayCardForm(): Promise<void> {
    const modal = document.createElement('div');
    modal.id = 'payment-card-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">Payment Details</h2>
        <form id="payment-form">
          <div id="card-container" class="mb-4"></div>
          <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
            Pay Now
          </button>
        </form>
        <button onclick="document.getElementById('payment-card-modal').remove()" class="mt-4 text-gray-500 underline w-full text-center">
          Cancel
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * Hide payment modal
   */
  private static hidePaymentModal(): void {
    document.getElementById('payment-qr-modal')?.remove();
    document.getElementById('payment-card-modal')?.remove();
  }
}

// Extend window interface for Square SDK
declare global {
  interface Window {
    Square: any;
  }
}