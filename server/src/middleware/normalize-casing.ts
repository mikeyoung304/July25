/**
 * Normalize Casing Middleware
 *
 * This middleware provides temporary backward compatibility during the migration
 * from snake_case to camelCase. It accepts both formats but normalizes to camelCase.
 *
 * DEPRECATION: This middleware will be removed after the migration period (2-4 weeks).
 * Monitor logs for snake_case usage and remove when it reaches zero.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Track snake_case usage for deprecation monitoring
const snakeCaseUsageCounter = new Map<string, number>();
let lastReportTime = Date.now();

/**
 * Field mappings from snake_case to camelCase
 */
const FIELD_MAPPINGS: Record<string, string> = {
  // Order fields
  restaurant_id: 'restaurantId',
  order_number: 'orderNumber',
  customer_name: 'customerName',
  customer_email: 'customerEmail',
  customer_phone: 'customerPhone',
  table_number: 'tableNumber',
  order_type: 'type',
  payment_status: 'paymentStatus',
  payment_method: 'paymentMethod',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  completed_at: 'completedAt',
  estimated_ready_time: 'estimatedReadyTime',
  prep_time_minutes: 'prepTimeMinutes',
  total_amount: 'total', // Legacy field name

  // Item fields
  menu_item_id: 'menuItemId',
  special_instructions: 'specialInstructions',

  // Filter/query fields
  date_from: 'dateFrom',
  date_to: 'dateTo',
  sort_by: 'sortBy',
  sort_direction: 'sortDirection',
};

/**
 * Recursively normalize an object from snake_case to camelCase
 */
function normalizeObject(obj: any, path = ''): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item, index) => normalizeObject(item, `${path}[${index}]`));
  }

  const normalized: any = {};
  let hasSnakeCase = false;

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = FIELD_MAPPINGS[key] || key;

    if (key !== camelKey) {
      hasSnakeCase = true;
      // Track usage for monitoring
      const counterKey = `${path}.${key}`;
      snakeCaseUsageCounter.set(counterKey, (snakeCaseUsageCounter.get(counterKey) || 0) + 1);
    }

    // Special handling for nested objects
    if (key === 'items' && Array.isArray(value)) {
      // Order items array
      normalized[camelKey] = value.map((item: any) => normalizeObject(item, `${path}.items`));
    } else if (key === 'modifiers' && Array.isArray(value)) {
      // Modifier array - handle string or object modifiers
      normalized[camelKey] = value.map((mod: any) => {
        if (typeof mod === 'string') {
          return { name: mod, price: 0 };
        }
        return normalizeObject(mod, `${path}.modifiers`);
      });
    } else if (key === 'modifications' && !obj.modifiers) {
      // Legacy field name for modifiers
      hasSnakeCase = true;
      normalized.modifiers = Array.isArray(value)
        ? value.map((mod: any) => typeof mod === 'string' ? { name: mod, price: 0 } : mod)
        : value;
    } else {
      // Recursively normalize nested objects
      normalized[camelKey] = normalizeObject(value, `${path}.${camelKey}`);
    }
  }

  return normalized;
}

/**
 * Log deprecation warning for snake_case usage
 */
function logSnakeCaseUsage(route: string, method: string): void {
  const now = Date.now();

  // Report every 5 minutes if there's usage
  if (now - lastReportTime > 5 * 60 * 1000 && snakeCaseUsageCounter.size > 0) {
    const topUsage = Array.from(snakeCaseUsageCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field, count]) => `${field}(${count})`);

    logger.warn('⚠️ Snake_case field usage detected', {
      route,
      method,
      topFields: topUsage,
      totalFields: snakeCaseUsageCounter.size,
      message: 'Clients should migrate to camelCase. This compatibility will be removed soon.',
    });

    lastReportTime = now;
  }
}

/**
 * Middleware to normalize request body from snake_case to camelCase
 */
export function normalizeCasing(req: Request, res: Response, next: NextFunction): void {
  try {
    // Only process JSON bodies
    if (req.body && typeof req.body === 'object') {
      const originalBody = JSON.stringify(req.body);
      req.body = normalizeObject(req.body, req.path);

      // Check if normalization occurred
      const normalizedBody = JSON.stringify(req.body);
      if (originalBody !== normalizedBody) {
        logSnakeCaseUsage(req.path, req.method);

        // Add deprecation header
        res.setHeader('X-Deprecation-Warning', 'snake_case fields are deprecated. Use camelCase.');
      }
    }

    // Also normalize query parameters
    if (req.query && typeof req.query === 'object') {
      const normalized: any = {};
      for (const [key, value] of Object.entries(req.query)) {
        const camelKey = FIELD_MAPPINGS[key] || key;
        normalized[camelKey] = value;

        if (key !== camelKey) {
          logSnakeCaseUsage(`${req.path}?${key}`, 'QUERY');
        }
      }
      req.query = normalized;
    }

    next();
  } catch (error) {
    logger.error('Failed to normalize request casing', { error, path: req.path });
    next(); // Continue even if normalization fails
  }
}

/**
 * Get snake_case usage statistics for monitoring
 */
export function getSnakeCaseStats(): { fields: Array<{ field: string; count: number }>; total: number } {
  const fields = Array.from(snakeCaseUsageCounter.entries())
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count);

  const total = fields.reduce((sum, item) => sum + item.count, 0);

  return { fields, total };
}

/**
 * Reset usage counters (useful for testing)
 */
export function resetSnakeCaseStats(): void {
  snakeCaseUsageCounter.clear();
  lastReportTime = Date.now();
}