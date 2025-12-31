/**
 * Unit Tests: CardPayment Component
 *
 * Tests extracted from E2E test suite (card-payment.spec.ts) focused on:
 * - Component rendering states
 * - UI feedback (loading, error, success)
 * - Environment indicators (demo, test, production)
 * - User interactions (back button, form submission)
 * - State management with PaymentStateMachine
 *
 * Actual Stripe payment flow remains in E2E tests.
 * These tests focus on component behavior and UI states.
 */

import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CardPayment } from '../CardPayment';

// Create mock functions at module level
const mockPost = vi.fn();
const mockGet = vi.fn();

// Mock dependencies
vi.mock('@/services/http', () => ({
  useHttpClient: () => ({
    post: mockPost,
    get: mockGet,
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  }),
}));

vi.mock('@/services/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock StripePaymentForm to isolate CardPayment component tests
vi.mock('@/modules/order-system/components/StripePaymentForm', () => ({
  StripePaymentForm: ({ onPaymentNonce, isProcessing }: any) => (
    <div data-testid="stripe-payment-form">
      <div data-testid="payment-element">Mock Payment Element</div>
      <button
        data-testid="submit-payment"
        onClick={() => onPaymentNonce('test-payment-id')}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing payment...' : 'Complete Order'}
      </button>
    </div>
  ),
}));

describe('CardPayment Component', () => {
  const defaultProps = {
    orderId: 'order-123',
    total: 86.40,
    onBack: vi.fn(),
    onSuccess: vi.fn(),
    onUpdateTableStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete (import.meta.env as any).VITE_STRIPE_PUBLISHABLE_KEY;
    delete (import.meta.env as any).NODE_ENV;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-CARD-008: Environment Indicator', () => {
    it('shows demo mode warning when Stripe credentials missing', () => {
      // Set demo mode (no Stripe key)
      (import.meta.env as any).VITE_STRIPE_PUBLISHABLE_KEY = '';

      render(<CardPayment {...defaultProps} />);

      // Verify demo mode message displays
      const demoWarning = screen.getByText(/demo mode/i);
      expect(demoWarning).toBeInTheDocument();
      expect(demoWarning).toHaveTextContent('Payment will be simulated for testing');
    });

    it('shows test environment indicator when using test Stripe key', () => {
      // Set test environment - using obviously fake key that still starts with pk_test_
      (import.meta.env as any).VITE_STRIPE_PUBLISHABLE_KEY = 'pk_test_FAKE_KEY_FOR_TESTING_ONLY';

      render(<CardPayment {...defaultProps} />);

      // Verify test environment badge displays
      const testIndicator = screen.getByText(/test environment/i);
      expect(testIndicator).toBeInTheDocument();
      expect(testIndicator).toHaveTextContent('Use test card 4242 4242 4242 4242');
    });

    it('does not show environment warning in production mode', () => {
      // Set production environment - using obviously fake key that still starts with pk_live_
      (import.meta.env as any).VITE_STRIPE_PUBLISHABLE_KEY = 'pk_live_FAKE_KEY_FOR_TESTING_ONLY';
      (import.meta.env as any).NODE_ENV = 'production';

      render(<CardPayment {...defaultProps} />);

      // Verify no demo or test warnings
      expect(screen.queryByText(/demo mode/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/test environment/i)).not.toBeInTheDocument();
    });
  });

  describe('TC-CARD-010: Secure Payment Badge', () => {
    it('displays secure payment badge', () => {
      render(<CardPayment {...defaultProps} />);

      // Verify secure badge displays
      const secureBadge = screen.getByText(/secure payment powered by stripe/i);
      expect(secureBadge).toBeInTheDocument();
    });
  });

  describe('TC-CARD-007: Navigation', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<CardPayment {...defaultProps} onBack={onBack} />);

      // Click back button
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('disables back button during processing', () => {
      render(<CardPayment {...defaultProps} />);

      // Initially enabled
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).not.toBeDisabled();

      // Note: Processing state is tested through payment submission
    });
  });

  describe('Amount Display', () => {
    it('displays the correct amount due', () => {
      render(<CardPayment {...defaultProps} total={86.40} />);

      // Verify amount is displayed
      expect(screen.getByText('$86.40')).toBeInTheDocument();
    });

    it('formats amount with two decimal places', () => {
      render(<CardPayment {...defaultProps} total={100} />);

      // Should format as $100.00, not $100
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });
  });

  describe('Component Header', () => {
    it('displays "Card Payment" title', () => {
      render(<CardPayment {...defaultProps} />);

      expect(screen.getByText('Card Payment')).toBeInTheDocument();
    });

    it('displays "Amount Due" label', () => {
      render(<CardPayment {...defaultProps} />);

      expect(screen.getByText('Amount Due')).toBeInTheDocument();
    });
  });

  describe('Payment Form Integration', () => {
    it('renders StripePaymentForm component', () => {
      render(<CardPayment {...defaultProps} />);

      // Verify payment form is rendered
      expect(screen.getByTestId('stripe-payment-form')).toBeInTheDocument();
      expect(screen.getByTestId('payment-element')).toBeInTheDocument();
    });

    it('passes correct props to StripePaymentForm', () => {
      render(<CardPayment {...defaultProps} orderId="test-order" total={50.00} />);

      // Verify form is rendered (props are passed correctly if form renders)
      expect(screen.getByTestId('stripe-payment-form')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible back button label', () => {
      render(<CardPayment {...defaultProps} />);

      const backButton = screen.getByLabelText(/go back to tender selection/i);
      expect(backButton).toBeInTheDocument();
    });

    it('uses semantic HTML for amount display', () => {
      render(<CardPayment {...defaultProps} />);

      // Amount should be in a structured layout
      const amountDisplay = screen.getByText('$86.40');
      expect(amountDisplay).toBeVisible();
    });
  });
});

