/**
 * Client-side Configuration Service
 * 
 * Wraps the shared config service with Vite-specific environment variable handling
 */

// eslint-disable-next-line no-restricted-imports -- central config aggregator purposely imports shared browser entry
import { browserConfig as sharedConfigSimple, configService as sharedConfig } from '@rebuild/shared/config/browser';

// Re-export everything from shared config (browser entrypoint)
// eslint-disable-next-line no-restricted-imports
export * from '@rebuild/shared/config/browser';
export { sharedConfig, sharedConfigSimple as config };

// Client-specific helpers
export const isDemo = () => {
  const cfg = sharedConfig.get();
  return cfg.squareAccessToken === 'demo' || cfg.squareEnvironment === 'sandbox';
};

export const getRestaurantId = (): string => {
  // Check session storage first (for multi-tenant scenarios)
  if (typeof window !== 'undefined') {
    const storedId = sessionStorage.getItem('currentRestaurantId');
    if (storedId) return storedId;
  }
  
  // Fall back to default
  return sharedConfig.get().defaultRestaurantId;
};

export const setRestaurantId = (id: string): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('currentRestaurantId', id);
  }
};
