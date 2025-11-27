import { EventEmitter } from '../../../services/utils/EventEmitter';
import type { HttpClient } from '@/services/http/httpClient';
import type { UnifiedCartItem } from '@/contexts/UnifiedCartContext';
import { logger } from '@/services/monitoring/logger';

// Type alias for compatibility
type KioskCartItem = UnifiedCartItem;

export type ToastType = 'success' | 'error' | 'loading';

export interface NavigateOptions {
  state?: Record<string, unknown>;
}

export interface VoiceCheckoutConfig {
  restaurantId: string;
  httpClient: HttpClient;
  onToast: (message: string, type: ToastType) => void;
  onNavigate: (path: string, options?: NavigateOptions) => void;
  debug?: boolean;
}

export interface OrderSummaryEvent {
  items: KioskCartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  timestamp: number;
}

export interface CheckoutInitiatedEvent {
  destination: '/kiosk-checkout' | '/order-confirmation';
  orderData?: any;
  timestamp: number;
}

export interface PaymentMethodSelectedEvent {
  method: 'card' | 'mobile' | 'cash' | 'terminal';
  timestamp: number;
}

export type CheckoutState =
  | 'idle'
  | 'reviewing'
  | 'confirming'
  | 'processing_payment'
  | 'complete'
  | 'error';

/**
 * Default delay for checkout navigation (ms)
 * Allows time for voice confirmation before navigating
 */
const DEFAULT_CHECKOUT_DELAY_MS = 2000;

/**
 * Default delay for summary state reset (ms)
 */
const DEFAULT_SUMMARY_RESET_DELAY_MS = 5000;

/**
 * Default delay for error state reset (ms)
 */
const DEFAULT_ERROR_RESET_DELAY_MS = 3000;

/**
 * VoiceCheckoutOrchestrator handles the checkout flow for voice orders
 * - Listens for confirmation events from WebRTCVoiceClient
 * - Provides order summaries for voice readback
 * - Manages checkout navigation and payment flows
 * - Handles different payment method selections
 *
 * Note: This service is now decoupled from React hooks.
 * Dependencies are passed as plain functions/callbacks in the constructor.
 *
 * ⚠️ **FIX (TODO-084)**: All timeouts are now tracked and cancellable to prevent:
 * - Memory leaks from uncancelled timeouts
 * - Navigation after component unmount
 * - Race conditions during checkout
 */
export class VoiceCheckoutOrchestrator extends EventEmitter {
  private config: VoiceCheckoutConfig;
  private checkoutState: CheckoutState = 'idle';
  private currentCart: KioskCartItem[] = [];
  private currentTotals = { subtotal: 0, tax: 0, total: 0 };
  private httpClient: HttpClient;
  private onToast: (message: string, type: ToastType) => void;
  private onNavigate: (path: string, options?: NavigateOptions) => void;

