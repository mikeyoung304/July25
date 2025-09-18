import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

import { TipSelector } from '../TipSelector';

describe('TipSelector', () => {
  const defaultProps = {
    subtotal: 50.0,
    currentTip: 0,
    onTipSelected: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tip options correctly', () => {
    render(<TipSelector {...defaultProps} />);

    expect(screen.getByText('18%')).toBeInTheDocument();
    expect(screen.getByText('$9.00')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    expect(screen.getByText('22%')).toBeInTheDocument();
    expect(screen.getByText('$11.00')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('should call onTipSelected with preset amount after continue', async () => {
    render(<TipSelector {...defaultProps} />);

    fireEvent.click(screen.getByText('20%').closest('button')!);
    fireEvent.click(screen.getByText('Continue to Payment'));

    await waitFor(() => {
      expect(defaultProps.onTipSelected).toHaveBeenCalledWith(10.0);
    });
  });

  it('should handle custom tip amount', async () => {
    render(<TipSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '15.50' } });
    fireEvent.click(screen.getByText('Continue to Payment'));

    await waitFor(() => {
      expect(defaultProps.onTipSelected).toHaveBeenCalledWith(15.5);
    });
  });

  it('should continue without tip', () => {
    render(<TipSelector {...defaultProps} />);

    fireEvent.click(screen.getByText('Continue without tip'));

    expect(defaultProps.onTipSelected).toHaveBeenCalledWith(0);
  });

  it('should handle back navigation', () => {
    render(<TipSelector {...defaultProps} />);

    fireEvent.click(screen.getByText('← Back to check'));

    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
