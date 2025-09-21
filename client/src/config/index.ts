/**
 * Client-side Configuration Service
 * 
 * Wraps the shared config service with Vite-specific environment variable handling
 */

import { config as sharedConfigSimple, configService as sharedConfig } from '../../../shared/config';

// Override process.env with import.meta.env for Vite
if (typeof window !== 'undefined' && import.meta.env) {
  // Map Vite env vars to process.env for shared config to work
  (window as any).process = (window as any).process || {};
  (window as any).process.env = {
    ...((window as any).process?.env || {}),
    NODE_ENV: import.meta.env.MODE,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_DEFAULT_RESTAURANT_ID: import.meta.env.VITE_DEFAULT_RESTAURANT_ID,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA,
    VITE_USE_REALTIME_VOICE: import.meta.env.VITE_USE_REALTIME_VOICE,
    VITE_SQUARE_APP_ID: import.meta.env.VITE_SQUARE_APP_ID,
    VITE_SQUARE_LOCATION_ID: import.meta.env.VITE_SQUARE_LOCATION_ID,
    VITE_SQUARE_ENVIRONMENT: import.meta.env.VITE_SQUARE_ENVIRONMENT,
  };
}

// Re-export everything from shared config
export * from '../../../shared/config';
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