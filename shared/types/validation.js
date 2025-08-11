"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schemas = exports.TypeValidator = exports.ApiSchemas = exports.TableSchemas = exports.OrderSchemas = exports.CommonSchemas = exports.ValidationError = void 0;
const zod_1 = require("zod");
// Base validation utilities
class ValidationError extends Error {
    field;
    code;
    details;
    constructor(message, field, code, details) {
        super(message);
        this.field = field;
        this.code = code;
        this.details = details;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
// Common field validators
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const createStringValidator = (options) => {
    let schema = zod_1.z.string();
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
        schema = schema.transform(str => str.trim());
    }
    return options.required ? schema : schema.optional();
};
// Common field schemas
exports.CommonSchemas = {
    uuid: zod_1.z.string().regex(UUID_REGEX, 'Must be a valid UUID'),
    email: zod_1.z.string().regex(EMAIL_REGEX, 'Must be a valid email address'),
    phone: zod_1.z.string().regex(PHONE_REGEX, 'Must be a valid phone number').optional(),
    url: zod_1.z.string().url('Must be a valid URL').optional(),
    // Restaurant/business specific
    restaurantId: zod_1.z.string().regex(UUID_REGEX, 'Invalid restaurant ID'),
    tableNumber: createStringValidator({ minLength: 1, maxLength: 10, required: true, sanitize: true }),
    orderNumber: createStringValidator({ minLength: 1, maxLength: 50, required: true, sanitize: true }),
    // Numeric validators with business rules
    price: zod_1.z.number().min(0).max(99999.99).transform(val => Math.round(val * 100) / 100), // Round to cents
    quantity: zod_1.z.number().int().min(1).max(999),
    percentage: zod_1.z.number().min(0).max(100),
    // Date validators
    dateString: zod_1.z.string().datetime(),
    futureDate: zod_1.z.string().datetime().refine((date) => new Date(date) > new Date(), { message: 'Date must be in the future' }),
    // Position/coordinate validators
    coordinate: zod_1.z.number().min(-9999).max(9999),
    zIndex: zod_1.z.number().int().min(0).max(9999),
    // Status enums
    orderStatus: zod_1.z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
    orderType: zod_1.z.enum(['dine-in', 'takeout', 'delivery']),
    paymentStatus: zod_1.z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']),
    tableStatus: zod_1.z.enum(['available', 'occupied', 'reserved', 'cleaning']),
    tableShape: zod_1.z.enum(['rectangle', 'square', 'round']),
    // Security-focused validators
    safeHtml: zod_1.z.string().transform(str => str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')),
    // Pagination
    pageNumber: zod_1.z.number().int().min(1).default(1),
    pageSize: zod_1.z.number().int().min(1).max(100).default(20),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc')
};
// Order validation schemas
exports.OrderSchemas = {
    // Order item modifier
    modifier: zod_1.z.object({
        id: exports.CommonSchemas.uuid,
        name: createStringValidator({ minLength: 1, maxLength: 100, required: true, sanitize: true }),
        price: exports.CommonSchemas.price
    }),
    // Order item
    orderItem: zod_1.z.object({
        id: exports.CommonSchemas.uuid,
        menu_item_id: exports.CommonSchemas.uuid,
        quantity: exports.CommonSchemas.quantity,
        unit_price: exports.CommonSchemas.price,
        subtotal: exports.CommonSchemas.price,
        modifiers: zod_1.z.array(zod_1.z.lazy(() => exports.OrderSchemas.modifier)).nullable().default(null),
        special_instructions: createStringValidator({ maxLength: 500, sanitize: true })
    }),
    // Complete order
    order: zod_1.z.object({
        id: exports.CommonSchemas.uuid,
        order_number: exports.CommonSchemas.orderNumber,
        restaurant_id: exports.CommonSchemas.restaurantId,
        customer_id: exports.CommonSchemas.uuid.nullable().default(null),
        table_number: exports.CommonSchemas.tableNumber.nullable().default(null),
        status: exports.CommonSchemas.orderStatus,
        type: exports.CommonSchemas.orderType,
        items: zod_1.z.array(zod_1.z.lazy(() => exports.OrderSchemas.orderItem)).min(1, 'Order must have at least one item'),
        subtotal: exports.CommonSchemas.price,
        tax: exports.CommonSchemas.price,
        tip: exports.CommonSchemas.price.nullable().default(null),
        total: exports.CommonSchemas.price,
        payment_status: exports.CommonSchemas.paymentStatus,
        special_instructions: createStringValidator({ maxLength: 1000, sanitize: true }),
        preparation_time_minutes: zod_1.z.number().int().min(1).max(480).nullable().default(null), // Max 8 hours
        completed_at: exports.CommonSchemas.dateString.nullable().default(null),
        created_at: exports.CommonSchemas.dateString,
        updated_at: exports.CommonSchemas.dateString
    }),
    // Order creation request (subset of full order)
    createOrderRequest: zod_1.z.object({
        restaurant_id: exports.CommonSchemas.restaurantId,
        customer_id: exports.CommonSchemas.uuid.optional(),
        table_number: exports.CommonSchemas.tableNumber.optional(),
        type: exports.CommonSchemas.orderType,
        items: zod_1.z.array(zod_1.z.object({
            menu_item_id: exports.CommonSchemas.uuid,
            quantity: exports.CommonSchemas.quantity,
            modifiers: zod_1.z.array(zod_1.z.object({
                id: exports.CommonSchemas.uuid,
                name: createStringValidator({ minLength: 1, maxLength: 100, required: true }),
                price: exports.CommonSchemas.price
            })).optional(),
            special_instructions: createStringValidator({ maxLength: 500, sanitize: true })
        })).min(1),
        special_instructions: createStringValidator({ maxLength: 1000, sanitize: true }),
        tip: zod_1.z.number().min(0).max(99999.99).transform(val => Math.round(val * 100) / 100).optional()
    }),
    // Order update request
    updateOrderRequest: zod_1.z.object({
        status: exports.CommonSchemas.orderStatus.optional(),
        special_instructions: createStringValidator({ maxLength: 1000, sanitize: true }),
        preparation_time_minutes: zod_1.z.number().int().min(1).max(480).optional()
    })
};
// Table validation schemas  
exports.TableSchemas = {
    // Table position
    position: zod_1.z.object({
        x: exports.CommonSchemas.coordinate,
        y: exports.CommonSchemas.coordinate
    }),
    // Complete table
    table: zod_1.z.object({
        id: exports.CommonSchemas.uuid,
        restaurant_id: exports.CommonSchemas.restaurantId,
        table_number: exports.CommonSchemas.tableNumber,
        seats: zod_1.z.number().int().min(1).max(20),
        status: exports.CommonSchemas.tableStatus,
        position: zod_1.z.lazy(() => exports.TableSchemas.position).optional(),
        width: zod_1.z.number().min(20).max(500).optional(),
        height: zod_1.z.number().min(20).max(500).optional(),
        shape: exports.CommonSchemas.tableShape.optional(),
        z_index: exports.CommonSchemas.zIndex.optional(),
        created_at: exports.CommonSchemas.dateString,
        updated_at: exports.CommonSchemas.dateString
    }),
    // Table creation request
    createTableRequest: zod_1.z.object({
        restaurant_id: exports.CommonSchemas.restaurantId,
        table_number: exports.CommonSchemas.tableNumber,
        seats: zod_1.z.number().int().min(1).max(20),
        position: zod_1.z.object({
            x: exports.CommonSchemas.coordinate,
            y: exports.CommonSchemas.coordinate
        }).optional(),
        width: zod_1.z.number().min(20).max(500).default(80),
        height: zod_1.z.number().min(20).max(500).default(80),
        shape: exports.CommonSchemas.tableShape.default('rectangle')
    }),
    // Table update request
    updateTableRequest: zod_1.z.object({
        table_number: exports.CommonSchemas.tableNumber.optional(),
        seats: zod_1.z.number().int().min(1).max(20).optional(),
        status: exports.CommonSchemas.tableStatus.optional(),
        position: zod_1.z.object({
            x: exports.CommonSchemas.coordinate,
            y: exports.CommonSchemas.coordinate
        }).optional(),
        width: zod_1.z.number().min(20).max(500).optional(),
        height: zod_1.z.number().min(20).max(500).optional(),
        shape: exports.CommonSchemas.tableShape.optional()
    })
};
// API Response schemas
exports.ApiSchemas = {
    // Generic API response
    apiResponse: (dataSchema) => zod_1.z.object({
        success: zod_1.z.boolean(),
        data: dataSchema.optional(),
        error: zod_1.z.object({
            code: zod_1.z.enum(['VALIDATION_ERROR', 'NOT_FOUND', 'SERVER_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'CONFLICT', 'RATE_LIMITED']),
            message: zod_1.z.string().min(1),
            details: zod_1.z.record(zod_1.z.array(zod_1.z.string())).optional()
        }).optional()
    }),
    // Paginated response
    paginatedResponse: (dataSchema) => zod_1.z.object({
        data: zod_1.z.array(dataSchema),
        total: zod_1.z.number().int().min(0),
        page: exports.CommonSchemas.pageNumber,
        limit: exports.CommonSchemas.pageSize,
        total_pages: zod_1.z.number().int().min(0)
    }),
    // Pagination parameters
    paginationParams: zod_1.z.object({
        page: exports.CommonSchemas.pageNumber,
        limit: exports.CommonSchemas.pageSize,
        sort_by: zod_1.z.string().optional(),
        sort_order: exports.CommonSchemas.sortOrder
    })
};
// Validation utilities
class TypeValidator {
    /**
     * Safely parse and validate data against a schema
     */
    static safeParse(schema, data, context) {
        try {
            const result = schema.safeParse(data);
            if (result.success) {
                return { success: true, data: result.data };
            }
            const errorDetails = {};
            result.error.errors.forEach(err => {
                const path = err.path.join('.');
                if (!errorDetails[path]) {
                    errorDetails[path] = [];
                }
                errorDetails[path].push(err.message);
            });
            return {
                success: false,
                error: new ValidationError(`Validation failed${context ? ` for ${context}` : ''}`, result.error.errors[0]?.path.join('.'), 'VALIDATION_ERROR', errorDetails)
            };
        }
        catch (error) {
            return {
                success: false,
                error: new ValidationError(`Validation error${context ? ` for ${context}` : ''}: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, 'VALIDATION_ERROR')
            };
        }
    }
    /**
     * Parse and validate data, throwing on error
     */
    static parse(schema, data, context) {
        const result = this.safeParse(schema, data, context);
        if (!result.success) {
            throw result.error;
        }
        return result.data;
    }
    /**
     * Create a validation middleware for Express routes
     */
    static createMiddleware(schema, target = 'body') {
        return (req, res, next) => {
            const result = this.safeParse(schema, req[target], `${target} validation`);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: result.error.message,
                        details: result.error.details
                    }
                });
            }
            // Replace the original data with validated/sanitized data
            req[target] = result.data;
            next();
        };
    }
}
exports.TypeValidator = TypeValidator;
// Export all schemas
exports.Schemas = {
    ...exports.CommonSchemas,
    ...exports.OrderSchemas,
    ...exports.TableSchemas,
    ...exports.ApiSchemas
};
