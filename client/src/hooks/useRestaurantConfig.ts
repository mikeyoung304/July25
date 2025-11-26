/**
 * useRestaurantConfig Hook
 * Phase 1: Unified Truth Protocol - Dynamic Configuration
 *
 * Fetches restaurant-specific configuration from the server, including:
 * - Tax rate (legally binding, never hardcoded)
 * - Default tip percentages
 * - Currency settings
 *
 * This replaces hardcoded magic numbers like TAX_RATE = 0.0825
 */

import { useState, useEffect } from 'react';
import { httpClient } from '@/services/http/httpClient';
import { logger } from '@/services/logger';

export interface RestaurantConfig {
  tax_rate: number;
  currency: string;
  timezone: string;
  default_tip_percentages?: number[];
  name?: string;
}

export interface UseRestaurantConfigResult {
  config: RestaurantConfig | null;
  isLoading: boolean;
  error: Error | null;
  taxRate: number; // Convenience accessor (0 if loading, throws if error)
}

const configLogger = logger.child({ hook: 'useRestaurantConfig' });

/**
 * Default fallback config (used only during initial load)
 * IMPORTANT: taxRate is 0 during loading - cart calculations wait for real data
 */
const DEFAULT_CONFIG: RestaurantConfig = {
  tax_rate: 0,
  currency: 'USD',
  timezone: 'America/Los_Angeles',
  default_tip_percentages: [15, 18, 20, 25]
};

/**
 * Fetch restaurant configuration from server
 *
 * @param restaurantId - Restaurant UUID
 * @returns Restaurant config state
 *
 * @example
 * ```typescript
 * const { config, isLoading, taxRate } = useRestaurantConfig(restaurantId);
 *
 * if (isLoading) {
 *   return <Spinner />;
 * }
 *
 * const totals = calculateCartTotals(items, taxRate, tip);
 * ```
 */
export function useRestaurantConfig(restaurantId: string): UseRestaurantConfigResult {
  const [config, setConfig] = useState<RestaurantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchConfig() {
      try {
        setIsLoading(true);
        setError(null);

        configLogger.debug('Fetching restaurant config', { restaurantId });

        // Fetch from server - this endpoint returns public config
        const response = await httpClient.get<RestaurantConfig>(`/api/v1/restaurants/${restaurantId}/public`);

        if (!isMounted) return;

        // Validate tax rate (critical financial data)
        if (typeof response.tax_rate !== 'number' || response.tax_rate < 0 || response.tax_rate > 1) {
          throw new Error(
            `Invalid tax rate received from server: ${response.tax_rate}. ` +
            `Expected number between 0 and 1.`
          );
        }

        configLogger.info('Restaurant config loaded', {
          restaurantId,
          taxRate: response.tax_rate,
          currency: response.currency
        });

        setConfig(response);
        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;

        const error = err instanceof Error ? err : new Error('Failed to fetch restaurant config');

        configLogger.error('Failed to fetch restaurant config', {
          error,
          restaurantId
        });

        setError(error);
        setIsLoading(false);

        // Don't set default config on error - force UI to handle missing data
        // This prevents silent failures with incorrect tax rates
      }
    }

    fetchConfig();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  // Convenience accessor for tax rate
  const taxRate = config?.tax_rate ?? 0;

  return {
    config,
    isLoading,
    error,
    taxRate
  };
}

/**
 * React Query / SWR-style hook (future enhancement)
 * For now, using simple useEffect-based fetching
 *
 * Future improvements:
 * - Add caching (React Query)
 * - Add retry logic
 * - Add refresh interval
 * - Add optimistic updates
 */
