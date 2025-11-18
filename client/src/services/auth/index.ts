import { supabase } from '@/core/supabase';
import { logger } from '@/services/logger'

/**
 * Get the current authentication token from Supabase session OR localStorage
 * Supports both Supabase sessions and custom JWT tokens (demo/PIN/station sessions)
 *
 * CRITICAL FIX (Nov 18, 2025): Added localStorage fallback to match httpClient.ts
 * Voice ordering requires this dual-source auth after custom JWT migration
 */
export async function getAuthToken(): Promise<string> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    logger.info('[Auth] Getting Supabase session...');
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      logger.info('[Auth] Supabase token obtained: yes');
      return session.access_token;
    }

    // Fallback to localStorage for custom JWT (demo/PIN/station sessions)
    // This matches the httpClient.ts implementation (lines 121-144)
    logger.info('[Auth] No Supabase session, checking localStorage for custom JWT...');
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.session?.accessToken && parsed.session?.expiresAt) {
          // Check if token is still valid
          if (parsed.session.expiresAt > Date.now() / 1000) {
            logger.info('[Auth] Using localStorage session token (custom JWT)');
            return parsed.session.accessToken;
          } else {
            logger.warn('[Auth] localStorage session token expired');
          }
        }
      } catch (parseError) {
        logger.error('[Auth] Failed to parse localStorage auth session:', parseError);
      }
    }

    logger.warn('[Auth] No active session - user needs to log in');
    throw new Error('No active authentication session');
  } catch (error) {
    console.error('[Auth] Error getting auth token:', error);
    throw error;
  }
}

/**
 * Get the current user information
 */
export async function getCurrentUser() {
  if (!supabase) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get optional authentication token (doesn't throw if not authenticated)
 * Used for endpoints that support both authenticated and anonymous access
 *
 * CRITICAL FIX (Nov 18, 2025): Added localStorage fallback to match httpClient.ts
 * Voice ordering requires this dual-source auth after custom JWT migration
 */
export async function getOptionalAuthToken(): Promise<string | null> {
  try {
    if (!supabase) {
      logger.warn('[Auth] Supabase client not initialized - returning null');
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      logger.info('[Auth] Optional token obtained from Supabase: yes');
      return session.access_token;
    }

    // Fallback to localStorage for custom JWT (demo/PIN/station sessions)
    // This matches the httpClient.ts implementation (lines 121-144)
    logger.info('[Auth] No Supabase session, checking localStorage for custom JWT...');
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.session?.accessToken && parsed.session?.expiresAt) {
          // Check if token is still valid
          if (parsed.session.expiresAt > Date.now() / 1000) {
            logger.info('[Auth] Optional token obtained from localStorage (custom JWT)');
            return parsed.session.accessToken;
          } else {
            logger.warn('[Auth] localStorage session token expired');
          }
        }
      } catch (parseError) {
        logger.error('[Auth] Failed to parse localStorage auth session:', parseError);
      }
    }

    logger.info('[Auth] No session - proceeding as anonymous');
    return null;
  } catch (error) {
    logger.warn('[Auth] Error getting optional auth token:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}