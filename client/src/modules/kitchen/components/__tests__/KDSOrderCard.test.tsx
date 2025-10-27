import React from 'react'
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderCard as KDSOrderCard } from '@/components/kitchen/OrderCard'
import type { Order } from '@rebuild/shared'

describe('KDSOrderCard', () => {
  const mockOrder: Order = {
    id: 'order-1',
    restaurant_id: 'rest-1',
    order_number: '001',
    type: 'online', // Component maps 'online' to 'Dine-In'
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
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  }

  const defaultProps = {
    order: mockOrder,
    onStatusChange: vi.fn() // Signature: (orderId: string, status: 'ready') => void
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

    // Check order number and status
    expect(screen.getByText(/Order #001/)).toBeInTheDocument()
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('displays all order items with details', () => {
    render(<KDSOrderCard {...defaultProps} />)

    // Component renders items as "quantity x name"
    expect(screen.getByText('2x Cheeseburger')).toBeInTheDocument()
    expect(screen.getByText('1x French Fries')).toBeInTheDocument()

    // Modifiers are rendered as bullets
    expect(screen.getByText('• Extra cheese')).toBeInTheDocument()
    expect(screen.getByText('• No onions')).toBeInTheDocument()

    // Special instructions
    expect(screen.getByText(/Note: Well done/)).toBeInTheDocument()
  })

  it('shows Complete Order button for new orders', () => {
    render(<KDSOrderCard {...defaultProps} />)

    const completeButton = screen.getByText('Complete Order')
    expect(completeButton).toBeInTheDocument()

    fireEvent.click(completeButton)
    // Component signature: onStatusChange(orderId: string, status: 'ready')
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('order-1', 'ready')
  })

  it('shows Complete Order button for preparing orders', () => {
    const preparingOrder = { ...mockOrder, status: 'preparing' as const }
    render(<KDSOrderCard order={preparingOrder} onStatusChange={defaultProps.onStatusChange} />)

    // Component only has one action button: Complete Order (not multi-step)
    const completeButton = screen.getByText('Complete Order')
    expect(completeButton).toBeInTheDocument()

    fireEvent.click(completeButton)
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('order-1', 'ready')
  })

  it('shows ready status for completed orders', () => {
    const readyOrder = { ...mockOrder, status: 'ready' as const }
    render(<KDSOrderCard order={readyOrder} onStatusChange={defaultProps.onStatusChange} />)

    // Component shows checkmark and text for ready orders
    expect(screen.getByText(/✓ Ready for Pickup/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('handles order type badge display', () => {
    render(<KDSOrderCard {...defaultProps} />)

    // Component maps 'online' type to 'Dine-In'
    expect(screen.getByText('Dine-In')).toBeInTheDocument()
  })

  it('displays timer', () => {
    render(<KDSOrderCard {...defaultProps} />)

    // Timer shows elapsed time in minutes (calculated from created_at)
    // Since mock time is 12:00:00 and created_at is 12:00:00, elapsed is 0 minutes
    expect(screen.getByText(/0m/)).toBeInTheDocument()
  })

  it('displays table number when customer name is available', () => {
    const orderWithCustomer = { ...mockOrder, customer_name: 'John Doe' }
    render(<KDSOrderCard order={orderWithCustomer} onStatusChange={defaultProps.onStatusChange} />)

    // Table number is only displayed if customer_name exists
    expect(screen.getByText(/Table 5/)).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('does not display customer section when customer name is not available', () => {
    render(<KDSOrderCard {...defaultProps} />)

    // Customer section should not be rendered when customer_name is undefined
    expect(screen.queryByText(/Table 5/)).not.toBeInTheDocument()
  })
})