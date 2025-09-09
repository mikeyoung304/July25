import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentMethodPicker } from '../PaymentMethodPicker';
import '@testing-library/jest-dom';

describe('PaymentMethodPicker', () => {
  const defaultProps = {
    totalAmount: 64.00,
    onSelect: jest.fn(),
    onBack: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all payment method options', () => {
    render(<PaymentMethodPicker {...defaultProps} />);

    expect(screen.getByText('Square Reader')).toBeInTheDocument();
    expect(screen.getByText('Digital Wallet')).toBeInTheDocument();
    expect(screen.getByText('Manual Entry')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Split Check')).toBeInTheDocument();
  });

  it('should select Square Terminal method', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    const squareButton = screen.getByText('Square Reader').closest('button');
    fireEvent.click(squareButton!);

    expect(defaultProps.onSelect).toHaveBeenCalledWith({
      type: 'SQUARE_TERMINAL',
      deviceId: expect.any(String)
    });
  });

  it('should select Digital Wallet method', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    const walletButton = screen.getByText('Digital Wallet').closest('button');
    fireEvent.click(walletButton!);

    expect(defaultProps.onSelect).toHaveBeenCalledWith({
      type: 'DIGITAL_WALLET'
    });
  });

  it('should handle cash payment with exact amount', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    const cashButton = screen.getByText('Cash').closest('button');
    fireEvent.click(cashButton!);

    // Should show cash input modal
    expect(screen.getByText('Cash Payment')).toBeInTheDocument();
    expect(screen.getByText('Amount Due: $64.00')).toBeInTheDocument();

    // Click exact amount button
    const exactButton = screen.getByText('Exact ($64.00)');
    fireEvent.click(exactButton);

    expect(defaultProps.onSelect).toHaveBeenCalledWith({
      type: 'CASH',
      tenderedAmount: 64.00
    });
  });

  it('should handle cash payment with custom amount and calculate change', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    const cashButton = screen.getByText('Cash').closest('button');
    fireEvent.click(cashButton!);

    const input = screen.getByPlaceholderText('Enter amount received');
    fireEvent.change(input, { target: { value: '100' } });

    // Should show change amount
    expect(screen.getByText('Change: $36.00')).toBeInTheDocument();

    const confirmButton = screen.getByText('Process Cash Payment');
    fireEvent.click(confirmButton);

    expect(defaultProps.onSelect).toHaveBeenCalledWith({
      type: 'CASH',
      tenderedAmount: 100.00
    });
  });

  it('should handle quick cash amounts', () => {
    render(<PaymentMethodPicker {...defaultProps} totalAmount={23.50} />);
    
    const cashButton = screen.getByText('Cash').closest('button');
    fireEvent.click(cashButton!);

    // Quick amounts should be: $25, $30, $40, $50
    const button30 = screen.getByText('$30');
    fireEvent.click(button30);

    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByText('Change: $6.50')).toBeInTheDocument();
  });

  it('should validate cash amount is sufficient', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    const cashButton = screen.getByText('Cash').closest('button');
    fireEvent.click(cashButton!);

    const input = screen.getByPlaceholderText('Enter amount received');
    fireEvent.change(input, { target: { value: '50' } });

    // Amount is less than total
    const confirmButton = screen.getByText('Process Cash Payment');
    expect(confirmButton).toBeDisabled();

    // Update to sufficient amount
    fireEvent.change(input, { target: { value: '65' } });
    expect(confirmButton).not.toBeDisabled();
  });

  it('should select Manual Entry method', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    const manualButton = screen.getByText('Manual Entry').closest('button');
    fireEvent.click(manualButton!);

    expect(defaultProps.onSelect).toHaveBeenCalledWith({
      type: 'MANUAL_ENTRY'
    });
  });

  it('should select Split Check method', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    const splitButton = screen.getByText('Split Check').closest('button');
    fireEvent.click(splitButton!);

    expect(defaultProps.onSelect).toHaveBeenCalledWith({
      type: 'SPLIT'
    });
  });

  it('should handle back button', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    const backButton = screen.getByText('← Back to tip');
    fireEvent.click(backButton);

    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('should close cash modal on cancel', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    const cashButton = screen.getByText('Cash').closest('button');
    fireEvent.click(cashButton!);

    expect(screen.getByText('Cash Payment')).toBeInTheDocument();

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Cash Payment')).not.toBeInTheDocument();
  });

  it('should display total amount prominently', () => {
    render(<PaymentMethodPicker {...defaultProps} />);
    
    expect(screen.getByText('Total Due')).toBeInTheDocument();
    expect(screen.getByText('$64.00')).toBeInTheDocument();
  });

  it('should disable payment buttons while processing', () => {
    render(<PaymentMethodPicker {...defaultProps} isProcessing={true} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      if (button.textContent !== '← Back to tip') {
        expect(button).toBeDisabled();
      }
    });
  });
});