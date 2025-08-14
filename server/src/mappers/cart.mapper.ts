/**
 * Cart/Order API boundary mappers
 * Transforms snake_case DB records to camelCase API responses
 */

import { camelizeKeys, snakeizeKeys } from '../utils/case';

// Database types (snake_case)
interface DbCartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: any[];
  special_instructions?: string;
  image_url?: string;
}

interface DbOrder {
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
  items: DbCartItem[];
  total_amount: number;
}

// API types (camelCase) - matching shared module
export interface ApiCartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: any[];
  specialInstructions?: string;
  imageUrl?: string;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  restaurantId: string;
  tableNumber?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  items: ApiCartItem[];
  totalAmount: number;
}

/**
 * Map database cart item to API format
 */
export function mapCartItem(dbItem: DbCartItem): ApiCartItem {
  return {
    id: dbItem.id,
    menuItemId: dbItem.menu_item_id,
    name: dbItem.name,
    price: dbItem.price,
    quantity: dbItem.quantity,
    modifiers: dbItem.modifiers || [],
    specialInstructions: dbItem.special_instructions,
    imageUrl: dbItem.image_url,
  };
}

/**
 * Map database order to API format
 */
export function mapOrder(dbOrder: DbOrder): ApiOrder {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    restaurantId: dbOrder.restaurant_id,
    tableNumber: dbOrder.table_number,
    customerName: dbOrder.customer_name,
    customerEmail: dbOrder.customer_email,
    customerPhone: dbOrder.customer_phone,
    status: dbOrder.status,
    type: dbOrder.type,
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
    items: (dbOrder.items || []).map(mapCartItem),
    totalAmount: dbOrder.total_amount,
  };
}

/**
 * Map array of cart items
 */
export function mapCartItems(dbItems: DbCartItem[]): ApiCartItem[] {
  return dbItems.map(mapCartItem);
}

/**
 * Map array of orders
 */
export function mapOrders(dbOrders: DbOrder[]): ApiOrder[] {
  return dbOrders.map(mapOrder);
}

/**
 * Convert API request (camelCase) to DB format (snake_case)
 */
export function mapToSnakeCase<T = any>(apiRecord: any): T {
  return snakeizeKeys<T>(apiRecord);
}