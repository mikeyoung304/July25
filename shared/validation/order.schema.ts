/**
 * Unified Order Validation Schema (Node.js Only - Joi)
 *
 * CRITICAL: This file contains Joi schemas for SERVER-SIDE validation only.
 * Browser-safe constants and helpers live in ../utils/order-constants.ts
 *
 * Per ADR-001: All layers use snake_case
 * This schema enforces UUID validation and consistent order status flow
 */

import Joi from 'joi';
import {
  ORDER_STATUSES,
  DB_ORDER_TYPES,
  UI_ORDER_TYPES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS
} from '../utils/order-constants';

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
