import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('framer-motion', () => {
  const factory = (element: keyof JSX.IntrinsicElements) =>
    ({ children, ...rest }: { children?: ReactNode }) => React.createElement(element, rest, children);

  return {
    motion: new Proxy({}, {
      get: (_target, key: string) => factory(key as keyof JSX.IntrinsicElements),
    }),
  };
});

import { PaymentMethodPicker } from '../PaymentMethodPicker';

describe('PaymentMethodPicker', () => {
  const defaultProps = {
    total: 64.0,
    onMethodSelected: vi.fn(),
    onBack: vi.fn(),
  };

  const originalTerminalId = import.meta.env.VITE_SQUARE_TERMINAL_ID;
  const originalPaymentRequest = (window as any).PaymentRequest;

  beforeEach(() => {
    import.meta.env.VITE_SQUARE_TERMINAL_ID = 'terminal-test';
    (window as any).PaymentRequest = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalTerminalId === undefined) {
      delete import.meta.env.VITE_SQUARE_TERMINAL_ID;
    } else {
      import.meta.env.VITE_SQUARE_TERMINAL_ID = originalTerminalId;
    }

    if (originalPaymentRequest === undefined) {
      delete (window as any).PaymentRequest;
    } else {
      (window as any).PaymentRequest = originalPaymentRequest;
    }
  });

  it('should render all payment method options', () => {
    render(<PaymentMethodPicker {...defaultProps} />);

    expect(screen.getByText('Tap, Insert or Swipe Card')).toBeInTheDocument();
    expect(screen.getByText('Apple Pay / Google Pay')).toBeInTheDocument();
    expect(screen.getByText('Enter Card Details')).toBeInTheDocument();
    expect(screen.getByText('Pay with Cash')).toBeInTheDocument();
    expect(screen.getByText('Split Check')).toBeInTheDocument();
  });

  it('should select Square Terminal method', () => {
    render(<PaymentMethodPicker {...defaultProps} />);

    const squareButton = screen.getByText('Tap, Insert or Swipe Card').closest('button');
    fireEvent.click(squareButton!);

    expect(defaultProps.onMethodSelected).toHaveBeenCalledWith({
      type: 'SQUARE_TERMINAL',
      deviceId: expect.any(String),
    });
  });

  it('should select Digital Wallet method', () => {
    render(<PaymentMethodPicker {...defaultProps} />);

    const walletButton = screen.getByText('Apple Pay / Google Pay').closest('button');
    fireEvent.click(walletButton!);

    expect(defaultProps.onMethodSelected).toHaveBeenCalledWith({
      type: 'DIGITAL_WALLET',
    });
  });

  it('should handle cash payment selection', () => {
    render(<PaymentMethodPicker {...defaultProps} />);

    fireEvent.click(screen.getByText('Pay with Cash').closest('button')!);

    expect(defaultProps.onMethodSelected).toHaveBeenCalledWith({
      type: 'CASH',
    });
  });

  it('should select Manual Entry method', () => {
    render(<PaymentMethodPicker {...defaultProps} />);

    fireEvent.click(screen.getByText('Enter Card Details').closest('button')!);

    const cardNumber = screen.getByPlaceholderText('1234 5678 9012 3456');
    fireEvent.change(cardNumber, { target: { value: '4242 4242 4242 4242' } });

    fireEvent.click(screen.getByText('Pay $64.00'));

    expect(defaultProps.onMethodSelected).toHaveBeenCalledWith({
      type: 'MANUAL_ENTRY',
      token: 'demo-token',
      cardDetails: { last4: '4242' },
    });
  });

  it('should select Split Check method', () => {
    render(<PaymentMethodPicker {...defaultProps} />);

    fireEvent.click(screen.getByText('Split Check').closest('button')!);

    expect(defaultProps.onMethodSelected).toHaveBeenCalledWith({
      type: 'SPLIT',
    });
  });

  it('should handle back button', () => {
    render(<PaymentMethodPicker {...defaultProps} />);

    fireEvent.click(screen.getByText('← Back to tip selection'));

    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('should display total amount prominently', () => {
    render(<PaymentMethodPicker {...defaultProps} />);

    expect(screen.getByText('Total Due: $64.00')).toBeInTheDocument();
  });

  it('should disable payment buttons while processing', () => {
    render(<PaymentMethodPicker {...defaultProps} isProcessing />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      if (button.textContent !== '← Back to tip selection') {
        expect(button).toBeDisabled();
      }
    });
  });
});
