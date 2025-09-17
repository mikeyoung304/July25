/**
 * Client-side feature flags configuration
 * Mirrors server feature flags for consistency
 */

interface ClientFeatureFlags {
  VOICE_CUSTOMER: boolean;
  VOICE_DEDUPLICATION: boolean;
  STRICT_VALIDATION: boolean;
}

class ClientFeatureManager {
  private flags: ClientFeatureFlags;

  constructor() {
    this.flags = {
      // Voice customer mode - controls payment requirement
      VOICE_CUSTOMER: import.meta.env.VITE_FEATURE_VOICE_CUSTOMER === 'true' || false,

      // Voice order deduplication
      VOICE_DEDUPLICATION: import.meta.env.VITE_FEATURE_VOICE_DEDUPE !== 'false',

      // Strict field validation
      STRICT_VALIDATION: import.meta.env.VITE_FEATURE_STRICT_VALIDATION === 'true'
    };

    // Log feature status in development
    if (import.meta.env.DEV) {
      console.log('[Features] Client feature flags:', this.flags);
    }
  }

  isEnabled(feature: keyof ClientFeatureFlags): boolean {
    return this.flags[feature] || false;
  }

  getAllFlags(): ClientFeatureFlags {
    return { ...this.flags };
  }
}

// Export singleton instance
export const clientFeatures = new ClientFeatureManager();

// Export helper functions
export const isVoiceCustomerEnabled = () => clientFeatures.isEnabled('VOICE_CUSTOMER');
export const isVoiceDedupeEnabled = () => clientFeatures.isEnabled('VOICE_DEDUPLICATION');
export const isStrictValidationEnabled = () => clientFeatures.isEnabled('STRICT_VALIDATION');