/**
 * Canonical Order Types - CamelCase Only
 * This is the single source of truth for all order-related types in the application.
 *
 * IMPORTANT: All properties MUST be in camelCase.
 * Snake_case is only allowed at the database boundary.
 */

export type OrderStatus =
  | 'new'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

// UI-friendly order types (what users see)
export type OrderType =
  | 'dine-in'
  | 'takeout'
  | 'delivery'
  | 'online'
  | 'drive-thru'
  | 'kiosk'
  | 'voice';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export type PaymentMethod = 'cash' | 'card' | 'online' | 'other';

export interface OrderItemModifier {
  id?: string;
  name: string;
  price: number;
  category?: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: OrderItemModifier[];
  specialInstructions?: string;
  notes?: string;
  subtotal: number;
  category?: string;
}

/**
 * Canonical Order interface - all camelCase
 */
export interface Order {
  // Core identifiers
  id: string;
  restaurantId: string;
  orderNumber: string;

  // Customer information
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;

  // Order details
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];

  // Financial
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;

  // Location/Service
  tableNumber?: string;
  notes?: string;

  // Timestamps (ISO strings)
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  estimatedReadyTime?: string;
  prepTimeMinutes?: number;
}

/**
 * Database row type - snake_case
 * This type represents the actual database schema
 * Only used in transformation layer
 */
export interface OrderDbRow {
  id: string;
  restaurant_id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  type: string;
  status: string;
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  payment_status: string;
  payment_method?: string;
  table_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  estimated_ready_time?: string;
  prep_time_minutes?: number;
}

export interface OrderItemDbRow {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  special_instructions?: string;
  subtotal: number;
}

/**
 * DTO types for API requests/responses
 */
export interface CreateOrderDTO {
  restaurantId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  type: OrderType;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    modifiers?: OrderItemModifier[];
    notes?: string;
  }>;
  tableNumber?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
}

export interface UpdateOrderDTO {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  estimatedReadyTime?: string;
  notes?: string;
}

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  type?: OrderType | OrderType[];
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'createdAt' | 'orderNumber' | 'tableNumber' | 'status' | 'total';
  sortDirection?: 'asc' | 'desc';
}