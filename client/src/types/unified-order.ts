/**
 * Unified Order Types for All Ordering Channels
 * This ensures consistency across voice, online, kiosk, and server input
 */

// Consistent order types across all channels
export type UnifiedOrderType = 'dine-in' | 'drive-thru' | 'takeout' | 'delivery';

// Consistent order status values - all 7 statuses
export type UnifiedOrderStatus = 'new' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

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
      return 'new';
    case 'pending':
      return 'pending';
    case 'confirmed':
      return 'confirmed';
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
      console.warn(`Unknown order status: ${status}, defaulting to 'new'`);
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
    id: (order.id as string) || '',
    restaurant_id: (order.restaurant_id as string) || (order.restaurantId as string) || '',
    order_number: (order.order_number as string) || (order.orderNumber as string) || '',
    
    type: normalizeOrderType((order.type as string) || (order.orderType as string) || 'takeout'),
    status: normalizeOrderStatus((order.status as string) || 'new'),
    items: ((order.items as unknown[]) || []).map((item: unknown) => {
      const itemObj = item as Record<string, unknown>;
      return {
        id: (itemObj.id as string) || '',
        menu_item_id: (itemObj.menu_item_id as string) || (itemObj.menuItemId as string) || (itemObj.id as string) || '',
        name: (itemObj.name as string) || '',
        quantity: (itemObj.quantity as number) || 1,
        price: (itemObj.price as number) || 0,
        modifiers: normalizeModifiers(itemObj.modifiers),
        special_instructions: (itemObj.special_instructions as string) || (itemObj.notes as string) || (itemObj.specialInstructions as string),
        category: itemObj.category as string
      };
    }),
    
    customerName: (order.customerName as string) || (order.customer_name as string),
    customerPhone: (order.customerPhone as string) || (order.customer_phone as string),
    customerEmail: (order.customerEmail as string) || (order.customer_email as string),
    tableNumber: (order.table_number as string) || (order.tableNumber as string),
    
    created_at: (order.created_at as string | Date) || (order.createdAt as string | Date) || new Date(),
    prepTimeMinutes: (order.prepTimeMinutes as number) || (order.prep_time_minutes as number) || (order.prepTime as number),
    completedTime: (order.completed_at as string | Date) || (order.completedAt as string | Date),
    
    subtotal: (order.subtotal as number) || 0,
    tax: (order.tax as number) || 0,
    total: (order.total as number) || (order.total_amount as number) || 0,
    payment_status: ((order.payment_status as string) || (order.paymentStatus as string) || 'pending') as 'pending' | 'paid' | 'refunded',
    paymentMethod: ((order.paymentMethod as string) || (order.payment_method as string)) as 'online' | 'cash' | 'card',
    
    notes: order.notes as string,
    source,
    metadata: order.metadata as Record<string, unknown>
  };
}