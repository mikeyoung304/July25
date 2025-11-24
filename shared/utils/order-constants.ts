/**
 * Order Constants and Browser-Safe Utilities
 *
 * This file contains ONLY browser-safe code:
 * - TypeScript types
 * - Constants (arrays, enums)
 * - Pure helper functions
 *
 * NO Joi schemas (Node.js only) - those live in validation/order.schema.ts
 *
 * Per ADR-001: All layers use snake_case
 */

import type { OrderStatus, OrderType, PaymentStatus, PaymentMethod } from '../types/order.types';

/**
 * Valid order statuses - matches shared/types/order.types.ts
 * Flow: new → pending → confirmed → preparing → ready → picked-up → completed
 *       (any status can transition to cancelled)
 */
export const ORDER_STATUSES: OrderStatus[] = [
  'new',
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked-up',
  'completed',
  'cancelled'
];

/**
 * Database-valid order types (what goes in the database)
 */
export const DB_ORDER_TYPES: OrderType[] = ['online', 'pickup', 'delivery'];

/**
 * UI order types that get mapped to DB types
 */
export const UI_ORDER_TYPES = ['kiosk', 'drive-thru', 'online', 'voice', 'dine-in', 'takeout', 'delivery'];

/**
 * Valid payment statuses
 */
export const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'refunded', 'failed'];

/**
 * Valid payment methods
 */
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'online', 'other'];

/**
 * Helper: Validate UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Helper: Map UI order type to DB order type
 */
export function mapOrderTypeToDb(uiType: string): OrderType {
  const mapping: Record<string, OrderType> = {
    'kiosk': 'online',
    'voice': 'online',
    'dine-in': 'online',
    'drive-thru': 'pickup',
    'takeout': 'pickup',
    'online': 'online',
    'pickup': 'pickup',
    'delivery': 'delivery'
  };

  return mapping[uiType] || 'online';
}

/**
 * Backward compatibility exports (same names as before)
 */
export const ORDER_STATUS_VALUES = ORDER_STATUSES;
export const DB_ORDER_TYPE_VALUES = DB_ORDER_TYPES;
export const UI_ORDER_TYPE_VALUES = UI_ORDER_TYPES;
export const PAYMENT_STATUS_VALUES = PAYMENT_STATUSES;
export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS;
