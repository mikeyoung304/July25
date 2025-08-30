/**
 * Common API Response Types
 * These types replace 'any' throughout the codebase for better type safety
 */

// Generic API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp?: number;
}

// API Error structure
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

// Pagination response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Common request types
export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
  skipCache?: boolean;
}

// WebSocket message types
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  id?: string;
}

// Form data types
export interface FormFieldValue {
  value: string | number | boolean | null;
  error?: string;
  touched?: boolean;
}

export type FormData = Record<string, FormFieldValue>;

// Event handler types
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;
export type ErrorHandler = (error: Error | ApiError) => void;

// Callback types
export type Callback<T = void> = (result: T) => void;
export type AsyncCallback<T = void> = (result: T) => Promise<void>;

// JSON types for replacing any in JSON operations
export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// Database record types
export interface DatabaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
}

// Common UI component props that often use 'any'
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T = unknown> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => unknown; // React.ReactNode in client code
}

// Replace common 'any' patterns in error handling
export type UnknownError = Error | ApiError | unknown;

// Type guards
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

export function isApiResponse<T>(response: unknown): response is ApiResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response
  );
}