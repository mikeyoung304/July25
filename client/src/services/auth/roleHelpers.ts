/**
 * Role-specific authentication helpers
 * Provides explicit token getters for different user contexts
 */

import { DemoAuthService } from './demoAuth';

/**
 * Get authentication token for public customer flow
 * Used for online ordering, kiosk checkout, and self-service scenarios
 *
 * @returns JWT token with 'customer' role
 */
export const getCustomerToken = (): Promise<string> => {
  return DemoAuthService.getDemoToken('customer');
};

/**
 * Get authentication token for staff server flow
 * Used for employee-facing features like ServerView, order management
 *
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
