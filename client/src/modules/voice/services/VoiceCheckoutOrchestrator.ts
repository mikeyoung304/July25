import { EventEmitter } from '../../../services/utils/EventEmitter';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import type { UnifiedCartItem } from '@/contexts/UnifiedCartContext';

// Type alias for compatibility
type KioskCartItem = UnifiedCartItem;

export interface VoiceCheckoutConfig {
  restaurantId: string;
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
 * VoiceCheckoutOrchestrator handles the checkout flow for voice orders
 * - Listens for confirmation events from WebRTCVoiceClient
 * - Provides order summaries for voice readback
 * - Manages checkout navigation and payment flows
 * - Handles different payment method selections
 */
export class VoiceCheckoutOrchestrator extends EventEmitter {
  private config: VoiceCheckoutConfig;
  private checkoutState: CheckoutState = 'idle';
  private currentCart: KioskCartItem[] = [];
  private currentTotals = { subtotal: 0, tax: 0, total: 0 };
  
  // Dependencies - these will be injected at runtime
  private apiClient: ReturnType<typeof useApiRequest> | null = null;
  private toast: ReturnType<typeof useToast> | null = null;
  private navigate: ReturnType<typeof useNavigate> | null = null;

  constructor(config: VoiceCheckoutConfig) {
    super();
    this.config = config;
    
    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Initialized with config:', config
    }
  }

  /**
   * Initialize the orchestrator with React hooks
   * Called from the React component that uses this service
   */
  initialize(
    apiClient: ReturnType<typeof useApiRequest>,
    toast: ReturnType<typeof useToast>,
    navigate: ReturnType<typeof useNavigate>
  ): void {
    this.apiClient = apiClient;
    this.toast = toast;
    this.navigate = navigate;
    
    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Initialized with React dependencies'
    }
  }

  /**
   * Update the current cart state
   */
  updateCart(items: KioskCartItem[], totals: { subtotal: number; tax: number; total: number }): void {
    this.currentCart = [...items];
    this.currentTotals = { ...totals };
    
    if (this.config.debug) {
      console.log('[VoiceCheckoutOrchestrator] Cart updated:', {
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
        console.warn(`${logPrefix} Unknown action: ${event.action}`);
    }
  }

  /**
   * Initiate the checkout process
   */
  private initiateCheckout(): void {
    if (this.currentCart.length === 0) {
      this.toast?.toast.error('No items in cart to checkout');
      this.emit('checkout.error', { error: 'No items in cart', timestamp: Date.now() });
      return;
    }

    if (this.checkoutState !== 'idle' && this.checkoutState !== 'reviewing') {
      console.warn('[VoiceCheckoutOrchestrator] Cannot checkout in state:', this.checkoutState);
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
    setTimeout(() => {
      this.navigateToCheckout();
    }, 2000);
  }

  /**
   * Navigate to the checkout page
   */
  private navigateToCheckout(): void {
    if (!this.navigate) {
      console.error('[VoiceCheckoutOrchestrator] Navigate function not available');
      return;
    }

    this.setCheckoutState('processing_payment');

    const checkoutEvent: CheckoutInitiatedEvent = {
      destination: '/kiosk-checkout',
      timestamp: Date.now()
    };

    this.emit('checkout.initiated', checkoutEvent);

    // Navigate to checkout page
    this.navigate('/kiosk-checkout');

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

    // Reset to idle after summary
    setTimeout(() => {
      this.setCheckoutState('idle');
    }, 5000);
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
    this.toast?.toast.success('Order cancelled');

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

    // Navigate to confirmation if we have navigation
    if (this.navigate) {
      this.navigate('/order-confirmation', {
        state: {
          ...orderData,
          isVoiceOrder: true,
          timestamp: Date.now()
        }
      });
    }

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
    this.toast?.toast.error(`Payment failed: ${error}`);

    // Provide voice feedback
    const feedbackText = 'There was an issue processing your payment. Please try again or select a different payment method.';
    this.emit('payment.error.feedback', { text: feedbackText, timestamp: Date.now() });

    // Reset to idle after error
    setTimeout(() => {
      this.setCheckoutState('idle');
    }, 3000);
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
    this.setCheckoutState('idle');
    this.currentCart = [];
    this.currentTotals = { subtotal: 0, tax: 0, total: 0 };

    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Reset to idle state'
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.reset();
    this.apiClient = null;
    this.toast = null;
    this.navigate = null;

    if (this.config.debug) {
      // Debug: '[VoiceCheckoutOrchestrator] Destroyed'
    }
  }
}