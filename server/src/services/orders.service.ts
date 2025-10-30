import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';
import { WebSocketServer } from 'ws';
import { broadcastOrderUpdate, broadcastNewOrder } from '../utils/websocket';
import { NotFound } from '../middleware/errorHandler';
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
  notes?: string | undefined;
}

// Service-specific create order request
export interface CreateOrderRequest {
  type?: 'kiosk' | 'drive-thru' | 'online' | 'voice';
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tableNumber?: string;
  seatNumber?: number;
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
   * Get restaurant tax rate
   * Per ADR-007: Tax rates are now configured per-restaurant
   */
  private static async getRestaurantTaxRate(restaurantId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('tax_rate')
        .eq('id', restaurantId)
        .single();

      if (error) {
        ordersLogger.error('Failed to fetch restaurant tax rate', { error, restaurantId });
        // Fall back to default rate (8%) if fetch fails
        ordersLogger.warn('Using default tax rate 0.08 (8%) due to fetch error');
        return 0.08;
      }

      if (!data || data.tax_rate === null || data.tax_rate === undefined) {
        ordersLogger.warn('Restaurant tax rate not found, using default', { restaurantId });
        return 0.08;
      }

      return Number(data.tax_rate);
    } catch (error) {
      ordersLogger.error('Exception fetching restaurant tax rate', { error, restaurantId });
      return 0.08;
    }
  }

  /**
   * Create a new order
   */
  static async createOrder(
    restaurantId: string,
    orderData: CreateOrderRequest
  ): Promise<Order> {
    try {
      // Validate seat number if both tableNumber and seatNumber are provided
      if (orderData.tableNumber && orderData.seatNumber) {
        await this.validateSeatNumber(restaurantId, orderData.tableNumber, orderData.seatNumber);
      }

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

      // Get restaurant-specific tax rate (ADR-007: Per-Restaurant Configuration)
      const taxRate = await this.getRestaurantTaxRate(restaurantId);
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
        seat_number: orderData.seatNumber,
        metadata: {
          ...orderData.metadata,
          originalType: uiOrderType, // Preserve original type for UI display
          uiType: uiOrderType, // Alternative name for compatibility
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          tip: tip // Store tip in metadata
        },
      };

      // Use atomic RPC function for transactional order creation + audit logging
      // Per ADR-003 and #117 (STAB-001): Insert and audit MUST be atomic
      const { data, error } = await supabase
        .rpc('create_order_with_audit', {
          p_restaurant_id: newOrder.restaurant_id,
          p_order_number: newOrder.order_number,
          p_type: newOrder.type,
          p_status: newOrder.status,
          p_items: newOrder.items as any,
          p_subtotal: newOrder.subtotal,
          p_tax: newOrder.tax,
          p_total_amount: newOrder.total_amount,
          p_notes: newOrder.notes || null,
          p_customer_name: newOrder.customer_name || null,
          p_table_number: newOrder.table_number || null,
          p_seat_number: newOrder.seat_number || null,
          p_metadata: newOrder.metadata as any || {}
        })
        .single();

      if (error) {
        ordersLogger.error('Atomic order creation failed', {
          error,
          orderType: newOrder.type,
          orderData: { ...newOrder, items: `[${newOrder.items.length} items]` }
        });
        throw error;
      }

      // Return raw snake_case data - frontend expects this format

      // Broadcast new order via WebSocket
      // Note: WebSocket is intentionally OUTSIDE the transaction
      // Real-time notifications don't need ACID guarantees
      if (this.wss) {
        broadcastNewOrder(this.wss, data);  // Send snake_case data
      }

      // Note: Status change logging is now handled atomically by the RPC function
      // No separate logStatusChange call needed - it's part of the transaction

      ordersLogger.info('Order created', {
        orderId: (data as any).id,
        orderNumber: (data as any).order_number,
        restaurantId
      });

      return data as any as Order;
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
        .select('id, restaurant_id, order_number, type, status, items, subtotal, tax, total_amount, notes, customer_name, table_number, seat_number, metadata, created_at, updated_at, preparing_at, ready_at, completed_at, cancelled_at, scheduled_pickup_time, auto_fire_time, is_scheduled, manually_fired, version, payment_status, payment_method, payment_amount, cash_received, change_given, payment_id, check_closed_at, closed_by_user_id')
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

      return (data || []) as any as Order[];  // Return raw snake_case data
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
        .select('id, restaurant_id, order_number, type, status, items, subtotal, tax, total_amount, notes, customer_name, table_number, seat_number, metadata, created_at, updated_at, preparing_at, ready_at, completed_at, cancelled_at, scheduled_pickup_time, auto_fire_time, is_scheduled, manually_fired, version, payment_status, payment_method, payment_amount, cash_received, change_given, payment_id, check_closed_at, closed_by_user_id')
        .eq('restaurant_id', restaurantId)
        .eq('id', orderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as any as Order;  // Return raw snake_case data
    } catch (error) {
      ordersLogger.error('Failed to fetch order', { error, restaurantId, orderId });
      throw error;
    }
  }

  /**
   * Update order status with optimistic locking
   * Per ADR-003 and #118 (STAB-002): Uses version column to prevent lost updates
   */
  static async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    newStatus: Order['status'],
    notes?: string
  ): Promise<Order> {
    try {
      // Get current order with version
      const currentOrder = await this.getOrder(restaurantId, orderId);
      if (!currentOrder) {
        throw NotFound('Order not found');
      }

      // Extract current version for optimistic locking
      const currentVersion = (currentOrder as any).version || 1;

      // Prepare update with version increment
      const update: Record<string, unknown> = {
        status: newStatus,
        version: currentVersion + 1, // Increment version for optimistic locking
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

      // Optimistic locking: Update only if version matches
      // If another request modified the order, version will have changed
      const { data, error } = await supabase
        .from('orders')
        .update(update)
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .eq('version', currentVersion) // CRITICAL: Optimistic lock check
        .select('id, restaurant_id, order_number, type, status, items, subtotal, tax, total_amount, notes, customer_name, table_number, seat_number, metadata, created_at, updated_at, preparing_at, ready_at, completed_at, cancelled_at, scheduled_pickup_time, auto_fire_time, is_scheduled, manually_fired, version, payment_status, payment_method, payment_amount, cash_received, change_given, payment_id, check_closed_at, closed_by_user_id')
        .single();

      if (error) {
        // Check if error is due to version conflict (no rows updated)
        if (error.code === 'PGRST116') {
          // PGRST116 = "The result contains 0 rows"
          // This means version conflict - order was modified by another request
          ordersLogger.warn('Order status update conflict detected (optimistic lock)', {
            orderId,
            restaurantId,
            expectedVersion: currentVersion,
            attemptedStatus: newStatus
          });
          throw new Error(
            `Order status update conflict. Order was modified by another request. ` +
            `Please retry the operation. (Order ID: ${orderId})`
          );
        }
        throw error;
      }

      // Verify we got data back (should always be true if no error)
      if (!data) {
        ordersLogger.error('Order status update succeeded but returned no data', {
          orderId,
          restaurantId,
          newStatus
        });
        throw new Error('Order status update succeeded but returned no data');
      }

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

      return data as any as Order;
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
   * Updated to use new payment_status, payment_method, payment_amount, etc. columns
   */
  static async updateOrderPayment(
    restaurantId: string,
    orderId: string,
    paymentStatus: 'unpaid' | 'paid' | 'failed' | 'refunded',
    paymentMethod?: 'cash' | 'card' | 'house_account' | 'gift_card' | 'other',
    paymentId?: string,
    additionalData?: {
      cash_received?: number;
      change_given?: number;
      payment_amount?: number;
    },
    closedByUserId?: string
  ): Promise<Order> {
    try {
      // Get current order
      const currentOrder = await this.getOrder(restaurantId, orderId);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Prepare update object with new payment fields
      const update: Record<string, unknown> = {
        payment_status: paymentStatus,
        payment_method: paymentMethod || null,
        payment_id: paymentId || null,
        updated_at: new Date().toISOString(),
      };

      // Set payment_amount (defaults to order total if not provided)
      if (additionalData?.payment_amount !== undefined) {
        update['payment_amount'] = additionalData.payment_amount;
      } else if (paymentStatus === 'paid') {
        // Use order total_amount as payment_amount if not explicitly provided
        update['payment_amount'] = (currentOrder as any).total_amount;
      }

      // Set cash-specific fields
      if (paymentMethod === 'cash' && additionalData) {
        if (additionalData.cash_received !== undefined) {
          update['cash_received'] = additionalData.cash_received;
        }
        if (additionalData.change_given !== undefined) {
          update['change_given'] = additionalData.change_given;
        }
      }

      // Set check_closed_at timestamp when payment is successful
      if (paymentStatus === 'paid') {
        update['check_closed_at'] = new Date().toISOString();

        // Set closed_by_user_id if provided
        if (closedByUserId) {
          update['closed_by_user_id'] = closedByUserId;
        }
      }

      const { data, error } = await supabase
        .from('orders')
        .update(update)
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .select('id, restaurant_id, order_number, type, status, items, subtotal, tax, total_amount, notes, customer_name, table_number, seat_number, metadata, created_at, updated_at, preparing_at, ready_at, completed_at, cancelled_at, scheduled_pickup_time, auto_fire_time, is_scheduled, manually_fired, version, payment_status, payment_method, payment_amount, cash_received, change_given, payment_id, check_closed_at, closed_by_user_id')
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
        paymentId,
        paymentAmount: update['payment_amount'],
        closedByUserId
      });

      return data as any as Order;
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
    parsedItems: Array<{ name: string; quantity: number; price?: number; notes?: string; modifiers?: any }>,
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
   * Validate seat number against table capacity
   */
  private static async validateSeatNumber(
    restaurantId: string,
    tableNumber: string,
    seatNumber: number
  ): Promise<void> {
    try {
      // Fetch table by label (table_number maps to label column)
      const { data: table, error } = await supabase
        .from('tables')
        .select('capacity')
        .eq('restaurant_id', restaurantId)
        .eq('label', tableNumber)
        .eq('active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Table not found - don't fail validation, just log warning
          ordersLogger.warn('Table not found for seat validation', {
            restaurantId,
            tableNumber,
            seatNumber
          });
          return;
        }
        throw error;
      }

      // Validate seat number against capacity
      if (table && table.capacity && seatNumber > table.capacity) {
        throw new Error(
          `Seat number ${seatNumber} exceeds table capacity of ${table.capacity} for table ${tableNumber}`
        );
      }

      ordersLogger.debug('Seat number validated', {
        restaurantId,
        tableNumber,
        seatNumber,
        capacity: table?.capacity
      });
    } catch (error) {
      ordersLogger.error('Seat validation failed', {
        error,
        restaurantId,
        tableNumber,
        seatNumber
      });
      throw error;
    }
  }

}