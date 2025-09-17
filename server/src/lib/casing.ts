/**
 * Database ↔ Application Casing Transformation Layer
 *
 * This is the ONLY place where snake_case should appear in the application layer.
 * All transformations between database (snake_case) and application (camelCase) happen here.
 *
 * IMPORTANT: Be explicit - no magic recursive transforms that break acronyms.
 */

import type {
  Order,
  OrderDbRow,
  OrderItem,
  OrderItemDbRow,
  OrderItemModifier,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PaymentMethod
} from '../../../shared/types/order.types.canonical';

/**
 * Transform database row to application Order
 * Database → Application (snake_case → camelCase)
 */
export function fromDbOrder(row: OrderDbRow): Order {
  return {
    // Core identifiers
    id: row.id,
    restaurantId: row.restaurant_id,
    orderNumber: row.order_number,

    // Customer information
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    customerEmail: row.customer_email ?? undefined,

    // Order details
    type: row.type as OrderType,
    status: row.status as OrderStatus,
    items: [], // Items loaded separately with JOIN

    // Financial
    subtotal: row.subtotal,
    tax: row.tax,
    tip: row.tip ?? undefined,
    total: row.total,
    paymentStatus: row.payment_status as PaymentStatus,
    paymentMethod: row.payment_method as PaymentMethod | undefined,

    // Location/Service
    tableNumber: row.table_number ?? undefined,
    notes: row.notes ?? undefined,

    // Timestamps
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
    estimatedReadyTime: row.estimated_ready_time ?? undefined,
    prepTimeMinutes: row.prep_time_minutes ?? undefined,
  };
}

/**
 * Transform application Order to database row
 * Application → Database (camelCase → snake_case)
 */
export function toDbOrder(order: Partial<Order>): Partial<OrderDbRow> {
  const result: Partial<OrderDbRow> = {};

  // Only map defined properties
  if (order.id !== undefined) result.id = order.id;
  if (order.restaurantId !== undefined) result.restaurant_id = order.restaurantId;
  if (order.orderNumber !== undefined) result.order_number = order.orderNumber;

  if (order.customerName !== undefined) result.customer_name = order.customerName;
  if (order.customerPhone !== undefined) result.customer_phone = order.customerPhone;
  if (order.customerEmail !== undefined) result.customer_email = order.customerEmail;

  if (order.type !== undefined) result.type = order.type;
  if (order.status !== undefined) result.status = order.status;

  if (order.subtotal !== undefined) result.subtotal = order.subtotal;
  if (order.tax !== undefined) result.tax = order.tax;
  if (order.tip !== undefined) result.tip = order.tip;
  if (order.total !== undefined) result.total = order.total;
  if (order.paymentStatus !== undefined) result.payment_status = order.paymentStatus;
  if (order.paymentMethod !== undefined) result.payment_method = order.paymentMethod;

  if (order.tableNumber !== undefined) result.table_number = order.tableNumber;
  if (order.notes !== undefined) result.notes = order.notes;

  if (order.createdAt !== undefined) result.created_at = order.createdAt;
  if (order.updatedAt !== undefined) result.updated_at = order.updatedAt;
  if (order.completedAt !== undefined) result.completed_at = order.completedAt;
  if (order.estimatedReadyTime !== undefined) result.estimated_ready_time = order.estimatedReadyTime;
  if (order.prepTimeMinutes !== undefined) result.prep_time_minutes = order.prepTimeMinutes;

  return result;
}

/**
 * Transform database order item to application OrderItem
 */
export function fromDbOrderItem(row: OrderItemDbRow & { modifiers?: any }): OrderItem {
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    name: row.name,
    quantity: row.quantity,
    price: row.price,
    specialInstructions: row.special_instructions ?? undefined,
    subtotal: row.subtotal,
    modifiers: row.modifiers ? parseModifiers(row.modifiers) : undefined,
  };
}

/**
 * Transform application OrderItem to database row
 */
export function toDbOrderItem(item: Partial<OrderItem>): Partial<OrderItemDbRow> {
  const result: Partial<OrderItemDbRow> = {};

  if (item.id !== undefined) result.id = item.id;
  if (item.menuItemId !== undefined) result.menu_item_id = item.menuItemId;
  if (item.name !== undefined) result.name = item.name;
  if (item.quantity !== undefined) result.quantity = item.quantity;
  if (item.price !== undefined) result.price = item.price;
  if (item.specialInstructions !== undefined) result.special_instructions = item.specialInstructions;
  if (item.notes !== undefined) result.special_instructions = item.notes; // Map notes to special_instructions
  if (item.subtotal !== undefined) result.subtotal = item.subtotal;

  return result;
}

/**
 * Parse modifiers from database JSON or array
 */
function parseModifiers(modifiers: any): OrderItemModifier[] | undefined {
  if (!modifiers) return undefined;

  // Handle JSON string
  if (typeof modifiers === 'string') {
    try {
      modifiers = JSON.parse(modifiers);
    } catch {
      return undefined;
    }
  }

  // Ensure it's an array
  if (!Array.isArray(modifiers)) return undefined;

  // Transform each modifier
  return modifiers.map(mod => {
    if (typeof mod === 'string') {
      // Legacy string modifier
      return { name: mod, price: 0 };
    }
    // Already an object, ensure camelCase
    return {
      id: mod.id,
      name: mod.name,
      price: mod.price ?? 0,
      category: mod.category,
    };
  });
}

/**
 * Build SQL column aliases for SELECT statements
 * This allows querying with camelCase results directly
 */
export function buildOrderSelectColumns(): string {
  return `
    id,
    restaurant_id AS "restaurantId",
    order_number AS "orderNumber",
    customer_name AS "customerName",
    customer_phone AS "customerPhone",
    customer_email AS "customerEmail",
    type,
    status,
    subtotal,
    tax,
    tip,
    total,
    payment_status AS "paymentStatus",
    payment_method AS "paymentMethod",
    table_number AS "tableNumber",
    notes,
    created_at AS "createdAt",
    updated_at AS "updatedAt",
    completed_at AS "completedAt",
    estimated_ready_time AS "estimatedReadyTime",
    prep_time_minutes AS "prepTimeMinutes"
  `;
}

/**
 * Build SQL column aliases for order items
 */
export function buildOrderItemSelectColumns(): string {
  return `
    id,
    menu_item_id AS "menuItemId",
    name,
    quantity,
    price,
    special_instructions AS "specialInstructions",
    subtotal,
    modifiers
  `;
}