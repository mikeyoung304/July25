/**
 * Order Test Factory
 *
 * Creates mock Order objects for testing with sensible defaults.
 * All fields can be overridden for specific test cases.
 *
 * Usage:
 * ```typescript
 * import { createOrder, createPaidOrder, createOrderWithItems } from '@/test/factories/order.factory';
 *
 * const order = createOrder({ total: 49.99 });
 * const paidOrder = createPaidOrder();
 * const orderWithItems = createOrderWithItems(3);
 * ```
 */

import type {
  Order,
  OrderItem,
  OrderItemModifier,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PaymentMethod,
} from '@rebuild/shared/types';

// Default test restaurant ID (matches CLAUDE.md test IDs)
export const TEST_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
export const ALT_RESTAURANT_ID = '22222222-2222-2222-2222-222222222222';

let orderCounter = 0;
let itemCounter = 0;

/**
 * Reset factory counters (call in beforeEach for deterministic IDs)
 */
export function resetOrderCounters() {
  orderCounter = 0;
  itemCounter = 0;
}

/**
 * Create a mock OrderItemModifier
 */
export function createModifier(overrides: Partial<OrderItemModifier> = {}): OrderItemModifier {
  return {
    id: `modifier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Extra Cheese',
    price: 1.50,
    ...overrides,
  };
}

/**
 * Create a mock OrderItem
 */
export function createOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  itemCounter++;
  const price = overrides.price ?? 9.99;
  const quantity = overrides.quantity ?? 1;

  return {
    id: `item-${itemCounter}`,
    menu_item_id: `menu-item-${itemCounter}`,
    name: `Test Item ${itemCounter}`,
    quantity,
    price,
    subtotal: price * quantity,
    modifiers: [],
    ...overrides,
  };
}

/**
 * Create multiple OrderItems
 */
export function createOrderItems(count: number, overrides: Partial<OrderItem> = {}): OrderItem[] {
  return Array.from({ length: count }, () => createOrderItem(overrides));
}

/**
 * Create a base Order with default values
 */
export function createOrder(overrides: Partial<Order> = {}): Order {
  orderCounter++;
  const now = new Date().toISOString();

  // Calculate totals from items if provided
  const items = overrides.items ?? [];
  const subtotal = overrides.subtotal ?? (items.reduce((sum, item) => sum + item.subtotal, 0) || 10.00);
  const tax = overrides.tax ?? subtotal * 0.0825; // 8.25% tax
  const tip = overrides.tip ?? 0;
  const total = overrides.total ?? subtotal + tax + tip;

  return {
    id: `order-${orderCounter}`,
    restaurant_id: TEST_RESTAURANT_ID,
    order_number: `ORD-${String(orderCounter).padStart(4, '0')}`,
    type: 'pickup' as OrderType,
    status: 'pending' as OrderStatus,
    items,
    subtotal,
    tax,
    tip,
    total,
    payment_status: 'pending' as PaymentStatus,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Create an Order with items
 */
export function createOrderWithItems(
  itemCount: number,
  orderOverrides: Partial<Order> = {},
  itemOverrides: Partial<OrderItem> = {}
): Order {
  const items = createOrderItems(itemCount, itemOverrides);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.0825;

  return createOrder({
    items,
    subtotal,
    tax,
    total: subtotal + tax,
    ...orderOverrides,
  });
}

/**
 * Create a paid/completed Order
 */
export function createPaidOrder(overrides: Partial<Order> = {}): Order {
  return createOrder({
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'card',
    total: 29.99,
    completed_at: new Date().toISOString(),
    ...overrides,
  });
}

/**
 * Create an Order in each status for testing status flows
 */
export function createOrdersInAllStatuses(): Record<OrderStatus, Order> {
  const statuses: OrderStatus[] = [
    'new',
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'picked-up',
    'completed',
    'cancelled',
  ];

  return statuses.reduce((acc, status) => {
    acc[status] = createOrder({ status });
    return acc;
  }, {} as Record<OrderStatus, Order>);
}

/**
 * Create a scheduled Order
 */
export function createScheduledOrder(
  scheduledTime: Date | string,
  overrides: Partial<Order> = {}
): Order {
  const scheduledPickupTime = typeof scheduledTime === 'string'
    ? scheduledTime
    : scheduledTime.toISOString();

  return createOrder({
    is_scheduled: true,
    scheduled_pickup_time: scheduledPickupTime,
    status: 'pending',
    ...overrides,
  });
}

/**
 * Create an Order for online ordering
 */
export function createOnlineOrder(overrides: Partial<Order> = {}): Order {
  return createOrder({
    type: 'online',
    customer_name: 'Test Customer',
    customer_email: 'test@example.com',
    customer_phone: '555-555-1234',
    ...overrides,
  });
}

/**
 * Create an Order for dine-in with table info
 */
export function createDineInOrder(
  tableNumber: string,
  overrides: Partial<Order> = {}
): Order {
  return createOrder({
    type: 'pickup', // DB type
    table_number: tableNumber,
    metadata: {
      uiType: 'dine-in',
      ...overrides.metadata,
    },
    ...overrides,
  });
}
