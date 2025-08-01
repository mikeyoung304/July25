/**
 * Unified Customer Types
 * Single source of truth for all customer-related types
 */

export interface Customer {
  id: string;
  restaurant_id: string;
  email?: string;
  phone?: string;
  name: string;
  loyalty_points?: number;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  preferred_payment_method?: string;
  dietary_preferences?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
  is_default: boolean;
  delivery_instructions?: string;
}

export interface CreateCustomerDTO {
  restaurant_id: string;
  email?: string;
  phone?: string;
  name: string;
  dietary_preferences?: string[];
  notes?: string;
}

export interface UpdateCustomerDTO {
  email?: string;
  phone?: string;
  name?: string;
  dietary_preferences?: string[];
  notes?: string;
}