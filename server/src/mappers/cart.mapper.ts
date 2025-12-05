/**
 * Cart/Order API boundary mappers
 *
 * ADR-001: ALL layers use snake_case - database, API, and client.
 * No transformations between layers.
 *
 * Note: These mappers are largely unused as orders.service.ts returns
 * raw snake_case data directly. Kept for potential future use.
 */

// Database/API types (snake_case - same format per ADR-001)
interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: any[];
  special_instructions?: string;
  image_url?: string;
}

interface Order {
  id: string;
  order_number: string;
  restaurant_id: string;
  table_number?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  status: string;
  type: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
  total_amount: number;
}

// Export types for consistency (all snake_case per ADR-001)
export type ApiCartItem = CartItem;
export type ApiOrder = Order;

/**
 * Map database cart item to API format (pass-through with defaults)
 * Per ADR-001: No case transformations needed
 */
export function mapCartItem(dbItem: any): CartItem {
  return {
    id: dbItem.id,
    menu_item_id: dbItem.menu_item_id,
    name: dbItem.name,
    price: dbItem.price,
    quantity: dbItem.quantity,
    modifiers: dbItem.modifiers || [],
    ...(dbItem.special_instructions ? { special_instructions: dbItem.special_instructions } : {}),
    ...(dbItem.image_url ? { image_url: dbItem.image_url } : {}),
  };
}

/**
 * Map database order to API format (pass-through with defaults)
 * Per ADR-001: No case transformations needed
 */
export function mapOrder(dbOrder: any): Order {
  return {
    id: dbOrder.id,
    order_number: dbOrder.order_number,
    restaurant_id: dbOrder.restaurant_id,
    ...(dbOrder.table_number != null ? { table_number: dbOrder.table_number } : {}),
    ...(dbOrder.customer_name ? { customer_name: dbOrder.customer_name } : {}),
    ...(dbOrder.customer_email ? { customer_email: dbOrder.customer_email } : {}),
    ...(dbOrder.customer_phone ? { customer_phone: dbOrder.customer_phone } : {}),
    status: dbOrder.status,
    type: dbOrder.type,
    created_at: dbOrder.created_at,
    updated_at: dbOrder.updated_at,
    items: (dbOrder.items || []).map(mapCartItem),
    total_amount: dbOrder.total_amount,
  };
}

/**
 * Map array of cart items
 */
export function mapCartItems(dbItems: any[]): CartItem[] {
  return dbItems.map(mapCartItem);
}

/**
 * Map array of orders
 */
export function mapOrders(dbOrders: any[]): Order[] {
  return dbOrders.map(mapOrder);
}

/**
 * Pass-through mapper - no transformation needed per ADR-001
 * @deprecated Use direct assignment instead - this function is a no-op
 */
export function mapToSnakeCase<T = any>(record: any): T {
  // ADR-001: No transformation needed - all layers use snake_case
  return record as T;
}
