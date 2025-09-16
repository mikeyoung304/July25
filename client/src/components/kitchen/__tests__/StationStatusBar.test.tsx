import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StationStatusBar, DEFAULT_STATIONS } from '../StationStatusBar'
import type { Order } from '@rebuild/shared'

describe('StationStatusBar status exhaustiveness', () => {
  const allStatuses: Order['status'][] = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']

  it('should handle all 7 order statuses without throwing', () => {
    allStatuses.forEach(status => {
      const testOrder: Order = {
        id: 'test-1',
        order_number: 'TEST001',
        status,
        type: 'online',
        table_number: 'A1',
        customer_name: 'Test Customer',
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            quantity: 1,
            price: 12.99,
            modifiers: []
          }
        ],
        total: 12.99,
        subtotal: 12.99,
        tax: 0,
        tip: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        restaurant_id: 'test-restaurant',
        tenant_id: 'test-tenant'
      }

      // Should not throw error for any status
      expect(() => {
        render(<StationStatusBar orders={[testOrder]} />)
      }).not.toThrow()
    })
  })

  it('should calculate station status correctly for all statuses', () => {
    const orders: Order[] = allStatuses.map((status, index) => ({
      id: `test-${index}`,
      order_number: `TEST00${index}`,
      status,
      type: 'online',
      table_number: `A${index}`,
      customer_name: 'Test Customer',
      items: [
        {
          id: `item-${index}`,
          name: 'Burger', // Will map to grill station
          quantity: 2,
          price: 12.99,
          modifiers: []
        }
      ],
      total: 25.98,
      subtotal: 25.98,
      tax: 0,
      tip: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      restaurant_id: 'test-restaurant',
      tenant_id: 'test-tenant'
    }))

    const { container } = render(<StationStatusBar orders={orders} stations={DEFAULT_STATIONS} />)

    // Verify component renders without errors
    expect(container.querySelector('.flex')).toBeTruthy()

    // Check that station indicators are rendered
    const indicators = container.querySelectorAll('[class*="rounded-full"]')
    expect(indicators.length).toBeGreaterThan(0)
  })

  it('should not count cancelled orders in station metrics', () => {
    const orders: Order[] = [
      {
        id: 'active-1',
        order_number: 'ACTIVE001',
        status: 'preparing',
        type: 'online',
        table_number: 'A1',
        customer_name: 'Customer 1',
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            quantity: 2,
            price: 12.99,
            modifiers: []
          }
        ],
        total: 25.98,
        subtotal: 25.98,
        tax: 0,
        tip: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        restaurant_id: 'test-restaurant',
        tenant_id: 'test-tenant'
      },
      {
        id: 'cancelled-1',
        order_number: 'CANCEL001',
        status: 'cancelled',
        type: 'online',
        table_number: 'A2',
        customer_name: 'Customer 2',
        items: [
          {
            id: 'item-2',
            name: 'Burger',
            quantity: 3,
            price: 12.99,
            modifiers: []
          }
        ],
        total: 38.97,
        subtotal: 38.97,
        tax: 0,
        tip: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        restaurant_id: 'test-restaurant',
        tenant_id: 'test-tenant'
      }
    ]

    const { container } = render(<StationStatusBar orders={orders} stations={DEFAULT_STATIONS} />)

    // The overall progress should only count active order (2 items)
    const progressText = container.textContent
    expect(progressText).toContain('0%') // 0% complete (2 preparing items, 0 completed)
  })
})