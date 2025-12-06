/**
 * Restaurant Test Factory
 *
 * Creates mock Restaurant configuration objects for testing.
 *
 * Usage:
 * ```typescript
 * import { createRestaurant, createRestaurantContext } from '@/test/factories/restaurant.factory';
 *
 * const restaurant = createRestaurant({ name: 'Test Bistro' });
 * const context = createRestaurantContext();
 * ```
 */

import { vi } from 'vitest';

// Test restaurant IDs (matching CLAUDE.md)
export const TEST_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
export const ALT_RESTAURANT_ID = '22222222-2222-2222-2222-222222222222';

let restaurantCounter = 0;

/**
 * Reset factory counter
 */
export function resetRestaurantCounters() {
  restaurantCounter = 0;
}

/**
 * Restaurant configuration interface
 */
export interface TestRestaurant {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
  tax_rate: number;
  is_active: boolean;
  settings: RestaurantSettings;
  hours?: BusinessHours;
  created_at: string;
  updated_at: string;
}

/**
 * Restaurant settings
 */
export interface RestaurantSettings {
  online_ordering_enabled: boolean;
  kiosk_enabled: boolean;
  voice_ordering_enabled: boolean;
  table_service_enabled: boolean;
  reservations_enabled: boolean;
  tips_enabled: boolean;
  default_tip_percentages: number[];
  order_ahead_minutes: number;
  max_scheduled_days: number;
}

/**
 * Business hours
 */
export interface BusinessHours {
  monday: { open: string; close: string } | null;
  tuesday: { open: string; close: string } | null;
  wednesday: { open: string; close: string } | null;
  thursday: { open: string; close: string } | null;
  friday: { open: string; close: string } | null;
  saturday: { open: string; close: string } | null;
  sunday: { open: string; close: string } | null;
}

/**
 * Restaurant context shape (matches useRestaurant hook)
 */
export interface TestRestaurantContext {
  restaurant: TestRestaurant | null;
  isLoading: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

/**
 * Create default restaurant settings
 */
export function createRestaurantSettings(
  overrides: Partial<RestaurantSettings> = {}
): RestaurantSettings {
  return {
    online_ordering_enabled: true,
    kiosk_enabled: true,
    voice_ordering_enabled: true,
    table_service_enabled: true,
    reservations_enabled: false,
    tips_enabled: true,
    default_tip_percentages: [15, 18, 20, 25],
    order_ahead_minutes: 30,
    max_scheduled_days: 7,
    ...overrides,
  };
}

/**
 * Create default business hours
 */
export function createBusinessHours(
  overrides: Partial<BusinessHours> = {}
): BusinessHours {
  const defaultHours = { open: '11:00', close: '22:00' };

  return {
    monday: defaultHours,
    tuesday: defaultHours,
    wednesday: defaultHours,
    thursday: defaultHours,
    friday: { open: '11:00', close: '23:00' },
    saturday: { open: '11:00', close: '23:00' },
    sunday: { open: '12:00', close: '21:00' },
    ...overrides,
  };
}

/**
 * Create a mock Restaurant
 */
export function createRestaurant(overrides: Partial<TestRestaurant> = {}): TestRestaurant {
  restaurantCounter++;
  const now = new Date().toISOString();
  const name = overrides.name ?? `Test Restaurant ${restaurantCounter}`;

  return {
    id: overrides.id ?? TEST_RESTAURANT_ID,
    name,
    slug: overrides.slug ?? name.toLowerCase().replace(/\s+/g, '-'),
    address: '123 Test Street, Test City, TC 12345',
    phone: '555-555-0100',
    email: 'info@testrestaurant.com',
    timezone: 'America/New_York',
    currency: 'USD',
    tax_rate: 8.25,
    is_active: true,
    settings: createRestaurantSettings(overrides.settings),
    hours: createBusinessHours(overrides.hours),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Create a restaurant context (for useRestaurant hook)
 */
export function createRestaurantContext(
  restaurantOverrides: Partial<TestRestaurant> | null = {},
  contextOverrides: Partial<TestRestaurantContext> = {}
): TestRestaurantContext {
  const restaurant = restaurantOverrides === null
    ? null
    : createRestaurant(restaurantOverrides);

  return {
    restaurant,
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(restaurant),
    ...contextOverrides,
  };
}

/**
 * Create a loading restaurant context
 */
export function createLoadingRestaurantContext(): TestRestaurantContext {
  return {
    restaurant: null,
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  };
}

/**
 * Create an error restaurant context
 */
export function createErrorRestaurantContext(
  error: Error = new Error('Failed to load restaurant')
): TestRestaurantContext {
  return {
    restaurant: null,
    isLoading: false,
    error,
    refetch: vi.fn(),
  };
}

/**
 * Restaurant presets for common test scenarios
 */
export const restaurantPresets = {
  /**
   * Standard restaurant with all features enabled
   */
  standard: (overrides: Partial<TestRestaurant> = {}) =>
    createRestaurant({
      name: 'Standard Restaurant',
      ...overrides,
    }),

  /**
   * Restaurant with only in-person service (no online ordering)
   */
  inPersonOnly: (overrides: Partial<TestRestaurant> = {}) =>
    createRestaurant({
      name: 'In-Person Restaurant',
      settings: createRestaurantSettings({
        online_ordering_enabled: false,
        voice_ordering_enabled: false,
      }),
      ...overrides,
    }),

  /**
   * Restaurant with kiosk-only mode
   */
  kioskOnly: (overrides: Partial<TestRestaurant> = {}) =>
    createRestaurant({
      name: 'Kiosk Restaurant',
      settings: createRestaurantSettings({
        table_service_enabled: false,
        online_ordering_enabled: false,
      }),
      ...overrides,
    }),

  /**
   * Restaurant currently closed
   */
  closed: (overrides: Partial<TestRestaurant> = {}) =>
    createRestaurant({
      name: 'Closed Restaurant',
      is_active: false,
      ...overrides,
    }),

  /**
   * Restaurant with no tips
   */
  noTips: (overrides: Partial<TestRestaurant> = {}) =>
    createRestaurant({
      name: 'No Tips Restaurant',
      settings: createRestaurantSettings({
        tips_enabled: false,
        default_tip_percentages: [],
      }),
      ...overrides,
    }),
};

/**
 * Context presets
 */
export const restaurantContextPresets = {
  standard: () => createRestaurantContext(restaurantPresets.standard()),
  inPersonOnly: () => createRestaurantContext(restaurantPresets.inPersonOnly()),
  kioskOnly: () => createRestaurantContext(restaurantPresets.kioskOnly()),
  closed: () => createRestaurantContext(restaurantPresets.closed()),
  loading: () => createLoadingRestaurantContext(),
  error: () => createErrorRestaurantContext(),
};
