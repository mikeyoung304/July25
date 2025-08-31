"use strict";
/**
 * Type-Safe Transformation Utilities
 * Provides safe conversion between different type formats across the application
 *
 * ENTERPRISE-GRADE TYPE SAFETY:
 * - No `any` usage
 * - Runtime validation
 * - Compile-time guarantees
 * - Structured error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbOrderTypeToUI = exports.uiOrderTypeToDb = exports.TypeTransformer = exports.DATABASE_FIELD_MAPS = exports.transformSharedToDatabase = exports.transformDatabaseToShared = exports.transformClientTableToShared = exports.transformSharedTableToClient = exports.transformSharedMenuItemToClient = exports.transformClientOrderItemToShared = exports.transformSharedOrderItemToClient = exports.transformClientOrderToShared = exports.transformSharedOrderToClient = exports.TypeTransformationError = void 0;
// Validation error types
class TypeTransformationError extends Error {
    field;
    originalValue;
    constructor(message, field, originalValue) {
        super(message);
        this.field = field;
        this.originalValue = originalValue;
        this.name = 'TypeTransformationError';
    }
}
exports.TypeTransformationError = TypeTransformationError;
// Validation utilities
const validateString = (value, fieldName) => {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeTransformationError(`Field '${fieldName}' must be a non-empty string`, fieldName, value);
    }
    return value;
};
const validateNumber = (value, fieldName) => {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new TypeTransformationError(`Field '${fieldName}' must be a valid number`, fieldName, value);
    }
    return value;
};
const validateDate = (value, fieldName) => {
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) {
        throw new TypeTransformationError(`Field '${fieldName}' must be a valid date`, fieldName, value);
    }
    return date;
};
// Order transformations
const transformSharedOrderToClient = (order) => {
    try {
        return {
            id: validateString(order.id, 'id'),
            orderNumber: validateString(order.order_number, 'order_number'),
            restaurantId: validateString(order.restaurant_id, 'restaurant_id'),
            customerId: order.customer_name || undefined,
            tableNumber: order.table_number || undefined,
            status: order.status,
            type: order.type,
            items: order.items.map(exports.transformSharedOrderItemToClient),
            subtotal: validateNumber(order.subtotal, 'subtotal'),
            tax: validateNumber(order.tax, 'tax'),
            tip: order.tip || undefined,
            totalAmount: validateNumber(order.total, 'total'),
            paymentStatus: order.payment_status === 'paid' ? 'completed' : order.payment_status,
            specialInstructions: order.notes || undefined,
            preparationTimeMinutes: order.estimated_ready_time ? 15 : undefined,
            orderTime: validateDate(order.created_at, 'created_at'),
            completedTime: order.completed_at ? validateDate(order.completed_at, 'completed_at') : undefined,
            createdAt: validateDate(order.created_at, 'created_at'),
            updatedAt: validateDate(order.updated_at, 'updated_at')
        };
    }
    catch (error) {
        if (error instanceof TypeTransformationError) {
            throw error;
        }
        throw new TypeTransformationError(`Failed to transform SharedOrder to ClientOrder: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, order);
    }
};
exports.transformSharedOrderToClient = transformSharedOrderToClient;
const transformClientOrderToShared = (order) => {
    try {
        return {
            id: validateString(order.id, 'id'),
            order_number: validateString(order.orderNumber, 'orderNumber'),
            restaurant_id: validateString(order.restaurantId, 'restaurantId'),
            table_number: order.tableNumber || null,
            status: order.status,
            type: order.type,
            items: order.items.map(exports.transformClientOrderItemToShared),
            subtotal: validateNumber(order.subtotal, 'subtotal'),
            tax: validateNumber(order.tax, 'tax'),
            tip: order.tip || null,
            total: validateNumber(order.totalAmount, 'totalAmount'),
            payment_status: order.paymentStatus === 'completed' ? 'paid' : order.paymentStatus,
            notes: order.specialInstructions || undefined,
            estimated_ready_time: order.preparationTimeMinutes ? new Date(Date.now() + order.preparationTimeMinutes * 60000).toISOString() : undefined,
            completed_at: order.completedTime ? order.completedTime.toISOString() : undefined,
            created_at: order.createdAt.toISOString(),
            updated_at: order.updatedAt.toISOString()
        };
    }
    catch (error) {
        if (error instanceof TypeTransformationError) {
            throw error;
        }
        throw new TypeTransformationError(`Failed to transform ClientOrder to SharedOrder: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, order);
    }
};
exports.transformClientOrderToShared = transformClientOrderToShared;
// Order item transformations
const transformSharedOrderItemToClient = (item) => {
    try {
        return {
            id: validateString(item.id, 'id'),
            menuItemId: validateString(item.menu_item_id, 'menu_item_id'),
            quantity: validateNumber(item.quantity, 'quantity'),
            unitPrice: validateNumber(item.price, 'price'),
            subtotal: validateNumber(item.subtotal, 'subtotal'),
            modifiers: item.modifiers?.map(mod => ({
                id: validateString(mod.id, 'modifier.id'),
                name: validateString(mod.name, 'modifier.name'),
                price: validateNumber(mod.price, 'modifier.price')
            })) || undefined,
            specialInstructions: item.special_instructions || undefined
        };
    }
    catch (error) {
        if (error instanceof TypeTransformationError) {
            throw error;
        }
        throw new TypeTransformationError(`Failed to transform SharedOrderItem to ClientOrderItem: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, item);
    }
};
exports.transformSharedOrderItemToClient = transformSharedOrderItemToClient;
const transformClientOrderItemToShared = (item) => {
    try {
        return {
            id: validateString(item.id, 'id'),
            menu_item_id: validateString(item.menuItemId, 'menuItemId'),
            name: 'Unknown Item', // Client doesn't have name, use placeholder
            quantity: validateNumber(item.quantity, 'quantity'),
            price: validateNumber(item.unitPrice, 'unitPrice'),
            subtotal: validateNumber(item.subtotal, 'subtotal'),
            modifiers: item.modifiers?.map(mod => ({
                id: validateString(mod.id, 'modifier.id'),
                name: validateString(mod.name, 'modifier.name'),
                price: validateNumber(mod.price, 'modifier.price')
            })) || undefined,
            special_instructions: item.specialInstructions || undefined
        };
    }
    catch (error) {
        if (error instanceof TypeTransformationError) {
            throw error;
        }
        throw new TypeTransformationError(`Failed to transform ClientOrderItem to SharedOrderItem: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, item);
    }
};
exports.transformClientOrderItemToShared = transformClientOrderItemToShared;
// Menu item transformations
const transformSharedMenuItemToClient = (item) => {
    try {
        return {
            id: validateString(item.id, 'id'),
            restaurantId: validateString(item.restaurant_id, 'restaurant_id'),
            name: validateString(item.name, 'name'),
            description: item.description || undefined,
            price: validateNumber(item.price, 'price'),
            category: validateString(item.category_id, 'category_id'), // Note: Using category_id as string
            available: item.is_available,
            imageUrl: item.image_url || undefined,
            prepTimeMinutes: item.preparation_time || undefined,
            createdAt: validateDate(item.created_at, 'created_at'),
            updatedAt: validateDate(item.updated_at, 'updated_at')
        };
    }
    catch (error) {
        if (error instanceof TypeTransformationError) {
            throw error;
        }
        throw new TypeTransformationError(`Failed to transform SharedMenuItem to ClientMenuItem: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, item);
    }
};
exports.transformSharedMenuItemToClient = transformSharedMenuItemToClient;
// Table transformations - critical for floor plan integration
const transformSharedTableToClient = (table) => {
    try {
        // Extract position coordinates with validation
        const position = table.position || { x: 0, y: 0 };
        const x = validateNumber(position.x, 'position.x');
        const y = validateNumber(position.y, 'position.y');
        // Map shape to type with validation
        const shapeToTypeMap = {
            'rectangle': 'rectangle',
            'square': 'square',
            'round': 'circle'
        };
        const shape = table.shape || 'rectangle';
        const type = shapeToTypeMap[shape];
        if (!type) {
            throw new TypeTransformationError(`Invalid table shape: ${shape}`, 'shape', shape);
        }
        return {
            id: validateString(table.id, 'id'),
            restaurantId: validateString(table.restaurant_id, 'restaurant_id'),
            tableNumber: validateString(table.table_number, 'table_number'),
            seats: validateNumber(table.capacity, 'capacity'),
            status: table.status,
            x,
            y,
            width: 80, // Default dimensions
            height: 80,
            type,
            zIndex: 1,
            createdAt: validateDate(table.created_at, 'created_at'),
            updatedAt: validateDate(table.updated_at, 'updated_at')
        };
    }
    catch (error) {
        if (error instanceof TypeTransformationError) {
            throw error;
        }
        throw new TypeTransformationError(`Failed to transform SharedTable to ClientTable: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, table);
    }
};
exports.transformSharedTableToClient = transformSharedTableToClient;
const transformClientTableToShared = (table) => {
    try {
        // Map type back to shape
        const typeToShapeMap = {
            'rectangle': 'rectangle',
            'square': 'square',
            'circle': 'round'
        };
        return {
            id: validateString(table.id, 'id'),
            restaurant_id: validateString(table.restaurantId, 'restaurantId'),
            table_number: validateString(table.tableNumber, 'tableNumber'),
            capacity: validateNumber(table.seats, 'seats'),
            status: table.status,
            position: {
                x: validateNumber(table.x, 'x'),
                y: validateNumber(table.y, 'y')
            },
            shape: typeToShapeMap[table.type],
            created_at: table.createdAt.toISOString(),
            updated_at: table.updatedAt.toISOString()
        };
    }
    catch (error) {
        if (error instanceof TypeTransformationError) {
            throw error;
        }
        throw new TypeTransformationError(`Failed to transform ClientTable to SharedTable: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, table);
    }
};
exports.transformClientTableToShared = transformClientTableToShared;
// Database field mapping utilities (for server-side use)
const transformDatabaseToShared = (dbRecord, fieldMap) => {
    const result = {};
    for (const [dbField, sharedField] of Object.entries(fieldMap)) {
        if (dbField in dbRecord) {
            result[sharedField] = dbRecord[dbField];
        }
    }
    // Copy unmapped fields
    for (const [key, value] of Object.entries(dbRecord)) {
        if (!(key in fieldMap)) {
            result[key] = value;
        }
    }
    return result;
};
exports.transformDatabaseToShared = transformDatabaseToShared;
const transformSharedToDatabase = (sharedRecord, fieldMap) => {
    const result = {};
    const reverseMap = Object.fromEntries(Object.entries(fieldMap).map(([db, shared]) => [shared, db]));
    for (const [sharedField, dbField] of Object.entries(reverseMap)) {
        if (sharedField in sharedRecord) {
            result[dbField] = sharedRecord[sharedField];
        }
    }
    // Copy unmapped fields
    for (const [key, value] of Object.entries(sharedRecord)) {
        if (!(key in reverseMap)) {
            result[key] = value;
        }
    }
    return result;
};
exports.transformSharedToDatabase = transformSharedToDatabase;
// Common field mappings
exports.DATABASE_FIELD_MAPS = {
    tables: {
        'x_pos': 'position.x',
        'y_pos': 'position.y',
        'shape': 'shape',
        'z_index': 'z_index'
    },
    orders: {
        'order_number': 'order_number',
        'total_amount': 'total',
        'payment_status': 'payment_status'
    }
};
// Type-safe transformation wrapper
class TypeTransformer {
    static safeTransform(transformer, input, errorContext) {
        try {
            return transformer(input);
        }
        catch (error) {
            if (error instanceof TypeTransformationError) {
                throw error;
            }
            throw new TypeTransformationError(`${errorContext || 'Transformation'} failed: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, input);
        }
    }
}
exports.TypeTransformer = TypeTransformer;
/**
 * Convert UI order types to database-valid order types
 * Maps user-facing order types to the database schema
 */
function uiOrderTypeToDb(uiType) {
    const mapping = {
        'dine-in': 'online', // Dine-in orders use online flow
        'takeout': 'pickup', // Takeout is pickup
        'delivery': 'delivery', // Direct mapping
        'online': 'online', // Direct mapping
        'drive-thru': 'pickup', // Drive-thru is pickup
        'kiosk': 'online', // Kiosk orders use online flow
        'voice': 'online' // Voice orders use online flow
    };
    return mapping[uiType];
}
exports.uiOrderTypeToDb = uiOrderTypeToDb;
/**
 * Convert database order types to UI display types
 * Maps database schema to user-facing order types
 */
function dbOrderTypeToUI(dbType) {
    const mapping = {
        'online': 'online',
        'pickup': 'takeout',
        'delivery': 'delivery'
    };
    return mapping[dbType];
}
exports.dbOrderTypeToUI = dbOrderTypeToUI;
