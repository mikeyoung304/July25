import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceCheckoutOrchestrator } from '../VoiceCheckoutOrchestrator';
import type { KioskCartItem } from '@/components/kiosk/KioskCartProvider';
import type { HttpClient } from '@/services/http/httpClient';

// Mock dependencies
const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  execute: vi.fn(),
  data: undefined,
  loading: false,
  error: null,
  reset: vi.fn(),
} as unknown as HttpClient;

const mockOnToast = vi.fn();
const mockOnNavigate = vi.fn();

// Mock cart items
const mockCartItems: KioskCartItem[] = [
  {
    id: '1',
    menuItem: {
      id: 'item-1',
      name: 'Soul Bowl',
      description: 'Southern comfort food bowl',
      price: 14.99,
      category: 'bowls',
      restaurant_id: 'test-restaurant',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    quantity: 1,
    modifications: ['extra sauce'],
  },
  {
    id: '2',
    menuItem: {
      id: 'item-2',
      name: 'Greek Salad',
      description: 'Fresh Mediterranean salad',
      price: 12.99,
      category: 'salads',
      restaurant_id: 'test-restaurant',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    quantity: 2,
    modifications: ['no olives'],
  },
];

describe('VoiceCheckoutOrchestrator', () => {
  let orchestrator: VoiceCheckoutOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new VoiceCheckoutOrchestrator({
      restaurantId: 'test-restaurant',
      httpClient: mockHttpClient,
      onToast: mockOnToast,
      onNavigate: mockOnNavigate,
      debug: false,
    });
    orchestrator.updateCart(mockCartItems, {
      subtotal: 42.97,
      tax: 3.44,
      total: 46.41,
    });
  });

  describe('handleOrderConfirmation', () => {
    it('should initiate checkout when action is checkout', async () => {
      const eventHandler = vi.fn();
      orchestrator.on('checkout.confirmation.requested', eventHandler);
      orchestrator.on('checkout.initiated', eventHandler);

      orchestrator.handleOrderConfirmation({
        action: 'checkout',
        timestamp: Date.now(),
      });

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          items: mockCartItems,
          total: 46.41,
        })
      );

      // Wait for navigation timeout
      await new Promise(resolve => setTimeout(resolve, 2100));

      expect(mockOnNavigate).toHaveBeenCalledWith('/kiosk-checkout');
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: '/kiosk-checkout',
        })
      );
    });

    it('should provide order summary when action is review', () => {
      const eventHandler = vi.fn();
      orchestrator.on('summary.provided', eventHandler);
      orchestrator.on('summary.text', eventHandler);

      orchestrator.handleOrderConfirmation({
        action: 'review',
        timestamp: Date.now(),
      });

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          items: mockCartItems,
          itemCount: 3, // 1 + 2
          total: 46.41,
        })
      );

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Your order has 3 items'),
        })
      );
    });

    it('should cancel order when action is cancel', () => {
      const eventHandler = vi.fn();
      orchestrator.on('checkout.cancelled', eventHandler);

      orchestrator.handleOrderConfirmation({
        action: 'cancel',
        timestamp: Date.now(),
      });

      expect(eventHandler).toHaveBeenCalled();
      expect(mockOnToast).toHaveBeenCalledWith('Order cancelled', 'success');
    });

    it('should handle empty cart for checkout', () => {
      orchestrator.updateCart([], { subtotal: 0, tax: 0, total: 0 });
      const eventHandler = vi.fn();
      orchestrator.on('checkout.error', eventHandler);

      orchestrator.handleOrderConfirmation({
        action: 'checkout',
        timestamp: Date.now(),
      });

      expect(mockOnToast).toHaveBeenCalledWith('No items in cart to checkout', 'error');
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'No items in cart',
        })
      );
    });
  });

  describe('handlePaymentMethodSelection', () => {
    it('should emit payment method selected event', () => {
      const eventHandler = vi.fn();
      orchestrator.on('payment.method.selected', eventHandler);
      orchestrator.on('payment.feedback', eventHandler);

      orchestrator.handlePaymentMethodSelection('card');

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'card',
        })
      );

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Credit or debit card selected'),
        })
      );
    });

    it('should provide appropriate feedback for different payment methods', () => {
      const eventHandler = vi.fn();
      orchestrator.on('payment.feedback', eventHandler);

      orchestrator.handlePaymentMethodSelection('mobile');
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Mobile payment selected'),
        })
      );

      orchestrator.handlePaymentMethodSelection('cash');
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Cash payment selected'),
        })
      );
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should navigate to confirmation and provide feedback', () => {
      const orderData = { order_number: 'ORDER-123', id: 'order-id-123' };
      const eventHandler = vi.fn();
      orchestrator.on('payment.success', eventHandler);
      orchestrator.on('payment.success.feedback', eventHandler);

      orchestrator.handlePaymentSuccess(orderData);

      expect(mockOnNavigate).toHaveBeenCalledWith('/order-confirmation', {
        state: expect.objectContaining({
          ...orderData,
          isVoiceOrder: true,
        }),
      });

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          orderData,
        })
      );

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Your order number is ORDER-123'),
        })
      );
    });
  });

  describe('handlePaymentError', () => {
    it('should show error message and provide feedback', () => {
      const eventHandler = vi.fn();
      orchestrator.on('payment.error', eventHandler);
      orchestrator.on('payment.error.feedback', eventHandler);

      orchestrator.handlePaymentError('Payment declined');

      expect(mockOnToast).toHaveBeenCalledWith('Payment failed: Payment declined', 'error');
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Payment declined',
        })
      );

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('There was an issue processing your payment'),
        })
      );
    });
  });

  describe('state management', () => {
    it('should track checkout state correctly', () => {
      const eventHandler = vi.fn();
      orchestrator.on('state.changed', eventHandler);

      expect(orchestrator.getCheckoutState()).toBe('idle');

      orchestrator.handleOrderConfirmation({
        action: 'review',
        timestamp: Date.now(),
      });

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'idle',
          to: 'reviewing',
        })
      );
    });

    it('should reset to idle state', () => {
      orchestrator.handleOrderConfirmation({
        action: 'review',
        timestamp: Date.now(),
      });

      orchestrator.reset();

      expect(orchestrator.getCheckoutState()).toBe('idle');
    });
  });

  describe('summary text generation', () => {
    it('should generate appropriate summary for empty cart', () => {
      orchestrator.updateCart([], { subtotal: 0, tax: 0, total: 0 });
      const eventHandler = vi.fn();
      orchestrator.on('summary.empty', eventHandler);

      orchestrator.handleOrderConfirmation({
        action: 'review',
        timestamp: Date.now(),
      });

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should generate detailed summary with items and modifications', () => {
      const eventHandler = vi.fn();
      orchestrator.on('summary.text', eventHandler);

      orchestrator.handleOrderConfirmation({
        action: 'review',
        timestamp: Date.now(),
      });

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/Your order has 3 items.*Soul Bowl with extra sauce.*Greek Salad with no olives.*\$46\.41/s),
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should clean up resources when destroyed', () => {
      orchestrator.destroy();

      expect(orchestrator.getCheckoutState()).toBe('idle');
      expect(orchestrator.listenerCount()).toBe(0);
    });
  });
});
