import { supabase } from '@/core/supabase';
import { logger } from '@/services/logger'

/**
 * Get the current authentication token from Supabase session
 * All users (workspace and customers) are real Supabase users with proper sessions
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
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}