/**
 * React hook for feature flags
 *
 * Usage:
 * ```tsx
 * const isNewFlowEnabled = useFeatureFlag('NEW_CUSTOMER_ID_FLOW');
 *
 * return (
 *   <div>
 *     {isNewFlowEnabled ? <NewFlow /> : <OldFlow />}
 *   </div>
 * );
 * ```
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth.hooks';
import { useRestaurant } from '@/core/restaurant-hooks';
import { featureFlagService } from './FeatureFlagService';

/**
 * Hook to check if a feature flag is enabled
 *
 * @param flagName - Feature flag name
 * @returns true if feature is enabled for current user/restaurant
 */
export function useFeatureFlag(flagName: string): boolean {
  const { user } = useAuth();
  const { restaurant } = useRestaurant();

  return useMemo(() => {
    return featureFlagService.isEnabled(
      flagName,
      user?.id,
      restaurant?.id
    );
  }, [flagName, user?.id, restaurant?.id]);
}

/**
 * Hook to get feature flag config (for debugging/admin)
 *
 * @param flagName - Feature flag name
 * @returns Feature flag configuration
 */
export function useFeatureFlagConfig(flagName: string) {
  return useMemo(() => {
    const allFlags = featureFlagService.getAllFlags();
    return allFlags[flagName] || { enabled: false };
  }, [flagName]);
}

/**
 * Hook to get all feature flags (for admin panel)
 *
 * @returns All feature flags
 */
export function useAllFeatureFlags() {
  return useMemo(() => {
    return featureFlagService.getAllFlags();
  }, []);
}
