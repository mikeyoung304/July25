import { supabase } from '@/core/supabase';
import { logger } from '@/services/logger'

/**
 * Bridge to AuthContext session
 * This allows services that can't use React hooks to access auth tokens
 * from AuthContext (which handles PIN, station, and email logins)
 */
let authContextSession: { accessToken?: string; refreshToken?: string; expiresAt?: number } | null = null;

/**
 * Set the auth session from AuthContext
 * Called by AuthContext when session changes
 */
export function setAuthContextSession(session: { accessToken?: string; refreshToken?: string; expiresAt?: number } | null) {
  authContextSession = session;
  logger.info('[Auth] AuthContext session updated:', session ? 'present' : 'cleared');
}

/**
 * Get the current authentication token
 * Checks AuthContext first (primary source for all auth methods)
 * Falls back to Supabase session for edge cases
 */
export async function getAuthToken(): Promise<string> {
  try {
    // Debug logging to understand the issue
    logger.info('[Auth] getAuthToken called', {
      hasAuthContextSession: !!authContextSession,
      hasAccessToken: !!authContextSession?.accessToken,
      tokenPreview: authContextSession?.accessToken ? authContextSession.accessToken.substring(0, 10) + '...' : 'none'
    });
    
    // First check AuthContext session (handles PIN, station, and email logins)
    if (authContextSession?.accessToken) {
      logger.info('[Auth] Using token from AuthContext');
      
      // Check if token is expired
      if (authContextSession.expiresAt && authContextSession.expiresAt * 1000 < Date.now()) {
        logger.warn('[Auth] AuthContext token expired');
      } else {
        return authContextSession.accessToken;
      }
    }

    // Fallback: Get Supabase session token (for direct Supabase auth edge cases)
    if (supabase) {
      logger.info('[Auth] Checking Supabase session as fallback...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        logger.info('[Auth] Supabase token obtained as fallback');
        return session.access_token;
      }
      logger.warn('[Auth] No Supabase session available');
    }

    // No authentication available
    logger.error('[Auth] No authentication found in AuthContext or Supabase');
    throw new Error('Authentication required. Please log in.');
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
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}