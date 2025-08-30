/**
 * Unified Order Types for All Ordering Channels
 * This ensures consistency across voice, online, kiosk, and server input
 */

// Consistent order types across all channels
export type UnifiedOrderType = 'dine-in' | 'drive-thru' | 'takeout' | 'delivery';

// Consistent order status values
export type UnifiedOrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';

// Consistent modifier structure
export interface UnifiedModifier {
  id: string;
  name: string;
  price: number;
}

// Unified order item structure
export interface UnifiedOrderItem {
  id: string;
  menu_item_id: string;  // References the menu item
  name: string;
  quantity: number;
  price: number;       // Always required
  modifiers?: UnifiedModifier[];  // Always object format
  specialInstructions?: string;
  category?: string;   // For KDS station routing
}

// Unified order structure for all channels
export interface UnifiedOrder {
  // Core identification
  id: string;
  restaurant_id: string;  // Using snake_case to match database
  order_number: string;
  
  // Order details
  type: UnifiedOrderType;
  status: UnifiedOrderStatus;
  items: UnifiedOrderItem[];
  
  // Customer information
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  tableNumber?: string;  // For dine-in orders
  
  // Timing
  created_at: Date | string;
  prepTimeMinutes?: number;  // Estimated prep time
  completedTime?: Date | string;
  
  // Financial
  subtotal: number;
  tax: number;
  total: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'online';
  
  // Additional info
  notes?: string;
  source: 'online' | 'voice' | 'kiosk' | 'server' | 'phone';
  metadata?: Record<string, unknown>;
}

// Converters for legacy formats
export function normalizeOrderType(type: string): UnifiedOrderType {
  // Handle underscore vs hyphen variations
  const normalized = type.replace(/_/g, '-').toLowerCase();
  
  switch (normalized) {
    case 'dine-in':
    case 'dinein':
      return 'dine-in';
    case 'drive-thru':
    case 'drivethru':
      return 'drive-thru';
    case 'takeout':
    case 'take-out':
      return 'takeout';
    case 'delivery':
      return 'delivery';
    default:
      return 'takeout'; // Safe default
  }
}

export function normalizeOrderStatus(status: string): UnifiedOrderStatus {
  switch (status.toLowerCase()) {
    case 'new':
    case 'pending':
      return 'new';
    case 'preparing':
    case 'in-progress':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'completed':
    case 'complete':
      return 'completed';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      return 'new';
  }
}

// Helper to ensure modifiers are in object format
export function normalizeModifiers(modifiers: unknown): UnifiedModifier[] | undefined {
  if (!modifiers || !Array.isArray(modifiers)) return undefined;
  
  return modifiers.map((mod, index) => {
    if (typeof mod === 'string') {
      // Convert string modifiers to object format
      return {
        id: `mod-${index}`,
        name: mod,
        price: 0  // Default price for string modifiers
      };
    }
    return mod;
  });
}

// Convert any order format to unified format
export function toUnifiedOrder(order: Record<string, unknown>, source: UnifiedOrder['source']): UnifiedOrder {
  return {
    id: order.id || '',
    restaurant_id: order.restaurant_id || order.restaurantId || '',
    order_number: order.order_number || order.order_number || '',
    
    type: normalizeOrderType(order.type || order.type || 'takeout'),
    status: normalizeOrderStatus(order.status || 'new'),
    items: ((order.items as unknown[]) || []).map((item: Record<string, unknown>) => ({
      id: item.id || '',
      menu_item_id: item.menu_item_id || item.menu_item_id || item.id || '',
      name: item.name || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      modifiers: normalizeModifiers(item.modifiers),
      special_instructions: item.special_instructions || item.notes || item.special_instructions,
      category: item.category
    })),
    
    customerName: order.customerName || order.customer_name,
    customerPhone: order.customerPhone || order.customer_phone,
    customerEmail: order.customerEmail || order.customer_email,
    table_number: order.table_number || order.table_number,
    
    created_at: order.created_at || order.created_at || new Date(),
    prepTimeMinutes: order.prepTimeMinutes || order.prep_time_minutes || order.prepTime,
    completed_at: order.completed_at || order.completed_at,
    
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    total: order.total || order.total_amount || 0,
    payment_status: order.payment_status || order.payment_status || 'pending',
    paymentMethod: order.paymentMethod || order.payment_method,
    
    notes: order.notes,
    source,
    metadata: order.metadata
  };
}