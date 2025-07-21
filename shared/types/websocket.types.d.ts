/**
 * Unified WebSocket Types
 * Single source of truth for all real-time communication types
 */
import { Order, OrderStatus } from './order.types';
import { Table, TableStatus } from './table.types';
export type WebSocketEventType = 'order:created' | 'order:updated' | 'order:status_changed' | 'order:cancelled' | 'table:updated' | 'table:status_changed' | 'menu:updated' | 'notification' | 'error';
export interface WebSocketMessage<T = any> {
    type: WebSocketEventType;
    payload: T;
    timestamp: string;
    restaurant_id: string;
}
export interface OrderCreatedPayload {
    order: Order;
}
export interface OrderUpdatedPayload {
    order: Order;
    changes: Partial<Order>;
}
export interface OrderStatusChangedPayload {
    order_id: string;
    previous_status: OrderStatus;
    new_status: OrderStatus;
    order: Order;
}
export interface TableUpdatedPayload {
    table: Table;
    changes: Partial<Table>;
}
export interface TableStatusChangedPayload {
    table_id: string;
    previous_status: TableStatus;
    new_status: TableStatus;
    table: Table;
}
export interface NotificationPayload {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    action?: {
        label: string;
        url?: string;
        action_type?: string;
    };
}
export interface ErrorPayload {
    code: string;
    message: string;
    details?: any;
}
export type WebSocketPayload = OrderCreatedPayload | OrderUpdatedPayload | OrderStatusChangedPayload | TableUpdatedPayload | TableStatusChangedPayload | NotificationPayload | ErrorPayload;
//# sourceMappingURL=websocket.types.d.ts.map