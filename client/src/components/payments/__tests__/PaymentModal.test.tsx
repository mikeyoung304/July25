import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PaymentModal } from '../PaymentModal';

// Mock the child components to test PaymentModal orchestration
vi.mock('../TipSelector', () => ({
  TipSelector: ({ onTipChange }: { onTipChange: (tip: number) => void }) => (
    <div data-testid="tip-selector">
      <button onClick={() => onTipChange(20)} data-testid="mock-tip-button">
        Set 20% Tip
      </button>
    </div>
  ),
}));

vi.mock('../TenderSelection', () => ({
  TenderSelection: ({
    onSelectCard,
    onSelectCash,
    onBack,
    total,
  }: {
    onSelectCard: () => void;
    onSelectCash: () => void;
    onBack: () => void;
    total: number;
  }) => (
    <div data-testid="tender-selection">
      <span>Total: ${total.toFixed(2)}</span>
      <button onClick={onSelectCard} data-testid="card-button">
        Card
      </button>
      <button onClick={onSelectCash} data-testid="cash-button">
        Cash
      </button>
      <button onClick={onBack} data-testid="back-to-tip">
        Back
      </button>
    </div>
  ),
}));

vi.mock('../CashPayment', () => ({
  CashPayment: ({
    onBack,
    onSuccess,
  }: {
    orderId: string;
    total: number;
    onBack: () => void;
    onSuccess: () => void;
  }) => (
    <div data-testid="cash-payment">
      <button onClick={onBack} data-testid="back-to-tender">
        Back
      </button>
      <button onClick={onSuccess} data-testid="complete-cash-payment">
        Complete Cash Payment
      </button>
    </div>
  ),
}));

vi.mock('../CardPayment', () => ({
  CardPayment: ({
    onBack,
    onSuccess,
  }: {
    orderId: string;
    total: number;
    onBack: () => void;
    onSuccess: () => void;
  }) => (
    <div data-testid="card-payment">
      <button onClick={onBack} data-testid="back-to-tender-from-card">
        Back
      </button>
      <button onClick={onSuccess} data-testid="complete-card-payment">
        Complete Card Payment
      </button>
    </div>
  ),
}));

describe('PaymentModal', () => {
  const defaultProps = {
    show: true,
    order_id: 'test-order-123',
    subtotal: 100,
    tax: 8.25,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when show is false', () => {
    render(<PaymentModal {...defaultProps} show={false} />);

    expect(screen.queryByTestId('tip-selector')).not.toBeInTheDocument();
  });

  it('renders TipSelector as the first step', () => {
    render(<PaymentModal {...defaultProps} />);

    expect(screen.getByTestId('tip-selector')).toBeInTheDocument();
  });

  it('shows Continue to Payment button on tip step', () => {
    render(<PaymentModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument();
  });

  it('transitions to TenderSelection after clicking Continue', async () => {
    render(<PaymentModal {...defaultProps} />);

    const continueButton = screen.getByRole('button', { name: /continue to payment/i });
    await userEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByTestId('tender-selection')).toBeInTheDocument();
    });
  });

  it('can navigate back from TenderSelection to TipSelector', async () => {
    render(<PaymentModal {...defaultProps} />);

    // Go to tender selection
    const continueButton = screen.getByRole('button', { name: /continue to payment/i });
    await userEvent.click(continueButton);

    // Click back
    const backButton = screen.getByTestId('back-to-tip');
    await userEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByTestId('tip-selector')).toBeInTheDocument();
    });
  });

  it('transitions to CashPayment when Cash is selected', async () => {
    render(<PaymentModal {...defaultProps} />);

    // Go to tender selection
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    // Select Cash
    await userEvent.click(screen.getByTestId('cash-button'));

    await waitFor(() => {
      expect(screen.getByTestId('cash-payment')).toBeInTheDocument();
    });
  });

  it('transitions to CardPayment when Card is selected', async () => {
    render(<PaymentModal {...defaultProps} />);

    // Go to tender selection
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    // Select Card
    await userEvent.click(screen.getByTestId('card-button'));

    await waitFor(() => {
      expect(screen.getByTestId('card-payment')).toBeInTheDocument();
    });
  });

  it('can navigate back from CashPayment to TenderSelection', async () => {
    render(<PaymentModal {...defaultProps} />);

    // Navigate to cash payment
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));
    await userEvent.click(screen.getByTestId('cash-button'));

    // Click back
    await userEvent.click(screen.getByTestId('back-to-tender'));

    await waitFor(() => {
      expect(screen.getByTestId('tender-selection')).toBeInTheDocument();
    });
  });

  it('calls onSuccess when cash payment is completed', async () => {
    const onSuccess = vi.fn();
    render(<PaymentModal {...defaultProps} onSuccess={onSuccess} />);

    // Navigate to cash payment
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));
    await userEvent.click(screen.getByTestId('cash-button'));

    // Complete payment
    await userEvent.click(screen.getByTestId('complete-cash-payment'));

    expect(onSuccess).toHaveBeenCalled();
  });

  it('calls onSuccess when card payment is completed', async () => {
    const onSuccess = vi.fn();
    render(<PaymentModal {...defaultProps} onSuccess={onSuccess} />);

    // Navigate to card payment
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));
    await userEvent.click(screen.getByTestId('card-button'));

    // Complete payment
    await userEvent.click(screen.getByTestId('complete-card-payment'));

    expect(onSuccess).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<PaymentModal {...defaultProps} onClose={onClose} />);

    // Click the backdrop (first motion div with bg-black/50)
    const backdrop = document.querySelector('.bg-black\\/50');
    if (backdrop) {
      await userEvent.click(backdrop);
    }

    expect(onClose).toHaveBeenCalled();
  });

  it('resets to tip step after successful payment', async () => {
    const onSuccess = vi.fn();
    const { rerender } = render(<PaymentModal {...defaultProps} onSuccess={onSuccess} />);

    // Navigate to cash payment and complete
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));
    await userEvent.click(screen.getByTestId('cash-button'));
    await userEvent.click(screen.getByTestId('complete-cash-payment'));

    // Modal should be shown again (simulate re-opening)
    rerender(<PaymentModal {...defaultProps} onSuccess={onSuccess} />);

    // Should be back at tip selector
    expect(screen.getByTestId('tip-selector')).toBeInTheDocument();
  });

  it('calculates total correctly with tip', async () => {
    render(<PaymentModal {...defaultProps} />);

    // Set tip
    await userEvent.click(screen.getByTestId('mock-tip-button'));

    // Go to tender selection
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    // Check total (100 + 8.25 + 20 = 128.25)
    expect(screen.getByText('Total: $128.25')).toBeInTheDocument();
  });
});
