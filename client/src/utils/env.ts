/**
 * Environment variable utility
 * Provides a Jest-compatible way to access Vite environment variables
 */

interface ImportMetaEnv {
  VITE_API_BASE_URL?: string
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  DEV?: boolean
  MODE?: string
  PROD?: boolean
  SSR?: boolean
}

function getEnv(): ImportMetaEnv {
  // In test environment, use process.env
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return {
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'test-key',
      DEV: process.env.NODE_ENV !== 'production',
      MODE: process.env.NODE_ENV || 'test',
      PROD: process.env.NODE_ENV === 'production',
      SSR: false
    }
  }
  
  // In browser/Vite environment, use import.meta.env
  // This will be handled by the polyfill in test environment
  try {
    // @ts-expect-error - import.meta is available in Vite
    return (globalThis as any).import?.meta?.env || {}
  } catch {
    return {}
  }
}

export const env = getEnv()