  // Tracked timeout IDs for cleanup (TODO-084)
  private checkoutTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private summaryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(config: VoiceCheckoutConfig) {
    super();
    this.config = config;
    this.httpClient = config.httpClient;
    this.onToast = config.onToast;
    this.onNavigate = config.onNavigate;

    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Initialized with config:', config
    }
  }

  /**
   * Update the current cart state
   */
  updateCart(items: KioskCartItem[], totals: { subtotal: number; tax: number; total: number }): void {
    this.currentCart = [...items];
    this.currentTotals = { ...totals };

    if (this.config.debug) {
      logger.info('[VoiceCheckoutOrchestrator] Cart updated', {
        itemCount: items.length,
        total: totals.total
      });
    }
  }

  /**
   * Handle order confirmation events from voice client
   */
  handleOrderConfirmation(event: { action: string; timestamp: number }): void {
    const logPrefix = '[VoiceCheckoutOrchestrator]';

    if (this.config.debug) {
      // Debug: `${logPrefix} Received confirmation event:`, event
    }

    switch (event.action) {
      case 'checkout':
        this.initiateCheckout();
        break;
      case 'review':
        this.provideOrderSummary();
        break;
      case 'cancel':
        this.cancelOrder();
        break;
      default:
        logger.warn(`${logPrefix} Unknown action: ${event.action}`);
    }
  }

  /**
   * Initiate the checkout process
   */
  private initiateCheckout(): void {
    if (this.currentCart.length === 0) {
      this.onToast('No items in cart to checkout', 'error');
      this.emit('checkout.error', { error: 'No items in cart', timestamp: Date.now() });
      return;
    }

    if (this.checkoutState !== 'idle' && this.checkoutState !== 'reviewing') {
      logger.warn('[VoiceCheckoutOrchestrator] Cannot checkout in state:', { state: this.checkoutState });
      return;
    }

    this.setCheckoutState('confirming');

    // Emit event for voice feedback
    this.emit('checkout.confirmation.requested', {
      items: this.currentCart,
      total: this.currentTotals.total,
      timestamp: Date.now()
    });

    // Auto-navigate to checkout after a brief delay for voice confirmation
    // Clear any existing timeout to prevent race conditions (TODO-084)
    this.clearCheckoutTimeout();
    this.checkoutTimeoutId = setTimeout(() => {
      this.checkoutTimeoutId = null;
      this.navigateToCheckout();
    }, DEFAULT_CHECKOUT_DELAY_MS);
  }

  /**
   * Clear checkout navigation timeout
   * @internal
   */
  private clearCheckoutTimeout(): void {
    if (this.checkoutTimeoutId !== null) {
      clearTimeout(this.checkoutTimeoutId);
      this.checkoutTimeoutId = null;
    }
  }

  /**
   * Navigate to the checkout page
   */
  private navigateToCheckout(): void {
    this.setCheckoutState('processing_payment');

    const checkoutEvent: CheckoutInitiatedEvent = {
      destination: '/kiosk-checkout',
      timestamp: Date.now()
    };

    this.emit('checkout.initiated', checkoutEvent);

    // Navigate to checkout page
    this.onNavigate('/kiosk-checkout');

    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Navigated to checkout page'
    }
  }

  /**
   * Provide order summary for voice readback
   */
  private provideOrderSummary(): void {
    if (this.currentCart.length === 0) {
      this.emit('summary.empty', { timestamp: Date.now() });
      return;
    }

    this.setCheckoutState('reviewing');

    const summaryEvent: OrderSummaryEvent = {
      items: this.currentCart,
      itemCount: this.currentCart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: this.currentTotals.subtotal,
      tax: this.currentTotals.tax,
      total: this.currentTotals.total,
      timestamp: Date.now()
    };

    this.emit('summary.provided', summaryEvent);

    // Generate summary text for voice readback
    const summaryText = this.generateSummaryText();
    this.emit('summary.text', { text: summaryText, timestamp: Date.now() });

    // Reset to idle after summary (TODO-084: cancellable timeout)
    this.clearSummaryTimeout();
    this.summaryTimeoutId = setTimeout(() => {
      this.summaryTimeoutId = null;
      this.setCheckoutState('idle');
    }, DEFAULT_SUMMARY_RESET_DELAY_MS);
  }

  /**
   * Clear summary state reset timeout
   * @internal
   */
  private clearSummaryTimeout(): void {
    if (this.summaryTimeoutId !== null) {
      clearTimeout(this.summaryTimeoutId);
      this.summaryTimeoutId = null;
    }
  }

  /**
   * Generate human-readable summary text for voice readback
   */
  private generateSummaryText(): string {
    if (this.currentCart.length === 0) {
      return "Your cart is empty. Please add some items to your order.";
    }

    const itemCount = this.currentCart.reduce((sum, item) => sum + item.quantity, 0);
    let summary = `Your order has ${itemCount} item${itemCount === 1 ? '' : 's'}. `;

    // List items
    const itemDescriptions = this.currentCart.map(item => {
      let description = `${item.quantity} ${item.menuItem.name}`;

      if (item.modifications && item.modifications.length > 0) {
        description += ` with ${item.modifications.join(', ')}`;
      }

      return description;
    });

    summary += itemDescriptions.join(', ') + '. ';
    summary += `Your total is $${this.currentTotals.total.toFixed(2)}. `;
    summary += "Say 'checkout' when you're ready to pay, or add more items to your order.";

    return summary;
  }

  /**
   * Cancel the current order
   */
  private cancelOrder(): void {
    this.setCheckoutState('idle');

    this.emit('checkout.cancelled', { timestamp: Date.now() });

    // Show confirmation
    this.onToast('Order cancelled', 'success');

    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Order cancelled'
    }
  }

  /**
   * Handle payment method selection
   */
  handlePaymentMethodSelection(method: 'card' | 'mobile' | 'cash' | 'terminal'): void {
    const event: PaymentMethodSelectedEvent = {
      method,
      timestamp: Date.now()
    };

    this.emit('payment.method.selected', event);

    // Provide voice feedback about payment method
    let feedbackText = '';
    switch (method) {
      case 'card':
        feedbackText = 'Credit or debit card selected. Please follow the on-screen instructions to complete your payment.';
        break;
      case 'terminal':
        feedbackText = 'Terminal payment selected. The payment terminal is being prepared for your transaction.';
        break;
      case 'mobile':
        feedbackText = 'Mobile payment selected. Please use your phone to complete the payment.';
        break;
      case 'cash':
        feedbackText = 'Cash payment selected. Please proceed to the counter to complete your payment.';
        break;
    }

    this.emit('payment.feedback', { text: feedbackText, timestamp: Date.now() });

    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Payment method selected:', method
    }
  }

  /**
   * Handle successful payment completion
   */
  handlePaymentSuccess(orderData: any): void {
    this.setCheckoutState('complete');

    this.emit('payment.success', {
      orderData,
      timestamp: Date.now()
    });

    // Navigate to confirmation
    this.onNavigate('/order-confirmation', {
      state: {
        ...orderData,
        isVoiceOrder: true,
        timestamp: Date.now()
      }
    });

    // Provide success feedback
    const feedbackText = `Thank you! Your order has been placed. Your order number is ${orderData.order_number || 'pending'}. Please wait for further instructions.`;
    this.emit('payment.success.feedback', { text: feedbackText, timestamp: Date.now() });
  }

  /**
   * Handle payment failure
   */
  handlePaymentError(error: string): void {
    this.setCheckoutState('error');

    this.emit('payment.error', { error, timestamp: Date.now() });

    // Show error message
    this.onToast(`Payment failed: ${error}`, 'error');

    // Provide voice feedback
    const feedbackText = 'There was an issue processing your payment. Please try again or select a different payment method.';
    this.emit('payment.error.feedback', { text: feedbackText, timestamp: Date.now() });

    // Reset to idle after error (TODO-084: cancellable timeout)
    this.clearErrorTimeout();
    this.errorTimeoutId = setTimeout(() => {
      this.errorTimeoutId = null;
      this.setCheckoutState('idle');
    }, DEFAULT_ERROR_RESET_DELAY_MS);
  }

  /**
   * Clear error state reset timeout
   * @internal
   */
  private clearErrorTimeout(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }

  /**
   * Clear all pending timeouts
   * Call this before component unmount to prevent memory leaks
   * @internal
   */
  private clearAllTimeouts(): void {
    this.clearCheckoutTimeout();
    this.clearSummaryTimeout();
    this.clearErrorTimeout();
  }

  /**
   * Set checkout state and emit event
   */
  private setCheckoutState(state: CheckoutState): void {
    if (this.checkoutState !== state) {
      const previousState = this.checkoutState;
      this.checkoutState = state;

      this.emit('state.changed', {
        from: previousState,
        to: state,
        timestamp: Date.now()
      });

      if (this.config.debug) {
        // Debug: `[VoiceCheckoutOrchestrator] State: ${previousState} → ${state}`
      }
    }
  }

  /**
   * Get current checkout state
   */
  getCheckoutState(): CheckoutState {
    return this.checkoutState;
  }

  /**
   * Reset orchestrator to idle state
   */
  reset(): void {
    // Clear all pending timeouts to prevent state changes after reset (TODO-084)
    this.clearAllTimeouts();
    this.setCheckoutState('idle');
    this.currentCart = [];
    this.currentTotals = { subtotal: 0, tax: 0, total: 0 };

    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Reset to idle state'
    }
  }

  /**
   * Clean up resources
   * IMPORTANT: Call this in useEffect cleanup to prevent memory leaks
   */
  destroy(): void {
    // Clear all timeouts first to prevent any callbacks from firing (TODO-084)
    this.clearAllTimeouts();
    this.removeAllListeners();
    this.reset();

    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Destroyed'
    }
  }
}
