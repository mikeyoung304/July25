import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
// Working directory is server/, so we go up one level to find .env
const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

const rawEnv = process.env;

const getString = (key: string, fallback = ''): string => {
  const value = rawEnv[key];
  // Trim to remove any whitespace or newline characters (e.g., from Vercel CLI)
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed !== '' ? trimmed : fallback;
};

const getOptionalString = (key: string): string | undefined => {
  const value = rawEnv[key];
  // Trim to remove any whitespace or newline characters (e.g., from Vercel CLI)
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
};

const getNumber = (key: string, fallback: number): number => {
  const value = rawEnv[key];
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getBoolean = (key: string, fallback = false): boolean => {
  const value = rawEnv[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

const getSquareEnvironment = (): 'sandbox' | 'production' => {
  const value = getString('SQUARE_ENVIRONMENT', 'sandbox').toLowerCase();
  return value === 'production' ? 'production' : 'sandbox';
};

/**
 * Server Environment Configuration
 * Reads from process.env after dotenv has loaded .env file
 */
export const env = {
  // Node
  NODE_ENV: getString('NODE_ENV', 'development'),
  PORT: getNumber('PORT', 3001),
  
  // Database
  DATABASE_URL: getString('DATABASE_URL'),
  SUPABASE_URL: getString('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getString('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_KEY: getString('SUPABASE_SERVICE_KEY'),
  SUPABASE_JWT_SECRET: getString('SUPABASE_JWT_SECRET'),
  
  // Frontend
  FRONTEND_URL: getString('FRONTEND_URL', 'http://localhost:5173'),
  ALLOWED_ORIGINS: getString('ALLOWED_ORIGINS', 'http://localhost:5173'),
  
  // Restaurant
  DEFAULT_RESTAURANT_ID: getString('DEFAULT_RESTAURANT_ID', '11111111-1111-1111-1111-111111111111'),
  
  // AI
  OPENAI_API_KEY: getOptionalString('OPENAI_API_KEY'),
  OPENAI_REALTIME_MODEL: getString('OPENAI_REALTIME_MODEL', 'gpt-4o-realtime-preview-2025-06-03'),
  AI_DEGRADED_MODE: getBoolean('AI_DEGRADED_MODE'),
  
  // Auth
  KIOSK_JWT_SECRET: getString('KIOSK_JWT_SECRET'),
  STATION_TOKEN_SECRET: getString('STATION_TOKEN_SECRET'),
  PIN_PEPPER: getString('PIN_PEPPER'),
  DEVICE_FINGERPRINT_SALT: getString('DEVICE_FINGERPRINT_SALT'),
  
  // Payments
  SQUARE_ACCESS_TOKEN: getString('SQUARE_ACCESS_TOKEN'),
  SQUARE_LOCATION_ID: getString('SQUARE_LOCATION_ID'),
  SQUARE_ENVIRONMENT: getSquareEnvironment(),
  SQUARE_APP_ID: getString('SQUARE_APP_ID'),
} as const;

export function validateEnv(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'DEFAULT_RESTAURANT_ID',
  ] as const;

  const missing = required.filter(key => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(env.DEFAULT_RESTAURANT_ID)) {
    throw new Error('DEFAULT_RESTAURANT_ID must be a valid UUID');
  }
}
