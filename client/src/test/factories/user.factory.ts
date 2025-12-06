/**
 * User Test Factory
 *
 * Creates mock User and authentication objects for testing.
 *
 * Usage:
 * ```typescript
 * import { createUser, createAuthenticatedUser } from '@/test/factories/user.factory';
 *
 * const manager = createUser({ role: 'manager' });
 * const authContext = createAuthenticatedUser();
 * ```
 */

import { TEST_RESTAURANT_ID } from './order.factory';

// Common user roles in the system
export type UserRole = 'admin' | 'manager' | 'server' | 'kitchen' | 'expo' | 'kiosk' | 'host';

let userCounter = 0;

/**
 * Reset factory counter
 */
export function resetUserCounters() {
  userCounter = 0;
}

/**
 * Basic User interface (matches common auth patterns)
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Auth context shape (matches useAuth hook return)
 */
export interface TestAuthContext {
  user: TestUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  refreshToken: ReturnType<typeof vi.fn>;
}

// Import vi for mock functions
import { vi } from 'vitest';

/**
 * Create a mock User
 */
export function createUser(overrides: Partial<TestUser> = {}): TestUser {
  userCounter++;
  const now = new Date().toISOString();
  const role = overrides.role ?? 'server';

  return {
    id: `user-${userCounter}`,
    email: overrides.email ?? `${role}${userCounter}@restaurant.com`,
    name: overrides.name ?? `Test ${role.charAt(0).toUpperCase() + role.slice(1)} ${userCounter}`,
    role,
    restaurant_id: TEST_RESTAURANT_ID,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Create a mock auth context (for useAuth hook)
 */
export function createAuthContext(
  userOverrides: Partial<TestUser> | null = {},
  contextOverrides: Partial<TestAuthContext> = {}
): TestAuthContext {
  const user = userOverrides === null ? null : createUser(userOverrides);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading: false,
    login: vi.fn().mockResolvedValue(user),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn().mockResolvedValue('new-token'),
    ...contextOverrides,
  };
}

/**
 * Create an authenticated user context
 */
export function createAuthenticatedUser(
  userOverrides: Partial<TestUser> = {},
  contextOverrides: Partial<TestAuthContext> = {}
): TestAuthContext {
  return createAuthContext(userOverrides, contextOverrides);
}

/**
 * Create an unauthenticated context
 */
export function createUnauthenticatedContext(
  contextOverrides: Partial<TestAuthContext> = {}
): TestAuthContext {
  return createAuthContext(null, {
    isAuthenticated: false,
    ...contextOverrides,
  });
}

/**
 * Create a loading auth context
 */
export function createLoadingAuthContext(): TestAuthContext {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  };
}

/**
 * Role-specific user presets (matching CLAUDE.md demo credentials pattern)
 */
export const userPresets = {
  manager: (overrides: Partial<TestUser> = {}) =>
    createUser({
      role: 'manager',
      email: 'manager@restaurant.com',
      name: 'Demo Manager',
      ...overrides,
    }),

  server: (overrides: Partial<TestUser> = {}) =>
    createUser({
      role: 'server',
      email: 'server@restaurant.com',
      name: 'Demo Server',
      ...overrides,
    }),

  kitchen: (overrides: Partial<TestUser> = {}) =>
    createUser({
      role: 'kitchen',
      email: 'kitchen@restaurant.com',
      name: 'Demo Kitchen',
      ...overrides,
    }),

  expo: (overrides: Partial<TestUser> = {}) =>
    createUser({
      role: 'expo',
      email: 'expo@restaurant.com',
      name: 'Demo Expo',
      ...overrides,
    }),

  admin: (overrides: Partial<TestUser> = {}) =>
    createUser({
      role: 'admin',
      email: 'admin@restaurant.com',
      name: 'Demo Admin',
      ...overrides,
    }),
};

/**
 * Create auth context presets for each role
 */
export const authPresets = {
  manager: () => createAuthenticatedUser(userPresets.manager()),
  server: () => createAuthenticatedUser(userPresets.server()),
  kitchen: () => createAuthenticatedUser(userPresets.kitchen()),
  expo: () => createAuthenticatedUser(userPresets.expo()),
  admin: () => createAuthenticatedUser(userPresets.admin()),
  unauthenticated: () => createUnauthenticatedContext(),
  loading: () => createLoadingAuthContext(),
};
