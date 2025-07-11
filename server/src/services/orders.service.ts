import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';
import { WebSocketServer } from 'ws';
import { broadcastOrderUpdate, broadcastNewOrder } from '../utils/websocket';

const ordersLogger = logger.child({ service: 'OrdersService' });

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
  notes?: string;
}

export interface CreateOrderRequest {
  type?: 'kiosk' | 'drive-thru' | 'online' | 'voice';
  items: OrderItem[];
  customerName?: string;
  tableNumber?: string;
  notes?: string;
  metadata?: any;
}

export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: string;
  type: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  notes?: string;
  customerName?: string;
  tableNumber?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  preparingAt?: string;
  readyAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface OrderFilters {
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
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
      // Calculate totals
      const subtotal = orderData.items.reduce((total, item) => {
        const itemTotal = item.price * item.quantity;
        const modifiersTotal = (item.modifiers || []).reduce(
          (modTotal, mod) => modTotal + mod.price * item.quantity,
          0
        );
        return total + itemTotal + modifiersTotal;
      }, 0);

      const taxRate = 0.07; // 7% tax - should be configurable per restaurant
      const tax = subtotal * taxRate;
      const totalAmount = subtotal + tax;

      // Generate order number
      const orderNumber = await this.generateOrderNumber(restaurantId);

      const newOrder = {
        restaurant_id: restaurantId,
        order_number: orderNumber,
        type: orderData.type || 'kiosk',
        status: 'pending',
        items: orderData.items,
        subtotal,
        tax,
        total_amount: totalAmount,
        notes: orderData.notes,
        customer_name: orderData.customerName,
        table_number: orderData.tableNumber,
        metadata: orderData.metadata || {},
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([newOrder])
        .select()
        .single();

      if (error) throw error;

      const order = this.mapOrder(data);
      
      // Broadcast new order via WebSocket
      if (this.wss) {
        broadcastNewOrder(this.wss, order);
      }

      // Log order status change
      await this.logStatusChange(order.id, restaurantId, null, 'pending');

      ordersLogger.info('Order created', { 
        orderId: order.id, 
        orderNumber: order.orderNumber,
        restaurantId 
      });

      return order;
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

      return (data || []).map(this.mapOrder);
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

      return this.mapOrder(data);
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
      const update: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Set timestamp fields based on status
      switch (newStatus) {
        case 'preparing':
          update.preparing_at = new Date().toISOString();
          break;
        case 'ready':
          update.ready_at = new Date().toISOString();
          break;
        case 'completed':
          update.completed_at = new Date().toISOString();
          break;
        case 'cancelled':
          update.cancelled_at = new Date().toISOString();
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

      const updatedOrder = this.mapOrder(data);

      // Broadcast order update via WebSocket
      if (this.wss) {
        broadcastOrderUpdate(this.wss, updatedOrder);
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
        orderNumber: updatedOrder.orderNumber,
        oldStatus: currentOrder.status,
        newStatus,
        restaurantId,
      });

      return updatedOrder;
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
   * Process voice order
   */
  static async processVoiceOrder(
    restaurantId: string,
    transcription: string,
    parsedItems: any[],
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
        modifiers: item.modifiers,
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

  /**
   * Map database record to Order interface
   */
  private static mapOrder(data: any): Order {
    return {
      id: data.id,
      restaurantId: data.restaurant_id,
      orderNumber: data.order_number,
      type: data.type,
      status: data.status,
      items: data.items || [],
      subtotal: parseFloat(data.subtotal),
      tax: parseFloat(data.tax),
      totalAmount: parseFloat(data.total_amount),
      notes: data.notes,
      customerName: data.customer_name,
      tableNumber: data.table_number,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      preparingAt: data.preparing_at,
      readyAt: data.ready_at,
      completedAt: data.completed_at,
      cancelledAt: data.cancelled_at,
    };
  }
}