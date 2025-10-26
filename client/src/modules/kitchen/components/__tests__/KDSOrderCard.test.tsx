import React from 'react'
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderCard as KDSOrderCard } from '@/components/kitchen/OrderCard'
import type { Order } from '@rebuild/shared'

// Mock the child components
vi.mock('@/components/shared/order/OrderHeaders', () => ({
  OrderHeader: ({ orderNumber, status }: { orderNumber: string; status: string }) => (
    <div data-testid="order-header">
      Order #{orderNumber} - {status}
    </div>
  ),
  OrderMetadata: ({ tableNumber, orderTime }: { tableNumber: string; orderTime: Date }) => (
    <div data-testid="order-metadata">
      Table {tableNumber} - {orderTime.toLocaleTimeString()}
    </div>
  )
}))

vi.mock('@/components/shared/order/OrderItemsList', () => ({
  OrderItemsList: ({ items }: { items: any[] }) => (
    <div data-testid="order-items">
      {items.map((item: any) => (
        <div key={item.id}>
          {item.quantity}x {item.name}
          {item.modifiers && <span> - {item.modifiers.join(', ')}</span>}
          {item.notes && <span> ({item.notes})</span>}
        </div>
      ))}
    </div>
  )
}))

vi.mock('@/components/shared/order/OrderActions', () => ({
  OrderActions: ({ status, onStatusChange }: { status: string; onStatusChange?: (status: string) => void }) => (
    <div data-testid="order-actions">
      {status === 'new' && (
        <button onClick={() => onStatusChange?.('preparing')}>Start Preparing</button>
      )}
      {status === 'preparing' && (
        <button onClick={() => onStatusChange?.('ready')}>Mark Ready</button>
      )}
      {status === 'ready' && <span>Ready for pickup</span>}
    </div>
  )
}))

describe('KDSOrderCard', () => {
  const mockOrder: Order = {
    id: 'order-1',
    restaurant_id: 'rest-1',
    order_number: '001',
    type: 'dine-in',
    status: 'new',
    items: [
      {
        id: '1',
        menu_item_id: 'item-1',
        name: 'Cheeseburger',
        quantity: 2,
        price: 12.99,
        subtotal: 25.98,
        modifiers: [
          { id: 'mod-1', name: 'Extra cheese', price: 1.00 },
          { id: 'mod-2', name: 'No onions', price: 0.00 }
        ],
        special_instructions: 'Well done'
      },
      {
        id: '2',
        menu_item_id: 'item-2',
        name: 'French Fries',
        quantity: 1,
        price: 4.99,
        subtotal: 4.99
      }
    ],
    subtotal: 30.97,
    tax: 2.48,
    total: 33.45,
    payment_status: 'pending',
    table_number: '5',
    notes: 'Well done',
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  }

  const defaultProps = {
    order: mockOrder,
    onStatusChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders order information correctly', () => {
    render(<KDSOrderCard {...defaultProps} />)
    
    // Check that order header contains the order number and status
    const orderHeader = screen.getByTestId('order-header')
    expect(orderHeader).toHaveTextContent('001')
    expect(orderHeader).toHaveTextContent('new')
    expect(screen.getByTestId('order-items')).toBeInTheDocument()
  })

  it('displays all order items with details', () => {
    render(<KDSOrderCard {...defaultProps} />)
    
    expect(screen.getByText('2x Cheeseburger')).toBeInTheDocument()
    expect(screen.getByText(/Extra cheese, No onions/)).toBeInTheDocument()
    expect(screen.getByText('1x French Fries')).toBeInTheDocument()
  })

  it('shows order actions for new orders', () => {
    render(<KDSOrderCard {...defaultProps} />)
    
    const startButton = screen.getByText('Start Preparing')
    expect(startButton).toBeInTheDocument()
    
    fireEvent.click(startButton)
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('order-1', 'preparing')
  })

  it('shows different actions for preparing orders', () => {
    const preparingOrder = { ...mockOrder, status: 'preparing' as const }
    render(<KDSOrderCard order={preparingOrder} onStatusChange={defaultProps.onStatusChange} />)
    
    const readyButton = screen.getByText('Mark Ready')
    expect(readyButton).toBeInTheDocument()
    
    fireEvent.click(readyButton)
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('order-1', 'ready')
  })

  it('shows ready status for completed orders', () => {
    const readyOrder = { ...mockOrder, status: 'ready' as const }
    render(<KDSOrderCard order={readyOrder} onStatusChange={defaultProps.onStatusChange} />)
    
    expect(screen.getByText('Ready for pickup')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('applies KDS-specific styling', () => {
    render(<KDSOrderCard {...defaultProps} />)
    
    const card = screen.getByTestId('order-card-order-1')
    expect(card).toHaveClass('kds-order-card')
  })

  it('handles order type badge display', () => {
    render(<KDSOrderCard {...defaultProps} />)
    
    // Should show order type badge for KDS variant
    expect(screen.getByText('Dine In')).toBeInTheDocument()
  })

  it('displays timer when enabled', () => {
    render(<KDSOrderCard {...defaultProps} />)
    
    // Timer should be visible in KDS variant
    expect(screen.getByText(/\d+m/)).toBeInTheDocument()
  })
})