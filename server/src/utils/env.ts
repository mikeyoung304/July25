/**
 * Environment variable helper
 * Provides type-safe access to environment variables
 */

interface ProcessEnv {
  NODE_ENV?: string;
  PORT?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_KEY?: string;
  SUPABASE_JWT_SECRET?: string;
  OPENAI_API_KEY?: string;
  FRONTEND_URL?: string;
  LOG_LEVEL?: string;
  LOG_FORMAT?: string;
  AI_DEGRADED_MODE?: string;
  VOICE_PERSONALITY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_SERVICE_KEY?: string;
}

/**
 * Type-safe environment variable access
 */
export function getEnv(key: keyof ProcessEnv): string | undefined {
  return process.env[key];
}

/**
 * Get environment variable with fallback
 */
export function getEnvOrDefault(key: keyof ProcessEnv, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get required environment variable (throws if missing)
 */
export function getRequiredEnv(key: keyof ProcessEnv): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Check if environment variable is set to true
 */
export function isEnvTrue(key: keyof ProcessEnv): boolean {
  const value = process.env[key];
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get all environment variables (for debugging)
 */
export function getAllEnv(): NodeJS.ProcessEnv {
  return process.env;
}