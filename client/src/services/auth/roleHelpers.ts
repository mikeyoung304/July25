/**
 * Role-specific authentication helpers
 * Provides explicit token getters for different user contexts
 *
 * @deprecated These helpers use the deprecated DemoAuthService which stores tokens
 * in sessionStorage instead of localStorage. Use AuthContext.loginAsDemo() instead.
 *
 * Migration:
 * - Replace getCustomerToken() with: await loginAsDemo('customer')
 * - Replace getServerToken() with: await loginAsDemo('server')
 */

import { DemoAuthService } from './demoAuth';

/**
 * Get authentication token for public customer flow
 * Used for online ordering, kiosk checkout, and self-service scenarios
 *
 * @deprecated Use AuthContext.loginAsDemo('customer') instead
 * @returns JWT token with 'customer' role
 */
export const getCustomerToken = (): Promise<string> => {
  return DemoAuthService.getDemoToken('customer');
};

/**
 * Get authentication token for staff server flow
 * Used for employee-facing features like ServerView, order management
 *
 * @deprecated Use AuthContext.loginAsDemo('server') instead
 * @returns JWT token with 'server' role
 */
export const getServerToken = (): Promise<string> => {
  return DemoAuthService.getDemoToken('server');
};

/**
 * Clear all cached authentication tokens
 * Useful for logout or session reset
 */
export const clearAuthTokens = (): void => {
  DemoAuthService.clearToken();
};
