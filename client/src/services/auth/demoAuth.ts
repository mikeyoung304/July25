import { env } from '@/utils/env';
import { logger } from '@/services/logger'

// Versioned storage key to force refresh when auth scopes change
const STORAGE_KEY_V1 = 'DEMO_AUTH_TOKEN';
const STORAGE_KEY_V2 = 'DEMO_AUTH_TOKEN_V2';
const CURRENT_VERSION = 2;
const RESTO_ID = '11111111-1111-1111-1111-111111111111';

// In-memory token storage
let cachedToken: string | null = null;
let tokenExpiresAt: number | null = null;

/**
 * Demo authentication service for development and testing
 * Automatically fetches and manages demo JWT tokens
 *
 * TODO: Replace with proper PIN authentication for production
 * See AUTHENTICATION_ARCHITECTURE.md for production auth implementation
 */
export class DemoAuthService {
  private static async fetchDemoToken(role: string = 'server'): Promise<{ token: string; expiresIn: number }> {
    const apiBase = env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    const response = await fetch(`${apiBase}/api/v1/auth/demo-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-token-version': String(CURRENT_VERSION),
      },
      body: JSON.stringify({
        role: role,
        restaurantId: RESTO_ID
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get demo token' }));
      console.error('[DemoAuth] Demo session endpoint failed:', {
        status: response.status,
        statusText: response.statusText,
        error: error.error,
        role: role,
        helpUrl: 'See docs/AUTHENTICATION_ARCHITECTURE.md for configuration'
      });
      throw new Error(`Demo auth failed: ${error.error || response.statusText}. Check server logs for details.`);
    }

    return response.json();
  }

  private static isTokenValid(): boolean {
    if (!cachedToken || !tokenExpiresAt) {
      return false;
    }
    
    // Check if token expires in the next 5 minutes
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return tokenExpiresAt > fiveMinutesFromNow;
  }

  static async getDemoToken(role: string = 'server'): Promise<string> {
    // Check cached token first
    if (this.isTokenValid() && cachedToken) {
      return cachedToken;
    }

    // Migrate from V1 to V2 if needed
    const oldToken = sessionStorage.getItem(STORAGE_KEY_V1);
    if (oldToken) {
      logger.info('🔄 Migrating demo token from V1 to V2');
      sessionStorage.removeItem(STORAGE_KEY_V1);
      // Force refresh with new version
    }

    // Try to get from versioned sessionStorage
    const storedToken = sessionStorage.getItem(STORAGE_KEY_V2);
    if (storedToken) {
      try {
        const parsed = JSON.parse(storedToken);
        if (parsed.token && parsed.expiresAt && parsed.expiresAt > Date.now() && parsed.version === CURRENT_VERSION) {
          cachedToken = parsed.token;
          tokenExpiresAt = parsed.expiresAt;
          return parsed.token;
        }
      } catch {
        // Invalid stored token, remove it
        sessionStorage.removeItem(STORAGE_KEY_V2);
      }
    }

    // Fetch new token
    try {
      const { token, expiresIn } = await this.fetchDemoToken(role);
      const expiresAt = Date.now() + (expiresIn * 1000);

      // Cache in memory
      cachedToken = token;
      tokenExpiresAt = expiresAt;

      // Store in versioned sessionStorage
      sessionStorage.setItem(STORAGE_KEY_V2, JSON.stringify({
        token,
        expiresAt,
        version: CURRENT_VERSION
      }));

      logger.info('🔑 Demo token refreshed', { role });
      return token;
    } catch (error) {
      console.error('Failed to get demo token:', error);
      throw error;
    }
  }

  static clearToken(): void {
    cachedToken = null;
    tokenExpiresAt = null;
    sessionStorage.removeItem(STORAGE_KEY_V1);
    sessionStorage.removeItem(STORAGE_KEY_V2);
  }

  static async refreshTokenIfNeeded(): Promise<string> {
    // Force token refresh
    this.clearToken();
    return this.getDemoToken();
  }
}

/**
 * Simple wrapper function for getting demo token
 * @param role - The role to authenticate as (default: 'server')
 */
export const getDemoToken = (role: string = 'server') => DemoAuthService.getDemoToken(role);