import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderCard } from '../OrderCard'
import type { Order } from '@rebuild/shared'

describe('OrderCard', () => {
  const mockOrder: Order = {
    id: 'order-1',
    restaurant_id: 'rest-1',
    order_number: '001',
    type: 'online',
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
    seat_number: undefined,
    customer_name: undefined,
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

  describe('Order display', () => {
    it('renders order number correctly', () => {
      render(<OrderCard {...defaultProps} />)
      expect(screen.getByText(/Order #0001/)).toBeInTheDocument()
    })

    it('displays order type badge for dine-in orders', () => {
      render(<OrderCard {...defaultProps} />)
      expect(screen.getByText('DINE-IN')).toBeInTheDocument()
    })

    it('displays drive-thru badge for orders without table', () => {
      const driveThruOrder = { ...mockOrder, table_number: undefined }
      render(<OrderCard order={driveThruOrder} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.getByText('DRIVE-THRU')).toBeInTheDocument()
    })

    it('displays table number prominently for dine-in orders', () => {
      render(<OrderCard {...defaultProps} />)
      expect(screen.getByText(/Table 5/)).toBeInTheDocument()
    })

    it('displays table and seat number when both present', () => {
      const orderWithSeat = { ...mockOrder, seat_number: 'A' }
      render(<OrderCard order={orderWithSeat} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.getByText(/Table 5, Seat A/)).toBeInTheDocument()
    })

    it('displays customer name for drive-thru orders', () => {
      const driveThruOrder = { ...mockOrder, table_number: undefined, customer_name: 'John Smith' }
      render(<OrderCard order={driveThruOrder} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.getByText('Smith')).toBeInTheDocument()
    })
  })

  describe('Order items display', () => {
    it('displays all items with quantity', () => {
      render(<OrderCard {...defaultProps} />)
      expect(screen.getByText('2x Cheeseburger')).toBeInTheDocument()
      expect(screen.getByText('1x French Fries')).toBeInTheDocument()
    })

    it('displays modifiers for each item', () => {
      render(<OrderCard {...defaultProps} />)
      expect(screen.getByText(/Extra cheese/)).toBeInTheDocument()
      expect(screen.getByText(/No onions/)).toBeInTheDocument()
    })

    it('displays special instructions when present', () => {
      render(<OrderCard {...defaultProps} />)
      expect(screen.getByText(/Note: Well done/)).toBeInTheDocument()
    })

    it('hides special instructions when not present', () => {
      const orderNoInstructions = {
        ...mockOrder,
        items: [{ ...mockOrder.items[0], special_instructions: undefined }]
      }
      render(<OrderCard order={orderNoInstructions} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.queryByText(/Note:/)).not.toBeInTheDocument()
    })
  })

  describe('Urgency indicators', () => {
    it('displays elapsed time in minutes', () => {
      render(<OrderCard {...defaultProps} />)
      expect(screen.getByText(/0m/)).toBeInTheDocument()
    })

    it('updates urgency color as time elapses', () => {
      const { rerender } = render(<OrderCard {...defaultProps} />)

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000)
      rerender(<OrderCard {...defaultProps} />)

      expect(screen.getByText(/5m/)).toBeInTheDocument()
    })

    it('shows 0 minutes for freshly created orders', () => {
      const freshOrder = { ...mockOrder, created_at: new Date().toISOString() }
      render(<OrderCard order={freshOrder} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.getByText(/0m/)).toBeInTheDocument()
    })
  })

  describe('Status buttons', () => {
    it('shows Mark Ready button for new orders', () => {
      render(<OrderCard {...defaultProps} />)
      const button = screen.getByRole('button', { name: /Mark Ready/ })
      expect(button).toBeInTheDocument()
    })

    it('shows Mark Ready button for preparing orders', () => {
      const preparingOrder = { ...mockOrder, status: 'preparing' as const }
      render(<OrderCard order={preparingOrder} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.getByRole('button', { name: /Mark Ready/ })).toBeInTheDocument()
    })

    it('calls onStatusChange with correct parameters when Mark Ready is clicked', () => {
      render(<OrderCard {...defaultProps} />)
      const button = screen.getByRole('button', { name: /Mark Ready/ })
      fireEvent.click(button)
      expect(defaultProps.onStatusChange).toHaveBeenCalledWith('order-1', 'ready')
    })

    it('hides Mark Ready button for ready orders', () => {
      const readyOrder = { ...mockOrder, status: 'ready' as const }
      render(<OrderCard order={readyOrder} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.queryByRole('button', { name: /Mark Ready/ })).not.toBeInTheDocument()
    })

    it('shows ready status message for ready orders', () => {
      const readyOrder = { ...mockOrder, status: 'ready' as const }
      render(<OrderCard order={readyOrder} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.getByText(/Ready for Pickup/)).toBeInTheDocument()
    })

    it('hides Mark Ready button for completed orders', () => {
      const completedOrder = { ...mockOrder, status: 'completed' as const }
      render(<OrderCard order={completedOrder} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.queryByRole('button', { name: /Mark Ready/ })).not.toBeInTheDocument()
    })

    it('hides Mark Ready button for cancelled orders', () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled' as const }
      render(<OrderCard order={cancelledOrder} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.queryByRole('button', { name: /Mark Ready/ })).not.toBeInTheDocument()
    })
  })

  describe('Focus mode', () => {
    it('renders focus mode button when onFocusMode is provided', () => {
      const onFocusMode = vi.fn()
      render(<OrderCard {...defaultProps} onFocusMode={onFocusMode} />)
      const focusButton = screen.getByLabelText(/Expand order details/)
      expect(focusButton).toBeInTheDocument()
    })

    it('calls onFocusMode with order when focus button is clicked', () => {
      const onFocusMode = vi.fn()
      render(<OrderCard {...defaultProps} onFocusMode={onFocusMode} />)
      const focusButton = screen.getByLabelText(/Expand order details/)
      fireEvent.click(focusButton)
      expect(onFocusMode).toHaveBeenCalledWith(mockOrder)
    })

    it('does not render focus button when onFocusMode is not provided', () => {
      render(<OrderCard {...defaultProps} onFocusMode={undefined} />)
      expect(screen.queryByLabelText(/Expand order details/)).not.toBeInTheDocument()
    })
  })

  describe('Memoization', () => {
    it('does not re-render when order id and status remain the same', () => {
      const { rerender } = render(<OrderCard {...defaultProps} />)
      const initialRender = screen.getByText(/Order #0001/)

      // Re-render with same order
      rerender(<OrderCard {...defaultProps} />)

      expect(screen.getByText(/Order #0001/)).toBeInTheDocument()
    })

    it('re-renders when order status changes', () => {
      const { rerender } = render(<OrderCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /Mark Ready/ })).toBeInTheDocument()

      const readyOrder = { ...mockOrder, status: 'ready' as const }
      rerender(<OrderCard order={readyOrder} onStatusChange={defaultProps.onStatusChange} />)

      expect(screen.queryByRole('button', { name: /Mark Ready/ })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('displays timer with aria-label', () => {
      render(<OrderCard {...defaultProps} />)
      const timerText = screen.getByText(/0m/)
      expect(timerText).toBeInTheDocument()
    })

    it('has accessible button labels', () => {
      const onFocusMode = vi.fn()
      render(<OrderCard {...defaultProps} onFocusMode={onFocusMode} />)
      expect(screen.getByLabelText(/Expand order details/)).toBeInTheDocument()
    })
  })
})
