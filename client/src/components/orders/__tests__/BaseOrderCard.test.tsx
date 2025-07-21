import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { BaseOrderCard } from '../BaseOrderCard';
import { mockOrder } from '@/test-utils';
import { vi } from 'vitest';

describe('BaseOrderCard', () => {
  const defaultProps = {
    order: mockOrder,
    onStatusChange: vi.fn(),
    onCardClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders order information correctly', () => {
    render(<BaseOrderCard {...defaultProps} />);
    
    expect(screen.getByText(mockOrder.order_number)).toBeInTheDocument();
    expect(screen.getByText(mockOrder.customer_name!)).toBeInTheDocument();
    expect(screen.getByText(`Table ${mockOrder.table_number}`)).toBeInTheDocument();
  });

  it('applies correct urgency styling based on wait time', () => {
    // Mock current time to be 15 minutes after order creation
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const urgentOrder = { ...mockOrder, created_at: fifteenMinutesAgo };
    
    const { container } = render(
      <BaseOrderCard {...defaultProps} order={urgentOrder} />
    );
    
    const orderCard = container.querySelector('[data-testid^="order-card-"]');
    expect(orderCard).toHaveAttribute('data-urgency', 'critical');
    expect(orderCard).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('renders in different variants', () => {
    const { rerender, container } = render(
      <BaseOrderCard {...defaultProps} variant="standard" />
    );
    
    let orderCard = container.querySelector('.order-card');
    expect(orderCard).toHaveClass('hover:shadow-md');
    
    rerender(<BaseOrderCard {...defaultProps} variant="kds" />);
    orderCard = container.querySelector('.order-card');
    expect(orderCard).toHaveClass('hover:shadow-lg');
  });

  it('renders in list layout', () => {
    const { container } = render(
      <BaseOrderCard {...defaultProps} layout="list" />
    );
    
    const orderCard = container.querySelector('.order-card');
    expect(orderCard).toHaveClass('border-l-4', 'pl-4', 'py-2');
    expect(orderCard).not.toHaveClass('rounded-lg', 'shadow-sm', 'p-4');
  });

  it('shows order type badge when enabled for KDS variant', () => {
    render(
      <BaseOrderCard 
        {...defaultProps} 
        variant="kds" 
        showOrderType={true}
      />
    );
    
    expect(screen.getByText('Dine In')).toBeInTheDocument();
  });

  it('hides actions when showActions is false', () => {
    render(
      <BaseOrderCard {...defaultProps} showActions={false} />
    );
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onCardClick when clicked', () => {
    render(<BaseOrderCard {...defaultProps} />);
    
    const orderCard = screen.getByTestId(`order-card-${mockOrder.id}`);
    fireEvent.click(orderCard);
    
    expect(defaultProps.onCardClick).toHaveBeenCalledWith(mockOrder);
  });

  it('shows timer when enabled', () => {
    render(<BaseOrderCard {...defaultProps} showTimer={true} />);
    
    expect(screen.getByText(/\d+m/)).toBeInTheDocument();
  });

  it('hides timer when disabled', () => {
    render(<BaseOrderCard {...defaultProps} showTimer={false} />);
    
    expect(screen.queryByText(/\d+m/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-test-class';
    const { container } = render(
      <BaseOrderCard {...defaultProps} className={customClass} />
    );
    
    const orderCard = container.querySelector('.order-card');
    expect(orderCard).toHaveClass(customClass);
  });

  it('shows overdue animation for KDS variant', () => {
    // Mock current time to be well past estimated ready time
    const overdueOrder = {
      ...mockOrder,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      estimated_ready_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    };
    
    const { container } = render(
      <BaseOrderCard 
        {...defaultProps} 
        order={overdueOrder}
        variant="kds"
      />
    );
    
    const orderCard = container.querySelector('.order-card');
    expect(orderCard).toHaveClass('animate-pulse');
  });
});