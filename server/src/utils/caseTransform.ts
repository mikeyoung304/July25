/**
 * Case transformation utilities for converting between camelCase and snake_case
 * Required for frontend/backend data exchange per Luis's API specification
 */

/**
 * Convert a string from camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Convert a string from snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Deep transform object keys from camelCase to snake_case
 * Handles nested objects, arrays, and special cases
 */
export function toSnakeCase<T>(obj: T): T {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj
  }

  // Handle Date objects (preserve as-is)
  if (obj instanceof Date) {
    return obj
  }

  // Handle File objects (preserve as-is)
  if (obj instanceof File) {
    return obj
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item)) as unknown as T
  }

  // Handle regular objects
  const transformed: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key)
      transformed[snakeKey] = toSnakeCase((obj as Record<string, unknown>)[key])
    }
  }
  return transformed as T
}

/**
 * Deep transform object keys from snake_case to camelCase
 * Handles nested objects, arrays, and special cases
 */
export function toCamelCase<T>(obj: T): T {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj
  }

  // Handle Date strings (convert to Date objects)
  if (typeof obj === 'string' && isISODateString(obj)) {
    return new Date(obj) as unknown as T
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj
  }

  // Handle Date objects (preserve as-is)
  if (obj instanceof Date) {
    return obj
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item)) as unknown as T
  }

  // Handle regular objects
  const transformed: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key)
      const value = (obj as Record<string, unknown>)[key]
      
      // Check if value is an ISO date string
      if (typeof value === 'string' && isISODateString(value)) {
        transformed[camelKey] = new Date(value)
      } else {
        transformed[camelKey] = toCamelCase(value)
      }
    }
  }
  return transformed as T
}

/**
 * Check if a string is a valid ISO date string
 */
function isISODateString(str: string): boolean {
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    return false
  }
  const date = new Date(str)
  return !isNaN(date.getTime())
}

/**
 * Transform query parameters object to snake_case
 * Useful for GET request parameters
 */
export function transformQueryParams(params: Record<string, unknown>): Record<string, unknown> {
  const transformed: Record<string, unknown> = {}
  
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null) {
      const snakeKey = camelToSnake(key)
      // Don't deep transform query param values, just the keys
      transformed[snakeKey] = params[key]
    }
  }
  
  return transformed
}