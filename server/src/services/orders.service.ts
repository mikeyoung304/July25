import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';
import { WebSocketServer } from 'ws';
import { broadcastOrderUpdate, broadcastNewOrder } from '../utils/websocket';
// Removed mapOrder - returning raw snake_case data for frontend consistency
// import { menuIdMapper } from './menu-id-mapper'; // Not currently used
import type {
  Order as SharedOrder,
  OrderItem as SharedOrderItem,
  OrderType,
  OrderFilters as SharedOrderFilters,
} from '@rebuild/shared';

const ordersLogger = logger.child({ service: 'OrdersService' });

// Extend shared OrderItem for service-specific needs
export interface OrderItem extends Omit<SharedOrderItem, 'menu_item_id' | 'subtotal'> {
  notes?: string;
}

// Service-specific create order request
export interface CreateOrderRequest {
  type?: 'kiosk' | 'drive-thru' | 'online' | 'voice';
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tableNumber?: string;
  notes?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total_amount?: number;
  metadata?: Record<string, unknown>;
}

// Extend shared Order type for service layer
export interface Order extends Omit<SharedOrder, 'order_number' | 'total' | 'payment_status' | 'created_at' | 'updated_at' | 'completed_at' | 'type'> {
  restaurantId: string; // Maps to restaurant_id
  orderNumber: string; // Maps to order_number
  type: OrderType | string; // Allow string for flexibility in service layer
  totalAmount: number; // Maps to total
  metadata?: Record<string, unknown>;
  createdAt: string; // Maps to created_at
  updatedAt: string; // Maps to updated_at
  preparingAt?: string;
  readyAt?: string;
  completedAt?: string; // Maps to completed_at
  cancelledAt?: string;
}

// Extend shared OrderFilters for service layer
export interface OrderFilters extends Omit<SharedOrderFilters, 'date_from' | 'date_to'> {
  startDate?: string; // Maps to date_from
  endDate?: string; // Maps to date_to
  limit?: number;
  offset?: number;
}

export class OrdersService {
  private static wss: WebSocketServer;

