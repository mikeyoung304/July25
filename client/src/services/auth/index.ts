import { supabase } from '@/core/supabase';
import { getDemoToken } from './demoAuth';

/**
 * Get the current authentication token
 * Returns a demo token in development or the Supabase JWT in production
 */
export async function getAuthToken(): Promise<string> {
  try {
    // In development/demo mode, use demo token
    if (import.meta.env.DEV || import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      console.log('[Auth] Getting demo token...');
      const token = await getDemoToken();
      console.log('[Auth] Demo token obtained:', token ? 'yes' : 'no');
      return token;
    }

    // In production, get Supabase session token
    if (supabase) {
      console.log('[Auth] Getting Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        console.log('[Auth] Supabase token obtained: yes');
        return session.access_token;
      }
      console.log('[Auth] No Supabase session, falling back to demo token');
    }

    // Fallback to demo token if no auth available
    console.log('[Auth] Falling back to demo token...');
    const token = await getDemoToken();
    console.log('[Auth] Fallback demo token obtained:', token ? 'yes' : 'no');
    return token;
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