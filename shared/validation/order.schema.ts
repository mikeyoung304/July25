/**
 * Unified Order Validation Schema
 * Single Source of Truth for order validation across Client and Server
 *
 * Per ADR-001: All layers use snake_case
 * This schema enforces UUID validation and consistent order status flow
 */

import Joi from 'joi';
import type { OrderStatus, OrderType, PaymentStatus, PaymentMethod } from '../types/order.types';

/**
 * Valid order statuses - matches shared/types/order.types.ts
 * Flow: new → pending → confirmed → preparing → ready → picked-up → completed
 *       (any status can transition to cancelled)
 */
const ORDER_STATUSES: OrderStatus[] = [
  'new',
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked-up',
  'completed',
  'cancelled'
];

/**
 * Database-valid order types (what goes in the database)
 */
const DB_ORDER_TYPES: OrderType[] = ['online', 'pickup', 'delivery'];

/**
 * UI order types that get mapped to DB types
 */
const UI_ORDER_TYPES = ['kiosk', 'drive-thru', 'online', 'voice', 'dine-in', 'takeout', 'delivery'];

/**
 * Valid payment statuses
 */
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'refunded', 'failed'];

/**
 * Valid payment methods
 */
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'online', 'other'];

/**
 * Order Item Modifier Schema
 */
export const orderItemModifierSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().required(),
  price: Joi.number().min(0).required(),
  category: Joi.string().optional()
});

/**
 * Order Item Schema
 * CRITICAL: Enforces UUID for all IDs
 */
export const orderItemSchema = Joi.object({
  id: Joi.string().uuid().required(),
  menu_item_id: Joi.string().uuid().required(),
  name: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).required(),
  modifiers: Joi.array().items(orderItemModifierSchema).optional(),
  special_instructions: Joi.string().max(500).optional(),
  subtotal: Joi.number().min(0).required()
});

/**
 * Create Order DTO Schema
 */
export const createOrderSchema = Joi.object({
  restaurant_id: Joi.string().uuid().required(),
  customer_name: Joi.string().max(100).optional(),
  customer_phone: Joi.string().max(20).optional(),
  customer_email: Joi.string().email({ tlds: { allow: false } }).optional(),
  type: Joi.string()
    .valid(...UI_ORDER_TYPES)
    .default('online'),
  items: Joi.array()
    .items(orderItemSchema.fork(['id', 'subtotal'], (schema) => schema.optional()))
    .min(1)
    .required(),
  table_number: Joi.string().max(20).optional(),
  seat_number: Joi.number().integer().min(1).optional(),
  notes: Joi.string().max(500).optional(),
  payment_method: Joi.string()
    .valid(...PAYMENT_METHODS)
    .optional(),
  scheduled_pickup_time: Joi.string().isoDate().optional()
});

/**
 * Update Order Status Schema
 */
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .required(),
  notes: Joi.string().max(500).optional()
});

/**
 * Update Order DTO Schema
 */
export const updateOrderSchema = Joi.object({
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .optional(),
  payment_status: Joi.string()
    .valid(...PAYMENT_STATUSES)
    .optional(),
  payment_method: Joi.string()
    .valid(...PAYMENT_METHODS)
    .optional(),
  estimated_ready_time: Joi.string().isoDate().optional(),
  notes: Joi.string().max(500).optional()
});

/**
 * Order Filters Schema
 */
export const orderFiltersSchema = Joi.object({
  status: Joi.alternatives()
    .try(
      Joi.string().valid(...ORDER_STATUSES),
      Joi.array().items(Joi.string().valid(...ORDER_STATUSES))
    )
    .optional(),
  type: Joi.alternatives()
    .try(
      Joi.string().valid(...DB_ORDER_TYPES),
      Joi.array().items(Joi.string().valid(...DB_ORDER_TYPES))
    )
    .optional(),
  payment_status: Joi.string()
    .valid(...PAYMENT_STATUSES)
    .optional(),
  date_from: Joi.string().isoDate().optional(),
  date_to: Joi.string().isoDate().optional(),
  search: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

/**
 * Voice Order Schema
 */
export const voiceOrderSchema = Joi.object({
  transcription: Joi.string().required(),
  audio_url: Joi.string().uri().optional(),
  metadata: Joi.object({
    device: Joi.string().optional(),
    device_id: Joi.string().optional(),
    location: Joi.string().optional(),
    confidence: Joi.number().min(0).max(1).optional()
  }).optional()
});

/**
 * Export all schemas as a single object for backward compatibility
 */
export const orderSchemas = {
  create: createOrderSchema,
  updateStatus: updateOrderStatusSchema,
  update: updateOrderSchema,
  filters: orderFiltersSchema,
  voice: voiceOrderSchema,
  item: orderItemSchema,
  itemModifier: orderItemModifierSchema
};

/**
 * Helper: Validate UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Helper: Map UI order type to DB order type
 */
export function mapOrderTypeToDb(uiType: string): OrderType {
  const mapping: Record<string, OrderType> = {
    'kiosk': 'online',
    'voice': 'online',
    'dine-in': 'online',
    'drive-thru': 'pickup',
    'takeout': 'pickup',
    'online': 'online',
    'pickup': 'pickup',
    'delivery': 'delivery'
  };

  return mapping[uiType] || 'online';
}

/**
 * Export constants for use in other modules
 */
export const ORDER_STATUS_VALUES = ORDER_STATUSES;
export const DB_ORDER_TYPE_VALUES = DB_ORDER_TYPES;
export const UI_ORDER_TYPE_VALUES = UI_ORDER_TYPES;
export const PAYMENT_STATUS_VALUES = PAYMENT_STATUSES;
export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS;
