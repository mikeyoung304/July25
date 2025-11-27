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

    // Check order number and type badge
    // formatOrderNumber pads to 4 digits: '001' -> '0001'
    expect(screen.getByText(/Order #0001/)).toBeInTheDocument()
    // Component shows type badge (DINE-IN for orders with table_number)
    expect(screen.getByText('DINE-IN')).toBeInTheDocument()
  })

  it('displays all order items with details', () => {
    render(<KDSOrderCard {...defaultProps} />)

    // Component renders items as "quantity x name"
    expect(screen.getByText('2x Cheeseburger')).toBeInTheDocument()
    expect(screen.getByText('1x French Fries')).toBeInTheDocument()

    // ModifierList renders modifier names (icons are aria-hidden)
    expect(screen.getByText(/Extra cheese/)).toBeInTheDocument()
    expect(screen.getByText(/No onions/)).toBeInTheDocument()

    // Special instructions
    expect(screen.getByText(/Note: Well done/)).toBeInTheDocument()
  })

  it('shows Mark Ready button for new orders', () => {
    render(<KDSOrderCard {...defaultProps} />)

    const readyButton = screen.getByText('Mark Ready')
    expect(readyButton).toBeInTheDocument()

    fireEvent.click(readyButton)
    // Component signature: onStatusChange(orderId: string, status: 'ready')
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('order-1', 'ready')
  })

  it('shows Mark Ready button for preparing orders', () => {
    const preparingOrder = { ...mockOrder, status: 'preparing' as const }
    render(<KDSOrderCard order={preparingOrder} onStatusChange={defaultProps.onStatusChange} />)

    // Component only has one action button: Mark Ready (not multi-step)
    const readyButton = screen.getByText('Mark Ready')
    expect(readyButton).toBeInTheDocument()

    fireEvent.click(readyButton)
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

    // Component shows DINE-IN for orders with table_number (mockOrder has table_number: '5')
    expect(screen.getByText('DINE-IN')).toBeInTheDocument()
  })

  it('displays timer', () => {
    render(<KDSOrderCard {...defaultProps} />)

    // Timer shows elapsed time in minutes (calculated from created_at)
    // Since mock time is 12:00:00 and created_at is 12:00:00, elapsed is 0 minutes
    expect(screen.getByText(/0m/)).toBeInTheDocument()
  })

  it('displays table number for dine-in orders', () => {
    render(<KDSOrderCard {...defaultProps} />)

    // Dine-in orders (with table_number) show table prominently
    expect(screen.getByText(/Table 5/)).toBeInTheDocument()
  })

  it('displays customer name when available', () => {
    // Order without table_number but with customer name shows customer prominently
    const orderWithCustomer = { ...mockOrder, table_number: undefined, customer_name: 'John Doe' }
    render(<KDSOrderCard order={orderWithCustomer} onStatusChange={defaultProps.onStatusChange} />)

    // getDisplayCustomerName extracts last name: "Doe"
    expect(screen.getByText('Doe')).toBeInTheDocument()
  })
})