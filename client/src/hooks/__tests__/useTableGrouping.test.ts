import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react-hooks'
import { useTableGrouping } from '../useTableGrouping'
import type { Order } from '@rebuild/shared'

describe('useTableGrouping status exhaustiveness', () => {
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
            name: 'Test Item',
            quantity: 1,
            price: 10.00,
            modifiers: []
          }
        ],
        total: 10.00,
        subtotal: 10.00,
        tax: 0,
        tip: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        restaurant_id: 'test-restaurant',
        tenant_id: 'test-tenant'
      }

      // Should not throw error for any status
      expect(() => {
        renderHook(() => useTableGrouping([testOrder]))
      }).not.toThrow()
    })
  })

  it('should count items correctly for each status', () => {
    const orders: Order[] = allStatuses.map((status, index) => ({
      id: `test-${index}`,
      order_number: `TEST00${index}`,
      status,
      type: 'online',
      table_number: 'A1', // Same table for grouping
      customer_name: 'Test Customer',
      items: [
        {
          id: `item-${index}`,
          name: 'Test Item',
          quantity: 2, // 2 items per order
          price: 10.00,
          modifiers: []
        }
      ],
      total: 20.00,
      subtotal: 20.00,
      tax: 0,
      tip: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      restaurant_id: 'test-restaurant',
      tenant_id: 'test-tenant'
    }))

    const { result } = renderHook(() => useTableGrouping(orders))
    const tableGroup = result.current.tables.get('A1')

    expect(tableGroup).toBeDefined()
    if (tableGroup) {
      // Verify counts - only non-cancelled orders
      expect(tableGroup.totalItems).toBe(10) // 5 non-cancelled/completed orders * 2 items each
      expect(tableGroup.readyItems).toBe(2) // 1 ready order * 2 items
      expect(tableGroup.preparingItems).toBe(4) // 2 orders (confirmed + preparing) * 2 items
      expect(tableGroup.completedItems).toBe(0) // Completed orders are filtered out
      // New and pending items are counted in totalItems but not in specific counts
    }
  })
})