  static setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  /**
   * Create a new order
   */
  static async createOrder(
    restaurantId: string,
    orderData: CreateOrderRequest
  ): Promise<Order> {
    try {
      // Convert external IDs to UUIDs for items
      const itemsWithUuids = await Promise.all(
        orderData.items.map(async (item) => {
          // Note: Menu ID mapping logic needs to be implemented with available methods
          const uuid = item.id; // Placeholder - using original ID for now
          if (uuid) {
            return { ...item, id: uuid };
          }
          // If no mapping found, keep original ID (might be UUID already)
          return item;
        })
      );

      // Calculate totals - use provided values if available, otherwise calculate
      const subtotal = orderData.subtotal !== undefined ? orderData.subtotal : itemsWithUuids.reduce((total, item) => {
        const itemTotal = item.price * item.quantity;
        const modifiersTotal = (item.modifiers || []).reduce(
          (modTotal, mod) => modTotal + mod.price * item.quantity,
          0
        );
        return total + itemTotal + modifiersTotal;
      }, 0);

      const taxRate = 0.07; // 7% tax - should be configurable per restaurant
      const tax = orderData.tax !== undefined ? orderData.tax : subtotal * taxRate;
      const tip = orderData.tip || 0;
      const totalAmount = orderData.total_amount !== undefined ? orderData.total_amount : (subtotal + tax + tip);

      // Generate order number
      const orderNumber = await this.generateOrderNumber(restaurantId);

      // Map UI order types to database-valid types
      // Database only accepts: 'online', 'pickup', 'delivery'
      const orderTypeMapping: Record<string, string> = {
        'kiosk': 'online',
        'voice': 'online',
        'drive-thru': 'pickup',
        'dine-in': 'online',
        'takeout': 'pickup',
        'online': 'online',
        'pickup': 'pickup',
        'delivery': 'delivery'
      };
      
      const uiOrderType = orderData.type || 'online';
      const dbOrderType = orderTypeMapping[uiOrderType] || 'online';
      
      if (!orderTypeMapping[uiOrderType]) {
        ordersLogger.warn('Unknown order type provided, defaulting to online', { 
          providedType: uiOrderType,
          mappedTo: dbOrderType
        });
      }

      const newOrder = {
        restaurant_id: restaurantId,
        order_number: orderNumber,
        type: dbOrderType, // Use database-valid type
        status: 'pending',
        items: itemsWithUuids,
        subtotal,
        tax,
        // tip column doesn't exist - it's included in total_amount
        total_amount: totalAmount,
        notes: orderData.notes,
        customer_name: orderData.customerName,
        // customer_email and customer_phone columns don't exist in DB
        // Store them in metadata instead
        table_number: orderData.tableNumber,
        metadata: { 
          ...orderData.metadata,
          originalType: uiOrderType, // Preserve original type for UI display
          uiType: uiOrderType, // Alternative name for compatibility
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          tip: tip // Store tip in metadata
        },
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([newOrder])
        .select()
        .single();

      if (error) {
        ordersLogger.error('Database insertion failed', { 
          error,
          orderType: newOrder.type,
          orderData: { ...newOrder, items: `[${newOrder.items.length} items]` }
        });
        throw error;
      }

      // Return raw snake_case data - frontend expects this format
      
      // Broadcast new order via WebSocket
      if (this.wss) {
        broadcastNewOrder(this.wss, data);  // Send snake_case data
      }

      // Log order status change
      await this.logStatusChange(data.id, restaurantId, null, 'pending');

      ordersLogger.info('Order created', { 
        orderId: data.id, 
        orderNumber: data.order_number,
        restaurantId 
      });

      return data;
    } catch (error) {
      ordersLogger.error('Failed to create order', { error, restaurantId });
      throw error;
    }
  }

  /**
   * Get orders with filters
   */
  static async getOrders(
    restaurantId: string,
    filters: OrderFilters = {}
  ): Promise<Order[]> {
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];  // Return raw snake_case data
    } catch (error) {
      ordersLogger.error('Failed to fetch orders', { error, restaurantId, filters });
      throw error;
    }
  }

  /**
   * Get single order
   */
  static async getOrder(restaurantId: string, orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('id', orderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;  // Return raw snake_case data
    } catch (error) {
      ordersLogger.error('Failed to fetch order', { error, restaurantId, orderId });
      throw error;
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    newStatus: Order['status'],
    notes?: string
  ): Promise<Order> {
    try {
      // Get current order
      const currentOrder = await this.getOrder(restaurantId, orderId);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Prepare update
      const update: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Set timestamp fields based on status
      switch (newStatus) {
        case 'preparing':
          update['preparing_at'] = new Date().toISOString();
          break;
        case 'ready':
          update['ready_at'] = new Date().toISOString();
          break;
        case 'completed':
          update['completed_at'] = new Date().toISOString();
          break;
        case 'cancelled':
          update['cancelled_at'] = new Date().toISOString();
          break;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(update)
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .select()
        .single();

      if (error) throw error;

      // Return raw snake_case data

      // Broadcast order update via WebSocket
      if (this.wss) {
        broadcastOrderUpdate(this.wss, data);  // Send snake_case data
      }

      // Log status change
      await this.logStatusChange(
        orderId,
        restaurantId,
        currentOrder.status,
        newStatus,
        notes
      );

      ordersLogger.info('Order status updated', {
        orderId,
        orderNumber: data.order_number,
        oldStatus: currentOrder.status,
        newStatus,
        restaurantId,
      });

      return data;
    } catch (error) {
      ordersLogger.error('Failed to update order status', { 
        error, 
        restaurantId, 
        orderId, 
        newStatus 
      });
      throw error;
    }
  }

  /**
   * Update order payment information
   */
  static async updateOrderPayment(
    restaurantId: string,
    orderId: string,
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
    paymentMethod?: 'cash' | 'card' | 'online' | 'other',
    paymentId?: string
  ): Promise<Order> {
    try {
      // Get current order
      const currentOrder = await this.getOrder(restaurantId, orderId);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Store payment info in metadata since payment_status column doesn't exist
      const metadata = (currentOrder as { metadata?: Record<string, unknown> }).metadata || {};
      metadata['payment'] = {
        status: paymentStatus,
        method: paymentMethod,
        paymentId: paymentId,
        updatedAt: new Date().toISOString()
      };

      // Prepare update object
      const update: Record<string, unknown> = {
        metadata: metadata,
        updated_at: new Date().toISOString(),
      };

      // If payment is successful, update order status to confirmed
      if (paymentStatus === 'paid' && currentOrder.status === 'pending') {
        update['status'] = 'confirmed';
      }

      const { data, error } = await supabase
        .from('orders')
        .update(update)
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .select()
        .single();

      if (error) throw error;

      // Return raw snake_case data

      // Broadcast order update via WebSocket
      if (this.wss) {
        broadcastOrderUpdate(this.wss, data);  // Send snake_case data
      }

      ordersLogger.info('Order payment updated', { 
        orderId, 
        restaurantId, 
        paymentStatus,
        paymentMethod,
        paymentId 
      });

      return data;
    } catch (error) {
      ordersLogger.error('Failed to update order payment', { error, orderId, restaurantId });
      throw error;
    }
  }

  /**
   * Process voice order
   */
  static async processVoiceOrder(
    restaurantId: string,
    transcription: string,
    parsedItems: Array<{ name: string; quantity: number; price?: number; notes?: string }>,
    confidence: number,
    audioUrl?: string
  ): Promise<Order> {
    try {
      // Log voice order attempt
      const { error: logError } = await supabase
        .from('voice_order_logs')
        .insert([{
          restaurant_id: restaurantId,
          transcription,
          parsed_items: parsedItems,
          confidence_score: confidence,
          audio_url: audioUrl,
          success: true,
        }]);

      if (logError) {
        ordersLogger.warn('Failed to log voice order', { error: logError });
      }

      // Create order from parsed items
      const orderItems: OrderItem[] = parsedItems.map(item => ({
        id: randomUUID(),
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        modifiers: (item as any).modifiers || [],
        notes: item.notes,
      }));

      const order = await this.createOrder(restaurantId, {
        type: 'voice',
        items: orderItems,
        metadata: {
          transcription,
          confidence,
          audioUrl,
        },
      });

      // Update voice log with order ID
      if (!logError) {
        await supabase
          .from('voice_order_logs')
          .update({ order_id: order.id })
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(1);
      }

      return order;
    } catch (error) {
      // Log failed voice order
      await supabase
        .from('voice_order_logs')
        .insert([{
          restaurant_id: restaurantId,
          transcription,
          parsed_items: parsedItems,
          confidence_score: confidence,
          audio_url: audioUrl,
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        }]);

      throw error;
    }
  }

  /**
   * Generate unique order number
   */
  private static async generateOrderNumber(restaurantId: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get today's order count
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startOfDay.toISOString());

    if (error) {
      ordersLogger.warn('Failed to get order count', { error });
    }

    const orderCount = (count || 0) + 1;
    return `${dateStr}-${orderCount.toString().padStart(4, '0')}`;
  }

  /**
   * Log status change for analytics
   */
  private static async logStatusChange(
    orderId: string,
    restaurantId: string,
    fromStatus: string | null,
    toStatus: string,
    notes?: string
  ): Promise<void> {
    try {
      await supabase
        .from('order_status_history')
        .insert([{
          order_id: orderId,
          restaurant_id: restaurantId,
          from_status: fromStatus,
          to_status: toStatus,
          notes,
        }]);
    } catch (error) {
      ordersLogger.warn('Failed to log status change', { error, orderId });
    }
  }

}