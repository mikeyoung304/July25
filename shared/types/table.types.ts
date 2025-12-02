/**
 * Unified Table Types
 * Single source of truth for all table-related types
 */

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'paid';

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  status: TableStatus;
  section?: string;
  position?: {
    x: number;
    y: number;
  };
  shape?: 'square' | 'round' | 'rectangle' | 'circle' | 'chip_monkey';
  current_order_id?: string;
  server_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTableDTO {
  restaurant_id: string;
  table_number: string;
  capacity: number;
  section?: string;
  position?: {
    x: number;
    y: number;
  };
  shape?: 'square' | 'round' | 'rectangle' | 'circle' | 'chip_monkey';
}

export interface UpdateTableDTO {
  capacity?: number;
  status?: TableStatus;
  section?: string;
  position?: {
    x: number;
    y: number;
  };
  shape?: 'square' | 'round' | 'rectangle' | 'circle' | 'chip_monkey';
  server_id?: string;
}