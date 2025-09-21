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
import type { Order as SharedOrder, OrderItem as SharedOrderItem, OrderType, UIOrderType } from './order.types';
import type { MenuItem as SharedMenuItem } from './menu.types';
import type { Table as SharedTable } from './table.types';
export interface Restaurant {
    id: string;
    name: string;
    logo_url?: string;
    timezone: string;
    currency: string;
    tax_rate: number;
    default_tip_percentages?: number[];
    created_at: string;
    updated_at: string;
}
export declare class TypeTransformationError extends Error {
    readonly field?: string | undefined;
    readonly originalValue?: unknown;
    constructor(message: string, field?: string | undefined, originalValue?: unknown);
}
export interface ClientOrder {
    id: string;
    orderNumber: string;
    restaurantId: string;
    customerId?: string;
    tableNumber?: string;
    status: SharedOrder['status'];
    type: SharedOrder['type'];
    items: ClientOrderItem[];
    subtotal: number;
    tax: number;
    tip?: number;
    totalAmount: number;
    paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    specialInstructions?: string;
    preparationTimeMinutes?: number;
    orderTime: Date;
    completedTime?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface ClientOrderItem {
    id: string;
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    modifiers?: ClientModifier[];
    specialInstructions?: string;
}
export interface ClientModifier {
    id: string;
    name: string;
    price: number;
}
export interface ClientMenuItem {
    id: string;
    restaurantId: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    available: boolean;
    imageUrl?: string;
    prepTimeMinutes?: number;
    calories?: number;
    allergens?: string[];
    spicyLevel?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface ClientTable {
    id: string;
    restaurantId: string;
    tableNumber: string;
    seats: number;
    status: SharedTable['status'];
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'circle' | 'rectangle' | 'square' | 'chip_monkey';
    zIndex: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const transformSharedOrderToClient: (order: SharedOrder) => ClientOrder;
export declare const transformClientOrderToShared: (order: ClientOrder) => SharedOrder;
export declare const transformSharedOrderItemToClient: (item: SharedOrderItem) => ClientOrderItem;
export declare const transformClientOrderItemToShared: (item: ClientOrderItem) => SharedOrderItem;
export declare const transformSharedMenuItemToClient: (item: SharedMenuItem) => ClientMenuItem;
export declare const transformSharedTableToClient: (table: SharedTable) => ClientTable;
export declare const transformClientTableToShared: (table: ClientTable) => SharedTable;
export declare const transformDatabaseToShared: <T extends Record<string, unknown>>(dbRecord: T, fieldMap: Record<string, string>) => Record<string, unknown>;
export declare const transformSharedToDatabase: <T extends Record<string, unknown>>(sharedRecord: T, fieldMap: Record<string, string>) => Record<string, unknown>;
export declare const DATABASE_FIELD_MAPS: {
    readonly tables: {
        readonly x_pos: "position.x";
        readonly y_pos: "position.y";
        readonly shape: "shape";
        readonly z_index: "z_index";
    };
    readonly orders: {
        readonly order_number: "order_number";
        readonly total_amount: "total";
        readonly payment_status: "payment_status";
    };
};
export declare class TypeTransformer {
    static safeTransform<T, R>(transformer: (input: T) => R, input: T, errorContext?: string): R;
}
/**
 * Convert UI order types to database-valid order types
 * Maps user-facing order types to the database schema
 */
export declare function uiOrderTypeToDb(uiType: UIOrderType): OrderType;
/**
 * Convert database order types to UI display types
 * Maps database schema to user-facing order types
 */
export declare function dbOrderTypeToUI(dbType: OrderType): UIOrderType;
//# sourceMappingURL=transformers.d.ts.map