/**
 * Feature flag configuration for gradual rollout
 */

import { logger } from '../utils/logger';

const featuresLogger = logger.child({ module: 'features' });

export interface FeatureFlags {
  AUTH_V2: boolean;
  STRICT_DTO_VALIDATION: boolean;
  IDEMPOTENCY_ENABLED: boolean;
  VOICE_DEDUPLICATION: boolean;
  REQUIRE_RESTAURANT_CONTEXT: boolean;
  CACHE_AUTH_ROLES: boolean;
}

/**
 * Default feature flags
 * These can be overridden by environment variables
 */
const defaultFlags: FeatureFlags = {
  // Core auth v2 system - controls edge normalization
  AUTH_V2: process.env.FEATURE_AUTH_V2 === 'true' || process.env.NODE_ENV === 'development',
  
  // Strict DTO validation - rejects snake_case when true
  STRICT_DTO_VALIDATION: process.env.FEATURE_STRICT_DTO === 'true' || false,
  
  // Idempotency for order creation
  IDEMPOTENCY_ENABLED: process.env.FEATURE_IDEMPOTENCY === 'true' || process.env.NODE_ENV === 'development',
  
  // Voice order deduplication on client
  VOICE_DEDUPLICATION: process.env.FEATURE_VOICE_DEDUPE === 'true' || true,
  
  // Require restaurant context for writes
  REQUIRE_RESTAURANT_CONTEXT: process.env.FEATURE_REQUIRE_CONTEXT === 'true' || process.env.NODE_ENV === 'development',
  
  // Cache auth role lookups
  CACHE_AUTH_ROLES: process.env.FEATURE_CACHE_ROLES === 'true' || true
};

/**
 * Feature flag manager
 */
class FeatureManager {
  private flags: FeatureFlags;
  
  constructor() {
    this.flags = { ...defaultFlags };
    this.logFeatureStatus();
  }
  
  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature] || false;
  }
  
  /**
   * Enable a feature (runtime toggle)
   */
  enable(feature: keyof FeatureFlags): void {
    this.flags[feature] = true;
    featuresLogger.info(`Feature enabled: ${feature}`);
  }
  
  /**
   * Disable a feature (runtime toggle)
   */
  disable(feature: keyof FeatureFlags): void {
    this.flags[feature] = false;
    featuresLogger.info(`Feature disabled: ${feature}`);
  }
  
  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }
  
  /**
   * Set multiple flags at once
   */
  setFlags(flags: Partial<FeatureFlags>): void {
    Object.assign(this.flags, flags);
    this.logFeatureStatus();
  }
  
  /**
   * Log current feature status
   */
  private logFeatureStatus(): void {
    featuresLogger.info('Feature flags initialized', this.flags);
  }
  
  /**
   * Get rollout percentage (for gradual rollout)
   */
  shouldEnableForUser(feature: keyof FeatureFlags, userId: string): boolean {
    // Always respect explicit feature flag first
    if (!this.isEnabled(feature)) {
      return false;
    }
    
    // For percentage-based rollout, use consistent hash
    const rolloutPercentage = parseInt(process.env[`FEATURE_${feature}_ROLLOUT`] || '100');
    if (rolloutPercentage >= 100) {
      return true;
    }
    
    // Simple hash-based rollout
    const hash = userId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    return (Math.abs(hash) % 100) < rolloutPercentage;
  }
}

// Export singleton instance
export const features = new FeatureManager();

// Export helper functions for common checks
export const isAuthV2Enabled = () => features.isEnabled('AUTH_V2');
export const isStrictDTOEnabled = () => features.isEnabled('STRICT_DTO_VALIDATION');
export const isIdempotencyEnabled = () => features.isEnabled('IDEMPOTENCY_ENABLED');
export const isVoiceDedupeEnabled = () => features.isEnabled('VOICE_DEDUPLICATION');
export const isRestaurantContextRequired = () => features.isEnabled('REQUIRE_RESTAURANT_CONTEXT');
export const isRoleCacheEnabled = () => features.isEnabled('CACHE_AUTH_ROLES');