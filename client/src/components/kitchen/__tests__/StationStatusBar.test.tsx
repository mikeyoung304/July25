import React from 'react'
import { describe, it, expect, vi, beforeEach, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StationStatusBar, StationDots, DEFAULT_STATIONS, type Station } from '../StationStatusBar'
import type { Order, OrderItem } from '@rebuild/shared'

describe('StationStatusBar', () => {
  const createMockOrder = (
    id: string,
    status: Order['status'],
    items: Array<{ name: string; quantity: number }>
  ): Order => ({
    id,
    restaurant_id: 'rest-1',
    order_number: '001',
    type: 'online',
    status,
    items: items.map((item, i) => ({
      id: `item-${i}`,
      menu_item_id: `menu-${i}`,
      name: item.name,
      quantity: item.quantity,
      price: 10.00,
      subtotal: 10.00 * item.quantity
    })),
    subtotal: 10.00,
    tax: 0.80,
    total: 10.80,
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  const defaultOrders: Order[] = [
    createMockOrder('order-1', 'preparing', [
      { name: 'Grilled Burger', quantity: 2 },
      { name: 'Caesar Salad', quantity: 1 }
    ]),
    createMockOrder('order-2', 'pending', [
      { name: 'Steak Dinner', quantity: 1 }
    ])
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component rendering', () => {
    it('renders station status bar with orders', () => {
      render(<StationStatusBar orders={defaultOrders} />)
      expect(screen.getByText('Stations:')).toBeInTheDocument()
    })

    it('renders with empty orders array', () => {
      const { container } = render(<StationStatusBar orders={[]} />)
      expect(container).toBeTruthy()
      expect(screen.getByText('Stations:')).toBeInTheDocument()
    })

    it('displays overall completion percentage', () => {
      render(<StationStatusBar orders={defaultOrders} />)
      // Component shows X% for overall completion
      expect(screen.getByText(/\d+%/)).toBeInTheDocument()
    })
  })

  describe('Station status calculation', () => {
    it('shows 100% completion for all ready orders', () => {
      const completedOrders = [
        createMockOrder('order-1', 'ready', [{ name: 'Grilled Burger', quantity: 1 }])
      ]
      render(<StationStatusBar orders={completedOrders} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('shows 0% completion for all pending orders', () => {
      const pendingOrders = [
        createMockOrder('order-1', 'pending', [{ name: 'Grilled Burger', quantity: 1 }])
      ]
      render(<StationStatusBar orders={pendingOrders} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('calculates partial completion correctly', () => {
      const mixedOrders = [
        createMockOrder('order-1', 'completed', [{ name: 'Burger', quantity: 1 }]),
        createMockOrder('order-2', 'pending', [{ name: 'Burger', quantity: 1 }])
      ]
      render(<StationStatusBar orders={mixedOrders} />)
      expect(screen.getByText('50%')).toBeInTheDocument()
    })
  })

  describe('Station assignment', () => {
    test.todo('assigns grill items based on keywords')
    test.todo('assigns salad items based on keywords')
    test.todo('defaults to first station for unmatched items')
  })

  describe('Custom stations', () => {
    it('renders with custom stations prop', () => {
      const customStations: Station[] = [
        {
          id: 'custom',
          name: 'Custom Station',
          icon: <span data-testid="custom-icon">C</span>,
          categories: ['custom'],
          color: 'red'
        }
      ]
      render(<StationStatusBar orders={defaultOrders} stations={customStations} />)
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })
  })

  describe('Display options', () => {
    it('shows labels when showLabels is true', () => {
      render(<StationStatusBar orders={defaultOrders} showLabels={true} />)
      // Station names should be visible
      expect(screen.getByText('Grill')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <StationStatusBar orders={defaultOrders} className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Edge cases', () => {
    it('handles orders with no items', () => {
      const emptyItemOrder = createMockOrder('order-1', 'pending', [])
      const { container } = render(<StationStatusBar orders={[emptyItemOrder]} />)
      expect(container).toBeTruthy()
    })

    it('handles large quantity items', () => {
      const largeOrder = createMockOrder('order-1', 'pending', [
        { name: 'Burger', quantity: 100 }
      ])
      const { container } = render(<StationStatusBar orders={[largeOrder]} />)
      expect(container).toBeTruthy()
    })
  })

  describe('DEFAULT_STATIONS configuration', () => {
    it('includes grill station', () => {
      expect(DEFAULT_STATIONS.some(s => s.id === 'grill')).toBe(true)
    })

    it('includes saute station', () => {
      expect(DEFAULT_STATIONS.some(s => s.id === 'saute')).toBe(true)
    })

    it('includes salad station', () => {
      expect(DEFAULT_STATIONS.some(s => s.id === 'salad')).toBe(true)
    })

    it('includes fry station', () => {
      expect(DEFAULT_STATIONS.some(s => s.id === 'fry')).toBe(true)
    })

    it('includes dessert station', () => {
      expect(DEFAULT_STATIONS.some(s => s.id === 'dessert')).toBe(true)
    })

    it('includes beverage station', () => {
      expect(DEFAULT_STATIONS.some(s => s.id === 'beverage')).toBe(true)
    })

    it('stations have proper configuration', () => {
      DEFAULT_STATIONS.forEach(station => {
        expect(station.id).toBeTruthy()
        expect(station.name).toBeTruthy()
        expect(station.icon).toBeTruthy()
        expect(Array.isArray(station.categories)).toBe(true)
        expect(station.color).toBeTruthy()
      })
    })
  })
})

describe('StationDots', () => {
  const createMockOrder = (
    id: string,
    status: Order['status'],
    items: Array<{ name: string; quantity: number }>
  ): Order => ({
    id,
    restaurant_id: 'rest-1',
    order_number: '001',
    type: 'online',
    status,
    items: items.map((item, i) => ({
      id: `item-${i}`,
      menu_item_id: `menu-${i}`,
      name: item.name,
      quantity: item.quantity,
      price: 10.00,
      subtotal: 10.00 * item.quantity
    })),
    subtotal: 10.00,
    tax: 0.80,
    total: 10.80,
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  it('renders dots for stations with items', () => {
    const orders = [
      createMockOrder('order-1', 'preparing', [{ name: 'Burger', quantity: 1 }])
    ]
    const { container } = render(<StationDots orders={orders} />)
    // Should render at least one dot
    expect(container.querySelectorAll('.rounded-full').length).toBeGreaterThan(0)
  })

  it('renders with empty orders', () => {
    const { container } = render(<StationDots orders={[]} />)
    expect(container).toBeTruthy()
  })

  it('supports size prop', () => {
    const orders = [
      createMockOrder('order-1', 'preparing', [{ name: 'Burger', quantity: 1 }])
    ]
    const { container: smContainer } = render(<StationDots orders={orders} size="sm" />)
    const { container: lgContainer } = render(<StationDots orders={orders} size="lg" />)

    expect(smContainer.querySelector('.w-2')).toBeTruthy()
    expect(lgContainer.querySelector('.w-4')).toBeTruthy()
  })
})