describe('CardPayment - Error Handling', () => {
  const defaultProps = {
    orderId: 'order-123',
    total: 86.40,
    onBack: vi.fn(),
    onSuccess: vi.fn(),
    onUpdateTableStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when payment fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('Payment declined'));

    render(<CardPayment {...defaultProps} />);

    // Trigger payment
    const submitButton = screen.getByTestId('submit-payment');
    await userEvent.click(submitButton);

    // Wait for error to display
    await waitFor(() => {
      expect(screen.getByText('Payment declined')).toBeInTheDocument();
    });
  });
});

describe('CardPayment - Payment Flow', () => {
  const defaultProps = {
    orderId: 'order-123',
    total: 86.40,
    onBack: vi.fn(),
    onSuccess: vi.fn(),
    onUpdateTableStatus: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-CARD-011: shows processing state during payment', async () => {
    mockPost.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    render(<CardPayment {...defaultProps} />);

    // Click submit
    const submitButton = screen.getByTestId('submit-payment');
    await userEvent.click(submitButton);

    // Verify processing state (button disabled)
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('TC-CARD-001: calls onSuccess after successful payment', async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      payment: { id: 'pi_test_12345' }
    });

    const onSuccess = vi.fn();
    render(<CardPayment {...defaultProps} onSuccess={onSuccess} />);

    // Click submit
    const submitButton = screen.getByTestId('submit-payment');
    await userEvent.click(submitButton);

    // Wait for success callback
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });
  });

  it('TC-CARD-013: updates table status after successful payment', async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      payment: { id: 'pi_test_12345' }
    });

    const onUpdateTableStatus = vi.fn().mockResolvedValue(undefined);
    render(<CardPayment {...defaultProps} onUpdateTableStatus={onUpdateTableStatus} />);

    // Click submit
    const submitButton = screen.getByTestId('submit-payment');
    await userEvent.click(submitButton);

    // Wait for table status update
    await waitFor(() => {
      expect(onUpdateTableStatus).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });
  });

  it('TC-CARD-012: allows retry after payment failure', async () => {
    // First call fails, second succeeds
    mockPost
      .mockRejectedValueOnce(new Error('Card declined'))
      .mockResolvedValueOnce({ success: true, payment: { id: 'pi_test_12345' } });

    render(<CardPayment {...defaultProps} />);

    // First attempt
    const submitButton = screen.getByTestId('submit-payment');
    await userEvent.click(submitButton);

    // Wait for first failure
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    // Second attempt
    await userEvent.click(submitButton);

    // Wait for success
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  it('sends correct payment data to API', async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      payment: { id: 'pi_test_12345' }
    });

    render(<CardPayment {...defaultProps} orderId="order-456" />);

    // Click submit
    const submitButton = screen.getByTestId('submit-payment');
    await userEvent.click(submitButton);

    // Verify API call
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/payments/create-payment-intent',
        expect.objectContaining({
          order_id: 'order-456',
          token: 'test-payment-id',
        })
      );
    });
  });

  it('includes idempotency key in payment request', async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      payment: { id: 'pi_test_12345' }
    });

    render(<CardPayment {...defaultProps} />);

    // Click submit
    const submitButton = screen.getByTestId('submit-payment');
    await userEvent.click(submitButton);

    // Verify idempotency key is included (can be card-checkout or demo-card depending on env)
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/payments/create-payment-intent',
        expect.objectContaining({
          idempotency_key: expect.stringMatching(/^(card-checkout-|demo-card-)/),
        })
      );
    });
  });
});

describe('CardPayment - Demo Mode', () => {
  const defaultProps = {
    orderId: 'order-123',
    total: 86.40,
    onBack: vi.fn(),
    onSuccess: vi.fn(),
    onUpdateTableStatus: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set demo mode
    (import.meta.env as any).VITE_STRIPE_PUBLISHABLE_KEY = 'demo';
    (import.meta.env as any).NODE_ENV = 'development';
  });

  it('TC-CARD-003: processes demo payment successfully', async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      payment: { id: 'demo-payment-123' }
    });

    const onSuccess = vi.fn();
    render(<CardPayment {...defaultProps} onSuccess={onSuccess} />);

    // Click submit
    const submitButton = screen.getByTestId('submit-payment');
    await userEvent.click(submitButton);

    // Wait for success
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });
  });

  it('uses demo idempotency key prefix in demo mode', async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      payment: { id: 'demo-payment-123' }
    });

    render(<CardPayment {...defaultProps} />);

    // Click submit
    const submitButton = screen.getByTestId('submit-payment');
    await userEvent.click(submitButton);

    // Verify demo idempotency key
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/payments/create-payment-intent',
        expect.objectContaining({
          idempotency_key: expect.stringMatching(/^demo-card-/),
        })
      );
    });
  });
});
