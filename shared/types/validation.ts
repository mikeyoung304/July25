/**
 * Runtime Type Validation for API Boundaries
 * Provides Zod schemas and validation utilities for enterprise-grade type safety
 * 
 * ENTERPRISE FEATURES:
 * - Runtime type validation
 * - Structured error reporting
 * - Input sanitization
 * - Type coercion with validation
 * - Security-focused validation
 */

import { z } from 'zod';

// Base validation utilities
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Common field validators
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createStringValidator = (options: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
  sanitize?: boolean;
}) => {
  let schema = z.string();
  
  // Apply validations before transform
  if (options.minLength) {
    schema = schema.min(options.minLength);
  }
  
  if (options.maxLength) {
    schema = schema.max(options.maxLength);
  }
  
  if (options.pattern) {
    schema = schema.regex(options.pattern);
  }
  
  // Apply transform last
  if (options.sanitize) {
    schema = schema.transform(str => str.trim()) as any;
  }
  
  return options.required ? schema : schema.optional();
};

// Common field schemas
export const CommonSchemas = {
  uuid: z.string().regex(UUID_REGEX, 'Must be a valid UUID'),
  email: z.string().regex(EMAIL_REGEX, 'Must be a valid email address'),
  phone: z.string().regex(PHONE_REGEX, 'Must be a valid phone number').optional(),
  url: z.string().url('Must be a valid URL').optional(),
  
  // Restaurant/business specific
  restaurantId: z.string().regex(UUID_REGEX, 'Invalid restaurant ID'),
  tableNumber: createStringValidator({ minLength: 1, maxLength: 10, required: true, sanitize: true }),
  orderNumber: createStringValidator({ minLength: 1, maxLength: 50, required: true, sanitize: true }),
  
  // Numeric validators with business rules
  price: z.number().min(0).max(99999.99).transform(val => Math.round(val * 100) / 100), // Round to cents
  quantity: z.number().int().min(1).max(999),
  percentage: z.number().min(0).max(100),
  
  // Date validators
  dateString: z.string().datetime(),
  futureDate: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    { message: 'Date must be in the future' }
  ),
  
  // Position/coordinate validators
  coordinate: z.number().min(-9999).max(9999),
  zIndex: z.number().int().min(0).max(9999),
  
  // Status enums
  orderStatus: z.enum(['new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
  orderType: z.enum(['dine-in', 'takeout', 'delivery']),
  paymentStatus: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']),
  tableStatus: z.enum(['available', 'occupied', 'reserved', 'cleaning']),
  tableShape: z.enum(['rectangle', 'square', 'round', 'circle', 'chip_monkey']),
  
  // Security-focused validators
  safeHtml: z.string().transform(str => 
    str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
       .replace(/javascript:/gi, '')
       .replace(/on\w+\s*=/gi, '')
  ),
  
  // Pagination
  pageNumber: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
} as const;

// Order validation schemas
export const OrderSchemas: any = {
  // Order item modifier
  modifier: z.object({
    id: CommonSchemas.uuid,
    name: createStringValidator({ minLength: 1, maxLength: 100, required: true, sanitize: true }),
    price: CommonSchemas.price
  }),
  
  // Order item
  orderItem: z.object({
    id: CommonSchemas.uuid,
    menu_item_id: CommonSchemas.uuid,
    quantity: CommonSchemas.quantity,
    unit_price: CommonSchemas.price,
    subtotal: CommonSchemas.price,
    modifiers: z.array(z.lazy(() => OrderSchemas.modifier)).nullable().default(null),
    special_instructions: createStringValidator({ maxLength: 500, sanitize: true })
  }),
  
  // Complete order
  order: z.object({
    id: CommonSchemas.uuid,
    order_number: CommonSchemas.orderNumber,
    restaurant_id: CommonSchemas.restaurantId,
    customer_id: CommonSchemas.uuid.nullable().default(null),
    table_number: CommonSchemas.tableNumber.nullable().default(null),
    status: CommonSchemas.orderStatus,
    type: CommonSchemas.orderType,
    items: z.array(z.lazy(() => OrderSchemas.orderItem)).min(1, 'Order must have at least one item'),
    subtotal: CommonSchemas.price,
    tax: CommonSchemas.price,
    tip: CommonSchemas.price.nullable().default(null),
    total: CommonSchemas.price,
    payment_status: CommonSchemas.paymentStatus,
    special_instructions: createStringValidator({ maxLength: 1000, sanitize: true }),
    preparation_time_minutes: z.number().int().min(1).max(480).nullable().default(null), // Max 8 hours
    completed_at: CommonSchemas.dateString.nullable().default(null),
    created_at: CommonSchemas.dateString,
    updated_at: CommonSchemas.dateString
  }),
  
  // Order creation request (subset of full order)
  createOrderRequest: z.object({
    restaurant_id: CommonSchemas.restaurantId,
    customer_id: CommonSchemas.uuid.optional(),
    table_number: CommonSchemas.tableNumber.optional(),
    type: CommonSchemas.orderType,
    items: z.array(z.object({
      menu_item_id: CommonSchemas.uuid,
      quantity: CommonSchemas.quantity,
      modifiers: z.array(z.object({
        id: CommonSchemas.uuid,
        name: createStringValidator({ minLength: 1, maxLength: 100, required: true }),
        price: CommonSchemas.price
      })).optional(),
      special_instructions: createStringValidator({ maxLength: 500, sanitize: true })
    })).min(1),
    special_instructions: createStringValidator({ maxLength: 1000, sanitize: true }),
    tip: z.number().min(0).max(99999.99).transform(val => Math.round(val * 100) / 100).optional()
  }),
  
  // Order update request
  updateOrderRequest: z.object({
    status: CommonSchemas.orderStatus.optional(),
    special_instructions: createStringValidator({ maxLength: 1000, sanitize: true }),
    preparation_time_minutes: z.number().int().min(1).max(480).optional()
  })
} as const;

// Table validation schemas  
export const TableSchemas: any = {
  // Table position
  position: z.object({
    x: CommonSchemas.coordinate,
    y: CommonSchemas.coordinate
  }),
  
  // Complete table
  table: z.object({
    id: CommonSchemas.uuid,
    restaurant_id: CommonSchemas.restaurantId,
    table_number: CommonSchemas.tableNumber,
    seats: z.number().int().min(1).max(20),
    status: CommonSchemas.tableStatus,
    position: z.lazy(() => TableSchemas.position).optional(),
    width: z.number().min(20).max(500).optional(),
    height: z.number().min(20).max(500).optional(),
    shape: CommonSchemas.tableShape.optional(),
    z_index: CommonSchemas.zIndex.optional(),
    created_at: CommonSchemas.dateString,
    updated_at: CommonSchemas.dateString
  }),
  
  // Table creation request
  createTableRequest: z.object({
    restaurant_id: CommonSchemas.restaurantId,
    table_number: CommonSchemas.tableNumber,
    seats: z.number().int().min(1).max(20),
    position: z.object({
      x: CommonSchemas.coordinate,
      y: CommonSchemas.coordinate
    }).optional(),
    width: z.number().min(20).max(500).default(80),
    height: z.number().min(20).max(500).default(80),
    shape: CommonSchemas.tableShape.default('rectangle')
  }),
  
  // Table update request
  updateTableRequest: z.object({
    table_number: CommonSchemas.tableNumber.optional(),
    seats: z.number().int().min(1).max(20).optional(),
    status: CommonSchemas.tableStatus.optional(),
    position: z.object({
      x: CommonSchemas.coordinate,
      y: CommonSchemas.coordinate
    }).optional(),
    width: z.number().min(20).max(500).optional(),
    height: z.number().min(20).max(500).optional(),
    shape: CommonSchemas.tableShape.optional()
  })
} as const;

// API Response schemas
export const ApiSchemas = {
  // Generic API response
  apiResponse: <T extends z.ZodType>(dataSchema: T) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.enum(['VALIDATION_ERROR', 'NOT_FOUND', 'SERVER_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'CONFLICT', 'RATE_LIMITED']),
      message: z.string().min(1),
      details: z.record(z.array(z.string())).optional()
    }).optional()
  }),
  
  // Paginated response
  paginatedResponse: <T extends z.ZodType>(dataSchema: T) => z.object({
    data: z.array(dataSchema),
    total: z.number().int().min(0),
    page: CommonSchemas.pageNumber,
    limit: CommonSchemas.pageSize,
    total_pages: z.number().int().min(0)
  }),
  
  // Pagination parameters
  paginationParams: z.object({
    page: CommonSchemas.pageNumber,
    limit: CommonSchemas.pageSize,
    sort_by: z.string().optional(),
    sort_order: CommonSchemas.sortOrder
  })
} as const;

