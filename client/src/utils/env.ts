/**
 * Environment variable utility
 * Provides a Jest-compatible way to access Vite environment variables
 */

interface ImportMetaEnv {
  VITE_API_BASE_URL?: string
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  VITE_DEFAULT_RESTAURANT_ID?: string
  VITE_DEMO_PANEL?: string
  DEV?: boolean
  MODE?: string
  PROD?: boolean
  SSR?: boolean
}

export function getEnv(): ImportMetaEnv {
  // In test environment, use process.env
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return {
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'test-key',
      VITE_DEFAULT_RESTAURANT_ID: process.env.VITE_DEFAULT_RESTAURANT_ID || 'grow',
      DEV: true, // In test mode, we're in development
      MODE: 'test',
      PROD: false,
      SSR: false
    }
  }
  
  // In browser/Vite environment, prefer the shared config bootstrap
  if (typeof window !== 'undefined') {
    const sharedEnv = (globalThis as typeof globalThis & {
      __SHARED_CONFIG_VITE_ENV__?: ImportMetaEnv
    }).__SHARED_CONFIG_VITE_ENV__

    if (sharedEnv) {
      return sharedEnv
    }
  }

  // Fall back to the raw import.meta env (Vite replaces at build time)
  try {
    return (import.meta as { env?: ImportMetaEnv }).env || {}
  } catch {
    return {}
  }
}

export const env = getEnv()
export default env
