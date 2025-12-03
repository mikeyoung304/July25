/**
 * Unified Table Types
 * Single source of truth for all table-related types
 *
 * Note: Database uses x_pos/y_pos/shape but API/client use x/y/type
 */

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'unavailable' | 'cleaning' | 'paid';

export type TableShape = 'circle' | 'rectangle' | 'square' | 'chip_monkey';

/**
 * Full table type as used by client and API
 * Database fields are transformed by the API:
 * - x_pos → x, y_pos → y, shape → type
 */
export interface Table {
  id: string;
  restaurant_id: string;
  label: string;           // Table identifier/number
  seats: number;
  status: TableStatus;
  type: TableShape;        // Stored as 'shape' in DB, transformed to 'type' by API
  x: number;              // Stored as x_pos in DB
  y: number;              // Stored as y_pos in DB
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  current_order_id?: string | null;
  active?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Simplified database table type for Supabase subscriptions
 * Contains only essential fields without UI layout properties
 */
export interface DatabaseTable {
  id: string;
  restaurant_id: string;
  label: string;
  seats: number;
  status: TableStatus;
  current_order_id?: string | null;
}

/**
 * DTO for creating new tables
 */
export interface CreateTableDTO {
  restaurant_id: string;
  label: string;
  seats: number;
  type?: TableShape;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  z_index?: number;
}

/**
 * DTO for updating tables
 */
export interface UpdateTableDTO {
  label?: string;
  seats?: number;
  status?: TableStatus;
  type?: TableShape;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  z_index?: number;
  current_order_id?: string | null;
  active?: boolean;
}