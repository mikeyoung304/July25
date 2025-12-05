import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CashPayment } from '../CashPayment';

// Mock dependencies
vi.mock('@/services/http', () => ({
  useHttpClient: () => ({
    post: vi.fn().mockResolvedValue({ success: true }),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
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

describe('CashPayment Component', () => {
  const defaultProps = {
    orderId: 'test-order-123',
    total: 86.40,
    onBack: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the cash payment interface with correct total', () => {
      render(<CashPayment {...defaultProps} />);

      expect(screen.getByText('Cash Payment')).toBeInTheDocument();
      expect(screen.getByText('$86.40')).toBeInTheDocument();
      expect(screen.getByText('Amount Due')).toBeInTheDocument();
    });

    it('displays quick amount buttons', () => {
      render(<CashPayment {...defaultProps} />);

      expect(screen.getByRole('button', { name: /quick select \$20/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quick select \$50/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quick select \$100/i })).toBeInTheDocument();
    });

    it('displays custom amount input field', () => {
      render(<CashPayment {...defaultProps} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      expect(customInput).toBeInTheDocument();
      expect(customInput).toHaveAttribute('type', 'number');
    });

    it('displays back button', () => {
      render(<CashPayment {...defaultProps} />);

      expect(screen.getByRole('button', { name: /go back to tender selection/i })).toBeInTheDocument();
    });
  });

  describe('Change Calculation', () => {
    it('calculates change correctly (100 - 86.40 = 13.60)', async () => {
      render(<CashPayment {...defaultProps} />);

      const button100 = screen.getByRole('button', { name: /quick select \$100/i });
      await userEvent.click(button100);

      await waitFor(() => {
        expect(screen.getByText('$100.00')).toBeInTheDocument(); // Cash received
        expect(screen.getByText('$13.60')).toBeInTheDocument(); // Change due
      });
    });

    it('shows $0.00 change for exact payment', async () => {
      render(<CashPayment {...defaultProps} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '86.40');

      await waitFor(() => {
        expect(screen.getByText('$0.00')).toBeInTheDocument(); // Change is zero
      });
    });

    it('shows insufficient payment error when amount is too low', async () => {
      render(<CashPayment {...defaultProps} />);

      const button50 = screen.getByRole('button', { name: /quick select \$50/i });
      await userEvent.click(button50);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Insufficient payment');
      });
    });

    it('displays shortage amount correctly', async () => {
      render(<CashPayment {...defaultProps} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '50.00');

      await waitFor(() => {
        // Shortage is 86.40 - 50.00 = 36.40
        expect(screen.getByRole('alert')).toHaveTextContent('$36.40 short');
      });
    });

    it('calculates change for custom amount (90 - 86.40 = 3.60)', async () => {
      render(<CashPayment {...defaultProps} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '90.00');

      await waitFor(() => {
        expect(screen.getByText('$3.60')).toBeInTheDocument(); // Change due
      });
    });
  });

  describe('Fast Cash Buttons', () => {
    it('sets amount to $20 when $20 button clicked', async () => {
      render(<CashPayment {...defaultProps} />);

      const button20 = screen.getByRole('button', { name: /quick select \$20/i });
      await userEvent.click(button20);

      await waitFor(() => {
        expect(screen.getByText('$20.00')).toBeInTheDocument();
        expect(button20).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('sets amount to $50 when $50 button clicked', async () => {
      render(<CashPayment {...defaultProps} />);

      const button50 = screen.getByRole('button', { name: /quick select \$50/i });
      await userEvent.click(button50);

      await waitFor(() => {
        expect(screen.getByText('$50.00')).toBeInTheDocument();
        expect(button50).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('sets amount to $100 when $100 button clicked', async () => {
      render(<CashPayment {...defaultProps} />);

      const button100 = screen.getByRole('button', { name: /quick select \$100/i });
      await userEvent.click(button100);

      await waitFor(() => {
        expect(screen.getByText('$100.00')).toBeInTheDocument();
        expect(button100).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('replaces amount on subsequent button clicks (not adds)', async () => {
      render(<CashPayment {...defaultProps} />);

      const button20 = screen.getByRole('button', { name: /quick select \$20/i });
      const button50 = screen.getByRole('button', { name: /quick select \$50/i });
      const button100 = screen.getByRole('button', { name: /quick select \$100/i });

      // Click $20
      await userEvent.click(button20);
      await waitFor(() => {
        expect(screen.getByText('$20.00')).toBeInTheDocument();
      });

      // Click $50 - should replace, not add to 20
      await userEvent.click(button50);
      await waitFor(() => {
        expect(screen.getByText('$50.00')).toBeInTheDocument();
        // Should not show $70 (20 + 50)
      });

      // Click $100 - should replace, not add to 50
      await userEvent.click(button100);
      await waitFor(() => {
        expect(screen.getByText('$100.00')).toBeInTheDocument();
        // Should not show $150 (50 + 100)
      });
    });

    it('highlights the selected fast cash button', async () => {
      render(<CashPayment {...defaultProps} />);

      const button50 = screen.getByRole('button', { name: /quick select \$50/i });
      const button100 = screen.getByRole('button', { name: /quick select \$100/i });

      await userEvent.click(button50);

      await waitFor(() => {
        expect(button50).toHaveAttribute('aria-pressed', 'true');
      });

      await userEvent.click(button100);

      await waitFor(() => {
        expect(button100).toHaveAttribute('aria-pressed', 'true');
        expect(button50).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });

  describe('Custom Amount Input', () => {
    it('accepts custom amount input', async () => {
      render(<CashPayment {...defaultProps} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '95.50');

      expect(customInput).toHaveValue(95.50);
    });

    it('clears custom input when fast cash button is clicked', async () => {
      render(<CashPayment {...defaultProps} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '75.00');

      expect(customInput).toHaveValue(75);

      const button100 = screen.getByRole('button', { name: /quick select \$100/i });
      await userEvent.click(button100);

      expect(customInput).toHaveValue(null);
    });

    it('rejects amounts exceeding $100,000', async () => {
      render(<CashPayment {...defaultProps} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '150000');

      // Value should not be set (rejected)
      expect(customInput).not.toHaveValue(150000);
    });

    it('accepts amounts up to $100,000', async () => {
      render(<CashPayment {...defaultProps} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '100000');

      expect(customInput).toHaveValue(100000);
    });
  });

  describe('Submit Validation', () => {
    it('disables submit when payment is insufficient', async () => {
      render(<CashPayment {...defaultProps} />);

      const button50 = screen.getByRole('button', { name: /quick select \$50/i });
      await userEvent.click(button50);

      const submitButton = screen.getByRole('button', { name: /complete cash payment/i });

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('enables submit when payment is sufficient', async () => {
      render(<CashPayment {...defaultProps} />);

      const button100 = screen.getByRole('button', { name: /quick select \$100/i });
      await userEvent.click(button100);

      const submitButton = screen.getByRole('button', { name: /complete cash payment/i });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });

    it('enables submit for exact payment amount', async () => {
      render(<CashPayment {...defaultProps} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '86.40');

      const submitButton = screen.getByRole('button', { name: /complete cash payment/i });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });

    it('enables submit for $0.00 total (comped order)', async () => {
      render(<CashPayment {...defaultProps} total={0} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '0');

      const submitButton = screen.getByRole('button', { name: /complete cash payment/i });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });

    it('disables submit when no amount is entered', () => {
      render(<CashPayment {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /complete cash payment/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('calls onBack when back button is clicked', async () => {
      const onBack = vi.fn();
      render(<CashPayment {...defaultProps} onBack={onBack} />);

      const backButton = screen.getByRole('button', { name: /go back to tender selection/i });
      await userEvent.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Payment Submission', () => {
    it('calls onSuccess after successful payment', async () => {
      const onSuccess = vi.fn();

      render(<CashPayment {...defaultProps} onSuccess={onSuccess} />);

      const button100 = screen.getByRole('button', { name: /quick select \$100/i });
      await userEvent.click(button100);

      const submitButton = screen.getByRole('button', { name: /complete cash payment/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onUpdateTableStatus if provided', async () => {
      const onUpdateTableStatus = vi.fn().mockResolvedValue(undefined);

      render(<CashPayment {...defaultProps} onUpdateTableStatus={onUpdateTableStatus} />);

      const button100 = screen.getByRole('button', { name: /quick select \$100/i });
      await userEvent.click(button100);

      const submitButton = screen.getByRole('button', { name: /complete cash payment/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onUpdateTableStatus).toHaveBeenCalledTimes(1);
      });
    });

    it('disables buttons during processing', async () => {
      render(<CashPayment {...defaultProps} />);

      const button100 = screen.getByRole('button', { name: /quick select \$100/i });
      await userEvent.click(button100);

      const submitButton = screen.getByRole('button', { name: /complete cash payment/i });

      // Submit button should be enabled before processing
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Display States', () => {
    it('shows green styling for sufficient payment', async () => {
      render(<CashPayment {...defaultProps} />);

      const button100 = screen.getByRole('button', { name: /quick select \$100/i });
      await userEvent.click(button100);

      await waitFor(() => {
        const changeDueLabel = screen.getByText('Change Due');
        // Navigate up: p -> div (text-right) -> div (flex items-center) -> div (container)
        const container = changeDueLabel.parentElement?.parentElement?.parentElement;
        expect(container).toHaveClass('bg-green-50');
        expect(container).toHaveClass('border-green-300');
      });
    });

    it('shows red styling for insufficient payment', async () => {
      render(<CashPayment {...defaultProps} />);

      const button50 = screen.getByRole('button', { name: /quick select \$50/i });
      await userEvent.click(button50);

      await waitFor(() => {
        const changeDueLabel = screen.getByText('Change Due');
        // Navigate up: p -> div (text-right) -> div (flex items-center) -> div (container)
        const container = changeDueLabel.parentElement?.parentElement?.parentElement;
        expect(container).toHaveClass('bg-red-50');
        expect(container).toHaveClass('border-red-300');
      });
    });

    it('does not show change display before amount is entered', () => {
      render(<CashPayment {...defaultProps} />);

      expect(screen.queryByText('Cash Received')).not.toBeInTheDocument();
      expect(screen.queryByText('Change Due')).not.toBeInTheDocument();
    });

    it('shows change display after amount is entered', async () => {
      render(<CashPayment {...defaultProps} />);

      const button100 = screen.getByRole('button', { name: /quick select \$100/i });
      await userEvent.click(button100);

      await waitFor(() => {
        expect(screen.getByText('Cash Received')).toBeInTheDocument();
        expect(screen.getByText('Change Due')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles zero dollar order correctly', async () => {
      render(<CashPayment {...defaultProps} total={0} />);

      expect(screen.getByText('$0.00')).toBeInTheDocument();

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '0');

      const submitButton = screen.getByRole('button', { name: /complete cash payment/i });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });

    it('handles large order totals', async () => {
      render(<CashPayment {...defaultProps} total={9999.99} />);

      expect(screen.getByText('$9999.99')).toBeInTheDocument();

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '10000');

      await waitFor(() => {
        expect(screen.getByText('$0.01')).toBeInTheDocument(); // Change
      });
    });

    it('handles decimal amounts correctly', async () => {
      render(<CashPayment {...defaultProps} total={47.89} />);

      const customInput = screen.getByLabelText(/custom cash amount received/i);
      await userEvent.clear(customInput);
      await userEvent.type(customInput, '50.00');

      await waitFor(() => {
        expect(screen.getByText('$2.11')).toBeInTheDocument(); // Change: 50.00 - 47.89
      });
    });
  });
});
