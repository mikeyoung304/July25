/**
 * Test Data Factories
 *
 * Re-exports all test data factories from a single entry point.
 *
 * Usage:
 * ```typescript
 * import {
 *   createOrder,
 *   createMenuItem,
 *   createUser,
 *   createRestaurant,
 * } from '@/test/factories';
 * ```
 */

// Order factories
export {
  TEST_RESTAURANT_ID,
  ALT_RESTAURANT_ID,
  resetOrderCounters,
  createModifier,
  createOrderItem,
  createOrderItems,
  createOrder,
  createOrderWithItems,
  createPaidOrder,
  createOrdersInAllStatuses,
  createScheduledOrder,
  createOnlineOrder,
  createDineInOrder,
} from './order.factory';

// Menu item factories
export {
  resetMenuItemCounters,
  createMenuCategory,
  createModifierOption,
  createModifierGroup,
  createMenuItem,
  createMenuItems,
  createMenuItemWithModifiers,
  createFeaturedMenuItem,
  createUnavailableMenuItem,
  createDietaryMenuItem,
  createFullMenu,
  menuItemPresets,
} from './menu-item.factory';

// User factories
export {
  resetUserCounters,
  createUser,
  createAuthContext,
  createAuthenticatedUser,
  createUnauthenticatedContext,
  createLoadingAuthContext,
  userPresets,
  authPresets,
} from './user.factory';
export type { TestUser, TestAuthContext, UserRole } from './user.factory';

// Restaurant factories
export {
  resetRestaurantCounters,
  createRestaurantSettings,
  createBusinessHours,
  createRestaurant,
  createRestaurantContext,
  createLoadingRestaurantContext,
  createErrorRestaurantContext,
  restaurantPresets,
  restaurantContextPresets,
} from './restaurant.factory';
export type {
  TestRestaurant,
  RestaurantSettings,
  BusinessHours,
  TestRestaurantContext,
} from './restaurant.factory';

/**
 * Reset all factory counters (call in beforeEach for deterministic IDs)
 */
export function resetAllFactoryCounters() {
  const { resetOrderCounters } = require('./order.factory');
  const { resetMenuItemCounters } = require('./menu-item.factory');
  const { resetUserCounters } = require('./user.factory');
  const { resetRestaurantCounters } = require('./restaurant.factory');

  resetOrderCounters();
  resetMenuItemCounters();
  resetUserCounters();
  resetRestaurantCounters();
}
