/**
 * Stripe Mock Utilities
 *
 * Centralized mocks for @stripe/react-stripe-js and @stripe/stripe-js.
 * Import this file in tests that need to mock Stripe behavior.
 *
 * Usage:
 * ```typescript
 * import { mockStripe, mockElements, setupStripeMocks } from '@/test/mocks/stripe';
 *
 * beforeEach(() => {
 *   setupStripeMocks();
 * });
 *
 * // Assert payment confirmation
 * expect(mockStripe.confirmPayment).toHaveBeenCalled();
 * ```
 */

import { vi } from 'vitest';
import * as React from 'react';

// Exported mock functions for assertions
export const mockStripe = {
  confirmPayment: vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_test', status: 'succeeded' } }),
  confirmCardPayment: vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_test', status: 'succeeded' } }),
  createPaymentMethod: vi.fn().mockResolvedValue({ paymentMethod: { id: 'pm_test' } }),
  elements: vi.fn(),
};

export const mockElements = {
  submit: vi.fn().mockResolvedValue({ error: undefined }),
  getElement: vi.fn().mockReturnValue({}),
};

export const mockCardElement = {
  mount: vi.fn(),
  unmount: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  update: vi.fn(),
  clear: vi.fn(),
  blur: vi.fn(),
  focus: vi.fn(),
};

/**
 * Configure Stripe mocks with specific behaviors
 */
export function setupStripeMocks(options: {
  confirmPaymentResult?: { paymentIntent?: { id: string; status: string }; error?: { message: string } };
  submitResult?: { error?: { message: string } };
} = {}) {
  const { confirmPaymentResult, submitResult } = options;

  if (confirmPaymentResult) {
    mockStripe.confirmPayment.mockResolvedValue(confirmPaymentResult);
    mockStripe.confirmCardPayment.mockResolvedValue(confirmPaymentResult);
  }

  if (submitResult) {
    mockElements.submit.mockResolvedValue(submitResult);
  }

  return {
    stripe: mockStripe,
    elements: mockElements,
    cardElement: mockCardElement,
  };
}

/**
 * Configure Stripe mock to simulate payment failure
 */
export function setupStripePaymentFailure(errorMessage = 'Payment failed') {
  mockStripe.confirmPayment.mockResolvedValue({
    error: { message: errorMessage, type: 'card_error' },
  });
  mockStripe.confirmCardPayment.mockResolvedValue({
    error: { message: errorMessage, type: 'card_error' },
  });
}

/**
 * Reset all Stripe mocks to defaults
 */
export function resetStripeMocks() {
  mockStripe.confirmPayment.mockReset().mockResolvedValue({ paymentIntent: { id: 'pi_test', status: 'succeeded' } });
  mockStripe.confirmCardPayment.mockReset().mockResolvedValue({ paymentIntent: { id: 'pi_test', status: 'succeeded' } });
  mockStripe.createPaymentMethod.mockReset().mockResolvedValue({ paymentMethod: { id: 'pm_test' } });
  mockElements.submit.mockReset().mockResolvedValue({ error: undefined });
  mockElements.getElement.mockReset().mockReturnValue({});
}

// Mock Elements wrapper component
const MockElements = ({ children }: { children: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'stripe-elements' }, children);

// Mock PaymentElement component
const MockPaymentElement = () =>
  React.createElement('div', { 'data-testid': 'payment-element' }, 'Payment Element');

// Mock CardElement component
const MockCardElement = () =>
  React.createElement('div', { 'data-testid': 'card-element' }, 'Card Element');

/**
 * The actual vi.mock calls - import this file to apply the mocks
 */
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: MockElements,
  PaymentElement: MockPaymentElement,
  CardElement: MockCardElement,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(mockStripe),
}));
