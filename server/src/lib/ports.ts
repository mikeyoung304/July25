/**
 * Port interfaces for repositories and external adapters
 *
 * Design Pattern: Repository Pattern with tenant-scoped interfaces
 * Reference: ADR-003 (Database Architecture Audit)
 *
 * CRITICAL: All repository methods MUST include restaurant_id as first parameter
 * to enforce multi-tenant data isolation at the interface level.
 *
 * This file defines the contracts that all data access implementations must follow.
 * Implementations can be:
 * - Supabase direct (current)
 * - Prisma (future migration)
 * - Mock (testing)
 */

// ============================================================================
// Core Repository Interface
// ============================================================================

/**
 * Base interface for all tenant-scoped repositories
 * All queries MUST be filtered by restaurant_id
 */
export interface TenantScopedRepository<T, CreateInput, UpdateInput> {
  findById(restaurantId: string, id: string): Promise<T | null>;
  findAll(restaurantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  create(restaurantId: string, data: CreateInput): Promise<T>;
  update(restaurantId: string, id: string, data: UpdateInput): Promise<T>;
  delete(restaurantId: string, id: string): Promise<void>;
}

// ============================================================================
// Domain-Specific Repository Interfaces
// ============================================================================

/**
 * Order Repository - Order persistence with restaurant isolation
 */
export interface OrderRepository {
  findById(restaurantId: string, id: string): Promise<Order | null>;
  findAll(restaurantId: string, filters?: OrderFilters): Promise<Order[]>;
  create(restaurantId: string, data: CreateOrderInput): Promise<Order>;
  updateStatus(restaurantId: string, id: string, status: OrderStatus): Promise<Order>;
  delete(restaurantId: string, id: string): Promise<void>;
  getActiveOrders(restaurantId: string): Promise<Order[]>;
}

/**
 * Menu Repository - Menu item management with restaurant isolation
 */
export interface MenuRepository {
  getMenuItems(restaurantId: string, categoryId?: string): Promise<MenuItem[]>;
  getMenuItemById(restaurantId: string, id: string): Promise<MenuItem | null>;
  getCategories(restaurantId: string): Promise<MenuCategory[]>;
  createMenuItem(restaurantId: string, data: CreateMenuItemInput): Promise<MenuItem>;
  updateMenuItem(restaurantId: string, id: string, data: UpdateMenuItemInput): Promise<MenuItem>;
  deleteMenuItem(restaurantId: string, id: string): Promise<void>;
}

/**
 * Table Repository - Table management with restaurant isolation
 */
export interface TableRepository {
  findById(restaurantId: string, id: string): Promise<Table | null>;
  findAll(restaurantId: string): Promise<Table[]>;
  findByNumber(restaurantId: string, tableNumber: string): Promise<Table | null>;
  create(restaurantId: string, data: CreateTableInput): Promise<Table>;
  update(restaurantId: string, id: string, data: UpdateTableInput): Promise<Table>;
  delete(restaurantId: string, id: string): Promise<void>;
  updateStatus(restaurantId: string, id: string, status: TableStatus): Promise<Table>;
}

/**
 * User Repository - User authentication and management
 * Note: Users may have access to multiple restaurants
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  getRestaurantAccess(userId: string): Promise<UserRestaurantAccess[]>;
  hasRestaurantAccess(userId: string, restaurantId: string): Promise<boolean>;
}

// ============================================================================
// Provider Ports (External Services)
// ============================================================================

/**
 * Payment Provider - Payment processing integration
 */
export interface PaymentProvider {
  createPaymentIntent(input: {
    amountCents: number;
    restaurantId: string;
    orderId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string): Promise<PaymentConfirmation>;
  refund(paymentIntentId: string, amountCents?: number): Promise<RefundResult>;
}

/**
 * Notification Provider - Push notifications and alerts
 */
export interface NotificationProvider {
  sendOrderNotification(restaurantId: string, orderId: string, type: NotificationType): Promise<void>;
  sendKitchenAlert(restaurantId: string, message: string): Promise<void>;
}

// ============================================================================
// Supporting Types
// ============================================================================

export type OrderStatus =
  | 'new'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked-up'
  | 'completed'
  | 'cancelled';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'paid';

export type NotificationType = 'new_order' | 'order_ready' | 'order_cancelled';

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: string;
  status: OrderStatus;
  type: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  table_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  modifiers?: OrderItemModifier[];
}

export interface OrderItemModifier {
  id: string;
  name: string;
  price: number;
}

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface CreateOrderInput {
  type: string;
  items: Omit<OrderItem, 'id'>[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  table_number?: string;
  notes?: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

export interface CreateMenuItemInput {
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available?: boolean;
}

export interface UpdateMenuItemInput {
  category_id?: string;
  name?: string;
  description?: string;
  price?: number;
  image_url?: string;
  is_available?: boolean;
}

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  status: TableStatus;
  section?: string;
}

export interface CreateTableInput {
  table_number: string;
  capacity: number;
  section?: string;
}

export interface UpdateTableInput {
  table_number?: string;
  capacity?: number;
  section?: string;
  status?: TableStatus;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
}

export interface UserRestaurantAccess {
  restaurant_id: string;
  role: string;
}

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  status: string;
}

export interface PaymentConfirmation {
  id: string;
  status: 'succeeded' | 'failed' | 'requires_action';
  amount: number;
}

export interface RefundResult {
  id: string;
  status: string;
  amount: number;
}

// ============================================================================
// Cache Service Port
// ============================================================================

/**
 * Cache Service Port
 *
 * CRITICAL: All cache keys MUST include restaurant_id to prevent cross-tenant data leakage
 * Example: `orders:${restaurant_id}:active` NOT `orders:active`
 */
export interface CacheServicePort {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(pattern: string): Promise<void>;
  isConnected(): Promise<boolean>;
}
