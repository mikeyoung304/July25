/**
 * Unified Types Export
 * Single source of truth for all shared types across the application
 */
export * from './order.types';
export * from './menu.types';
export * from './customer.types';
export * from './table.types';
export * from './websocket.types';
export interface PaginationParams {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
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
//# sourceMappingURL=index.d.ts.map