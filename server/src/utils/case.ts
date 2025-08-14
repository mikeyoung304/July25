/**
 * Lightweight case transformation utilities for API boundary mapping
 * Converts snake_case DB fields to camelCase API responses
 */

/**
 * Convert snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Recursively convert object keys from snake_case to camelCase
 * Handles nested objects and arrays
 */
export function camelizeKeys<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => camelizeKeys(item)) as any;
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = camelizeKeys(obj[key]);
    }
  }
  return result;
}

/**
 * Recursively convert object keys from camelCase to snake_case
 * Handles nested objects and arrays
 */
export function snakeizeKeys<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => snakeizeKeys(item)) as any;
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = snakeizeKeys(obj[key]);
    }
  }
  return result;
}