// Validation utilities
export class TypeValidator {
  /**
   * Safely parse and validate data against a schema
   */
  static safeParse<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context?: string
  ): { success: true; data: T } | { success: false; error: ValidationError } {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return { success: true, data: result.data };
      }
      
      const errorDetails: Record<string, string[]> = {};
      result.error.errors.forEach(err => {
        const path = err.path.join('.');
        if (!errorDetails[path]) {
          errorDetails[path] = [];
        }
        errorDetails[path].push(err.message);
      });
      
      return {
        success: false,
        error: new ValidationError(
          `Validation failed${context ? ` for ${context}` : ''}`,
          result.error.errors[0]?.path.join('.'),
          'VALIDATION_ERROR',
          errorDetails
        )
      };
    } catch (error) {
      return {
        success: false,
        error: new ValidationError(
          `Validation error${context ? ` for ${context}` : ''}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          undefined,
          'VALIDATION_ERROR'
        )
      };
    }
  }
  
  /**
   * Parse and validate data, throwing on error
   */
  static parse<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context?: string
  ): T {
    const result = this.safeParse(schema, data, context);
    
    if (!result.success) {
      throw (result as any).error;
    }
    
    return result.data;
  }
  
  /**
   * Create a validation middleware for Express routes
   */
  static createMiddleware<T>(
    schema: z.ZodSchema<T>,
    target: 'body' | 'params' | 'query' = 'body'
  ) {
    return (req: any, res: any, next: any) => {
      const result = this.safeParse(schema, req[target], `${target} validation`);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: (result as any).error.message,
            details: (result as any).error.details
          }
        });
      }
      
      // Replace the original data with validated/sanitized data
      req[target] = result.data;
      next();
    };
  }
}

// Export all schemas
export const Schemas = {
  ...CommonSchemas,
  ...OrderSchemas,
  ...TableSchemas,
  ...ApiSchemas
} as const;

// Type inference helpers
export type InferSchemaType<T extends z.ZodType> = z.infer<T>;

// Commonly used inferred types
export type ValidatedOrder = InferSchemaType<typeof OrderSchemas.order>;
export type ValidatedOrderItem = InferSchemaType<typeof OrderSchemas.orderItem>;
export type ValidatedTable = InferSchemaType<typeof TableSchemas.table>;
export type ValidatedCreateOrderRequest = InferSchemaType<typeof OrderSchemas.createOrderRequest>;
export type ValidatedCreateTableRequest = InferSchemaType<typeof TableSchemas.createTableRequest>;