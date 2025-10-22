/**
 * Test Users for E2E Tests
 * Part of: Production Launch Preparation - Work Stream 1
 *
 * IMPORTANT: These use the demo authentication system.
 * All tests use AuthContext.loginAsDemo() for consistent authentication.
 */

export const TEST_USERS = {
  server: {
    role: 'server',
    displayName: 'Test Server',
    userId: 'e2e-server-001',
  },
  cashier: {
    role: 'cashier',
    displayName: 'Test Cashier',
    userId: 'e2e-cashier-001',
  },
  kitchen: {
    role: 'kitchen',
    displayName: 'Test Kitchen',
    userId: 'e2e-kitchen-001',
  },
  manager: {
    role: 'manager',
    displayName: 'Test Manager',
    userId: 'e2e-manager-001',
  },
  owner: {
    role: 'owner',
    displayName: 'Test Owner',
    userId: 'e2e-owner-001',
  },
} as const;

export type TestUserRole = keyof typeof TEST_USERS;
