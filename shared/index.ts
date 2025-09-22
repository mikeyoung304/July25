// shared/index.ts
export * from './types/order.types';    // existing zod types
export * from './types/menu.types';
export * from './types/customer.types';
export * from './types/table.types';
export * from './types/websocket.types';
export * from './types/events.types';    // event types
export * from './types/transformers';
export * from './types/validation';
// Export utils but avoid conflicts with runtime
export * from './utils';

// Selectively export from runtime to avoid conflicts
export { 
  RuntimeMemoryMonitor
  // CleanupManager and ManagedService are already exported from utils
} from './runtime';
export * from './src/voice-types';      // voice websocket types
export * from './cart';                 // cart utilities
// Export api-types with "Api" prefix to avoid conflicts
export type {
  ApiMenuItem,
  ApiMenuCategory,
  ApiMenuItemModifier,
  ApiMenuItemModifierOption,
  ApiMenuItemModifierGroup,
  ApiMenuResponse,
  // Re-export with standard names (will override menu.types exports)
  MenuItem as ApiMenuItem_Alt,
  MenuCategory as ApiMenuCategory_Alt,
  MenuResponse as ApiMenuResponse_Alt
} from './api-types';

// Common types used across modules
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'CONFLICT' | 'RATE_LIMITED';
    message: string;
    details?: Record<string, string[]>; // Structured validation errors
  };
}

export interface RestaurantSettings {
  orderPrefix?: string;
  autoAcceptOrders?: boolean;
  kitchenDisplayMode?: 'grid' | 'list';
}

export interface Restaurant {
  id: string;
  name: string;
  logo_url?: string;
  timezone: string;
  currency: string;
  tax_rate: number;
  default_tip_percentages?: number[];
  settings?: RestaurantSettings;
  created_at: string;
  updated_at: string;
}

export interface CreateRestaurantDTO {
  name: string;
  timezone: string;
  currency: string;
  tax_rate: number;
  settings?: RestaurantSettings;
}

export interface UpdateRestaurantDTO {
  name?: string;
  timezone?: string;
  currency?: string;
  tax_rate?: number;
  settings?: RestaurantSettings;
}