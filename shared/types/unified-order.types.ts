/**
 * SINGLE SOURCE OF TRUTH for Order Types
 * All order-related types should import from this file
 * 
 * Critical: ALL 7 statuses MUST be handled in UI components
 */

// Database order statuses (all 7 must be handled)
export const ORDER_STATUSES = [
  'new',
  'pending', 
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

// Database order types (stored in DB)
export type OrderType = 'online' | 'pickup' | 'delivery';

// UI display types (for presentation layer only)
export type UIOrderType = 
  | 'dine-in' 
  | 'takeout' 
  | 'delivery' 
  | 'online' 
  | 'drive-thru' 
  | 'kiosk' 
  | 'voice';

// Order item modifier
export interface OrderItemModifier {
  id: string;
  name: string;
  price: number;
  groupId?: string;
  groupName?: string;
}

// Order item
export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  modifiers?: OrderItemModifier[];
  subtotal: number;
}

// Main order interface
export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: string;
  status: OrderStatus;
  type: OrderType;
  items: OrderItem[];
  
  // Customer info
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  
  // Pricing
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  
  // Payment
  paymentMethod?: 'card' | 'cash' | 'online';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  
  // Additional
  notes?: string;
  tableId?: string;
  source?: UIOrderType;
}

// DTOs for API operations
export interface CreateOrderDTO {
  restaurantId?: string; // Optional, will use header
  type: OrderType;
  items: Omit<OrderItem, 'id'>[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  tableId?: string;
  tip?: number;
}

export interface UpdateOrderDTO {
  status?: OrderStatus;
  items?: OrderItem[];
  notes?: string;
  tip?: number;
}

// Filters for querying orders
export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  type?: OrderType | OrderType[];
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  tableId?: string;
  search?: string;
}

// WebSocket event payloads
export interface OrderEventPayload {
  order: Order;
  restaurantId: string;
  timestamp: string;
}

export interface OrderCreatedPayload extends OrderEventPayload {
  type: 'order_created';
}

export interface OrderUpdatedPayload extends OrderEventPayload {
  type: 'order_updated';
  changes?: Partial<Order>;
}

export interface OrderStatusChangedPayload extends OrderEventPayload {
  type: 'order_status_changed';
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
}

// Type guards
export function isValidOrderStatus(status: unknown): status is OrderStatus {
  return typeof status === 'string' && ORDER_STATUSES.includes(status as OrderStatus);
}

export function isValidOrderType(type: unknown): type is OrderType {
  return type === 'online' || type === 'pickup' || type === 'delivery';
}

// Status helpers
export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    new: 'blue',
    pending: 'yellow',
    confirmed: 'green',
    preparing: 'orange',
    ready: 'purple',
    completed: 'gray',
    cancelled: 'red'
  };
  return colors[status] || 'gray';
}

export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    new: 'New',
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return labels[status] || status;
}

// Re-export for backward compatibility
export type UnifiedOrder = Order;
export type UnifiedOrderItem = OrderItem;
export type UnifiedOrderStatus = OrderStatus;
export type UnifiedOrderType = UIOrderType;