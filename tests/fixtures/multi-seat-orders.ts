/**
 * Multi-Seat Order Test Fixtures
 * Task: TEST_001
 * Purpose: Mock data and utilities for testing multi-seat ordering functionality
 * Author: TESTING_AGENT (Claude Code)
 * Created: 2025-10-29
 */

import type { Table, TableStatus } from '@rebuild/shared'
import type { Order, OrderStatus, OrderType, PaymentStatus } from '@rebuild/shared'

// ============================================================================
// Table Fixtures
// ============================================================================

/**
 * Mock Table 5 with 4-person capacity
 * Used as primary test table for multi-seat ordering scenarios
 */
export const MOCK_TABLE_5: Table = {
  id: 'test-table-5-id',
  restaurant_id: '11111111-1111-1111-1111-111111111111',
  table_number: '5',
  capacity: 4,
  status: 'available' as TableStatus,
  section: 'Main Dining',
  position: {
    x: 200,
    y: 150
  },
  shape: 'square',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

/**
 * Table 5 with occupied status (has active orders)
 */
export const MOCK_TABLE_5_OCCUPIED: Table = {
  ...MOCK_TABLE_5,
  status: 'occupied' as TableStatus,
  current_order_id: 'test-order-1'
}

// ============================================================================
// Seat-Specific Order Items
// ============================================================================

export interface MockOrderItem {
  id: string
  menu_item_id: string
  name: string
  quantity: number
  price: number
  modifiers?: Array<{ id: string; name: string; price: number; category?: string }>
  special_instructions?: string
  subtotal: number
}

/**
 * Menu items for Seat 1
 */
export const SEAT_1_ITEMS: MockOrderItem[] = [
  {
    id: 'item-1-1',
    menu_item_id: 'menu-soul-bowl',
    name: 'Soul Bowl',
    quantity: 1,
    price: 12.99,
    modifiers: [
      { id: 'mod-1', name: 'Extra Avocado', price: 2.00 },
      { id: 'mod-2', name: 'No Onions', price: 0 }
    ],
    subtotal: 14.99
  },
  {
    id: 'item-1-2',
    menu_item_id: 'menu-green-juice',
    name: 'Green Juice',
    quantity: 1,
    price: 6.99,
    subtotal: 6.99
  }
]

/**
 * Menu items for Seat 2
 */
export const SEAT_2_ITEMS: MockOrderItem[] = [
  {
    id: 'item-2-1',
    menu_item_id: 'menu-power-wrap',
    name: 'Power Wrap',
    quantity: 1,
    price: 10.99,
    subtotal: 10.99
  },
  {
    id: 'item-2-2',
    menu_item_id: 'menu-kombucha',
    name: 'Kombucha',
    quantity: 1,
    price: 4.99,
    subtotal: 4.99
  }
]

/**
 * Menu items for Seat 3
 */
export const SEAT_3_ITEMS: MockOrderItem[] = [
  {
    id: 'item-3-1',
    menu_item_id: 'menu-buddha-bowl',
    name: 'Buddha Bowl',
    quantity: 2,
    price: 13.99,
    special_instructions: 'Dressing on the side',
    subtotal: 27.98
  }
]

/**
 * Menu items for Seat 4
 */
export const SEAT_4_ITEMS: MockOrderItem[] = [
  {
    id: 'item-4-1',
    menu_item_id: 'menu-acai-bowl',
    name: 'Acai Bowl',
    quantity: 1,
    price: 11.99,
    modifiers: [
      { id: 'mod-3', name: 'Extra Granola', price: 1.00 }
    ],
    subtotal: 12.99
  },
  {
    id: 'item-4-2',
    menu_item_id: 'menu-matcha-latte',
    name: 'Matcha Latte',
    quantity: 1,
    price: 5.99,
    subtotal: 5.99
  }
]

// ============================================================================
// Complete Order Fixtures
// ============================================================================

/**
 * Generate a complete order for a specific seat at Table 5
 */
export function generateSeatOrder(
  seatNumber: number,
  items: MockOrderItem[],
  overrides?: Partial<Order>
): Order {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax

  return {
    id: `test-order-table5-seat${seatNumber}`,
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    order_number: `T5S${seatNumber}-${Date.now()}`,
    customer_name: `Table 5 - Seat ${seatNumber}`,
    type: 'online' as OrderType, // Maps to 'dine-in' in UI
    status: 'new' as OrderStatus,
    items: items,
    subtotal,
    tax,
    total,
    payment_status: 'pending' as PaymentStatus,
    table_number: '5',
    seat_number: seatNumber, // NEW: seat_number field
    notes: `Voice order from Table 5, Seat ${seatNumber}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Mock order for Table 5, Seat 1
 */
export const MOCK_ORDER_SEAT_1 = generateSeatOrder(1, SEAT_1_ITEMS)

/**
 * Mock order for Table 5, Seat 2
 */
export const MOCK_ORDER_SEAT_2 = generateSeatOrder(2, SEAT_2_ITEMS)

/**
 * Mock order for Table 5, Seat 3
 */
export const MOCK_ORDER_SEAT_3 = generateSeatOrder(3, SEAT_3_ITEMS)

/**
 * Mock order for Table 5, Seat 4
 */
export const MOCK_ORDER_SEAT_4 = generateSeatOrder(4, SEAT_4_ITEMS)

/**
 * All orders for Table 5 (multi-seat scenario)
 */
export const ALL_TABLE_5_ORDERS = [
  MOCK_ORDER_SEAT_1,
  MOCK_ORDER_SEAT_2,
  MOCK_ORDER_SEAT_3,
  MOCK_ORDER_SEAT_4
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate seat-specific order items for testing
 * @param seatNumber - Seat number (1-4)
 * @param itemCount - Number of items to generate
 * @returns Array of mock order items
 */
export function generateSeatItems(seatNumber: number, itemCount: number = 2): MockOrderItem[] {
  const items: MockOrderItem[] = []

  for (let i = 0; i < itemCount; i++) {
    const itemId = i + 1
    items.push({
      id: `item-${seatNumber}-${itemId}`,
      menu_item_id: `menu-item-${seatNumber}-${itemId}`,
      name: `Test Item ${seatNumber}-${itemId}`,
      quantity: 1,
      price: 10.99 + i,
      subtotal: 10.99 + i
    })
  }

  return items
}

/**
 * Generate a batch of orders for all seats at a table
 * @param tableNumber - Table number (e.g., "5")
 * @param capacity - Number of seats at the table
 * @returns Array of orders for each seat
 */
export function generateMultiSeatOrders(
  tableNumber: string,
  capacity: number = 4
): Order[] {
  const orders: Order[] = []

  for (let seat = 1; seat <= capacity; seat++) {
    const items = generateSeatItems(seat)
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const tax = subtotal * 0.08
    const total = subtotal + tax

    orders.push({
      id: `order-table${tableNumber}-seat${seat}`,
      restaurant_id: '11111111-1111-1111-1111-111111111111',
      order_number: `T${tableNumber}S${seat}-${Date.now()}`,
      customer_name: `Table ${tableNumber} - Seat ${seat}`,
      type: 'online' as OrderType,
      status: 'new' as OrderStatus,
      items,
      subtotal,
      tax,
      total,
      payment_status: 'pending' as PaymentStatus,
      table_number: tableNumber,
      seat_number: seat,
      notes: `Test order for Table ${tableNumber}, Seat ${seat}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  return orders
}

/**
 * Get mock order data for a specific seat
 * @param seatNumber - Seat number (1-4)
 * @returns Order fixture for that seat
 */
export function getMockOrderForSeat(seatNumber: number): Order {
  switch (seatNumber) {
    case 1:
      return MOCK_ORDER_SEAT_1
    case 2:
      return MOCK_ORDER_SEAT_2
    case 3:
      return MOCK_ORDER_SEAT_3
    case 4:
      return MOCK_ORDER_SEAT_4
    default:
      throw new Error(`Invalid seat number: ${seatNumber}. Must be 1-4.`)
  }
}

/**
 * Get mock items for a specific seat
 * @param seatNumber - Seat number (1-4)
 * @returns Order items for that seat
 */
export function getMockItemsForSeat(seatNumber: number): MockOrderItem[] {
  switch (seatNumber) {
    case 1:
      return SEAT_1_ITEMS
    case 2:
      return SEAT_2_ITEMS
    case 3:
      return SEAT_3_ITEMS
    case 4:
      return SEAT_4_ITEMS
    default:
      throw new Error(`Invalid seat number: ${seatNumber}. Must be 1-4.`)
  }
}

/**
 * Calculate total for all orders at a table
 * @param orders - Array of orders
 * @returns Total amount for all orders
 */
export function calculateTableTotal(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + order.total, 0)
}

/**
 * Check if a seat is already ordered at a table
 * @param orders - Array of existing orders
 * @param seatNumber - Seat number to check
 * @returns True if seat has an order
 */
export function isSeatOrdered(orders: Order[], seatNumber: number): boolean {
  return orders.some(order => order.seat_number === seatNumber)
}

/**
 * Get list of ordered seats at a table
 * @param orders - Array of orders
 * @returns Array of seat numbers that have orders
 */
export function getOrderedSeats(orders: Order[]): number[] {
  return orders
    .map(order => order.seat_number)
    .filter((seat): seat is number => seat !== undefined)
    .sort((a, b) => a - b)
}

/**
 * Get list of available seats at a table
 * @param capacity - Table capacity
 * @param orders - Array of existing orders
 * @returns Array of seat numbers that are available
 */
export function getAvailableSeats(capacity: number, orders: Order[]): number[] {
  const orderedSeats = getOrderedSeats(orders)
  const allSeats = Array.from({ length: capacity }, (_, i) => i + 1)
  return allSeats.filter(seat => !orderedSeats.includes(seat))
}

// ============================================================================
// Voice Order Transcripts (for testing voice input)
// ============================================================================

export const VOICE_TRANSCRIPTS = {
  seat1: "I'll have a Soul Bowl with extra avocado and no onions, and a Green Juice",
  seat2: "Can I get a Power Wrap and a Kombucha please",
  seat3: "I'd like two Buddha Bowls, dressing on the side",
  seat4: "One Acai Bowl with extra granola and a Matcha Latte"
}

// ============================================================================
// API Response Mocks
// ============================================================================

/**
 * Mock API response for successful order submission
 */
export function mockOrderSubmissionSuccess(order: Order) {
  return {
    success: true,
    data: {
      order,
      message: `Order submitted successfully for Table ${order.table_number}, Seat ${order.seat_number}`
    }
  }
}

/**
 * Mock API response for order submission failure
 */
export function mockOrderSubmissionError(error: string) {
  return {
    success: false,
    error,
    message: 'Failed to submit order'
  }
}

/**
 * Mock API response for fetching orders by table
 */
export function mockGetOrdersByTable(tableNumber: string, orders: Order[]) {
  return {
    success: true,
    data: orders.filter(order => order.table_number === tableNumber)
  }
}

// ============================================================================
// Exports
// ============================================================================

export const MULTI_SEAT_FIXTURES = {
  // Tables
  table: MOCK_TABLE_5,
  tableOccupied: MOCK_TABLE_5_OCCUPIED,

  // Orders
  orders: {
    seat1: MOCK_ORDER_SEAT_1,
    seat2: MOCK_ORDER_SEAT_2,
    seat3: MOCK_ORDER_SEAT_3,
    seat4: MOCK_ORDER_SEAT_4,
    all: ALL_TABLE_5_ORDERS
  },

  // Items
  items: {
    seat1: SEAT_1_ITEMS,
    seat2: SEAT_2_ITEMS,
    seat3: SEAT_3_ITEMS,
    seat4: SEAT_4_ITEMS
  },

  // Voice transcripts
  transcripts: VOICE_TRANSCRIPTS,

  // Helpers
  generateSeatOrder,
  generateSeatItems,
  generateMultiSeatOrders,
  getMockOrderForSeat,
  getMockItemsForSeat,
  calculateTableTotal,
  isSeatOrdered,
  getOrderedSeats,
  getAvailableSeats,
  mockOrderSubmissionSuccess,
  mockOrderSubmissionError,
  mockGetOrdersByTable
}
