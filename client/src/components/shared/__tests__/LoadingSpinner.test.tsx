import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('presentation', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('renders with message', () => {
    const message = 'Loading orders...';
    render(<LoadingSpinner message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender, container } = render(<LoadingSpinner size="xs" />);
    let spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="xl" />);
    spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-16', 'w-16');
  });

  it('renders different variants', () => {
    const { rerender, container } = render(<LoadingSpinner variant="spinner" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    rerender(<LoadingSpinner variant="dots" />);
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);

    rerender(<LoadingSpinner variant="icon" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders fullscreen with overlay', () => {
    const { container } = render(<LoadingSpinner fullScreen overlay />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('fixed', 'inset-0', 'bg-background/80', 'z-50');
  });

  it('applies custom className', () => {
    const customClass = 'custom-spinner-class';
    const { container } = render(<LoadingSpinner className={customClass} />);
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('renders dots with correct animation delays', () => {
    const { container } = render(<LoadingSpinner variant="dots" />);
    const dots = container.querySelectorAll('.animate-bounce');
    
    dots.forEach((dot, index) => {
      expect(dot).toHaveStyle({ animationDelay: `${index * 150}ms` });
    });
  });
});