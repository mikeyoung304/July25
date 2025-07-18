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
  menuItemId: string;  // References the menu item
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
  orderNumber: string;
  
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
  orderTime: Date | string;
  prepTimeMinutes?: number;  // Estimated prep time
  completedTime?: Date | string;
  
  // Financial
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'online';
  
  // Additional info
  notes?: string;
  source: 'online' | 'voice' | 'kiosk' | 'server' | 'phone';
  metadata?: Record<string, any>;
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
export function normalizeModifiers(modifiers: any): UnifiedModifier[] | undefined {
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
export function toUnifiedOrder(order: any, source: UnifiedOrder['source']): UnifiedOrder {
  return {
    id: order.id || '',
    restaurant_id: order.restaurant_id || order.restaurantId || '',
    orderNumber: order.orderNumber || order.order_number || '',
    
    type: normalizeOrderType(order.type || order.orderType || 'takeout'),
    status: normalizeOrderStatus(order.status || 'new'),
    items: (order.items || []).map((item: any) => ({
      id: item.id || '',
      menuItemId: item.menuItemId || item.menu_item_id || item.id || '',
      name: item.name || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      modifiers: normalizeModifiers(item.modifiers),
      specialInstructions: item.specialInstructions || item.notes || item.special_instructions,
      category: item.category
    })),
    
    customerName: order.customerName || order.customer_name,
    customerPhone: order.customerPhone || order.customer_phone,
    customerEmail: order.customerEmail || order.customer_email,
    tableNumber: order.tableNumber || order.table_number,
    
    orderTime: order.orderTime || order.created_at || new Date(),
    prepTimeMinutes: order.prepTimeMinutes || order.prep_time_minutes || order.prepTime,
    completedTime: order.completedTime || order.completed_at,
    
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    totalAmount: order.totalAmount || order.total_amount || 0,
    paymentStatus: order.paymentStatus || order.payment_status || 'pending',
    paymentMethod: order.paymentMethod || order.payment_method,
    
    notes: order.notes,
    source,
    metadata: order.metadata
  };
}