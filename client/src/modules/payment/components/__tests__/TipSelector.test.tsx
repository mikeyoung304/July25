import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TipSelector } from '../TipSelector';
import '@testing-library/jest-dom';

describe('TipSelector', () => {
  const defaultProps = {
    subtotal: 50.00,
    onSelect: jest.fn(),
    onBack: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tip options correctly', () => {
    render(<TipSelector {...defaultProps} />);

    expect(screen.getByText('18%')).toBeInTheDocument();
    expect(screen.getByText('$9.00')).toBeInTheDocument();
    
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    
    expect(screen.getByText('22%')).toBeInTheDocument();
    expect(screen.getByText('$11.00')).toBeInTheDocument();
  });

  it('should highlight recommended tip option', () => {
    render(<TipSelector {...defaultProps} />);
    
    const recommendedButton = screen.getByText('20%').closest('button');
    expect(recommendedButton).toHaveClass('ring-2', 'ring-primary');
  });

  it('should call onSelect with correct tip amount for preset option', () => {
    render(<TipSelector {...defaultProps} />);
    
    const button20 = screen.getByText('20%').closest('button');
    fireEvent.click(button20!);

    expect(defaultProps.onSelect).toHaveBeenCalledWith(10.00);
  });

  it('should handle custom tip amount', async () => {
    render(<TipSelector {...defaultProps} />);
    
    const customButton = screen.getByText('Custom Amount').closest('button');
    fireEvent.click(customButton!);

    const input = screen.getByPlaceholderText('Enter tip amount');
    fireEvent.change(input, { target: { value: '15.50' } });

    const confirmButton = screen.getByText('Add $15.50 Tip');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(defaultProps.onSelect).toHaveBeenCalledWith(15.50);
    });
  });

  it('should handle no tip selection', () => {
    render(<TipSelector {...defaultProps} />);
    
    const noTipButton = screen.getByText('No Tip');
    fireEvent.click(noTipButton);

    expect(defaultProps.onSelect).toHaveBeenCalledWith(0);
  });

  it('should validate custom tip input', async () => {
    render(<TipSelector {...defaultProps} />);
    
    const customButton = screen.getByText('Custom Amount').closest('button');
    fireEvent.click(customButton!);

    const input = screen.getByPlaceholderText('Enter tip amount');
    
    // Test negative value
    fireEvent.change(input, { target: { value: '-5' } });
    const confirmButton = screen.getByText('Add Tip');
    expect(confirmButton).toBeDisabled();

    // Test valid value
    fireEvent.change(input, { target: { value: '8.75' } });
    const validConfirmButton = screen.getByText('Add $8.75 Tip');
    expect(validConfirmButton).not.toBeDisabled();
  });

  it('should display tip percentage for custom amount', () => {
    render(<TipSelector {...defaultProps} />);
    
    const customButton = screen.getByText('Custom Amount').closest('button');
    fireEvent.click(customButton!);

    const input = screen.getByPlaceholderText('Enter tip amount');
    fireEvent.change(input, { target: { value: '7.50' } });

    expect(screen.getByText('15% tip')).toBeInTheDocument();
  });

  it('should handle back button', () => {
    render(<TipSelector {...defaultProps} />);
    
    const backButton = screen.getByText('← Back');
    fireEvent.click(backButton);

    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('should handle tip selection after viewing custom', () => {
    render(<TipSelector {...defaultProps} />);
    
    // First open custom
    const customButton = screen.getByText('Custom Amount').closest('button');
    fireEvent.click(customButton!);

    // Then go back
    const backToPresets = screen.getByText('← Back to preset amounts');
    fireEvent.click(backToPresets);

    // Select a preset
    const button18 = screen.getByText('18%').closest('button');
    fireEvent.click(button18!);

    expect(defaultProps.onSelect).toHaveBeenCalledWith(9.00);
  });

  it('should format currency correctly', () => {
    render(<TipSelector {...defaultProps} subtotal={33.33} />);

    // 18% of 33.33 = 6.00 (rounded)
    expect(screen.getByText('$6.00')).toBeInTheDocument();
    
    // 20% of 33.33 = 6.67
    expect(screen.getByText('$6.67')).toBeInTheDocument();
    
    // 22% of 33.33 = 7.33
    expect(screen.getByText('$7.33')).toBeInTheDocument();
  });
});