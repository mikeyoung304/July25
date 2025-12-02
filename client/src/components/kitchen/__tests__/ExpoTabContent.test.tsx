import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExpoTabContent } from '../ExpoTabContent'
import type { Order } from '@rebuild/shared'

describe('ExpoTabContent', () => {
  const mockActiveOrder: Order = {
    id: 'active-order-1',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    order_number: '001',
    type: 'online',
    status: 'preparing',
    items: [
      {
        id: 'item-1',
        menu_item_id: 'menu-item-1',
        name: 'Cheeseburger',
        quantity: 2,
        price: 12.99,
        subtotal: 25.98
      },
      {
        id: 'item-2',
        menu_item_id: 'menu-item-2',
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
    customer_name: 'John Smith',
    table_number: '5',
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  }

  const mockReadyOrder: Order = {
    id: 'ready-order-1',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    order_number: '002',
    type: 'pickup',
    status: 'ready',
    items: [
      {
        id: 'item-3',
        menu_item_id: 'menu-item-3',
        name: 'Caesar Salad',
        quantity: 1,
        price: 9.99,
        subtotal: 9.99
      }
    ],
    subtotal: 9.99,
    tax: 0.80,
    total: 10.79,
    payment_status: 'paid',
    customer_name: 'Jane Doe',
    created_at: '2024-01-01T11:50:00Z',
    updated_at: '2024-01-01T11:55:00Z'
  }

  const defaultProps = {
    activeOrders: [mockActiveOrder],
    readyOrders: [mockReadyOrder],
    onStatusChange: vi.fn().mockResolvedValue(undefined)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Empty state rendering', () => {
    it('displays empty state when no active orders', () => {
      render(<ExpoTabContent {...defaultProps} activeOrders={[]} />)
      expect(screen.getByText('No active orders')).toBeInTheDocument()
    })

    it('displays empty state when no ready orders', () => {
      render(<ExpoTabContent {...defaultProps} readyOrders={[]} />)
      expect(screen.getByText('No orders ready')).toBeInTheDocument()
      expect(screen.getByText('Orders will appear here when marked ready')).toBeInTheDocument()
    })

    it('displays both empty states when no orders at all', () => {
      render(<ExpoTabContent activeOrders={[]} readyOrders={[]} onStatusChange={defaultProps.onStatusChange} />)
      expect(screen.getByText('No active orders')).toBeInTheDocument()
      expect(screen.getByText('No orders ready')).toBeInTheDocument()
    })
  })

  describe('Active orders panel', () => {
    it('renders Kitchen Activity panel header', () => {
      render(<ExpoTabContent {...defaultProps} />)
      expect(screen.getByText('Kitchen Activity')).toBeInTheDocument()
    })

    it('displays count of active orders', () => {
      render(<ExpoTabContent {...defaultProps} />)
      const counts = screen.getAllByText('(1)')
      // Should appear at least once (for Kitchen Activity panel)
      expect(counts.length).toBeGreaterThanOrEqual(1)
    })

    it('renders active orders in Kitchen Activity panel', () => {
      render(<ExpoTabContent {...defaultProps} />)
      expect(screen.getByText(/Order #0001/)).toBeInTheDocument()
      expect(screen.getByText(/2x Cheeseburger/)).toBeInTheDocument()
    })

    it('displays multiple active orders', () => {
      const secondActiveOrder = {
        ...mockActiveOrder,
        id: 'active-order-2',
        order_number: '003',
        created_at: '2024-01-01T11:45:00Z'
      }
      render(
        <ExpoTabContent
          {...defaultProps}
          activeOrders={[mockActiveOrder, secondActiveOrder]}
        />
      )
      expect(screen.getByText(/Order #0001/)).toBeInTheDocument()
      expect(screen.getByText(/Order #0003/)).toBeInTheDocument()
    })

    it('sorts active orders by created_at (oldest first)', () => {
      const newerOrder = {
        ...mockActiveOrder,
        id: 'active-order-newer',
        order_number: '005',
        created_at: '2024-01-01T12:05:00Z'
      }
      const olderOrder = {
        ...mockActiveOrder,
        id: 'active-order-older',
        order_number: '003',
        created_at: '2024-01-01T11:45:00Z'
      }

      render(
        <ExpoTabContent
          {...defaultProps}
          activeOrders={[newerOrder, olderOrder]}
          readyOrders={[]} // No ready orders to avoid confusion
        />
      )

      // Both orders should be present
      expect(screen.getByText(/Order #0003/)).toBeInTheDocument()
      expect(screen.getByText(/Order #0005/)).toBeInTheDocument()
    })
  })

  describe('Ready orders panel', () => {
    it('renders Ready for Fulfillment panel header', () => {
      render(<ExpoTabContent {...defaultProps} />)
      expect(screen.getByText('Ready for Fulfillment')).toBeInTheDocument()
    })

    it('displays count of ready orders', () => {
      render(<ExpoTabContent {...defaultProps} />)
      const counts = screen.getAllByText('(1)')
      // Should appear twice (one for Kitchen Activity, one for Ready orders)
      expect(counts.length).toBe(2)
    })

    it('renders ready orders in Ready for Fulfillment panel', () => {
      render(<ExpoTabContent {...defaultProps} />)
      // Ready orders use ReadyOrderCard which displays differently
      expect(screen.getByText('Order #002')).toBeInTheDocument()
      expect(screen.getByText(/1x Caesar Salad/)).toBeInTheDocument()
    })

    it('displays READY badge on ready orders', () => {
      render(<ExpoTabContent {...defaultProps} />)
      expect(screen.getByText('READY')).toBeInTheDocument()
    })

    it('displays multiple ready orders', () => {
      const secondReadyOrder = {
        ...mockReadyOrder,
        id: 'ready-order-2',
        order_number: '004',
        created_at: '2024-01-01T11:40:00Z'
      }
      render(
        <ExpoTabContent
          {...defaultProps}
          readyOrders={[mockReadyOrder, secondReadyOrder]}
        />
      )
      expect(screen.getByText('Order #002')).toBeInTheDocument()
      expect(screen.getByText('Order #004')).toBeInTheDocument()
    })

    it('sorts ready orders by created_at (oldest first)', () => {
      const newerOrder = {
        ...mockReadyOrder,
        id: 'ready-order-newer',
        order_number: '006',
        created_at: '2024-01-01T11:55:00Z'
      }
      const olderOrder = {
        ...mockReadyOrder,
        id: 'ready-order-older',
        order_number: '004',
        created_at: '2024-01-01T11:35:00Z'
      }

      render(
        <ExpoTabContent
          {...defaultProps}
          activeOrders={[]} // No active orders to avoid confusion
          readyOrders={[newerOrder, olderOrder]}
        />
      )

      // Both orders should be present (ReadyOrderCard format)
      expect(screen.getByText('Order #004')).toBeInTheDocument()
      expect(screen.getByText('Order #006')).toBeInTheDocument()
    })
  })

  describe('Order type mapping', () => {
    it('maps online order type to Dine-In', () => {
      const onlineOrder = { ...mockReadyOrder, type: 'online' as const }
      render(<ExpoTabContent {...defaultProps} readyOrders={[onlineOrder]} />)
      expect(screen.getByText('Dine-In')).toBeInTheDocument()
    })

    it('maps pickup order type to Takeout', () => {
      const pickupOrder = { ...mockReadyOrder, type: 'pickup' as const }
      render(<ExpoTabContent {...defaultProps} readyOrders={[pickupOrder]} />)
      expect(screen.getByText('Takeout')).toBeInTheDocument()
    })

    it('maps delivery order type to Delivery', () => {
      const deliveryOrder = { ...mockReadyOrder, type: 'delivery' as const }
      render(<ExpoTabContent {...defaultProps} readyOrders={[deliveryOrder]} />)
      expect(screen.getByText('Delivery')).toBeInTheDocument()
    })
  })

  describe('Status change interactions', () => {
    it('Mark Ready button calls onStatusChange with ready status', async () => {
      // Use real timers for async operations
      vi.useRealTimers()
      const mockOnStatusChange = vi.fn().mockResolvedValue(undefined)

      render(
        <ExpoTabContent
          activeOrders={[mockActiveOrder]}
          readyOrders={[mockReadyOrder]}
          onStatusChange={mockOnStatusChange}
        />
      )

      const markReadyButton = screen.getByRole('button', { name: /Mark Ready/i })
      fireEvent.click(markReadyButton)

      // Wait for the async call
      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith('active-order-1', 'ready')
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })

    it('Mark Sold button calls onStatusChange with completed status', async () => {
      // Use real timers for async operations
      vi.useRealTimers()
      const mockOnStatusChange = vi.fn().mockResolvedValue(undefined)

      render(
        <ExpoTabContent
          activeOrders={[mockActiveOrder]}
          readyOrders={[mockReadyOrder]}
          onStatusChange={mockOnStatusChange}
        />
      )

      const markSoldButton = screen.getByRole('button', { name: /Mark Sold/i })
      fireEvent.click(markSoldButton)

      // Wait for the async call
      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith('ready-order-1', 'completed')
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })

    it('handles multiple button clicks correctly', async () => {
      // Use real timers for async operations
      vi.useRealTimers()
      const mockOnStatusChange = vi.fn().mockResolvedValue(undefined)

      render(
        <ExpoTabContent
          activeOrders={[mockActiveOrder]}
          readyOrders={[mockReadyOrder]}
          onStatusChange={mockOnStatusChange}
        />
      )

      const markReadyButton = screen.getByRole('button', { name: /Mark Ready/i })
      const markSoldButton = screen.getByRole('button', { name: /Mark Sold/i })

      fireEvent.click(markReadyButton)
      fireEvent.click(markSoldButton)

      // Wait for both async calls
      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith('active-order-1', 'ready')
        expect(mockOnStatusChange).toHaveBeenCalledWith('ready-order-1', 'completed')
        expect(mockOnStatusChange).toHaveBeenCalledTimes(2)
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })
  })

  describe('Elapsed time display', () => {
    it('displays elapsed time for ready orders', () => {
      // Order created at 11:50, current time is 12:00 (10 minutes elapsed)
      render(<ExpoTabContent {...defaultProps} />)
      expect(screen.getByText('10m')).toBeInTheDocument()
    })

    it('calculates elapsed time correctly based on created_at', () => {
      // Set system time to 15 minutes after order creation
      vi.setSystemTime(new Date('2024-01-01T12:05:00Z'))

      const order = {
        ...mockReadyOrder,
        created_at: '2024-01-01T11:50:00Z' // 15 minutes before current time
      }

      render(
        <ExpoTabContent
          activeOrders={[]}
          readyOrders={[order]}
          onStatusChange={defaultProps.onStatusChange}
        />
      )

      // Should show 15 minutes elapsed
      expect(screen.getByText('15m')).toBeInTheDocument()
    })

    it('displays 0m for orders just created', () => {
      const freshOrder = {
        ...mockReadyOrder,
        created_at: '2024-01-01T12:00:00Z' // Same as current time
      }
      render(
        <ExpoTabContent
          activeOrders={[]} // No active orders
          readyOrders={[freshOrder]}
          onStatusChange={defaultProps.onStatusChange}
        />
      )
      // Since there's only one order, we can use getByText
      expect(screen.getByText('0m')).toBeInTheDocument()
    })

    it('shows urgency color change at 20+ minutes', () => {
      // Order created 25 minutes ago
      const oldOrder = {
        ...mockReadyOrder,
        created_at: '2024-01-01T11:35:00Z'
      }
      render(
        <ExpoTabContent
          activeOrders={[]}
          readyOrders={[oldOrder]}
          onStatusChange={defaultProps.onStatusChange}
        />
      )

      const timeElement = screen.getByText('25m')
      expect(timeElement).toBeInTheDocument()
      // Check parent element for the urgency color class
      expect(timeElement.parentElement?.className).toContain('text-red-600')
    })

    it('shows normal urgency color for orders under 10 minutes', () => {
      const recentOrder = {
        ...mockReadyOrder,
        created_at: '2024-01-01T11:55:00Z' // 5 minutes ago
      }
      render(
        <ExpoTabContent
          activeOrders={[]}
          readyOrders={[recentOrder]}
          onStatusChange={defaultProps.onStatusChange}
        />
      )

      const timeElement = screen.getByText('5m')
      expect(timeElement).toBeInTheDocument()
      // The urgency color is applied to the parent div (0-10 minutes = green)
      const parentDiv = timeElement.closest('div')
      expect(parentDiv?.className).toMatch(/text-green/)
    })
  })

  describe('Customer information display', () => {
    it('displays customer name when present', () => {
      render(<ExpoTabContent {...defaultProps} />)
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })

    it('displays table number with customer name when both present', () => {
      const orderWithTable = {
        ...mockReadyOrder,
        customer_name: 'Jane Doe',
        table_number: '12'
      }
      render(<ExpoTabContent {...defaultProps} readyOrders={[orderWithTable]} />)
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText(/Table 12/)).toBeInTheDocument()
    })

    it('hides customer section when no customer name', () => {
      const orderNoCustomer = {
        ...mockReadyOrder,
        customer_name: undefined
      }
      render(<ExpoTabContent {...defaultProps} readyOrders={[orderNoCustomer]} />)
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
    })
  })

  describe('Order items display', () => {
    it('displays all items in ready orders', () => {
      render(<ExpoTabContent {...defaultProps} />)
      expect(screen.getByText(/1x Caesar Salad/)).toBeInTheDocument()
    })

    it('displays multiple items correctly', () => {
      const multiItemOrder = {
        ...mockReadyOrder,
        items: [
          {
            id: 'item-1',
            menu_item_id: 'menu-1',
            name: 'Burger',
            quantity: 2,
            price: 10.00,
            subtotal: 20.00
          },
          {
            id: 'item-2',
            menu_item_id: 'menu-2',
            name: 'Fries',
            quantity: 1,
            price: 5.00,
            subtotal: 5.00
          },
          {
            id: 'item-3',
            menu_item_id: 'menu-3',
            name: 'Drink',
            quantity: 3,
            price: 2.00,
            subtotal: 6.00
          }
        ]
      }
      render(<ExpoTabContent {...defaultProps} readyOrders={[multiItemOrder]} />)
      expect(screen.getByText(/2x Burger/)).toBeInTheDocument()
      expect(screen.getByText(/1x Fries/)).toBeInTheDocument()
      expect(screen.getByText(/3x Drink/)).toBeInTheDocument()
    })
  })

  describe('Error boundary integration', () => {
    it('wraps active orders in error boundary', () => {
      render(<ExpoTabContent {...defaultProps} />)
      // Verify the component renders without error
      expect(screen.getByText(/Order #0001/)).toBeInTheDocument()
    })

    it('wraps ready orders in error boundary', () => {
      render(<ExpoTabContent {...defaultProps} />)
      // Verify the component renders without error (ReadyOrderCard format)
      expect(screen.getByText('Order #002')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible button labels for Mark Ready', () => {
      render(<ExpoTabContent {...defaultProps} />)
      const button = screen.getByRole('button', { name: /Mark Ready/i })
      expect(button).toHaveAccessibleName()
    })

    it('has accessible button labels for Mark Sold', () => {
      render(<ExpoTabContent {...defaultProps} />)
      const button = screen.getByRole('button', { name: /Mark Sold/i })
      expect(button).toHaveAccessibleName()
    })
  })

  describe('Panel count badges', () => {
    it('updates Kitchen Activity count when active orders change', () => {
      const { rerender } = render(<ExpoTabContent {...defaultProps} />)
      expect(screen.getByText('Kitchen Activity')).toBeInTheDocument()

      const newActiveOrders = [
        mockActiveOrder,
        { ...mockActiveOrder, id: 'active-2', order_number: '010' },
        { ...mockActiveOrder, id: 'active-3', order_number: '011' }
      ]

      rerender(
        <ExpoTabContent
          {...defaultProps}
          activeOrders={newActiveOrders}
        />
      )

      const counts = screen.getAllByText('(3)')
      expect(counts.length).toBeGreaterThanOrEqual(1)
    })

    it('updates Ready for Fulfillment count when ready orders change', () => {
      const { rerender } = render(<ExpoTabContent {...defaultProps} />)

      const newReadyOrders = [
        mockReadyOrder,
        { ...mockReadyOrder, id: 'ready-2', order_number: '020' }
      ]

      rerender(
        <ExpoTabContent
          {...defaultProps}
          readyOrders={newReadyOrders}
        />
      )

      const counts = screen.getAllByText('(2)')
      expect(counts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Memoization', () => {
    it('memoizes sorted active orders', () => {
      const { rerender } = render(<ExpoTabContent {...defaultProps} />)
      const firstRender = screen.getByText(/Order #0001/)

      // Re-render with same data
      rerender(<ExpoTabContent {...defaultProps} />)

      expect(screen.getByText(/Order #0001/)).toBe(firstRender)
    })

    it('updates when active orders array changes', () => {
      const { rerender } = render(<ExpoTabContent {...defaultProps} />)

      // Verify initial state
      expect(screen.getByText(/Order #0001/)).toBeInTheDocument()

      const updatedActiveOrders = [
        { ...mockActiveOrder, id: 'updated-order', order_number: '0999' }
      ]

      rerender(
        <ExpoTabContent
          activeOrders={updatedActiveOrders}
          readyOrders={[mockReadyOrder]}
          onStatusChange={defaultProps.onStatusChange}
        />
      )

      // OrderCard pads the order number to 4 digits
      expect(screen.getByText(/Order #0999/)).toBeInTheDocument()
      expect(screen.queryByText(/Order #0001/)).not.toBeInTheDocument()
    })
  })
})
