/**
 * DEPRECATED: This file is deprecated as of Phase 1 of the "Unified Truth" protocol.
 *
 * All order validation schemas have been moved to @rebuild/shared/validation/order.schema.ts
 * to serve as the Single Source of Truth across Client and Server.
 *
 * This file now re-exports from the shared package for backward compatibility.
 * Any imports from this file should be updated to import directly from '@rebuild/shared'.
 *
 * Migration Guide:
 * - Before: import { orderSchemas } from '../models/order.model';
 * - After:  import { orderSchemas } from '@rebuild/shared';
 */

// Re-export from shared for backward compatibility
export {
  orderSchemas,
  createOrderSchema,
  updateOrderStatusSchema,
  updateOrderSchema,
  orderFiltersSchema,
  voiceOrderSchema,
  orderItemSchema,
  orderItemModifierSchema,
  isValidUUID,
  mapOrderTypeToDb,
  ORDER_STATUS_VALUES,
  DB_ORDER_TYPE_VALUES,
  UI_ORDER_TYPE_VALUES,
  PAYMENT_STATUS_VALUES,
  PAYMENT_METHOD_VALUES
} from '@rebuild/shared';