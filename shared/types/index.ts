/**
 * Unified Types Export
 * Single source of truth for all shared types across the application
 */

// Order types
export * from './order.types';

// Menu types
export * from './menu.types';

// Customer types
export * from './customer.types';

// Table types
export * from './table.types';

// WebSocket types
export * from './websocket.types';

// Event types
export * from './events.types';

// Type transformation utilities
export * from './transformers';

// Runtime validation utilities
export * from './validation';

// Utility functions
export * from '../utils';

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

export interface VoiceSettings {
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  max_response_output_tokens?: number;
}

export interface RestaurantSettings {
  orderPrefix?: string;
  autoAcceptOrders?: boolean;
  kitchenDisplayMode?: 'grid' | 'list';
  voice?: {
    employee?: VoiceSettings;
    customer?: VoiceSettings;
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