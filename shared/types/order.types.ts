/**
 * Unified Order Types
 * Single source of truth for all order-related types
 */

export type OrderStatus = 
  | 'new'
  | 'pending'
  | 'confirmed' 
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

// Database-valid order types (what goes in the database)
export type OrderType = 'online' | 'pickup' | 'delivery';

// UI order types (what users see in the interface)
export type UIOrderType = 'dine-in' | 'takeout' | 'delivery' | 'online' | 'kiosk' | 'voice';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export type PaymentMethod = 'cash' | 'card' | 'online' | 'other';

export interface OrderItemModifier {
  id: string;
  name: string;
  price: number;
  category?: string;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: OrderItemModifier[];
  special_instructions?: string;
  subtotal: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  table_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  estimated_ready_time?: string;
}

export interface CreateOrderDTO {
  restaurant_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  type: OrderType;
  items: Omit<OrderItem, 'id' | 'subtotal'>[];
  table_number?: string;
  notes?: string;
  payment_method?: PaymentMethod;
}

export interface UpdateOrderDTO {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  estimated_ready_time?: string;
  notes?: string;
}

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  type?: OrderType | OrderType[];
  payment_status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
}