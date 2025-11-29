import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TipSelector } from '../TipSelector';

describe('TipSelector', () => {
  const defaultProps = {
    subtotal: 100,
    tax: 8.25,
    onTipChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with preset tip buttons', () => {
    render(<TipSelector {...defaultProps} />);

    expect(screen.getByRole('button', { name: /set tip to 15%/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set tip to 18%/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set tip to 20%/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set tip to 25%/i })).toBeInTheDocument();
  });

  it('renders No Tip button', () => {
    render(<TipSelector {...defaultProps} />);

    expect(screen.getByRole('button', { name: /no tip/i })).toBeInTheDocument();
  });

  it('displays subtotal correctly', () => {
    render(<TipSelector {...defaultProps} />);

    // Subtotal appears in header - use getAllByText since it appears multiple times
    const subtotals = screen.getAllByText('$100.00');
    expect(subtotals.length).toBeGreaterThan(0);
  });

  it('calculates tip correctly for 15%', async () => {
    const onTipChange = vi.fn();
    render(<TipSelector {...defaultProps} onTipChange={onTipChange} />);

    const button15 = screen.getByRole('button', { name: /set tip to 15%/i });
    await userEvent.click(button15);

    // 15% of $100 = $15
    expect(onTipChange).toHaveBeenCalledWith(15);
  });

  it('calculates tip correctly for 20%', async () => {
    const onTipChange = vi.fn();
    render(<TipSelector {...defaultProps} onTipChange={onTipChange} />);

    const button20 = screen.getByRole('button', { name: /set tip to 20%/i });
    await userEvent.click(button20);

    // 20% of $100 = $20
    expect(onTipChange).toHaveBeenCalledWith(20);
  });

  it('calculates tip correctly for 25%', async () => {
    const onTipChange = vi.fn();
    render(<TipSelector {...defaultProps} onTipChange={onTipChange} />);

    const button25 = screen.getByRole('button', { name: /set tip to 25%/i });
    await userEvent.click(button25);

    // 25% of $100 = $25
    expect(onTipChange).toHaveBeenCalledWith(25);
  });

  it('sets tip to 0 when No Tip is clicked', async () => {
    const onTipChange = vi.fn();
    render(<TipSelector {...defaultProps} onTipChange={onTipChange} />);

    const noTipButton = screen.getByRole('button', { name: /no tip/i });
    await userEvent.click(noTipButton);

    expect(onTipChange).toHaveBeenCalledWith(0);
  });

  it('allows custom tip amount entry', async () => {
    const onTipChange = vi.fn();
    render(<TipSelector {...defaultProps} onTipChange={onTipChange} />);

    const customInput = screen.getByLabelText(/custom tip amount/i);
    await userEvent.clear(customInput);
    await userEvent.type(customInput, '12.50');

    // Custom tip of $12.50
    expect(onTipChange).toHaveBeenLastCalledWith(12.5);
  });

  it('displays calculated dollar amounts for each preset', () => {
    render(<TipSelector {...defaultProps} />);

    // Check that dollar amounts are shown next to percentages
    // Use getAllByText since $20.00 appears both in the button and the tip summary
    expect(screen.getByText('$15.00')).toBeInTheDocument(); // 15% of $100
    expect(screen.getByText('$18.00')).toBeInTheDocument(); // 18% of $100
    expect(screen.getAllByText('$20.00').length).toBeGreaterThan(0); // 20% of $100 (appears in button and summary)
    expect(screen.getByText('$25.00')).toBeInTheDocument(); // 25% of $100
  });

  it('shows correct total with subtotal, tax, and tip', async () => {
    const onTipChange = vi.fn();
    render(<TipSelector {...defaultProps} onTipChange={onTipChange} />);

    // Default is 20% selected, so total = 100 + 8.25 + 20 = 128.25
    expect(screen.getByText('$128.25')).toBeInTheDocument();
  });

  it('uses initial_tip value when provided', () => {
    const onTipChange = vi.fn();
    render(
      <TipSelector
        {...defaultProps}
        onTipChange={onTipChange}
        initial_tip={15}
      />
    );

    // Should show the initial tip in the custom input
    const customInput = screen.getByLabelText(/custom tip amount/i);
    expect(customInput).toHaveValue(15);
  });

  it('highlights selected preset button', async () => {
    render(<TipSelector {...defaultProps} />);

    // 20% is selected by default
    const button20 = screen.getByRole('button', { name: /set tip to 20%/i });
    expect(button20).toHaveAttribute('aria-pressed', 'true');

    // Click 15%
    const button15 = screen.getByRole('button', { name: /set tip to 15%/i });
    await userEvent.click(button15);

    expect(button15).toHaveAttribute('aria-pressed', 'true');
    expect(button20).toHaveAttribute('aria-pressed', 'false');
  });

  it('handles decimal subtotal correctly', async () => {
    const onTipChange = vi.fn();
    render(
      <TipSelector
        subtotal={47.89}
        tax={3.95}
        onTipChange={onTipChange}
      />
    );

    const button15 = screen.getByRole('button', { name: /set tip to 15%/i });
    await userEvent.click(button15);

    // 15% of $47.89 = $7.18 (rounded)
    expect(onTipChange).toHaveBeenCalledWith(7.18);
  });
});
