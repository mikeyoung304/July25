/**
 * Type-Safe Transformation Utilities
 * Provides safe conversion between different type formats across the application
 *
 * Note: Client* types and camelCase transformers were removed in TODO-146
 * as the codebase uses snake_case consistently (ADR-001)
 */

import type { OrderType, UIOrderType } from './order.types';

export interface Restaurant {
  id: string;
  name: string;
  logo_url?: string;
  timezone: string;
  currency: string;
  tax_rate: number;
  default_tip_percentages?: number[];
  created_at: string;
  updated_at: string;
}

// Validation error types
export class TypeTransformationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly originalValue?: unknown
  ) {
    super(message);
    this.name = 'TypeTransformationError';
  }
}

/**
 * Convert UI order types to database-valid order types
 * Maps user-facing order types to the database schema
 */
export function uiOrderTypeToDb(uiType: UIOrderType): OrderType {
  const mapping: Record<UIOrderType, OrderType> = {
    'dine-in': 'online',    // Dine-in orders use online flow
    'takeout': 'pickup',    // Takeout is pickup
    'delivery': 'delivery', // Direct mapping
    'online': 'online',     // Direct mapping
    'drive-thru': 'pickup', // Drive-thru is pickup
    'kiosk': 'online',      // Kiosk orders use online flow
    'voice': 'online'       // Voice orders use online flow
  };

  return mapping[uiType];
}

/**
 * Convert database order types to UI display types
 * Maps database schema to user-facing order types
 */
export function dbOrderTypeToUI(dbType: OrderType): UIOrderType {
  const mapping: Record<OrderType, UIOrderType> = {
    'online': 'online',
    'pickup': 'takeout',
    'delivery': 'delivery'
  };

  return mapping[dbType];
}
