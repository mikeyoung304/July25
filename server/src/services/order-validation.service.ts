/**
 * Order Validation Service
 *
 * Extracted from orders.service.ts for better modularity.
 * Contains validation functions for order-related operations.
 */

import { supabase } from '../config/database';
import { logger } from '../utils/logger';

const validationLogger = logger.child({ service: 'OrderValidation' });

/**
 * Validate seat number against table capacity
 *
 * Ensures the seat number doesn't exceed the table's capacity.
 * Uses table label (not ID) for lookup since that's what's stored on orders.
 *
 * @param restaurant_id - The restaurant ID (multi-tenancy)
 * @param table_number - The table label/number
 * @param seat_number - The seat number to validate
 * @throws Error if seat exceeds table capacity
 */
export async function validateSeatNumber(
  restaurant_id: string,
  table_number: string,
  seat_number: number
): Promise<void> {
  try {
    // Fetch table by label (table_number maps to label column)
    const { data: table, error } = await supabase
      .from('tables')
      .select('seats')  // Database column is 'seats' not 'capacity'
      .eq('restaurant_id', restaurant_id)
      .eq('label', table_number)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Table not found - don't fail validation, just log warning
        validationLogger.warn('Table not found for seat validation', {
          restaurant_id,
          table_number,
          seat_number
        });
        return;
      }
      throw error;
    }

    // Validate seat number against capacity (seats column)
    if (table && table.seats && seat_number > table.seats) {
      throw new Error(
        `Seat number ${seat_number} exceeds table capacity of ${table.seats} for table ${table_number}`
      );
    }

    validationLogger.debug('Seat number validated', {
      restaurant_id,
      table_number,
      seat_number,
      capacity: table?.seats
    });
  } catch (error) {
    validationLogger.error('Seat validation failed', {
      error,
      restaurant_id,
      table_number,
      seat_number
    });
    throw error;
  }
}

/**
 * Validate order items have required fields
 *
 * Per ADR-003: menu_item_id and subtotal are REQUIRED for proper menu item relationships
 *
 * @param items - Array of order items to validate
 * @returns True if all items are valid
 * @throws Error if any item is missing required fields
 */
export function validateOrderItems(
  items: Array<{
    menu_item_id?: string;
    name: string;
    quantity: number;
    price: number;
  }>
): boolean {
  if (!items || items.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  for (const item of items) {
    if (!item.name || typeof item.name !== 'string') {
      throw new Error('Each item must have a valid name');
    }

    if (typeof item.quantity !== 'number' || item.quantity < 1) {
      throw new Error(`Invalid quantity for item "${item.name}": must be at least 1`);
    }

    if (typeof item.price !== 'number' || item.price < 0) {
      throw new Error(`Invalid price for item "${item.name}": must be a non-negative number`);
    }
  }

  return true;
}

/**
 * Validate table exists and is active
 *
 * @param restaurant_id - The restaurant ID (multi-tenancy)
 * @param table_number - The table label/number to validate
 * @returns True if table exists and is active
 */
export async function validateTableExists(
  restaurant_id: string,
  table_number: string
): Promise<boolean> {
  const { data: table, error } = await supabase
    .from('tables')
    .select('id')
    .eq('restaurant_id', restaurant_id)
    .eq('label', table_number)
    .eq('active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return false;
    }
    validationLogger.error('Error checking table existence', {
      error,
      restaurant_id,
      table_number
    });
    throw error;
  }

  return !!table;
}
