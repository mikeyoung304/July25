/**
 * Feature Flag Service
 *
 * Lightweight feature flag system for gradual rollout and A/B testing.
 * Supports:
 * - Environment-based flags (VITE_FEATURE_*)
 * - Percentage-based rollouts
 * - User-based targeting
 * - Local override via localStorage
 *
 * Usage:
 * ```ts
 * import { featureFlagService } from '@/services/featureFlags';
 *
 * const isEnabled = await featureFlagService.isEnabled('NEW_CUSTOMER_ID_FLOW');
 * if (isEnabled) {
 *   // New code path
 * }
 * ```
 */

import { logger } from '@/services/monitoring/logger';

export interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  targetUserIds?: string[];
  targetRestaurantIds?: string[];
}

export class FeatureFlagService {
  private flags: Map<string, FeatureFlagConfig> = new Map();
  private readonly STORAGE_KEY = 'feature_flags_override';

  constructor() {
    this.loadFlags();
  }

  /**
   * Load feature flags from environment variables and localStorage overrides
   */
  private loadFlags(): void {
    // Load from environment variables (VITE_FEATURE_*)
    const envFlags = this.loadFromEnv();

    // Load from localStorage overrides (for testing)
    const localOverrides = this.loadFromLocalStorage();

    // Merge flags (localStorage takes precedence)
    this.flags = new Map([...envFlags.entries(), ...localOverrides.entries()]);

    logger.info('[FeatureFlags] Loaded flags', {
      count: this.flags.size,
      flags: Array.from(this.flags.keys())
    });
  }

  /**
   * Load flags from environment variables
   */
  private loadFromEnv(): Map<string, FeatureFlagConfig> {
    const flags = new Map<string, FeatureFlagConfig>();

    // Parse VITE_FEATURE_* environment variables
    // Format: VITE_FEATURE_FLAG_NAME=true|false|percentage
    // Examples:
    //   VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=true
    //   VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=50 (50% rollout)

    Object.keys(import.meta.env).forEach(key => {
      if (key.startsWith('VITE_FEATURE_')) {
        const flagName = key.replace('VITE_FEATURE_', '');
        const value = import.meta.env[key];

        flags.set(flagName, this.parseEnvValue(value));
      }
    });

    return flags;
  }

  /**
   * Parse environment variable value into FeatureFlagConfig
   */
  private parseEnvValue(value: string): FeatureFlagConfig {
    // Boolean: "true" or "false"
    if (value === 'true') {
      return { enabled: true };
    }
    if (value === 'false') {
      return { enabled: false };
    }

    // Percentage: "50" means 50% rollout
    const percentage = parseInt(value, 10);
    if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
      return {
        enabled: true,
        rolloutPercentage: percentage
      };
    }

    // Default: disabled
    logger.warn('[FeatureFlags] Invalid env value, defaulting to disabled', { value });
    return { enabled: false };
  }

  /**
   * Load feature flag overrides from localStorage (for testing)
   * SECURITY: Disabled in production to prevent unauthorized feature flag manipulation
   */
  private loadFromLocalStorage(): Map<string, FeatureFlagConfig> {
    const flags = new Map<string, FeatureFlagConfig>();

    // Disable localStorage overrides in production
    if (import.meta.env.PROD) {
      return flags;
    }

    try {
      const overridesJson = localStorage.getItem(this.STORAGE_KEY);
      if (overridesJson) {
        const overrides = JSON.parse(overridesJson);
        Object.entries(overrides).forEach(([key, config]) => {
          flags.set(key, config as FeatureFlagConfig);
        });
      }
    } catch (error) {
      logger.error('[FeatureFlags] Failed to load localStorage overrides', { error });
    }

    return flags;
  }

  /**
   * Check if a feature flag is enabled for the current user
   *
   * @param flagName - Feature flag name (e.g., 'NEW_CUSTOMER_ID_FLOW')
   * @param userId - Optional user ID for targeting
   * @param restaurantId - Optional restaurant ID for targeting
   * @returns true if feature is enabled
   */
  async isEnabled(
    flagName: string,
    userId?: string,
    restaurantId?: string
  ): Promise<boolean> {
    const config = this.flags.get(flagName);

    // Flag not defined - default to disabled
    if (!config) {
      return false;
    }

    // Flag explicitly disabled
    if (!config.enabled) {
      return false;
    }

    // Check user targeting
    if (config.targetUserIds && userId) {
      return config.targetUserIds.includes(userId);
    }

    // Check restaurant targeting
    if (config.targetRestaurantIds && restaurantId) {
      return config.targetRestaurantIds.includes(restaurantId);
    }

    // Check percentage rollout
    if (config.rolloutPercentage !== undefined) {
      return await this.isInRolloutPercentage(flagName, userId || restaurantId || '', config.rolloutPercentage);
    }

    // No targeting - enabled for all
    return true;
  }

  /**
   * Determine if user/restaurant is in rollout percentage using consistent hashing
   *
   * This ensures the same user/restaurant always gets the same result for a given flag,
   * which is critical for A/B testing.
   *
   * Uses SHA-256 for cryptographically secure, uniform distribution.
   */
  private async isInRolloutPercentage(flagName: string, id: string, percentage: number): Promise<boolean> {
    const hash = await this.cryptoHash(`${flagName}:${id}`);
    const bucket = hash % 100;

    return bucket < percentage;
  }

  /**
   * Cryptographically secure hash function using SHA-256
   * Provides uniform distribution for feature flag bucketing
   */
  private async cryptoHash(str: string): Promise<number> {
    // Convert string to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(str);

    // Generate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert first 4 bytes to a number
    const hashArray = new Uint8Array(hashBuffer);
    const hash = (hashArray[0] << 24) | (hashArray[1] << 16) | (hashArray[2] << 8) | hashArray[3];

    return Math.abs(hash);
  }

  /**
   * Get all feature flags (for admin/debug UI)
   */
  getAllFlags(): Record<string, FeatureFlagConfig> {
    return Object.fromEntries(this.flags);
  }

  /**
   * Override a feature flag locally (for testing)
   * This is stored in localStorage and persists across page reloads
   * SECURITY: Disabled in production to prevent unauthorized feature flag manipulation
   */
  setLocalOverride(flagName: string, config: FeatureFlagConfig): void {
    // Prevent overrides in production
    if (import.meta.env.PROD) {
      logger.warn('[FeatureFlags] Local overrides disabled in production', { flagName });
      return;
    }

    this.flags.set(flagName, config);

    // Save to localStorage
    try {
      const overrides = this.getAllFlags();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(overrides));

      logger.info('[FeatureFlags] Set local override', { flagName, config });
    } catch (error) {
      logger.error('[FeatureFlags] Failed to save override', { error });
    }
  }

  /**
   * Clear all local overrides (for testing)
   */
  clearLocalOverrides(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.loadFlags();

    logger.info('[FeatureFlags] Cleared all local overrides');
  }
}

// Singleton instance
export const featureFlagService = new FeatureFlagService();
