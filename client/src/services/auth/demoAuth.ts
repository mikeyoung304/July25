import { env } from '@/utils/env';
import { logger } from '@/services/logger'

const STORAGE_KEY = 'DEMO_AUTH_TOKEN';
const RESTO_ID = '11111111-1111-1111-1111-111111111111';

// In-memory token storage
let cachedToken: string | null = null;
let tokenExpiresAt: number | null = null;

/**
 * Demo authentication service for kiosk mode
 * Automatically fetches and manages demo JWT tokens
 */
export class DemoAuthService {
  private static async fetchDemoToken(): Promise<{ token: string; expiresIn: number }> {
    const apiBase = env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 
      (import.meta.env.PROD ? 'https://july25.onrender.com' : 'http://localhost:3001');
    
    const response = await fetch(`${apiBase}/api/v1/auth/kiosk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: RESTO_ID
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get demo token' }));
      console.error('[DemoAuth] Kiosk auth endpoint failed:', {
        status: response.status,
        statusText: response.statusText,
        error: error.error,
        helpUrl: 'See docs/DEMO_AUTH_SETUP.md for configuration'
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

  static async getDemoToken(): Promise<string> {
    // Check cached token first
    if (this.isTokenValid() && cachedToken) {
      return cachedToken;
    }

    // Try to get from sessionStorage
    const storedToken = sessionStorage.getItem(STORAGE_KEY);
    if (storedToken) {
      try {
        const parsed = JSON.parse(storedToken);
        if (parsed.token && parsed.expiresAt && parsed.expiresAt > Date.now()) {
          cachedToken = parsed.token;
          tokenExpiresAt = parsed.expiresAt;
          return parsed.token;
        }
      } catch {
        // Invalid stored token, remove it
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    // Fetch new token
    try {
      const { token, expiresIn } = await this.fetchDemoToken();
      const expiresAt = Date.now() + (expiresIn * 1000);
      
      // Cache in memory
      cachedToken = token;
      tokenExpiresAt = expiresAt;
      
      // Store in sessionStorage
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        token,
        expiresAt
      }));

      logger.info('🔑 Demo token refreshed');
      return token;
    } catch (error) {
      console.error('Failed to get demo token:', error);
      throw error;
    }
  }

  static clearToken(): void {
    cachedToken = null;
    tokenExpiresAt = null;
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Simple wrapper function for getting demo token
 */
export const getDemoToken = () => DemoAuthService.getDemoToken();